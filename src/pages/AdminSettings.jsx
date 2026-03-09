import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Settings, Save } from 'lucide-react';

const GROUP_LABELS = {
  general: 'General',
  security: 'Security',
  notifications: 'Notifications',
  warehouse: 'Warehouse',
  users: 'Users',
  map: 'Map',
  backup: 'Backup',
  reports: 'Reports',
  maintenance: 'Maintenance',
  feature_flags: 'Feature flags',
};

const KEYS_BY_GROUP = {
  general: ['system_name', 'organization_name', 'support_email', 'support_phone', 'timezone', 'language', 'logo_url'],
  security: ['two_fa_enabled', 'password_min_length', 'login_attempt_limit', 'session_timeout_minutes', 'jwt_expiry_hours'],
  notifications: ['email_notifications_enabled', 'sms_notifications_enabled', 'low_stock_threshold', 'camera_offline_alert_minutes'],
  warehouse: ['default_warehouse_capacity', 'allow_stock_transfer', 'inventory_alerts_enabled', 'camera_monitoring_enabled'],
  users: ['allow_self_password_reset', 'default_new_user_role', 'max_inspectors_per_warehouse'],
  map: ['default_map_zoom', 'map_low_stock_color', 'map_normal_stock_color', 'map_live_status_enabled'],
  backup: ['backup_enabled', 'backup_frequency', 'backup_storage_location'],
  reports: ['default_report_format', 'csv_export_enabled', 'pdf_export_enabled'],
  maintenance: ['maintenance_mode', 'maintenance_message'],
  feature_flags: ['feature_cameras', 'feature_map', 'feature_reports', 'feature_stock_transfer'],
};

const BOOLEAN_KEYS = new Set([
  'two_fa_enabled', 'email_notifications_enabled', 'sms_notifications_enabled',
  'allow_stock_transfer', 'inventory_alerts_enabled', 'camera_monitoring_enabled',
  'allow_self_password_reset', 'map_live_status_enabled', 'backup_enabled',
  'csv_export_enabled', 'pdf_export_enabled', 'maintenance_mode',
  'feature_cameras', 'feature_map', 'feature_reports', 'feature_stock_transfer',
]);

const SELECT_OPTIONS = {
  language: [
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'Urdu' },
  ],
  default_new_user_role: [
    { value: 'inspector', label: 'Inspector' },
    { value: 'permanent_secretary', label: 'Permanent Secretary' },
  ],
  backup_frequency: [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
  ],
  backup_storage_location: [
    { value: 'local', label: 'Local' },
    { value: 'cloud', label: 'Cloud' },
  ],
  default_report_format: [
    { value: 'pdf', label: 'PDF' },
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
  ],
};

const AdminSettings = () => {
  const { user } = useAuth();
  const { refreshPublicSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [data, setData] = useState({ settings: {}, groups: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/admin/settings');
      setData({ settings: res.settings || {}, groups: res.groups || {} });
      const flat = res.settings || {};
      setFormValues((prev) => ({ ...prev, ...flat }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchSettings();
    }
  }, [user?.role]);

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {};
      const keysToSend = KEYS_BY_GROUP[activeTab] || Object.keys(data.groups[activeTab] || {}) || Object.keys(formValues);
      keysToSend.forEach((key) => {
        if (formValues[key] !== undefined) {
          payload[key] = String(formValues[key]);
        }
      });
      if (Object.keys(payload).length === 0) {
        toast.success('No changes to save');
        return;
      }
      await api.put('/admin/settings', { settings: payload });
      const { data: res } = await api.get('/admin/settings');
      setData({ settings: res.settings || {}, groups: res.groups || {} });
      setFormValues((prev) => ({ ...prev, ...(res.settings || {}) }));
      await refreshPublicSettings();
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Access denied. Super Admin only.</p>
      </div>
    );
  }

  const groups = data.groups || {};
  const tabs = Object.keys(GROUP_LABELS);
  const currentGroup = groups[activeTab] || {};
  const keysForTab = KEYS_BY_GROUP[activeTab] || Object.keys(currentGroup);
  const keys = keysForTab.length > 0 ? keysForTab : Object.keys(currentGroup);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">System configuration</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-1 overflow-x-auto">
              {(tabs.length ? tabs : Object.keys(GROUP_LABELS)).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveTab(group)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === group
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {GROUP_LABELS[group] || group}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {GROUP_LABELS[activeTab] || activeTab}
            </h2>
            <div className="space-y-4">
              {keys.map((key) =>
                renderField(key, formValues[key] ?? currentGroup[key] ?? '', handleChange)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function renderField(key, value, onChange) {
  const strVal = value != null ? String(value) : '';
  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const isBool = BOOLEAN_KEYS.has(key);
  const options = SELECT_OPTIONS[key];

  if (isBool) {
    return (
      <div key={key} className="flex items-center gap-3">
        <input
          type="checkbox"
          id={key}
          checked={strVal === 'true'}
          onChange={(e) => onChange(key, e.target.checked ? 'true' : 'false')}
          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor={key} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      </div>
    );
  }
  if (options) {
    return (
      <div key={key}>
        <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <select
          id={key}
          value={strVal}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const isNumber = [
    'password_min_length', 'login_attempt_limit', 'session_timeout_minutes', 'jwt_expiry_hours',
    'low_stock_threshold', 'camera_offline_alert_minutes', 'default_warehouse_capacity',
    'max_inspectors_per_warehouse', 'default_map_zoom',
  ].includes(key);
  const isMultiline = key === 'maintenance_message';

  return (
    <div key={key}>
      <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {isMultiline ? (
        <textarea
          id={key}
          value={strVal}
          onChange={(e) => onChange(key, e.target.value)}
          rows={3}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      ) : (
        <input
          id={key}
          type={isNumber ? 'number' : 'text'}
          value={strVal}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      )}
    </div>
  );
}

export default AdminSettings;
