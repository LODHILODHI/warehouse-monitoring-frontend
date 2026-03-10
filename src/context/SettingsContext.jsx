import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const defaultPublic = {
  maintenance_mode: 'false',
  maintenance_message: 'System is under maintenance. Please try again later.',
  system_name: 'Warehouse Monitor',
  organization_name: 'Management System',
  logo_url: '',
  feature_cameras: 'true',
  feature_map: 'true',
  feature_reports: 'true',
  feature_stock_transfer: 'true',
};

const SettingsContext = createContext();

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export const SettingsProvider = ({ children }) => {
  const [publicSettings, setPublicSettings] = useState(defaultPublic);
  const [publicLoading, setPublicLoading] = useState(true);

  const fetchPublicSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/public', {
        timeout: 10000,
        validateStatus: () => true,
      });
      if (data && typeof data === 'object') {
        setPublicSettings((prev) => ({ ...defaultPublic, ...prev, ...data }));
      }
    } catch {
      setPublicSettings(defaultPublic);
    } finally {
      setPublicLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  const value = {
    publicSettings,
    publicLoading,
    refreshPublicSettings: fetchPublicSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
