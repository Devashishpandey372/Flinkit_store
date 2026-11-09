import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Clock, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import LoadingSpinner from '../components/LoadingSpinner';

const HERO_SLIDES = [
  {
    id: 1,
    title: 'Groceries in',
    highlight: '10 Minutes',
    subtitle: 'Fresh produce, daily essentials & more delivered to your door.',
    cta: 'Shop Now',
    bg: 'from-emerald-600 via-green-500 to-teal-400',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  },
  {
    id: 2,
    title: 'Fresh Fruits &',
    highlight: 'Vegetables',
    subtitle: 'Farm-fresh produce delivered daily. No preservatives, just freshness.',
    cta: 'Explore Fresh',
    bg: 'from-lime-500 via-green-500 to-emerald-600',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80',
  },
  {
    id: 3,
    title: 'Big Savings on',
    highlight: 'Daily Essentials',
    subtitle: 'Up to 40% off on your favourite grocery brands every day.',
    cta: 'See Offers',
    bg: 'from-yellow-400 via-orange-400 to-red-400',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
  },
];

const FEATURES = [
  { icon: Clock, title: '10-Min Delivery', desc: 'Lightning fast delivery to your door' },
  { icon: ShieldCheck, title: 'Quality Assured', desc: 'Fresh products, every single time' },
  { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₹499' },
  { icon: RefreshCw, title: 'Easy Returns', desc: 'Hassle-free returns within 24 hrs' },
];

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [freshProducts, setFreshProducts] = useState([]);
  const [snacksProducts, setSnacksProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, freshRes, snacksRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?featured=true&limit=8'),
          api.get('/products?category=fruits-vegetables&limit=6'),
          api.get('/products?category=snacks-munchies&limit=6'),
        ]);
        setCategories(catRes.data.data.categories);
        setFeaturedProducts(featuredRes.data.data.products);
        setFreshProducts(freshRes.data.data.products);
        setSnacksProducts(snacksRes.data.data.products);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-advance hero
  useEffect(() => {
    const interval = setInterval(() => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const slide = HERO_SLIDES[heroSlide];

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className={`relative bg-gradient-to-br ${slide.bg} overflow-hidden transition-all duration-700`} id="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-white z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-1.5 mb-4">
                <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                <span className="text-sm font-semibold">Delivery in 10 minutes</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                {slide.title}
                <br />
                <span className="text-yellow-300">{slide.highlight}</span>
              </h1>
              <p className="text-white/80 text-lg mb-8 max-w-md">{slide.subtitle}</p>
              <div className="flex gap-3">
                <Link to="/products" className="bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-yellow-50 transition-colors flex items-center gap-2 shadow-lg" id="hero-cta-btn">
                  {slide.cta} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/signup" className="bg-white/20 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-colors" id="hero-signup-btn">
                  Get Started
                </Link>
              </div>
            </div>
            <div className="flex-1 relative">
              <img
                src={slide.image}
                alt={slide.title}
                className="rounded-3xl shadow-2xl w-full max-w-md mx-auto object-cover h-72 md:h-96"
              />
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroSlide(i)}
              className={`h-2 rounded-full transition-all ${i === heroSlide ? 'bg-white w-6' : 'bg-white/40 w-2'}`}
            />
          ))}
        </div>
      </section>

      {/* Features Strip */}
      <section className="bg-primary-600 py-4" id="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-3 text-white">
                <div className="bg-white/20 rounded-xl p-2 shrink-0">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs text-white/70 hidden sm:block">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* Categories */}
            <section id="categories-section">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="section-title">Shop by Category</h2>
                  <p className="section-subtitle">Everything you need, one tap away</p>
                </div>
                <Link to="/products" className="flex items-center gap-1 text-primary-600 font-semibold text-sm hover:gap-2 transition-all">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
                {categories.map((cat) => <CategoryCard key={cat._id} category={cat} />)}
              </div>
            </section>

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <section id="featured-products-section">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="section-title">🔥 Best Sellers</h2>
                    <p className="section-subtitle">Top picks chosen by our customers</p>
                  </div>
                  <Link to="/products?featured=true" className="flex items-center gap-1 text-primary-600 font-semibold text-sm hover:gap-2 transition-all">
                    See all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                  {featuredProducts.map((p) => <ProductCard key={p._id} product={p} />)}
                </div>
              </section>
            )}

            {/* Promo Banner */}
            <section className="relative bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl overflow-hidden p-8 md:p-12 text-center" id="promo-banner">
              <div className="relative z-10">
                <p className="text-white/80 font-medium mb-2">Limited time offer</p>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Up to 40% OFF on Snacks!</h2>
                <p className="text-white/80 mb-6">Chips, namkeen, biscuits and more — grab them before the sale ends!</p>
                <Link to="/products?category=snacks-munchies" className="bg-white text-orange-500 font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors inline-flex items-center gap-2" id="promo-cta-btn">
                  Shop Snacks <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>

            {/* Fresh Products */}
            {freshProducts.length > 0 && (
              <section id="fresh-products-section">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="section-title">🥦 Fresh Fruits & Vegetables</h2>
                    <p className="section-subtitle">Farm-fresh, delivered daily</p>
                  </div>
                  <Link to="/products?category=fruits-vegetables" className="flex items-center gap-1 text-primary-600 font-semibold text-sm hover:gap-2 transition-all">
                    See all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {freshProducts.map((p) => <ProductCard key={p._id} product={p} />)}
                </div>
              </section>
            )}

            {/* Snacks Products */}
            {snacksProducts.length > 0 && (
              <section id="snacks-section">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="section-title">🍿 Snacks & Munchies</h2>
                    <p className="section-subtitle">Because hunger doesn't wait</p>
                  </div>
                  <Link to="/products?category=snacks-munchies" className="flex items-center gap-1 text-primary-600 font-semibold text-sm hover:gap-2 transition-all">
                    See all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {snacksProducts.map((p) => <ProductCard key={p._id} product={p} />)}
                </div>
              </section>
            )}

            {/* App Promo */}
            <section className="bg-gray-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8" id="app-promo-section">
              <div className="flex-1 text-white">
                <div className="inline-flex items-center gap-2 bg-primary-600/30 text-primary-400 rounded-full px-4 py-1.5 mb-4 text-sm font-semibold">
                  <Zap className="w-4 h-4" /> Quick Commerce
                </div>
                <h2 className="text-3xl font-black mb-4">Why Choose <span className="text-primary-400">Flinkit</span>?</h2>
                <ul className="space-y-3 text-gray-300">
                  {['10-minute delivery in your area', '1000+ products across all categories', 'Fresh & quality-checked products', 'Secure payments with Razorpay', 'Easy returns & 24/7 support'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="btn-primary mt-6 inline-flex" id="home-signup-cta">Get Started Free</Link>
              </div>
              <div className="flex-1 flex justify-center">
                <img
                  src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&q=80"
                  alt="Grocery delivery"
                  className="rounded-2xl w-full max-w-sm object-cover h-64"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
