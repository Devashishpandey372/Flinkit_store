import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const ProductCard = ({ product }) => {
  const { addToCart, updateCartItem, removeCartItem, cart } = useCart();
  const { isAuthenticated } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  // Find quantity in cart
  const cartItem = cart?.items?.find(
    (item) => (item.product?._id || item.product) === product._id
  );
  const quantity = cartItem?.quantity || 0;

  const discount = product.discountPercent || Math.round(
    ((product.originalPrice - product.sellingPrice) / product.originalPrice) * 100
  );

  const isOutOfStock = product.stock === 0 || product.availabilityStatus === 'out_of_stock';

  const handleAdd = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    await addToCart(product._id, 1);
    setIsAdding(false);
  };

  const handleIncrease = async (e) => {
    e.preventDefault();
    await updateCartItem(product._id, quantity + 1);
  };

  const handleDecrease = async (e) => {
    e.preventDefault();
    if (quantity === 1) {
      await removeCartItem(product._id);
    } else {
      await updateCartItem(product._id, quantity - 1);
    }
  };

  return (
    <Link to={`/products/${product._id}`} className="card group block fade-in" id={`product-card-${product._id}`}>
      {/* Image */}
      <div className="relative bg-gray-50 overflow-hidden h-44">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'; }}
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {discount}% OFF
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="badge-outofstock text-sm px-3 py-1">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{product.unit} {product.brand ? `• ${product.brand}` : ''}</p>
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price + Cart */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-bold text-gray-900">₹{product.sellingPrice}</span>
            {product.originalPrice > product.sellingPrice && (
              <span className="text-xs text-gray-400 line-through ml-1.5">₹{product.originalPrice}</span>
            )}
          </div>

          {!isOutOfStock && (
            quantity > 0 ? (
              <div
                className="flex items-center gap-1.5 bg-primary-600 rounded-xl overflow-hidden"
                onClick={(e) => e.preventDefault()}
                id={`cart-qty-${product._id}`}
              >
                <button
                  onClick={handleDecrease}
                  className="p-1.5 hover:bg-primary-700 transition-colors text-white"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-white min-w-[1.25rem] text-center">{quantity}</span>
                <button
                  onClick={handleIncrease}
                  className="p-1.5 hover:bg-primary-700 transition-colors text-white"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={isAdding}
                className="flex items-center gap-1 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 font-semibold text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95"
                id={`add-to-cart-${product._id}`}
                aria-label={`Add ${product.name} to cart`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            )
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
