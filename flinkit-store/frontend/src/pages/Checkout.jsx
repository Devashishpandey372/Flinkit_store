import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Plus, CreditCard, Banknote, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout = () => {
  const { cart, cartSubtotal, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New address form modal/toggle
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    houseNumber: '',
    street: '',
    landmark: '',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110001',
    deliveryInstructions: '',
    isDefault: false,
  });

  const items = cart?.items || [];
  const deliveryFee = cartSubtotal >= 499 ? 0 : 40;
  const total = cartSubtotal + deliveryFee;

  // Pre-load Razorpay SDK script on mount
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await api.get('/addresses');
        const list = res.data.data.addresses || [];
        setAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(defaultAddr._id);
        } else {
          setShowAddAddress(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAddresses();
  }, []);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/addresses', newAddr);
      const created = res.data.data.address;
      setAddresses([created, ...addresses]);
      setSelectedAddressId(created._id);
      setShowAddAddress(false);
      toast.success('Address saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select or add a delivery address');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/products');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create order in database
      const orderRes = await api.post('/orders', {
        addressId: selectedAddressId,
        paymentMethod,
      });

      const order = orderRes.data.data.order;

      // If Cash on Delivery, complete immediately
      if (paymentMethod === 'cod') {
        await fetchCart();
        toast.success('Order placed successfully! 🎉');
        navigate(`/order-success/${order._id}`, { state: { order } });
        return;
      }

      // 2. Online Payment via Razorpay
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || typeof window.Razorpay !== 'function') {
        toast.error('Failed to load Razorpay payment SDK. Please check your internet connection.');
        setSubmitting(false);
        return;
      }

      // Step a: Call backend to create Razorpay Order ID
      const rzpOrderRes = await api.post('/payments/create-order', { orderId: order._id });
      const { razorpayOrderId, amount, currency, key, user: rzpUser } = rzpOrderRes.data.data;

      // Step b: Open Razorpay Checkout Modal
      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency: currency || 'INR',
        name: 'Flinkit',
        description: 'Grocery Order Payment',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
        order_id: razorpayOrderId,
        prefill: {
          name: rzpUser?.name || user?.name || '',
          email: rzpUser?.email || user?.email || '',
          contact: rzpUser?.phone || user?.phone || '',
        },
        theme: {
          color: '#16a34a',
        },
        // Step c: On handler success, send verification payload to backend
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payments/verify', {
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await fetchCart();
            toast.success('Payment verified & order confirmed! 🎉');
            // Step d: Redirect to Order Success page
            navigate(`/order-success/${order._id}`, {
              state: {
                order: verifyRes.data?.data?.order || order,
                paymentId: response.razorpay_payment_id,
              },
            });
          } catch (verifyErr) {
            if (verifyErr.code === 'ECONNABORTED' || verifyErr.message?.includes('timeout')) {
              toast.error('Network timeout during payment verification. Please check My Orders to see your order status.');
            } else {
              toast.error(verifyErr.response?.data?.message || 'Payment verification failed: cryptographic signature mismatch.');
            }
            navigate('/my-orders');
          }
        },
        // Step e: Handle modal closure gracefully
        modal: {
          ondismiss: () => {
            toast('Payment cancelled: Modal closed. Your order is safely saved in My Orders where you can complete payment.', { icon: 'ℹ️' });
            fetchCart();
            navigate('/my-orders');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        const error = response.error || {};
        if (error.source === 'gateway' || error.reason === 'gateway_error') {
          toast.error(`Gateway Technical Error: ${error.description || 'Payment gateway encountered a bank communication issue. Please retry.'}`);
        } else if (error.reason === 'payment_failed') {
          toast.error(`Payment Failed: ${error.description || 'Transaction declined by bank or card issuer.'}`);
        } else {
          toast.error(`Payment Error: ${error.description || 'Payment could not be completed.'}`);
        }
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Address */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            {/* Saved Addresses List */}
            {addresses.length > 0 && !showAddAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr._id;
                  return (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-sm text-gray-900">{addr.fullName}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {addr.houseNumber}, {addr.street}
                        {addr.landmark ? `, ${addr.landmark}` : ''}
                      </p>
                      <p className="text-xs text-gray-600">
                        {addr.city}, {addr.state} — {addr.pinCode}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">📱 {addr.phone}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Address Form */}
            {showAddAddress && (
              <form onSubmit={handleAddAddress} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newAddr.fullName}
                      onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={newAddr.phone}
                      onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">House / Flat No.</label>
                    <input
                      type="text"
                      required
                      value={newAddr.houseNumber}
                      onChange={(e) => setNewAddr({ ...newAddr, houseNumber: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Street / Colony</label>
                    <input
                      type="text"
                      required
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code</label>
                    <input
                      type="text"
                      required
                      value={newAddr.pinCode}
                      onChange={(e) => setNewAddr({ ...newAddr, pinCode: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn-primary py-2 px-6 text-sm">
                    Save Address
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Payment Method */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Select Payment Method</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                htmlFor="payment-method-cod"
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-primary-600 bg-primary-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  id="payment-method-cod"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="accent-primary-600"
                />
                <Banknote className="w-5 h-5 text-gray-700" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500">Pay when order arrives</p>
                </div>
              </label>

              <label
                htmlFor="payment-method-online"
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'online'
                    ? 'border-primary-600 bg-primary-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  id="payment-method-online"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="accent-primary-600"
                />
                <CreditCard className="w-5 h-5 text-gray-700" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Online Payment</p>
                  <p className="text-xs text-gray-500">UPI, Cards, NetBanking (Razorpay)</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Col: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {items.map((i) => (
                <div key={i.product?._id} className="flex justify-between items-center text-xs text-gray-600 py-1">
                  <span className="truncate max-w-[160px]">
                    {i.product?.name} × {i.quantity}
                  </span>
                  <span className="font-semibold text-gray-900">₹{(i.product?.sellingPrice || 0) * i.quantity}</span>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 border-t pt-2 border-dashed">
                <span>Total Amount</span>
                <span className="text-xl text-primary-600">₹{total}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 text-base mt-2"
              id="confirm-place-order-btn"
            >
              {submitting ? (
                <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
              ) : (
                <>
                  Place Order <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Safe & Secure Checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

