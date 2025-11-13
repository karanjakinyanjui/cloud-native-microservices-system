import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ShoppingCart, ArrowLeft, Star, Package, Truck, Shield } from 'lucide-react';
import { useState } from 'react';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProduct(id!);
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      navigate('/cart');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Product not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/600'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {product.rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-medium text-gray-900">{product.rating}</span>
              </div>
              {product.reviewCount && (
                <span className="text-gray-600">({product.reviewCount} reviews)</span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-primary-600">
              ${product.price.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 bg-primary-50 px-3 py-1 rounded-full">
              {product.category}
            </span>
          </div>

          <p className="text-gray-700 text-lg mb-8 leading-relaxed">{product.description}</p>

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
              <span className="text-sm text-gray-600 ml-2">
                {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-semibold"
            >
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
            </button>
          </div>

          {/* Product Features */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Features</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Quality Guaranteed</h4>
                  <p className="text-gray-600 text-sm">
                    All products are carefully inspected before shipping
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Fast Delivery</h4>
                  <p className="text-gray-600 text-sm">
                    Free shipping on orders over $50
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Secure Payment</h4>
                  <p className="text-gray-600 text-sm">
                    Your payment information is always protected
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
