import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useCreateOrder } from '../hooks/useOrders';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ShippingAddress } from '../types';
import { CreditCard, MapPin } from 'lucide-react';
import { useState } from 'react';

const shippingSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().min(2, 'Country is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
});

type CheckoutFormData = z.infer<typeof shippingSchema>;

export const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, isEmpty } = useCart();
  const { mutate: createOrder, isPending, error } = useCreateOrder();
  const [orderCreated, setOrderCreated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(shippingSchema),
  });

  if (isEmpty) {
    navigate('/cart');
    return null;
  }

  const onSubmit = (data: CheckoutFormData) => {
    const orderData = {
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      shippingAddress: data as ShippingAddress,
    };

    createOrder(orderData, {
      onSuccess: (order) => {
        setOrderCreated(true);
        clearCart();
        setTimeout(() => {
          navigate(`/orders/${order.id}`);
        }, 2000);
      },
    });
  };

  if (orderCreated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600">Redirecting to order details...</p>
        </div>
      </div>
    );
  }

  const subtotal = total;
  const shipping = total >= 50 ? 0 : 5;
  const tax = total * 0.1;
  const orderTotal = subtotal + shipping + tax;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-6 w-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Shipping Information</h2>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {(error as any).message || 'Failed to create order. Please try again.'}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    {...register('fullName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <input
                    {...register('addressLine1')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.addressLine1 && (
                    <p className="mt-1 text-sm text-red-600">{errors.addressLine1.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    {...register('addressLine2')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    {...register('city')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    {...register('state')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    {...register('postalCode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    {...register('country')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.country && (
                    <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    {...register('phone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Information (Mock) */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-6 w-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Payment Information</h2>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Payment processing is simulated for this demo. No actual payment will be charged.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPending ? <LoadingSpinner size="sm" /> : 'Place Order'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product.name} x {item.quantity}
                  </span>
                  <span className="font-medium">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-2 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
