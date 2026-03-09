import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { validatePassword } from '../utils/passwordValidation';
import { User, Mail, Lock, Shield } from 'lucide-react';

const getRoleDisplayName = (role) => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'permanent_secretary':
      return 'Permanent Secretary';
    case 'inspector':
      return 'Inspector';
    default:
      return role || '—';
  }
};

const getRoleBadgeStyle = (role) => {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    case 'permanent_secretary':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'inspector':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  }
};

const Profile = () => {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/me');
      const user = data.user || data;
      setProfile(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password) {
      const check = validatePassword(formData.password);
      if (!check.valid) {
        toast.error(check.message);
        return;
      }
    }
    try {
      setSaving(true);
      const payload = {};
      if (formData.name !== (profile?.name ?? '')) payload.name = formData.name;
      if (formData.email !== (profile?.email ?? '')) payload.email = formData.email;
      if (formData.password) payload.password = formData.password;

      if (Object.keys(payload).length === 0) {
        toast.success('No changes to save');
        return;
      }

      const { data } = await api.patch('/me', payload);
      const updatedUser = data.user || data;
      setProfile(updatedUser);
      updateUser(updatedUser);
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      toast.success(data.message || 'Profile updated successfully');
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-1">View and update your account details</p>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-2 text-gray-500" />
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2 text-gray-500" />
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="you@example.com"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Shield className="w-4 h-4 inline mr-2 text-gray-500" />
              Role
            </label>
            <div
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getRoleBadgeStyle(
                profile?.role
              )}`}
            >
              {getRoleDisplayName(profile?.role)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Role cannot be changed here.</p>
          </div>

          {/* New password (optional) */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Lock className="w-4 h-4 inline mr-2 text-gray-500" />
              New password
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Min 8 characters, 1 uppercase, 1 number, 1 special (!@#$%^&*). Leave blank to keep current.</p>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-3"
              placeholder="New password"
            />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
