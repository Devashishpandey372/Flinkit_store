import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const CartDrawer = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const { cart, cartSubtotal, updateCartItem, removeCartItem, isDrawerOpen, closeDrawer } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isDrawerOpen;
  const onClose = propOnClose || closeDrawer;

  const items = cart?.items || [];
  const deliveryFee = cartSubtotal >= 499 ? 0 : 40;
  const total = cartSubtotal + deliveryFee;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={onClose}
          id="cart-drawer-backdrop"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        id="cart-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-gray-900">My Cart</h2>
            {items.length > 0 && (
              <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors" id="cart-drawer-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
              <ShoppingBag className="w-16 h-16 text-gray-200" />
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <button onClick={onClose} className="btn-primary text-sm">Start Shopping</button>
            </div>
          ) : (
            items.map((item) => {
              const product = item.product;
              if (!product) return null;
              return (
                <div key={product._id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3" id={`cart-item-${product._id}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-14 h-14 object-cover rounded-lg bg-white"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.unit}</p>
                    <p className="text-sm font-bold text-primary-600 mt-1">₹{product.sellingPrice * item.quantity}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeCartItem(product._id)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 bg-primary-600 rounded-lg">
                      <button onClick={() => item.quantity === 1 ? removeCartItem(product._id) : updateCartItem(product._id, item.quantity - 1)}
                        className="p-1 hover:bg-primary-700 rounded-l-lg transition-colors text-white">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1.5">{item.quantity}</span>
                      <button onClick={() => updateCartItem(product._id, item.quantity + 1)}
                        className="p-1 hover:bg-primary-700 rounded-r-lg transition-colors text-white">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery fee</span>
                <span className={`font-medium ${deliveryFee === 0 ? 'text-primary-600' : ''}`}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              {cartSubtotal < 499 && (
                <p className="text-xs text-primary-600 font-medium">
                  Add ₹{499 - cartSubtotal} more for free delivery!
                </p>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t pt-1.5 border-dashed border-gray-200">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full btn-primary flex items-center justify-center gap-2"
              id="cart-checkout-btn"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
