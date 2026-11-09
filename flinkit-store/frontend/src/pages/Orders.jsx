import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle2, XCircle, ArrowRight, Truck, FileText } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import InvoiceModal from '../components/InvoiceModal';

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

