import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, ShoppingBag, ShieldCheck, Truck, RefreshCw, Zap } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, updateCartItem, removeCartItem } = useCart();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/products/${id}`);
        const prod = res.data.data.product;
        setProduct(prod);

        // Fetch related products
        if (prod.category?._id || prod.category?.slug) {
          const catId = prod.category.slug || prod.category._id;
          const relatedRes = await api.get(`/products?category=${catId}&limit=4`);
          setRelated(relatedRes.data.data.products.filter((p) => p._id !== prod._id));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">{error || 'This product might be out of stock or removed.'}</p>
        <button onClick={() => navigate('/products')} className="btn-primary">
          Back to Products
        </button>
      </div>
    );
  }

  const cartItem = cart?.items?.find(
    (item) => (item.product?._id || item.product) === product._id
  );
  const quantity = cartItem?.quantity || 0;

  const discount =
    product.discountPercent ||
    Math.round(((product.originalPrice - product.sellingPrice) / product.originalPrice) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb / Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm">
        {/* Product Image */}
        <div className="relative bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center p-8 max-h-[460px]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full max-h-96 object-contain"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500';
            }}
          />
          {discount > 0 && (
            <span className="absolute top-4 left-4 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
              <Zap className="w-3.5 h-3.5 fill-primary-600" /> 10-Minute Delivery
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{product.name}</h1>
            <p className="text-sm text-gray-500 font-medium mb-4">Pack Size: {product.unit}</p>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-black text-gray-900">₹{product.sellingPrice}</span>
              {product.originalPrice > product.sellingPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">₹{product.originalPrice}</span>
                  <span className="text-sm text-green-600 font-bold">
                    Save ₹{product.originalPrice - product.sellingPrice}
                  </span>
                </>
              )}
            </div>

            <div className="border-t border-b border-gray-100 py-4 mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description || 'Fresh, high-quality product carefully selected and packed for fast delivery.'}
              </p>
            </div>
          </div>

          <div>
            {/* Actions */}
            {product.stock > 0 ? (
              quantity > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center gap-3 bg-primary-600 rounded-xl px-4 py-2">
                    <button
                      onClick={() =>
                        quantity === 1 ? removeCartItem(product._id) : updateCartItem(product._id, quantity - 1)
                      }
                      className="p-1 hover:bg-primary-700 transition-colors text-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-base font-bold text-white min-w-[2rem] text-center">{quantity}</span>
                    <button
                      onClick={() => updateCartItem(product._id, quantity + 1)}
                      className="p-1 hover:bg-primary-700 transition-colors text-white"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">in cart</span>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product._id, 1)}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-8 text-base"
                >
                  <ShoppingBag className="w-5 h-5" /> Add to Cart
                </button>
              )
            ) : (
              <span className="badge-outofstock text-base px-4 py-2">Out of Stock</span>
            )}

            {/* Badges */}
            <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Truck className="w-4 h-4 text-primary-600 shrink-0" />
                <span>Superfast delivery</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0" />
                <span>100% Quality checked</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <RefreshCw className="w-4 h-4 text-primary-600 shrink-0" />
                <span>Easy returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Similar Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;

