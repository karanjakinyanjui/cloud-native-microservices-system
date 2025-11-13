import { useAuthStore } from '../store/authStore';
import { User, Mail, Calendar, Shield } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
          <div className="h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Email Address</p>
              <p className="text-gray-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-gray-900">{user.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Account Role</p>
              <p className="text-gray-900 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Member Since</p>
              <p className="text-gray-900">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Account Actions</h2>
        <div className="space-y-3">
          <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            Edit Profile
          </button>
          <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            Change Password
          </button>
          <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            Privacy Settings
          </button>
          <button className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
