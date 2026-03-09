import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FileText, User, Hash, Globe, Clock } from 'lucide-react';
import { format } from 'date-fns';

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    entityId: '',
    userId: '',
    limit: 50,
    from: '',
    to: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.entityId) params.append('entityId', filters.entityId);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.limit) params.append('limit', String(Math.min(200, Math.max(1, filters.limit))));
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      const { data } = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(data.auditLogs || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchLogs();
    }
  }, [user?.role]);

  const parseDetails = (details) => {
    if (!details) return null;
    try {
      return typeof details === 'string' ? JSON.parse(details) : details;
    } catch {
      return details;
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Access denied. Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit logs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Activity and change history</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Action</label>
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="e.g. warehouse_created"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Entity type</label>
          <input
            type="text"
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            placeholder="e.g. warehouse, user"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-32"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Entity ID</label>
          <input
            type="text"
            value={filters.entityId}
            onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
            placeholder="UUID"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-48"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">User ID</label>
          <input
            type="text"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            placeholder="Who did it"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Limit</label>
          <input
            type="number"
            min={1}
            max={200}
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) || 50 })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Who</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entity type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entity ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const detailsObj = parseDetails(log.details);
                    const detailsStr = detailsObj != null
                      ? (typeof detailsObj === 'object' ? JSON.stringify(detailsObj) : String(detailsObj))
                      : log.details ?? '—';
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            {log.user?.name ?? '—'} ({log.user?.email ?? '—'})
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{log.action ?? '—'}</td>
                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">{log.entityType ?? '—'}</td>
                        <td className="px-6 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Hash className="w-4 h-4 text-gray-400" />
                            {log.entityId ? `${log.entityId.slice(0, 8)}…` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={detailsStr}>
                          {detailsStr !== '—' ? detailsStr.slice(0, 60) + (detailsStr.length > 60 ? '…' : '') : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-gray-400" />
                            {log.ipAddress ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
