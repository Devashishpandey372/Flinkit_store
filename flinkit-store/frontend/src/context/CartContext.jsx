import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [cartLoading, setCartLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) { setCart({ items: [] }); return; }
    try {
      setCartLoading(true);
      const res = await api.get('/cart');
      setCart(res.data.data.cart);
    } catch { /* silent */ } finally {
      setCartLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!isAuthenticated) { toast.error('Please login to add items to cart'); return; }
    try {
      const res = await api.post('/cart/items', { productId, quantity });
      setCart(res.data.data.cart);
      toast.success('Added to cart!', { icon: '🛒', duration: 1500 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    }
  }, [isAuthenticated]);

  const updateCartItem = useCallback(async (productId, quantity) => {
    try {
      const res = await api.patch(`/cart/items/${productId}`, { quantity });
      setCart(res.data.data.cart);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cart');
    }
  }, []);

  const removeCartItem = useCallback(async (productId) => {
    try {
      const res = await api.delete(`/cart/items/${productId}`);
      setCart(res.data.data.cart);
      toast.success('Item removed', { duration: 1500 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await api.delete('/cart/clear');
      setCart({ items: [] });
    } catch { /* silent */ }
  }, []);

  // Computed
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const cartSubtotal = cart?.items?.reduce((sum, item) => {
    const price = item.product?.sellingPrice || 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartLoading,
        cartCount,
        cartSubtotal,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        fetchCart,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
