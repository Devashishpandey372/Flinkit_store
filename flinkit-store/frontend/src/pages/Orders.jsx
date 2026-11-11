import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle2, XCircle, ArrowRight, Truck, FileText, CreditCard } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import InvoiceModal from '../components/InvoiceModal';

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

const STATUS_COLORS = {
  placed: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  packed: 'bg-purple-50 text-purple-700 border-purple-200',
  out_for_delivery: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      setOrders(res.data.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRetryPayment = async (order) => {
    setRetryingId(order._id);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || typeof window.Razorpay !== 'function') {
        toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
        setRetryingId(null);
        return;
      }

      const rzpOrderRes = await api.post('/payments/create-order', { orderId: order._id });
      const { razorpayOrderId, amount, currency, key, user: rzpUser } = rzpOrderRes.data.data;

      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency: currency || 'INR',
        name: 'Flinkit',
        description: 'Grocery Order Payment Retry',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
        order_id: razorpayOrderId,
        prefill: {
          name: rzpUser?.name || '',
          email: rzpUser?.email || '',
          contact: rzpUser?.phone || '',
        },
        theme: { color: '#16a34a' },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment verified & order confirmed! 🎉');
            fetchOrders();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment modal closed. You can retry anytime.', { icon: 'ℹ️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        const error = response.error || {};
        toast.error(error.description || 'Payment retry failed. Please try another payment method.');
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment retry.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/cancel`, { cancellationReason: 'Cancelled by customer' });
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">No Orders Yet</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          You haven't placed any orders yet. Start exploring groceries and snacks now!
        </p>
        <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
          Start Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-8">My Orders</h1>

      <div className="space-y-6">
        {orders.map((order) => {
          const statusClass = STATUS_COLORS[order.fulfillmentStatus] || 'bg-gray-100 text-gray-700';
          const canCancel = ['placed', 'confirmed'].includes(order.fulfillmentStatus);

          return (
            <div
              key={order._id}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5"
              id={`order-card-${order._id}`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    Order #{order._id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusClass}`}
                  >
                    {order.fulfillmentStatus.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full uppercase">
                    {order.paymentMethod} • {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 object-contain rounded-xl bg-gray-50 p-1.5 shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.unit} • Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">₹{item.sellingPrice * item.quantity}</p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                <div>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Delivery to:</span>{' '}
                    {order.deliveryAddress?.houseNumber}, {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-lg font-black text-primary-600">₹{order.totalAmount}</p>
                  </div>

                  {order.paymentMethod === 'online' && order.paymentStatus !== 'paid' && order.fulfillmentStatus !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleRetryPayment(order)}
                      disabled={retryingId === order._id}
                      className="text-xs bg-primary-600 hover:bg-primary-700 text-white font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                      title="Pay for this order"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> {retryingId === order._id ? 'Connecting...' : 'Pay Now'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setInvoiceOrder(order)}
                    className="text-xs border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                    title="View Tax Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" /> Invoice
                  </button>

                  {canCancel && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      disabled={cancellingId === order._id}
                      className="text-xs text-red-600 border border-red-200 hover:bg-red-50 font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                      {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
};

export default Orders;

