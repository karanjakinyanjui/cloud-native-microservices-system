import { useCartStore } from '../store/cartStore';
import { Product } from '../types';

export const useCart = () => {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
  } = useCartStore();

  return {
    items,
    addToCart: (product: Product, quantity = 1) => addItem(product, quantity),
    removeFromCart: (productId: string) => removeItem(productId),
    updateQuantity: (productId: string, quantity: number) => updateQuantity(productId, quantity),
    clearCart,
    total: getTotal(),
    itemCount: getItemCount(),
    isEmpty: items.length === 0,
  };
};
