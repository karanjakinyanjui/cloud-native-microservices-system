import { useParams, useNavigate } from 'react-router-dom';
import { useOrder, useCancelOrder } from '../hooks/useOrders';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ArrowLeft, Package, MapPin, CreditCard, XCircle } from 'lucide-react';
import { useState } from 'react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useOrder(id!);
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelOrder = () => {
    cancelOrder(id!, {
      onSuccess: () => {
        setShowCancelConfirm(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Order not found
        </div>
      </div>
    );
  }

  const canCancel = order.status === 'pending' || order.status === 'processing';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Orders
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order #{order.id.slice(0, 8)}
            </h1>
            <p className="text-gray-600">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                statusColors[order.status]
              }`}
            >
              {order.status.toUpperCase()}
            </span>
            {canCancel && !showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {showCancelConfirm && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                No, Keep Order
              </button>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            Order Items
          </h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{item.productName}</h3>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${item.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    Total: ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="border-t pt-4 mb-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.paymentStatus === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : order.paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {order.paymentStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Shipping Address
          </h2>
          <div className="text-gray-700">
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p>{order.shippingAddress.addressLine2}</p>
            )}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>
            <p>{order.shippingAddress.country}</p>
            <p className="mt-2">Phone: {order.shippingAddress.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
