import { useSettings } from '../context/SettingsContext';

const MaintenanceScreen = () => {
  const { publicSettings } = useSettings();
  const message = publicSettings.maintenance_message || 'System is under maintenance. Please try again later.';
  const systemName = publicSettings.system_name || 'Warehouse Monitor';
  const orgName = publicSettings.organization_name || '';
  const logoUrl = publicSettings.logo_url?.trim();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-lg w-full text-center">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-16 mx-auto mb-6 object-contain" />
        ) : (
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500 flex items-center justify-center">
            <span className="text-3xl">⚠</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{systemName}</h1>
        {orgName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{orgName}</p>
        )}
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message}</p>
        </div>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Please try again later or contact support.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
