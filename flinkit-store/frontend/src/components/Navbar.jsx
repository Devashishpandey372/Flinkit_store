import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, MapPin, User, LogOut, ChevronDown, Package, Menu, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isShopkeeper, logout } = useAuth();
  const { cartCount, openDrawer } = useCart();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowUserMenu(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0" id="nav-logo">
            <div className="bg-primary-600 rounded-xl p-1.5">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-black text-gray-900">
              flinkit<span className="text-primary-600">.</span>
            </span>
          </Link>

          {/* Location — hidden on mobile */}
          <button className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors shrink-0" id="nav-location-btn">
            <MapPin className="w-4 h-4 text-primary-600" />
            <span className="font-medium">Delivery in</span>
            <span className="font-bold text-gray-900">10 mins</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl" id="nav-search-form">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search for groceries, snacks...'
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all"
                id="nav-search-input"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="hidden md:flex items-center gap-2 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors"
                  id="nav-user-menu-btn"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50 scale-in" id="nav-user-dropdown">
                    {(isAdmin || isShopkeeper) && (
                      <Link to="/admin/dashboard" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary-700 font-semibold hover:bg-primary-50 transition-colors">
                        <Package className="w-4 h-4" /> {isAdmin ? 'Admin Dashboard' : 'Merchant Dashboard'}
                      </Link>
                    )}
                    <Link to="/profile" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4" /> My Profile
                    </Link>
                    <Link to="/my-orders" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Package className="w-4 h-4" /> My Orders
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      id="nav-logout-btn">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-primary-600 px-3 py-2 transition-colors" id="nav-login-btn">Login</Link>
                <Link to="/signup" className="btn-primary text-sm py-2" id="nav-signup-btn">Sign Up</Link>
              </div>
            )}

            {/* Cart */}
            <button
              type="button"
              onClick={openDrawer}
              className="relative flex items-center justify-center w-10 h-10 hover:bg-gray-50 rounded-xl transition-colors"
              id="nav-cart-btn"
              aria-label="Open Cart"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-gray-50 rounded-xl transition-colors"
              id="nav-mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 slide-in-right" id="nav-mobile-menu">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                {(isAdmin || isShopkeeper) && <Link to="/admin/dashboard" className="block px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>{isAdmin ? 'Admin Dashboard' : 'Merchant Dashboard'}</Link>}
                <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
                <Link to="/my-orders" className="block px-3 py-2 text-sm hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Logout</button>
              </>
            ) : (
              <div className="flex gap-2 px-3 py-2">
                <Link to="/login" className="btn-outline flex-1 text-center text-sm" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link to="/signup" className="btn-primary flex-1 text-center text-sm" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
