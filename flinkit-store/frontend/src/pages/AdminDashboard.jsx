import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New product form state
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    category: '',
    unit: '1 kg',
    originalPrice: '',
    sellingPrice: '',
    stock: 50,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    description: '',
    isFeatured: false,
  });

  const fetchData = async () => {
    try {
      const [metricsRes, ordersRes, productsRes, catsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/orders?limit=20'),
        api.get('/admin/products?limit=50'),
        api.get('/admin/categories'),
      ]);

      setMetrics(metricsRes.data.data);
      setOrders(ordersRes.data.data.orders || []);
      setProducts(productsRes.data.data.products || []);
      setCategories(catsRes.data.data.categories || []);
      if (!newProd.category && catsRes.data.data.categories?.length > 0) {
        setNewProd((p) => ({ ...p, category: catsRes.data.data.categories[0]._id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateOrderStatus = async (orderId, fulfillmentStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { fulfillmentStatus });
      toast.success('Order status updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/products', {
        ...newProd,
        originalPrice: Number(newProd.originalPrice),
        sellingPrice: Number(newProd.sellingPrice),
        stock: Number(newProd.stock),
      });
      toast.success('Product created successfully');
      setShowProductModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deactivated');
      fetchData();
    } catch (err) {
      toast.error('Failed to deactivate product');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Control Center</h1>
          <p className="text-sm text-gray-500">Live operational metrics, order status & inventory control</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'overview' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'orders' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'products' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700'
            }`}
          >
            Products ({products.length})
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-primary-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-black text-gray-900">₹{metrics?.totalRevenue || 0}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Package className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Orders</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{metrics?.totalOrders || 0}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-purple-600 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Customers</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{metrics?.totalCustomers || 0}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Low Stock</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{metrics?.lowStockProducts || 0}</p>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
            <div className="divide-y divide-gray-100">
              {(metrics?.recentOrders || []).map((order) => (
                <div key={order._id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-gray-800">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400">
                      {order.user?.name} • ₹{order.totalAmount}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                    {order.fulfillmentStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Manage Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-xs">{ord._id.slice(-8).toUpperCase()}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-800">{ord.user?.name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{ord.deliveryAddress?.city}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">₹{ord.totalAmount}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold uppercase">{ord.paymentMethod}</span> (
                      <span className="text-xs text-gray-500">{ord.paymentStatus}</span>)
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full capitalize">
                        {ord.fulfillmentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={ord.fulfillmentStatus}
                        onChange={(e) => handleUpdateOrderStatus(ord._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white font-medium"
                      >
                        <option value="placed">Placed</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Inventory Management</h2>
            <button
              onClick={() => setShowProductModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          {/* Add Product Modal */}
          {showProductModal && (
            <form onSubmit={handleCreateProduct} className="p-4 bg-primary-50/50 border border-primary-200 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-gray-900">Create New Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Product Name"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="input-field py-2 text-sm"
                />
                <select
                  value={newProd.category}
                  onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                  className="input-field py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Unit (e.g. 1 kg, 500 ml)"
                  required
                  value={newProd.unit}
                  onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                  className="input-field py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Original Price"
                  required
                  value={newProd.originalPrice}
                  onChange={(e) => setNewProd({ ...newProd, originalPrice: e.target.value })}
                  className="input-field py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Selling Price"
                  required
                  value={newProd.sellingPrice}
                  onChange={(e) => setNewProd({ ...newProd, sellingPrice: e.target.value })}
                  className="input-field py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Initial Stock"
                  required
                  value={newProd.stock}
                  onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                  className="input-field py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-1.5 border rounded-xl text-xs text-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 px-5 text-xs">
                  Save Product
                </button>
              </div>
            </form>
          )}

          {/* Product List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 object-contain rounded-lg bg-gray-50" />
                      <div>
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.unit}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-gray-600">{p.category?.name || 'General'}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900">₹{p.sellingPrice}</span>{' '}
                      <span className="text-xs text-gray-400 line-through">₹{p.originalPrice}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold text-xs ${p.stock <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteProduct(p._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

