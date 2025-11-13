import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

export const Cart = () => {
  const { items, removeFromCart, updateQuantity, total, isEmpty } = useCart();
  const navigate = useNavigate();

  if (isEmpty) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some products to get started</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Browse Products
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-4 p-6 border-b last:border-b-0"
              >
                <img
                  src={item.product.imageUrl || 'https://via.placeholder.com/150'}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />

                <div className="flex-1">
                  <Link
                    to={`/products/${item.product.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {item.product.description}
                  </p>
                  <p className="text-primary-600 font-bold text-lg mt-2">
                    ${item.product.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-lg font-bold text-gray-900">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{total >= 50 ? 'Free' : '$5.00'}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (10%)</span>
                <span>${(total * 0.1).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>
                  ${(total + (total >= 50 ? 0 : 5) + total * 0.1).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight className="h-5 w-5" />
            </button>

            <Link
              to="/products"
              className="block text-center text-primary-600 hover:text-primary-700 mt-4 font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
