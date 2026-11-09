import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const CartPage = () => {
  const { cart, cartLoading, cartSubtotal, updateCartItem, removeCartItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const items = cart?.items || [];
  const deliveryFee = cartSubtotal >= 499 ? 0 : 40;
  const total = cartSubtotal + deliveryFee;

  if (cartLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-12 h-12 text-primary-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Looks like you haven't added anything to your cart yet. Explore our fresh grocery collection!
        </p>
        <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
          Explore Groceries <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-gray-900">
            Shopping Cart <span className="text-sm font-semibold text-gray-500">({items.length} items)</span>
          </h1>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;

            return (
              <div
                key={product._id}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-gray-200 transition-all"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 object-contain rounded-xl bg-gray-50 p-2 shrink-0"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200';
                  }}
                />

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${product._id}`}
                    className="text-base font-bold text-gray-900 hover:text-primary-600 transition-colors truncate block"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{product.unit}</p>
                  <p className="text-base font-extrabold text-primary-600 mt-1">
                    ₹{product.sellingPrice * item.quantity}
                    {item.quantity > 1 && (
                      <span className="text-xs text-gray-400 font-normal ml-2">
                        (₹{product.sellingPrice} / unit)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={() => removeCartItem(product._id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 bg-primary-600 rounded-xl overflow-hidden">
                    <button
                      onClick={() =>
                        item.quantity === 1 ? removeCartItem(product._id) : updateCartItem(product._id, item.quantity - 1)
                      }
                      className="p-1.5 hover:bg-primary-700 transition-colors text-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-white min-w-[1.5rem] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(product._id, item.quantity + 1)}
                      className="p-1.5 hover:bg-primary-700 transition-colors text-white"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Bill Details</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal</span>
                <span className="font-semibold text-gray-900">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>

              {cartSubtotal < 499 ? (
                <div className="bg-yellow-50 text-yellow-800 rounded-xl p-2.5 text-xs font-medium">
                  Add ₹{499 - cartSubtotal} more for <span className="font-bold">FREE Delivery</span>!
                </div>
              ) : (
                <div className="bg-green-50 text-green-700 rounded-xl p-2.5 text-xs font-medium">
                  🎉 You unlocked FREE Delivery!
                </div>
              )}

              <hr className="my-3 border-gray-100" />

              <div className="flex justify-between text-base font-black text-gray-900">
                <span>To Pay</span>
                <span className="text-xl text-primary-600">₹{total}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 text-base"
              id="proceed-checkout-btn"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

