import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  FolderTree,
  ShoppingBag,
  Boxes,
  Store,
  LogOut,
  Search,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Copy,
  Clock,
  Ban,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const COMMON_UNITS = [
  '1 kg',
  '500 g',
  '250 g',
  '100 g',
  '2 kg',
  '5 kg',
  '1 L',
  '500 ml',
  '200 ml',
  '1 piece',
  '6 pcs',
  '1 packet',
  '1 box',
  '1 dozen',
];

const AdminDashboard = () => {
  const { user, logout, isAdmin, isShopkeeper } = useAuth();
  const navigate = useNavigate();

  // Navigation
  const [activeTab, setActiveTab] = useState('overview'); // overview, products, add-product, inventory, categories, orders, shopkeepers, users, profile
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Product Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [selectedShopkeeperFilter, setSelectedShopkeeperFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Shopkeeper Filter (Master Admin)
  const [shopkeeperStatusFilter, setShopkeeperStatusFilter] = useState('all');

  // New Product Form State
  const initialProductForm = {
    name: '',
    shortDescription: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    unit: '1 kg',
    originalPrice: '',
    sellingPrice: '',
    stock: 50,
    sku: '',
    image: '',
    images: [],
    availabilityStatus: 'available',
    isFeatured: false,
  };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // Editing Product Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editImageUploading, setEditImageUploading] = useState(false);

  // Viewing Product Modal
  const [viewingProduct, setViewingProduct] = useState(null);

  // Delete Confirmation Modal
  const [productToDelete, setProductToDelete] = useState(null);
  const [shopkeeperToDelete, setShopkeeperToDelete] = useState(null);

  // Invite Shopkeeper Modal State (Master Admin)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', shopName: '', name: '' });
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Add Category Modal State (Master Admin)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', image: '', description: '' });
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Shop Profile State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    shopName: user?.shopName || '',
    shopAddress: user?.shopAddress || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Fetch Dashboard Statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminService.getDashboard();
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard metrics');
    }
  }, []);

  // Fetch Products with filters
  const fetchProducts = useCallback(async (page = 1) => {
    try {
      const params = {
        page,
        limit: 15,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStockStatus) params.stockStatus = selectedStockStatus;
      if (selectedShopkeeperFilter) params.shopkeeper = selectedShopkeeperFilter;

      const res = await adminService.getProducts(params);
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load products');
    }
  }, [searchQuery, selectedCategory, selectedStockStatus, selectedShopkeeperFilter]);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await adminService.getCategories();
      setCategories(res.data.data.categories || []);
      if (!productForm.category && res.data.data.categories?.length > 0) {
        setProductForm((prev) => ({ ...prev, category: res.data.data.categories[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  }, [productForm.category]);

  // Fetch Orders
  const fetchOrders = useCallback(async (page = 1) => {
    try {
      const res = await adminService.getOrders({ page, limit: 15 });
      setOrders(res.data.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch Shopkeepers (Master Admin only)
  const fetchShopkeepers = useCallback(async (status = 'all') => {
    if (!isAdmin) return;
    try {
      const params = status !== 'all' ? { status } : {};
      const res = await adminService.getShopkeepers(params);
      setShopkeepers(res.data.data.shopkeepers || []);
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  // Fetch Customers (Master Admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await adminService.getUsers({ limit: 50 });
      setUsersList(res.data.data.users || []);
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchCategories(),
        fetchProducts(1),
        fetchOrders(1),
        fetchShopkeepers('all'),
        fetchUsers(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchCategories, fetchProducts, fetchOrders, fetchShopkeepers, fetchUsers]);

  // Calculate discount percentage helper
  const calcDiscount = (orig, sell) => {
    const o = Number(orig);
    const s = Number(sell);
    if (!o || !s || s >= o) return 0;
    return Math.round(((o - s) / o) * 100);
  };

  // Image Upload handler
  const handleFileUpload = async (file, isEdit = false) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    if (isEdit) setEditImageUploading(true);
    else setImageUploading(true);

    try {
      const res = await adminService.uploadImage(formData);
      const uploadedUrl = res.data.data.url;

      if (isEdit) {
        setEditingProduct((prev) => ({
          ...prev,
          image: uploadedUrl,
          images: [uploadedUrl, ...(prev.images || []).filter((img) => img !== uploadedUrl)],
        }));
      } else {
        setImagePreview(uploadedUrl);
        setProductForm((prev) => ({
          ...prev,
          image: uploadedUrl,
          images: [uploadedUrl, ...(prev.images || []).filter((img) => img !== uploadedUrl)],
        }));
      }
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      if (isEdit) setEditImageUploading(false);
      else setImageUploading(false);
    }
  };

  // Create Product Submit
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const orig = Number(productForm.originalPrice);
    const sell = Number(productForm.sellingPrice);
    const stk = Number(productForm.stock);

    if (sell > orig) {
      toast.error('Selling price cannot exceed the original MRP');
      return;
    }
    if (stk < 0) {
      toast.error('Stock quantity cannot be negative');
      return;
    }

    setFormSubmitting(true);
    try {
      await adminService.createProduct({
        ...productForm,
        originalPrice: orig,
        sellingPrice: sell,
        stock: stk,
        image: productForm.image || 'https://via.placeholder.com/400x400?text=Product',
      });

      toast.success('Product created and published to storefront!');
      setProductForm({
        ...initialProductForm,
        category: categories[0]?._id || '',
      });
      setImagePreview('');
      setActiveTab('products');
      fetchProducts(1);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (prod) => {
    setEditingProduct({
      ...prod,
      category: prod.category?._id || prod.category,
    });
    setShowEditModal(true);
  };

  // Update Product Submit
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const orig = Number(editingProduct.originalPrice);
    const sell = Number(editingProduct.sellingPrice);
    const stk = Number(editingProduct.stock);

    if (sell > orig) {
      toast.error('Selling price cannot exceed original MRP');
      return;
    }

    try {
      await adminService.updateProduct(editingProduct._id, {
        name: editingProduct.name,
        shortDescription: editingProduct.shortDescription,
        description: editingProduct.description,
        category: editingProduct.category,
        subcategory: editingProduct.subcategory,
        brand: editingProduct.brand,
        unit: editingProduct.unit,
        originalPrice: orig,
        sellingPrice: sell,
        stock: stk,
        sku: editingProduct.sku,
        image: editingProduct.image,
        images: editingProduct.images,
        availabilityStatus: editingProduct.availabilityStatus,
        isFeatured: editingProduct.isFeatured,
      });

      toast.success('Product updated successfully');
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts(currentPage);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update product');
    }
  };

  // Delete Product Action
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await adminService.deleteProduct(productToDelete._id);
      toast.success(`"${productToDelete.name}" deactivated`);
      setProductToDelete(null);
      fetchProducts(currentPage);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate product');
    }
  };

  // Quick Stock Update
  const handleQuickStockUpdate = async (productId, currentStock, delta) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await adminService.updateStock(productId, { stock: newStock });
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, stock: newStock } : p))
      );
      toast.success(`Stock updated to ${newStock}`);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  // Quick Availability Toggle
  const handleToggleAvailability = async (product) => {
    const nextStatus = product.availabilityStatus === 'available' ? 'out_of_stock' : 'available';
    try {
      await adminService.updateAvailability(product._id, { availabilityStatus: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, availabilityStatus: nextStatus } : p))
      );
      toast.success(`Product marked as ${nextStatus === 'available' ? 'Available' : 'Out of Stock'}`);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, fulfillmentStatus) => {
    try {
      await adminService.updateOrderStatus(orderId, { fulfillmentStatus });
      toast.success(`Order transitioned to "${fulfillmentStatus}"`);
      fetchOrders(1);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  // Master Admin: Update Shopkeeper Status (Approve / Reject / Suspend / Reactivate)
  const handleShopkeeperStatusAction = async (shopkeeperId, action, reason = '') => {
    try {
      await adminService.updateShopkeeperStatus(shopkeeperId, { action, reason });
      toast.success(`Shopkeeper account ${action}d successfully`);
      fetchShopkeepers(shopkeeperStatusFilter);
      fetchStats();
      fetchProducts(1);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} shopkeeper`);
    }
  };

  // Master Admin: Delete Shopkeeper
  const confirmDeleteShopkeeper = async () => {
    if (!shopkeeperToDelete) return;
    try {
      await adminService.deleteShopkeeper(shopkeeperToDelete._id);
      toast.success(`Shopkeeper "${shopkeeperToDelete.shopName || shopkeeperToDelete.name}" deleted`);
      setShopkeeperToDelete(null);
      fetchShopkeepers(shopkeeperStatusFilter);
      fetchStats();
      fetchProducts(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete shopkeeper');
    }
  };

  // Master Admin: Generate Shopkeeper Invitation
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setInviteSubmitting(true);
    try {
      const res = await adminService.inviteShopkeeper(inviteForm);
      setGeneratedInvite(res.data.data);
      toast.success('Invitation link generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Master Admin: Create New Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setCategorySubmitting(true);
    try {
      await adminService.createCategory(categoryForm);
      toast.success('Category created successfully');
      setShowCategoryModal(false);
      setCategoryForm({ name: '', image: '', description: '' });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCategorySubmitting(false);
    }
  };

  // Master Admin: Toggle Customer Active
  const handleToggleCustomerActive = async (userId) => {
    try {
      await adminService.toggleUserActive(userId);
      toast.success('Customer status updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update customer status');
    }
  };

  // Save Shop Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await adminService.updateProfile(profileForm);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Define sidebar navigation strictly based on role
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'products',
      label: isAdmin ? 'All Products' : 'My Products',
      icon: Package,
      badge: stats?.totalProducts,
    },
    { id: 'add-product', label: 'Add New Product', icon: PlusCircle },
    { id: 'inventory', label: 'Inventory / Stock', icon: Boxes },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: stats?.pendingOrders || stats?.totalOrders },
    ...(isAdmin
      ? [
          {
            id: 'shopkeepers',
            label: 'Shopkeepers',
            icon: Store,
            badge: stats?.pendingShopkeepers,
          },
          { id: 'users', label: 'Customers', icon: Users, badge: stats?.totalCustomers },
        ]
      : []),
    { id: 'profile', label: isAdmin ? 'Master Profile' : 'Shop Profile', icon: Store },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9f7] flex flex-col md:flex-row">
      {/* ─── MOBILE NAVBAR ─── */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-black text-gray-900 text-lg">
            flinkit<span className="text-primary-600">.</span> {isAdmin ? 'Master Admin' : 'Merchant'}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
            isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {isAdmin ? 'Master Admin' : 'Shopkeeper'}
        </span>
      </div>

      {/* ─── DESKTOP & MOBILE SIDEBAR ─── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & Portal Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary-600 rounded-xl p-1.5 shadow-sm">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-black text-gray-900 block leading-tight">
                  flinkit<span className="text-primary-600">.</span>
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  {isAdmin ? 'Master Admin Control' : 'Merchant Center'}
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Role Badge */}
          <div className="mx-4 my-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl font-black flex items-center justify-center shrink-0 text-sm ${
                isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'
              }`}
            >
              {isAdmin ? 'M' : user?.shopName?.[0] || 'S'}
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-bold text-gray-900 truncate">
                {isAdmin ? 'Master Administrator' : user?.shopName || user?.name}
              </span>
              <span
                className={`block text-[10px] font-medium capitalize ${
                  isAdmin ? 'text-purple-600' : 'text-emerald-600'
                }`}
              >
                ● {isAdmin ? 'Full Store Authority' : 'Verified Shopkeeper'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 space-y-1">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Customer Storefront</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  {isAdmin ? 'Master Admin Store Overview' : `${user?.shopName || 'Shop'} Overview`}
                </h1>
                <p className="text-sm text-gray-500">
                  {isAdmin
                    ? 'Global store operational metrics, merchant approvals, and sales performance'
                    : 'Real-time inventory levels, customer orders, and shop revenue'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    fetchStats();
                    fetchProducts(1);
                    fetchOrders(1);
                    if (isAdmin) fetchShopkeepers(shopkeeperStatusFilter);
                    toast.success('Refreshed');
                  }}
                  className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
                <button
                  onClick={() => setActiveTab('add-product')}
                  className="btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> Add Product
                </button>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-primary-600 mb-2">
                  <Package className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Products</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.totalProducts || 0}</p>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {stats?.activeProducts || 0} active in catalog
                </span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Low Stock</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.lowStockProducts || 0}</p>
                <span className="text-[11px] text-amber-600 font-medium">Under 10 units</span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Out of Stock</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.outOfStockProducts || 0}</p>
                <span className="text-[11px] text-red-600 font-medium">Unavailable to order</span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Orders</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.totalOrders || 0}</p>
                <span className="text-[11px] text-blue-600 font-medium">₹{stats?.totalRevenue || 0} total settled</span>
              </div>
            </div>

            {/* MASTER ADMIN EXTRA CARDS: SHOPKEEPERS & CUSTOMERS */}
            {isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl p-6 border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-purple-700 block mb-1">
                      Shopkeeper Partners
                    </span>
                    <span className="text-3xl font-black text-gray-900">{stats?.totalShopkeepers || 0}</span>
                    <span className="text-xs text-purple-600 block mt-1 font-bold">
                      {stats?.pendingShopkeepers || 0} pending review
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('shopkeepers')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 shadow-sm"
                  >
                    Manage Shopkeepers
                  </button>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block mb-1">
                      Customer Base
                    </span>
                    <span className="text-3xl font-black text-gray-900">{stats?.totalCustomers || 0}</span>
                    <span className="text-xs text-emerald-600 block mt-1 font-bold">Active shoppers</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                  >
                    View Customers
                  </button>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">Recent Orders</h2>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  View All Orders
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Fulfillment</th>
                      <th className="pb-3 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(stats?.recentOrders || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                          No recent orders recorded yet.
                        </td>
                      </tr>
                    ) : (
                      (stats?.recentOrders || []).map((ord) => (
                        <tr key={ord._id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-mono text-xs font-bold text-gray-800">
                            #{ord._id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-3 text-xs text-gray-600">
                            {ord.user?.name || ord.deliveryAddress?.fullName || 'Customer'}
                          </td>
                          <td className="py-3 text-xs font-black text-gray-900">
                            ₹{ord.totalAmount}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                ord.fulfillmentStatus === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : ord.fulfillmentStatus === 'cancelled'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {ord.fulfillmentStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                ord.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-gray-400'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS (ALL PRODUCTS FOR MASTER ADMIN / MY PRODUCTS FOR SHOPKEEPER) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  {isAdmin ? 'All Store Products' : 'My Grocery Products'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isAdmin
                    ? 'Master oversight of all products across all seller partners'
                    : 'Manage your shop inventory, selling prices, and availability'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('add-product')}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Add New Product
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products by name, brand, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProducts(1)}
                  className="w-full pl-10 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Master Admin: Shopkeeper Filter */}
                {isAdmin && (
                  <select
                    value={selectedShopkeeperFilter}
                    onChange={(e) => {
                      setSelectedShopkeeperFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    <option value="">All Shops / Sellers</option>
                    {shopkeepers.map((sk) => (
                      <option key={sk._id} value={sk._id}>
                        {sk.shopName || sk.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Stock Status Filter */}
                <select
                  value={selectedStockStatus}
                  onChange={(e) => {
                    setSelectedStockStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400 cursor-pointer"
                >
                  <option value="">All Stock Statuses</option>
                  <option value="in_stock">In Stock (&gt;0)</option>
                  <option value="low_stock">Low Stock (1-10)</option>
                  <option value="out_of_stock">Out of Stock (0)</option>
                </select>

                <button
                  onClick={() => fetchProducts(1)}
                  className="px-3 py-2 bg-primary-50 text-primary-700 font-bold text-xs rounded-xl hover:bg-primary-100"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Product</th>
                      {isAdmin && <th className="py-3.5 px-4">Sold By / Shop</th>}
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Price / MRP</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-400 text-xs">
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => {
                        const discount = calcDiscount(prod.originalPrice, prod.sellingPrice);
                        const isOos = prod.stock === 0 || prod.availabilityStatus === 'out_of_stock';
                        return (
                          <tr key={prod._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-12 h-12 object-cover rounded-xl bg-gray-100 border border-gray-100 shrink-0"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/100?text=Grocery';
                                  }}
                                />
                                <div>
                                  <span className="font-bold text-gray-900 block text-xs line-clamp-1">
                                    {prod.name}
                                  </span>
                                  <span className="text-[11px] text-gray-400">
                                    {prod.unit} {prod.brand ? `• ${prod.brand}` : ''}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {isAdmin && (
                              <td className="py-3 px-4 text-xs font-semibold text-purple-700">
                                {prod.shopkeeper?.shopName || prod.shopName || 'Central Store'}
                              </td>
                            )}

                            <td className="py-3 px-4 text-xs text-gray-600">
                              {prod.category?.name || 'General'}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-black text-gray-900 text-xs">
                                  ₹{prod.sellingPrice}
                                </span>
                                {prod.originalPrice > prod.sellingPrice && (
                                  <span className="text-[10px] text-gray-400 line-through">
                                    ₹{prod.originalPrice}
                                  </span>
                                )}
                              </div>
                              {discount > 0 && (
                                <span className="text-[9px] font-bold text-emerald-600">
                                  {discount}% OFF
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-bold ${
                                  prod.stock === 0
                                    ? 'text-red-600'
                                    : prod.stock <= 10
                                    ? 'text-amber-600'
                                    : 'text-gray-900'
                                }`}
                              >
                                {prod.stock} units
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleAvailability(prod)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                  !isOos
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                                title="Click to toggle availability"
                              >
                                {!isOos ? '● Available' : '○ Out of Stock'}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setViewingProduct(prod)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(prod)}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setProductToDelete(prod)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Showing {products.length} of {pagination.total} products
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => {
                        const p = pagination.page - 1;
                        setCurrentPage(p);
                        fetchProducts(p);
                      }}
                      className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-bold text-gray-800">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => {
                        const p = pagination.page + 1;
                        setCurrentPage(p);
                        fetchProducts(p);
                      }}
                      className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADD NEW PRODUCT */}
        {activeTab === 'add-product' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Add New Grocery Product</h1>
              <p className="text-sm text-gray-500">
                {isAdmin
                  ? 'Publish product as Central Store or under authorized shopkeeper'
                  : `Publish new product under ${user?.shopName || 'your shop'}`}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm">
              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
                    1. Basic Product Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="e.g. Fortune Sunlite Sunflower Oil"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        value={productForm.subcategory}
                        onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                        placeholder="e.g. Edible Oils & Ghee"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        value={productForm.brand}
                        onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                        placeholder="e.g. Fortune"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        placeholder="e.g. OIL-FOR-1L"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Unit / Pack Size <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        list="unit-datalist"
                        value={productForm.unit}
                        onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                        placeholder="e.g. 1 L, 500 g"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                      <datalist id="unit-datalist">
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Stock Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                        placeholder="e.g. 50"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* 2. Pricing & Automatic Discount */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
                    2. Pricing & Real-Time Discount
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Regular Price (MRP in ₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={productForm.originalPrice}
                        onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                        placeholder="e.g. 195"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Selling Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={productForm.sellingPrice}
                        onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                        placeholder="e.g. 165"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Calculated Discount
                      </label>
                      <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-800 flex items-center justify-between">
                        <span>{calcDiscount(productForm.originalPrice, productForm.sellingPrice)}% OFF</span>
                        <span className="text-[10px] text-emerald-600">
                          Save ₹{Math.max(0, Number(productForm.originalPrice) - Number(productForm.sellingPrice))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* 3. Image Upload */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
                    3. Product Image
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Upload Image File
                      </label>
                      <div className="border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files?.[0])}
                          className="hidden"
                          id="new-product-file"
                        />
                        <label htmlFor="new-product-file" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                          <span className="text-xs font-bold text-gray-700 block">
                            {imageUploading ? 'Uploading file...' : 'Click to select photo from computer'}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-1">PNG, JPG, WEBP up to 5MB</span>
                        </label>
                      </div>

                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Or Direct Image URL
                        </label>
                        <input
                          type="url"
                          value={productForm.image}
                          onChange={(e) => {
                            setProductForm({ ...productForm, image: e.target.value });
                            setImagePreview(e.target.value);
                          }}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col items-center justify-center min-h-[180px]">
                      {imagePreview || productForm.image ? (
                        <div className="text-center">
                          <img
                            src={imagePreview || productForm.image}
                            alt="Preview"
                            className="w-32 h-32 object-contain rounded-xl mx-auto mb-2 border border-gray-200 bg-white"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/200?text=Invalid+Image';
                            }}
                          />
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Image Ready
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 text-center">Image preview will appear here</span>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* 4. Description */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
                    4. Descriptions & Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Short Summary (Catalog Badge)
                      </label>
                      <input
                        type="text"
                        value={productForm.shortDescription}
                        onChange={(e) => setProductForm({ ...productForm, shortDescription: e.target.value })}
                        placeholder="e.g. 100% refined cooking oil rich in vitamin A & D"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Detailed Description
                      </label>
                      <textarea
                        rows={3}
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Nutritional facts, packaging details, and usage recommendations..."
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 focus:bg-white resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                        <input
                          type="checkbox"
                          checked={productForm.isFeatured}
                          onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-400"
                        />
                        <span>Featured on Homepage</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">Availability:</span>
                        <select
                          value={productForm.availabilityStatus}
                          onChange={(e) => setProductForm({ ...productForm, availabilityStatus: e.target.value })}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                        >
                          <option value="available">Available</option>
                          <option value="out_of_stock">Out of Stock</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn-primary px-8 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    {formSubmitting ? 'Publishing...' : 'Save & Publish Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: INVENTORY / STOCK */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Inventory & Stock Levels</h1>
                <p className="text-sm text-gray-500">
                  {isAdmin
                    ? 'Global inventory monitoring and instant unit adjustments across all stores'
                    : 'Manage physical shelf stock for your shop'}
                </p>
              </div>
              <button
                onClick={() => fetchProducts(1)}
                className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync Stock
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      {isAdmin && <th className="py-3 px-4">Seller</th>}
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Current Units</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Quick Stock Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map((p) => {
                      const isLow = p.stock > 0 && p.stock <= 10;
                      const isOut = p.stock === 0 || p.availabilityStatus === 'out_of_stock';
                      return (
                        <tr key={p._id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-9 h-9 rounded-lg object-cover bg-gray-50 shrink-0 border border-gray-100"
                              />
                              <div>
                                <strong className="text-xs text-gray-900 block line-clamp-1">{p.name}</strong>
                                <span className="text-[10px] text-gray-400">{p.unit}</span>
                              </div>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-xs text-purple-700 font-semibold">
                              {p.shopkeeper?.shopName || p.shopName || 'Central'}
                            </td>
                          )}
                          <td className="py-3 px-4 text-xs font-mono text-gray-500">{p.sku || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-sm font-black ${
                                isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                              }`}
                            >
                              {p.stock} units
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isOut
                                  ? 'bg-red-50 text-red-700'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleQuickStockUpdate(p._id, p.stock, -10)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                              >
                                -10
                              </button>
                              <button
                                onClick={() => handleQuickStockUpdate(p._id, p.stock, -1)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => handleQuickStockUpdate(p._id, p.stock, 1)}
                                className="px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-800 rounded-lg text-xs font-bold"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => handleQuickStockUpdate(p._id, p.stock, 10)}
                                className="px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-800 rounded-lg text-xs font-bold"
                              >
                                +10
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CATEGORIES (CRUD FOR MASTER ADMIN, READ-ONLY FOR SHOPKEEPER) */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Grocery Departments</h1>
                <p className="text-sm text-gray-500">
                  {isAdmin
                    ? 'Manage department taxonomy and storefront navigation categories'
                    : 'Standard categories available for product categorization'}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> Add Category
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((c) => (
                <div
                  key={c._id}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4"
                >
                  <img
                    src={c.image || 'https://via.placeholder.com/100?text=Category'}
                    alt={c.name}
                    className="w-14 h-14 rounded-2xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{c.name}</h3>
                    <span className="text-[11px] text-gray-400 block font-mono">/{c.slug}</span>
                    <Link
                      to={`/products?category=${c.slug}`}
                      className="text-[11px] font-bold text-primary-600 hover:underline mt-1 inline-block"
                    >
                      Browse Storefront
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Customer Orders</h1>
                <p className="text-sm text-gray-500">
                  {isAdmin
                    ? 'Storewide customer order fulfillments and payment statuses'
                    : 'Customer orders containing items from your grocery store'}
                </p>
              </div>
              <button
                onClick={() => fetchOrders(1)}
                className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                          No orders registered yet.
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord._id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-gray-900 block">
                              #{ord._id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <strong className="text-xs text-gray-800 block">
                              {ord.user?.name || ord.deliveryAddress?.fullName || 'Customer'}
                            </strong>
                            <span className="text-[10px] text-gray-400 block">
                              {ord.deliveryAddress?.phone || ord.user?.phone || 'N/A'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs text-gray-600">{ord.items?.length || 0} item(s)</td>

                          <td className="py-3 px-4 font-black text-gray-900 text-xs">₹{ord.totalAmount}</td>

                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {ord.paymentStatus} ({ord.paymentMethod})
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={ord.fulfillmentStatus}
                              onChange={(e) => handleUpdateOrderStatus(ord._id, e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none capitalize cursor-pointer"
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: MASTER ADMIN - SHOPKEEPER PARTNERS MANAGEMENT */}
        {isAdmin && activeTab === 'shopkeepers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Shopkeeper Partner Management</h1>
                <p className="text-sm text-gray-500">
                  Review registrations, approve merchant privileges, issue invitations, or suspend accounts
                </p>
              </div>
              <button
                onClick={() => {
                  setGeneratedInvite(null);
                  setShowInviteModal(true);
                }}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Invite Shopkeeper
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All Partners'],
                ['pending', 'Pending Approval'],
                ['approved', 'Active & Approved'],
                ['suspended', 'Suspended'],
                ['rejected', 'Rejected'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setShopkeeperStatusFilter(key);
                    fetchShopkeepers(key);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    shopkeeperStatusFilter === key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Shopkeepers Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Shop / Store Name</th>
                      <th className="py-3.5 px-4">Merchant Name</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Live Products</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Master Admin Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {shopkeepers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                          No shopkeepers found in this category.
                        </td>
                      </tr>
                    ) : (
                      shopkeepers.map((sk) => {
                        const status = sk.approvalStatus || (sk.isApproved ? 'approved' : 'pending');
                        return (
                          <tr key={sk._id} className="hover:bg-gray-50/50">
                            <td className="py-3.5 px-4">
                              <strong className="text-xs font-bold text-gray-900 block">
                                {sk.shopName || 'Storefront Partner'}
                              </strong>
                              <span className="text-[11px] text-gray-400 max-w-xs block truncate">
                                {sk.shopAddress || 'No address specified'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-xs font-medium text-gray-800">
                              {sk.name}
                            </td>

                            <td className="py-3.5 px-4 text-xs text-gray-600">
                              <div>{sk.email}</div>
                              <div className="text-gray-400 text-[11px]">{sk.phone}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-black text-gray-900 text-xs">
                                {sk.productCount || 0} items
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : status === 'suspended'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Approve action if pending or suspended */}
                                {status !== 'approved' && (
                                  <button
                                    onClick={() => handleShopkeeperStatusAction(sk._id, 'approve')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                                    title="Approve Partner"
                                  >
                                    Approve
                                  </button>
                                )}

                                {/* Suspend action if approved */}
                                {status === 'approved' && (
                                  <button
                                    onClick={() => handleShopkeeperStatusAction(sk._id, 'suspend')}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                                    title="Suspend Store"
                                  >
                                    Suspend
                                  </button>
                                )}

                                {/* Reject action if pending */}
                                {status === 'pending' && (
                                  <button
                                    onClick={() => handleShopkeeperStatusAction(sk._id, 'reject')}
                                    className="px-2.5 py-1 bg-gray-200 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors"
                                    title="Reject Application"
                                  >
                                    Reject
                                  </button>
                                )}

                                {/* Delete Shopkeeper */}
                                <button
                                  onClick={() => setShopkeeperToDelete(sk)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: MASTER ADMIN - CUSTOMER ACCOUNTS */}
        {isAdmin && activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Registered Customers</h1>
              <p className="text-sm text-gray-500">
                Customer account registry and status management
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                          No customer accounts found.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u._id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900 text-xs">{u.name}</td>
                          <td className="py-3 px-4 text-xs text-gray-600">{u.email}</td>
                          <td className="py-3 px-4 text-xs text-gray-500">{u.phone}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                u.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleCustomerActive(u._id)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                                u.isActive
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                {isAdmin ? 'Master Administrator Profile' : 'Shopkeeper Profile'}
              </h1>
              <p className="text-sm text-gray-500">
                {isAdmin
                  ? 'Master platform administrative details and operations contact'
                  : 'Your shop information, delivery dispatch address, and registered contact'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div
                className={`p-4 rounded-2xl flex items-center justify-between border ${
                  isAdmin
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    className={`w-6 h-6 ${isAdmin ? 'text-purple-600' : 'text-emerald-600'}`}
                  />
                  <div>
                    <strong className="block text-xs font-bold text-gray-900">
                      Role Authority: {isAdmin ? 'MASTER ADMINISTRATOR' : 'VERIFIED SHOPKEEPER'}
                    </strong>
                    <span className="text-[11px] text-gray-500">
                      {isAdmin
                        ? 'Full store privileges: Shopkeeper approvals, product catalog, customer management'
                        : 'Permitted: Product additions, shelf inventory, and order fulfillment'}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Shop / Operating Entity
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.shopName}
                      onChange={(e) => setProfileForm({ ...profileForm, shopName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={profileForm.shopAddress}
                    onChange={(e) => setProfileForm({ ...profileForm, shopAddress: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL: INVITE SHOPKEEPER (MASTER ADMIN) ─── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => {
                setShowInviteModal(false);
                setGeneratedInvite(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Invite New Shopkeeper</h3>
                <span className="text-xs text-gray-400">Generate partner onboarding token</span>
              </div>
            </div>

            {!generatedInvite ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Shopkeeper Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="partner@grocery.com"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Shop / Supermarket Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteForm.shopName}
                    onChange={(e) => setInviteForm({ ...inviteForm, shopName: e.target.value })}
                    placeholder="e.g. Modern Grocers"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-purple-600/20"
                >
                  {inviteSubmitting ? 'Generating...' : 'Generate Invitation Token'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900">
                  <strong className="block font-bold mb-1">Invitation Token Generated:</strong>
                  <div className="font-mono bg-white p-2.5 rounded-xl border border-purple-200 text-xs text-purple-800 break-all select-all flex items-center justify-between">
                    <span>{generatedInvite.inviteToken}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInvite.inviteToken);
                        toast.success('Token copied!');
                      }}
                      className="p-1 hover:bg-purple-100 rounded"
                      title="Copy Token"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-purple-700 mt-2">
                    Share this code with the partner. Entering this code on registration grants automatic verification.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setGeneratedInvite(null);
                  }}
                  className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD CATEGORY (MASTER ADMIN) ─── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-gray-900 mb-1">Create Grocery Category</h3>
            <p className="text-xs text-gray-500 mb-4">Add a new department category for the storefront</p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Organic & Gourmet"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={categoryForm.image}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description of products in this category..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-bold"
                >
                  {categorySubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT PRODUCT ─── */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Edit Product Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Unit / Size
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Stock Units
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Regular MRP (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editingProduct.originalPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Replace Product Image
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={editingProduct.image}
                    alt="Current"
                    className="w-16 h-16 rounded-xl object-contain border bg-gray-50 shrink-0"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0], true)}
                      className="text-xs"
                    />
                    {editImageUploading && (
                      <span className="text-[10px] text-primary-600 block mt-1">Uploading...</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Availability Status
                </label>
                <select
                  value={editingProduct.availabilityStatus}
                  onChange={(e) => setEditingProduct({ ...editingProduct, availabilityStatus: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="available">Available</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-6 py-2 rounded-xl text-xs font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW PRODUCT DETAILS ─── */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setViewingProduct(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <img
                src={viewingProduct.image}
                alt={viewingProduct.name}
                className="w-20 h-20 rounded-2xl object-contain border bg-gray-50 shrink-0"
              />
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {viewingProduct.name}
                </h3>
                <span className="text-xs text-gray-400 block mt-0.5">
                  {viewingProduct.unit} • {viewingProduct.brand || 'Unbranded'}
                </span>
                <span className="text-xs font-bold text-emerald-600 block mt-1">
                  ₹{viewingProduct.sellingPrice} (MRP: ₹{viewingProduct.originalPrice})
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs text-gray-600 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Sold By:</span>
                <span className="font-bold text-purple-700">
                  {viewingProduct.shopkeeper?.shopName || viewingProduct.shopName || 'Central Store'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="font-bold text-gray-800">{viewingProduct.category?.name || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stock Available:</span>
                <span className="font-bold text-gray-800">{viewingProduct.stock} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SKU:</span>
                <span className="font-mono text-gray-800">{viewingProduct.sku || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link
                to={`/products/${viewingProduct._id}`}
                target="_blank"
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                View on Storefront <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE PRODUCT CONFIRMATION ─── */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">Deactivate Product?</h3>
            <p className="text-xs text-gray-500 mb-6">
              &quot;{productToDelete.name}&quot; will be removed from the customer catalog.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE SHOPKEEPER CONFIRMATION (MASTER ADMIN) ─── */}
      {shopkeeperToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">Delete Shopkeeper?</h3>
            <p className="text-xs text-gray-500 mb-6">
              This will permanently delete &quot;{shopkeeperToDelete.shopName || shopkeeperToDelete.name}&quot; and remove all their products from the store.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShopkeeperToDelete(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteShopkeeper}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Yes, Delete Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
