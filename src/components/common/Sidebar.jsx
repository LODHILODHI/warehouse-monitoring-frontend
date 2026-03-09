import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
  LayoutDashboard,
  Warehouse,
  Package,
  FileText,
  Users,
  LogOut,
  Map,
  Video,
  UserCircle,
  Shield,
  ClipboardList,
  Settings,
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { publicSettings } = useSettings();

  const isPermanentSecretary = user?.role === 'permanent_secretary';
  const isSuperAdmin = user?.role === 'super_admin';
  const featureMap = publicSettings.feature_map !== 'false';
  const featureCameras = publicSettings.feature_cameras !== 'false';
  const featureReports = publicSettings.feature_reports !== 'false';
  const canAccessMap = (isSuperAdmin || isPermanentSecretary) && featureMap;
  const canAccessCameras = (isSuperAdmin || isPermanentSecretary) && featureCameras;
  const showReports = featureReports;

  const systemName = publicSettings.system_name || 'Warehouse Monitor';
  const orgName = publicSettings.organization_name || 'Management System';
  const logoUrl = publicSettings.logo_url?.trim();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    ...(canAccessMap
      ? [{ name: 'Map', path: '/map', icon: Map }]
      : []),
    ...(canAccessCameras
      ? [{ name: 'Camera Streams', path: '/camera-streams', icon: Video }]
      : []),
    {
      name: 'Warehouses',
      path: '/warehouses',
      icon: Warehouse,
    },
    {
      name: 'Stock Entries',
      path: '/stock',
      icon: Package,
    },
    ...(showReports
      ? [{ name: 'Reports', path: '/reports', icon: FileText }]
      : []),
    ...(isSuperAdmin
      ? [
          { name: 'Users', path: '/users', icon: Users },
          { name: 'Login logs', path: '/security/login-logs', icon: Shield },
          { name: 'Audit logs', path: '/audit-logs', icon: ClipboardList },
          { name: 'Admin Settings', path: '/admin/settings', icon: Settings },
        ]
      : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo / branding */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-10 w-auto object-contain mb-2" />
        ) : null}
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{systemName}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{orgName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          to="/profile"
          className="flex items-center gap-3 mb-3 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || ''}
            </p>
          </div>
          <UserCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
