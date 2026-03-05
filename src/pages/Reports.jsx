import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FileText, Download } from 'lucide-react';
import {
  LineChart,
  Line,
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
import { format, subDays } from 'date-fns';

const Reports = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [stockType, setStockType] = useState('');
  const [stockReport, setStockReport] = useState(null);
  const [warehouseAnalytics, setWarehouseAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseAnalytics();
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      toast.error('Failed to load warehouses');
    }
  };

  const fetchStockReport = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
      if (selectedWarehouse) params.warehouseId = selectedWarehouse;
      if (stockType) params.type = stockType;

      const response = await api.get('/reports/stock', { params });
      setStockReport(response.data);
    } catch (error) {
      toast.error('Failed to load stock report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseAnalytics = async () => {
    if (!selectedWarehouse) return;
    try {
      const response = await api.get(`/reports/warehouse/${selectedWarehouse}`);
      setWarehouseAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load warehouse analytics');
      console.error(error);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View detailed reports and analytics</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={stockType}
              onChange={(e) => setStockType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
        </div>
        <button
          onClick={fetchStockReport}
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {/* Stock Report */}
      {stockReport && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Stock Report
            </h2>
            <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stockReport.totalEntries || 0}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">IN Entries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stockReport.inEntries || 0}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">OUT Entries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stockReport.outEntries || 0}
              </p>
            </div>
          </div>
          {stockReport.chartData && stockReport.chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockReport.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="date" stroke="#6b7280" className="dark:stroke-gray-400" />
                <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    border: `1px solid ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="entries" stroke="#3b82f6" name="Entries" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Warehouse Analytics */}
      {warehouseAnalytics && selectedWarehouse && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Warehouse Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warehouseAnalytics.chartData && warehouseAnalytics.chartData.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Entries Over Time
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={warehouseAnalytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis dataKey="date" stroke="#6b7280" className="dark:stroke-gray-400" />
                    <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                        border: `1px solid ${document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="entries" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {warehouseAnalytics.inOutTotals && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  IN vs OUT
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'IN', value: warehouseAnalytics.inOutTotals.in || 0 },
                        { name: 'OUT', value: warehouseAnalytics.inOutTotals.out || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[warehouseAnalytics.inOutTotals.in || 0, warehouseAnalytics.inOutTotals.out || 0].map(
                        (entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
