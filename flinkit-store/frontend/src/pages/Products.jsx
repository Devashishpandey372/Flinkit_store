import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import LoadingSpinner from '../components/LoadingSpinner';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'createdAt', order: 'desc' },
  { label: 'Price: Low to High', value: 'sellingPrice', order: 'asc' },
  { label: 'Price: High to Low', value: 'sellingPrice', order: 'desc' },
  { label: 'Name A-Z', value: 'name', order: 'asc' },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';
  const featured = searchParams.get('featured') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 24, sort, order };
      if (category) params.category = category;
      if (search) params.search = search;
      if (featured) params.featured = featured;

      const res = await api.get('/products', { params });
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, order, featured, page]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const selectedSort = SORT_OPTIONS.find(o => o.value === sort && o.order === order) || SORT_OPTIONS[0];

  const currentCategory = categories.find(c => c.slug === category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">
            {search ? `Search: "${search}"` : currentCategory ? currentCategory.name : featured ? '⭐ Best Sellers' : 'All Products'}
          </h1>
          {pagination.total !== undefined && (
            <p className="text-sm text-gray-500 mt-0.5">{pagination.total} products found</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="relative">
            <select
              value={`${sort}_${order}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split('_');
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set('sort', s); next.set('order', o); next.delete('page');
                  return next;
                });
              }}
              className="appearance-none border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
              id="products-sort-select"
            >
              {SORT_OPTIONS.map(o => (
                <option key={`${o.value}_${o.order}`} value={`${o.value}_${o.order}`}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 border rounded-xl px-3 py-2 text-sm transition-colors ${showFilters ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 hover:border-primary-300'}`} id="products-filter-btn">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        {showFilters && (
          <aside className="w-56 shrink-0 hidden md:block fade-in" id="products-filter-sidebar">
            <div className="card p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Filters</h3>
                {(category || featured) && (
                  <button onClick={() => { setParam('category', ''); setParam('featured', ''); }} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {/* Categories */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">Categories</p>
                <ul className="space-y-1">
                  <li>
                    <button onClick={() => setParam('category', '')}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${!category ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                      All Products
                    </button>
                  </li>
                  {categories.map(cat => (
                    <li key={cat._id}>
                      <button onClick={() => setParam('category', cat.slug)}
                        className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${category === cat.slug ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick filters */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">Quick Filters</p>
                <button onClick={() => setParam('featured', featured ? '' : 'true')}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${featured ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                  ⭐ Best Sellers
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {/* Active filter chips */}
          {(category || search || featured) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {category && (
                <span className="flex items-center gap-1 bg-primary-100 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {currentCategory?.name || category}
                  <button onClick={() => setParam('category', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {search && (
                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  Search: {search}
                  <button onClick={() => setParam('search', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {featured && (
                <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  Best Sellers
                  <button onClick={() => setParam('featured', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
              <Link to="/products" className="btn-primary">Browse all products</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p._id} product={p} />)}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10" id="products-pagination">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('page', p); return next; })}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 hover:border-primary-300 text-gray-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
