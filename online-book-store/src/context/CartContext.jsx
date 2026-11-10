import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pageturner-cart")) || []; }
    catch { return []; }
  });

  useEffect(() => localStorage.setItem("pageturner-cart", JSON.stringify(cart)), [cart]);

  const addToCart = (book) => setCart(current => {
    const found = current.find(item => item.id === book.id);
    return found
      ? current.map(item => item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { ...book, quantity: 1 }];
  });
  const updateQuantity = (id, quantity) => setCart(current =>
    quantity <= 0 ? current.filter(item => item.id !== id) :
    current.map(item => item.id === id ? { ...item, quantity } : item)
  );
  const removeFromCart = (id) => setCart(current => current.filter(item => item.id !== id));
  const clearCart = () => setCart([]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const value = useMemo(() => ({ cart, addToCart, updateQuantity, removeFromCart, clearCart, count, total }), [cart, count, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);