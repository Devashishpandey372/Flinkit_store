import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Clock, Package, ArrowRight, Truck, ShieldCheck, ShoppingBag, Copy, Check, FileText } from 'lucide-react';
import { orderService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import InvoiceModal from '../components/InvoiceModal';
import toast from 'react-hot-toast';

const OrderSuccess = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [copied, setCopied] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (!order && id) {
      const fetchOrder = async () => {
        try {
          const res = await orderService.getOrderById(id);
          setOrder(res.data.data.order);
        } catch (err) {
          console.error('Failed to load order:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [id, order]);

  const copyOrderId = () => {
    const orderIdToCopy = order?._id || id;
    if (orderIdToCopy) {
      navigator.clipboard.writeText(orderIdToCopy);
      setCopied(true);
      toast.success('Order ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const orderId = order?._id || id;
  const isOnlinePaid = order?.paymentMethod === 'online' && order?.paymentStatus === 'paid';
  const paymentId = location.state?.paymentId || order?.razorpayPaymentId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xl text-center space-y-6">
        {/* Animated Celebration Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
          </div>
          <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
        </div>

        <div>
          <h1 className="text-3xl font-black text-gray-900">
            {isOnlinePaid ? 'Payment Verified & Order Confirmed!' : 'Order Placed Successfully!'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Thank you for shopping with Flinkit. Your groceries are being packed right now!
          </p>
        </div>

        {/* 10-Minute Delivery Promise Banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs uppercase font-bold tracking-wider text-green-100">Superfast Delivery</p>
              <p className="text-base font-black">Arriving in 10 - 15 minutes</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm">
            <Clock className="w-3.5 h-3.5" /> Express
          </div>
        </div>

        {/* Order Details Card */}
        {order && (
          <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-4 border border-gray-100 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Order Reference</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-gray-800 text-sm">{orderId}</span>
                  <button
                    onClick={copyOrderId}
                    className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                    title="Copy Order ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    order.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                >
                  {order.paymentStatus === 'paid' ? 'Paid ✓' : 'Payment Pending'}
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold uppercase">
                  {order.paymentMethod === 'online' ? 'Online (Razorpay)' : 'Cash on Delivery'}
                </span>
              </div>
            </div>

            {/* Payment ID if available */}
            {paymentId && (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Razorpay Payment ID</span>
                <span className="font-mono font-semibold text-gray-700">{paymentId}</span>
              </div>
            )}

            {/* Delivery Address */}
            {order.deliveryAddress && (
              <div className="text-xs text-gray-600 space-y-0.5">
                <span className="font-semibold text-gray-800 block">Delivery Address:</span>
                <p>
                  {order.deliveryAddress.fullName} • {order.deliveryAddress.phone}
                </p>
                <p>
                  {order.deliveryAddress.houseNumber}, {order.deliveryAddress.street}
                  {order.deliveryAddress.landmark ? `, ${order.deliveryAddress.landmark}` : ''}
                </p>
                <p>
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} — {order.deliveryAddress.pinCode}
                </p>
              </div>
            )}

            {/* Items summary */}
            {order.items && order.items.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Ordered Items ({order.items.length}):</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-600">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-bold text-gray-800">₹{item.sellingPrice * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-base font-black text-gray-900">
              <span>Total Paid</span>
              <span className="text-xl text-primary-600">₹{order.totalAmount}</span>
            </div>
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          Verified Secure Checkout with Razorpay
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {order && (
            <button
              type="button"
              onClick={() => setShowInvoice(true)}
              className="flex-1 py-3.5 px-6 rounded-2xl border border-primary-600 bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              id="view-invoice-btn"
            >
              <FileText className="w-4 h-4 text-primary-600" /> View / Print Tax Invoice
            </button>
          )}
          <Link
            to="/my-orders"
            className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-bold shadow-md"
            id="view-orders-btn"
          >
            <Package className="w-4 h-4" /> View My Orders
          </Link>
          <Link
            to="/products"
            className="flex-1 py-3.5 px-6 rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            id="continue-shopping-btn"
          >
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>
      </div>

      {/* Printable Tax Invoice Modal */}
      {order && (
        <InvoiceModal
          order={order}
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
};

export default OrderSuccess;

