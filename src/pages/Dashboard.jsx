import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Warehouse,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Video,
  AlertTriangle,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalWarehouses: 0,
    activeWarehouses: 0,
    stockEntriesToday: 0,
    stockEntriesThisMonth: 0,
    totalCameras: 0,
    onlineCameras: 0,
    totalStockItems: 0,
    lowStockItems: 0,
    totalInspectors: 0,
  });
  const [trends, setTrends] = useState({});
  const [recentEntries, setRecentEntries] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topWarehouses, setTopWarehouses] = useState([]);
  const [stockDistribution, setStockDistribution] = useState(null);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Pagination state for recent entries
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesLimit] = useState(20);
  const [entriesPagination, setEntriesPagination] = useState(null);
  // Filters for recent entries (admin only)
  const [warehouses, setWarehouses] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  // Loading state for entries only (not full page)
  const [entriesLoading, setEntriesLoading] = useState(false);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isPermanentSecretary = user?.role === 'permanent_secretary';
  const isInspector = user?.role === 'inspector';
  const canFilterByInspector = isSuperAdmin || isPermanentSecretary;

  // Fetch warehouses and inspectors for admin filters
  const fetchWarehousesAndInspectors = async () => {
    try {
      const [warehousesRes, usersRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/users'),
      ]);
      setWarehouses(warehousesRes.data.warehouses || []);
      // Filter only inspectors from users
      const inspectorsList = (usersRes.data.users || []).filter(
        (u) => u.role === 'inspector'
      );
      setInspectors(inspectorsList);
    } catch (error) {
      console.error('Failed to load warehouses/inspectors:', error);
    }
  };

  // Get filtered inspectors based on selected warehouse
  const getFilteredInspectors = () => {
    if (!selectedWarehouseId) {
      // If no warehouse selected, show all inspectors
      return inspectors;
    }
    
    // Find the selected warehouse
    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
    if (!selectedWarehouse) {
      return inspectors;
    }
    
    // If warehouse has assignedInspectors array, use it
    if (selectedWarehouse.assignedInspectors && Array.isArray(selectedWarehouse.assignedInspectors)) {
      const assignedInspectorIds = selectedWarehouse.assignedInspectors.map(ai => ai.id);
      return inspectors.filter(inspector => assignedInspectorIds.includes(inspector.id));
    }
    
    // Otherwise, check inspector's assignedWarehouses array
    return inspectors.filter(inspector => 
      inspector.assignedWarehouses && 
      Array.isArray(inspector.assignedWarehouses) && 
      inspector.assignedWarehouses.includes(selectedWarehouseId)
    );
  };

  useEffect(() => {
    fetchDashboardData();
    if (canFilterByInspector) {
      fetchWarehousesAndInspectors();
    } else if (isInspector) {
      // For inspectors, fetch assigned warehouses
      fetchInspectorWarehouses();
    }
  }, []);

  // Fetch warehouses for inspectors
  const fetchInspectorWarehouses = async () => {
    try {
      const response = await api.get('/inspector/warehouses');
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      console.error('Failed to load inspector warehouses:', error);
    }
  };

  // Clear inspector selection if it's not valid for selected warehouse
  useEffect(() => {
    if (selectedWarehouseId && selectedInspectorId) {
      const filteredInspectors = getFilteredInspectors();
      const isInspectorValid = filteredInspectors.some(i => i.id === selectedInspectorId);
      if (!isInspectorValid) {
        setSelectedInspectorId('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouseId, warehouses, inspectors]);

  // Fetch dashboard data when page or filters change
  useEffect(() => {
    // Only show full loading on initial load
    if (loading) {
      fetchDashboardData();
    } else {
      // For filter changes, only reload entries
      fetchRecentEntriesOnly();
    }
  }, [entriesPage, selectedWarehouseId, selectedInspectorId]);

  // Fetch only recent entries when filters change (without full page reload)
  const fetchRecentEntriesOnly = async () => {
    try {
      setEntriesLoading(true);
      
      // Use inspector-specific API if user is inspector
      if (isInspector) {
        const params = {
          page: entriesPage,
          limit: entriesLimit,
        };
        
        if (selectedWarehouseId) {
          params.warehouseId = selectedWarehouseId;
        }
        
        console.log('Fetching entries (inspector API):', params);
        
        const response = await api.get('/inspector/stock', { params });
        const entries = response.data.entries || [];
        const pagination = response.data.pagination || null;
        
        setRecentEntries(entries);
        setEntriesPagination(pagination);
        
        console.log('Entries received (inspector API):', entries.length);
      } else {
        // Build query parameters for admin/permanent secretary
        const params = {
          page: entriesPage,
          limit: entriesLimit,
        };
        
        // Add filters for admin and permanent secretary
        if (canFilterByInspector) {
          if (selectedWarehouseId) {
            params.warehouseId = selectedWarehouseId;
          }
          if (selectedInspectorId) {
            params.inspectorId = selectedInspectorId;
          }
        }
        
        console.log('Fetching entries with filters:', params);
        
        // Only fetch recent entries, not full dashboard stats
        const statsRes = await api.get('/dashboard/stats', {
          params,
        });
        
        const stats = statsRes.data;
        
        // Only update recent entries
        if (stats.recentStockEntries) {
          if (stats.recentStockEntries.items && Array.isArray(stats.recentStockEntries.items)) {
            setRecentEntries(stats.recentStockEntries.items || []);
            setEntriesPagination(stats.recentStockEntries.pagination || null);
          } else if (Array.isArray(stats.recentStockEntries)) {
            setRecentEntries(stats.recentStockEntries);
            setEntriesPagination(null);
          } else {
            setRecentEntries([]);
            setEntriesPagination(null);
          }
        } else {
          setRecentEntries([]);
          setEntriesPagination(null);
        }
        
        // Log response details
        const entriesCount = stats.recentStockEntries?.items?.length || stats.recentStockEntries?.length || 0;
        const appliedFilters = stats.recentStockEntries?.filters || {};
        console.log('Entries received:', entriesCount);
        console.log('Applied filters:', appliedFilters);
      }
    } catch (error) {
      console.error('Failed to load recent entries:', error);
      toast.error('Failed to load recent entries');
    } finally {
      setEntriesLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use inspector-specific API if user is inspector
      if (isInspector) {
        const dashboardRes = await api.get('/inspector/dashboard');
        const dashboard = dashboardRes.data;
        
        // Set metrics from inspector dashboard
        setMetrics({
          totalWarehouses: dashboard.assignedWarehouses?.length || 0,
          activeWarehouses: dashboard.assignedWarehouses?.filter(w => w.status === 'active').length || 0,
          stockEntriesToday: dashboard.statistics?.entriesToday || 0,
          stockEntriesThisMonth: dashboard.statistics?.entriesThisMonth || 0,
          totalCameras: 0, // Not available in inspector dashboard
          onlineCameras: 0,
          totalStockItems: 0,
          lowStockItems: 0,
          totalInspectors: 0,
        });
        
        // Set recent entries
        if (dashboard.recentActivity && Array.isArray(dashboard.recentActivity)) {
          setRecentEntries(dashboard.recentActivity);
          setEntriesPagination(null); // Inspector API doesn't have pagination for recent activity
        } else {
          setRecentEntries([]);
          setEntriesPagination(null);
        }
        
        // Set trends (empty for inspector)
        setTrends({});
        setChartData([]);
        setTopWarehouses([]);
        setStockDistribution(null);
        setLowStockAlerts([]);
        
        console.log('Inspector dashboard loaded');
        return;
      }
      
      // Build query parameters for admin/permanent secretary
      const params = {
        page: entriesPage,
        limit: entriesLimit,
      };
      
      // Add filters for admin and permanent secretary
      if (canFilterByInspector) {
        if (selectedWarehouseId) {
          params.warehouseId = selectedWarehouseId;
        }
        if (selectedInspectorId) {
          params.inspectorId = selectedInspectorId;
        }
      }
      
      console.log('Fetching dashboard with filters:', params);
      
      // Include pagination and filter parameters for recent entries
      const statsRes = await api.get('/dashboard/stats', {
        params,
      });
      const stats = statsRes.data;

      // Set metrics
      setMetrics({
        totalWarehouses: stats.metrics?.totalWarehouses || 0,
        activeWarehouses: stats.metrics?.activeWarehouses || 0,
        stockEntriesToday: stats.metrics?.stockEntriesToday || 0,
        stockEntriesThisMonth: stats.metrics?.stockEntriesThisMonth || 0,
        totalCameras: stats.metrics?.totalCameras || 0,
        onlineCameras: stats.metrics?.onlineCameras || 0,
        totalStockItems: stats.metrics?.totalStockItems || 0,
        lowStockItems: stats.metrics?.lowStockItems || 0,
        totalInspectors: stats.metrics?.totalInspectors || 0,
      });

      // Set trends
      setTrends(stats.trends || {});

      // Set chart data
      setChartData(stats.chartData || []);

      // Handle recent entries - check if it's an object with items and pagination, or just an array
      if (stats.recentStockEntries) {
        if (stats.recentStockEntries.items && Array.isArray(stats.recentStockEntries.items)) {
          // New format with pagination
          setRecentEntries(stats.recentStockEntries.items || []);
          setEntriesPagination(stats.recentStockEntries.pagination || null);
          const appliedFilters = stats.recentStockEntries.filters || {};
          console.log('Entries received (full load):', stats.recentStockEntries.items.length);
          console.log('Applied filters:', appliedFilters);
        } else if (Array.isArray(stats.recentStockEntries)) {
          // Old format (backward compatibility)
          setRecentEntries(stats.recentStockEntries);
          setEntriesPagination(null);
        } else {
          setRecentEntries([]);
          setEntriesPagination(null);
        }
      } else {
        setRecentEntries([]);
        setEntriesPagination(null);
      }

      // Set top warehouses
      setTopWarehouses(stats.topWarehouses || []);

      // Set stock distribution
      setStockDistribution(stats.stockDistribution || null);

      // Set low stock alerts
      setLowStockAlerts(stats.lowStockAlerts || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination for recent entries
  const handleEntriesPageChange = (newPage) => {
    setEntriesPage(newPage);
    // Scroll to recent entries section
    const entriesSection = document.getElementById('recent-entries-section');
    if (entriesSection) {
      entriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper function to get trend data
  const getTrend = (key) => {
    const trend = trends[key];
    if (!trend) return { value: null, isUp: null };
    return {
      value: `${trend.changeType === 'increase' ? '+' : trend.changeType === 'decrease' ? '-' : ''}${Math.abs(trend.change).toFixed(1)}%`,
      isUp: trend.changeType === 'increase',
    };
  };

  // Filter metric cards based on user role
  const allMetricCards = [
    {
      title: 'Total Warehouses',
      value: metrics.totalWarehouses,
      subtitle: isInspector ? 'Assigned warehouses' : 'All warehouses',
      icon: Warehouse,
      trendKey: 'warehouses',
      color: 'blue',
      showForInspector: true,
    },
    {
      title: 'Active Warehouses',
      value: metrics.activeWarehouses,
      subtitle: 'Currently operational',
      icon: Warehouse,
      trendKey: 'activeWarehouses',
      color: 'green',
      showForInspector: true,
    },
    {
      title: 'Stock Entries Today',
      value: metrics.stockEntriesToday,
      subtitle: 'Entries today',
      icon: Package,
      trendKey: 'stockEntriesToday',
      color: 'purple',
      showForInspector: true,
    },
    {
      title: 'Stock Entries This Month',
      value: metrics.stockEntriesThisMonth,
      subtitle: 'Total this month',
      icon: Package,
      trendKey: 'stockEntriesThisMonth',
      color: 'orange',
      showForInspector: true,
    },
    {
      title: 'Total Stock Items',
      value: metrics.totalStockItems,
      subtitle: 'Unique items',
      icon: Activity,
      trendKey: null,
      color: 'indigo',
      showForInspector: false, // Hide for inspectors
    },
    {
      title: 'Low Stock Alerts',
      value: metrics.lowStockItems,
      subtitle: 'Items need attention',
      icon: AlertTriangle,
      trendKey: null,
      color: 'red',
      showForInspector: false, // Hide for inspectors
    },
    {
      title: 'Total Inspectors',
      value: metrics.totalInspectors,
      subtitle: 'Active inspectors',
      icon: Users,
      trendKey: null,
      color: 'teal',
      showForInspector: false, // Hide for inspectors
    },
    {
      title: 'Online Cameras',
      value: `${metrics.onlineCameras}/${metrics.totalCameras}`,
      subtitle: 'Camera status',
      icon: Video,
      trendKey: null,
      color: 'cyan',
      showForInspector: false, // Hide for inspectors
    },
  ];

  // Filter cards based on role
  const metricCards = isInspector 
    ? allMetricCards.filter(card => card.showForInspector)
    : allMetricCards;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your warehouse operations</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = {
            blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
            green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
            purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
            orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
            indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
            red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
            teal: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
            cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
          };
          const colors = colorClasses[card.color] || colorClasses.blue;
          const trend = card.trendKey ? getTrend(card.trendKey) : null;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                {trend && trend.value && (
                  <div className={`flex items-center text-sm font-medium ${
                    trend.isUp 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trend.isUp ? (
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                    )}
                    {trend.value}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Chart Section - Hide for inspectors */}
      {!isInspector && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Stock Activity - Monthly
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing total stock entries for the last 6 months
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis dataKey="month" stroke="#6b7280" className="dark:stroke-gray-400" />
            <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                border: `1px solid ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
              }}
            />
            <Area
              type="monotone"
              dataKey="entries"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorEntries)"
              name="Total Entries"
            />
            {chartData.length > 0 && chartData[0].in !== undefined && (
              <>
                <Area
                  type="monotone"
                  dataKey="in"
                  stroke="#10b981"
                  fillOpacity={0.3}
                  fill="#10b981"
                  name="Stock IN"
                />
                <Area
                  type="monotone"
                  dataKey="out"
                  stroke="#ef4444"
                  fillOpacity={0.3}
                  fill="#ef4444"
                  name="Stock OUT"
                />
              </>
            )}
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      )}

      {/* Additional Charts Section - Hide for inspectors */}
      {!isInspector && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Distribution Chart */}
        {stockDistribution && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Stock Distribution
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                IN vs OUT stock overview
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Stock IN', value: stockDistribution.totalIn, percentage: stockDistribution.inPercentage },
                    { name: 'Stock OUT', value: stockDistribution.totalOut, percentage: stockDistribution.outPercentage },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stockDistribution.totalIn.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total IN</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stockDistribution.totalOut.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total OUT</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Warehouses Chart */}
        {topWarehouses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Top Warehouses by Activity
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Most active warehouses this month
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topWarehouses.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis type="number" stroke="#6b7280" className="dark:stroke-gray-400" />
                <YAxis 
                  dataKey="warehouseName" 
                  type="category" 
                  width={120}
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    border: `1px solid ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="entriesThisMonth" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Entries This Month" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        </div>
      )}

      {/* Low Stock Alerts - Hide for inspectors */}
      {!isInspector && lowStockAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              Low Stock Alerts
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Items requiring immediate attention
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockAlerts.slice(0, 8).map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alert.alertLevel === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{alert.itemName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{alert.warehouseName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      alert.alertLevel === 'critical'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {alert.netStock}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {alert.alertLevel === 'critical' ? 'Critical' : 'Warning'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Stock Entries Table */}
      <div id="recent-entries-section" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Stock Entries
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Latest stock entry activities
                {entriesPagination && (
                  <span className="ml-2">
                    (Page {entriesPagination.page} of {entriesPagination.totalPages})
                  </span>
                )}
                {selectedWarehouseId && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Warehouse'}
                  </span>
                )}
                {selectedInspectorId && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    {inspectors.find(i => i.id === selectedInspectorId)?.name || 'Inspector'}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Filters for Admin and Permanent Secretary */}
          {canFilterByInspector && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Warehouse
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    const newWarehouseId = e.target.value;
                    setSelectedWarehouseId(newWarehouseId);
                    setEntriesPage(1); // Reset to first page when filter changes
                    
                    // If warehouse changes, check if current inspector is still valid
                    if (newWarehouseId && selectedInspectorId) {
                      const selectedWarehouse = warehouses.find(w => w.id === newWarehouseId);
                      if (selectedWarehouse) {
                        // Check if current inspector is assigned to new warehouse
                        let isInspectorValid = false;
                        
                        if (selectedWarehouse.assignedInspectors && Array.isArray(selectedWarehouse.assignedInspectors)) {
                          isInspectorValid = selectedWarehouse.assignedInspectors.some(ai => ai.id === selectedInspectorId);
                        } else {
                          // Check inspector's assignedWarehouses
                          const currentInspector = inspectors.find(i => i.id === selectedInspectorId);
                          isInspectorValid = currentInspector?.assignedWarehouses?.includes(newWarehouseId) || false;
                        }
                        
                        // Clear inspector if not assigned to new warehouse
                        if (!isInspectorValid) {
                          setSelectedInspectorId('');
                        }
                      }
                    } else if (!newWarehouseId) {
                      // If no warehouse selected, keep inspector selection
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Inspector
                </label>
                <select
                  value={selectedInspectorId}
                  onChange={(e) => {
                    setSelectedInspectorId(e.target.value);
                    setEntriesPage(1); // Reset to first page when filter changes
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Inspectors</option>
                  {getFilteredInspectors().map((inspector) => (
                    <option key={inspector.id} value={inspector.id}>
                      {inspector.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Loading indicator for entries only */}
          {entriesLoading && (
            <div className="mt-4 flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading entries...</span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Inspector
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entriesLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                      Loading entries...
                    </div>
                  </td>
                </tr>
              ) : recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No stock entries found
                    {selectedWarehouseId || selectedInspectorId ? (
                      <span className="block text-xs mt-1">Try adjusting your filters</span>
                    ) : null}
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {entry.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.type === 'IN'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {entry.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.warehouse?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.inspector?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {entriesPagination && entriesPagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing page {entriesPagination.page} of {entriesPagination.totalPages}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500">
                ({entriesPagination.totalItems} total entries)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEntriesPageChange(entriesPage - 1)}
                disabled={!entriesPagination.hasPrevPage}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  entriesPagination.hasPrevPage
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, entriesPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (entriesPagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (entriesPage <= 3) {
                    pageNum = i + 1;
                  } else if (entriesPage >= entriesPagination.totalPages - 2) {
                    pageNum = entriesPagination.totalPages - 4 + i;
                  } else {
                    pageNum = entriesPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handleEntriesPageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pageNum === entriesPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handleEntriesPageChange(entriesPage + 1)}
                disabled={!entriesPagination.hasNextPage}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  entriesPagination.hasNextPage
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
