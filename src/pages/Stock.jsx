import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Package, Search, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const Stock = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Inspector filter (Super Admin and Permanent Secretary)
  const [inspectors, setInspectors] = useState([]);
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [formData, setFormData] = useState({
    warehouseId: '',
    type: 'IN',
    itemName: '',
    quantity: '',
    notes: '',
  });

  // Role checks - define before use
  const isSuperAdmin = user?.role === 'super_admin';
  const isInspector = user?.role === 'inspector';
  const isPermanentSecretary = user?.role === 'permanent_secretary';
  const canCreateEdit = isSuperAdmin || (isInspector && !isPermanentSecretary);
  const canFilterByInspector = isSuperAdmin || isPermanentSecretary;
  const assignedWarehouses = warehouses; // In real app, filter by assignment

  useEffect(() => {
    fetchWarehouses();
    if (canFilterByInspector) {
      fetchInspectors();
    }
  }, []);

  useEffect(() => {
    // For inspectors, fetch all entries (warehouse filter is optional)
    // For admin/permanent secretary, require warehouse selection
    if (isInspector) {
      fetchStockEntries(selectedWarehouse || null);
    } else if (warehouses.length > 0 && selectedWarehouse) {
      fetchStockEntries(selectedWarehouse);
    }
  }, [warehouses, selectedWarehouse, selectedInspectorId, filterType]);

  // Fetch inspectors for admin filter
  const fetchInspectors = async () => {
    try {
      const response = await api.get('/users');
      const inspectorsList = (response.data.users || []).filter(
        (u) => u.role === 'inspector'
      );
      setInspectors(inspectorsList);
      console.log('Inspectors loaded:', inspectorsList.length);
      console.log('Inspectors data:', inspectorsList);
    } catch (error) {
      console.error('Failed to load inspectors:', error);
    }
  };

  // Get filtered inspectors based on selected warehouse
  const getFilteredInspectors = () => {
    if (!selectedWarehouse) {
      console.log('No warehouse selected, returning all inspectors:', inspectors.length);
      return inspectors;
    }
    
    const selectedWarehouseData = warehouses.find(w => w.id === selectedWarehouse);
    if (!selectedWarehouseData) {
      console.log('Warehouse not found, returning all inspectors');
      return inspectors;
    }
    
    console.log('Selected warehouse:', selectedWarehouseData.name);
    console.log('Warehouse has assignedInspectors:', !!selectedWarehouseData.assignedInspectors);
    console.log('Total inspectors available:', inspectors.length);
    
    // If warehouse has assignedInspectors array, use it
    if (selectedWarehouseData.assignedInspectors && Array.isArray(selectedWarehouseData.assignedInspectors) && selectedWarehouseData.assignedInspectors.length > 0) {
      const assignedInspectorIds = selectedWarehouseData.assignedInspectors.map(ai => ai.id);
      const filtered = inspectors.filter(inspector => assignedInspectorIds.includes(inspector.id));
      console.log('Filtered inspectors (from warehouse.assignedInspectors):', filtered.length, filtered.map(i => i.name));
      return filtered.length > 0 ? filtered : inspectors; // Fallback to all if filtered is empty
    }
    
    // Otherwise, check inspector's assignedWarehouses array
    const filtered = inspectors.filter(inspector => {
      if (!inspector.assignedWarehouses || !Array.isArray(inspector.assignedWarehouses)) {
        return false;
      }
      return inspector.assignedWarehouses.includes(selectedWarehouse);
    });
    console.log('Filtered inspectors (from inspector.assignedWarehouses):', filtered.length);
    console.log('Inspectors with assignedWarehouses:', inspectors.filter(i => i.assignedWarehouses?.length > 0).length);
    
    // If no filtered inspectors found and we can't determine relationship, show all inspectors
    if (filtered.length === 0) {
      console.log('No filtered inspectors found, showing all inspectors as fallback');
      return inspectors;
    }
    
    return filtered;
  };

  // Clear inspector selection if it's not valid for selected warehouse
  useEffect(() => {
    if (selectedWarehouse && selectedInspectorId) {
      const filteredInspectors = getFilteredInspectors();
      const isInspectorValid = filteredInspectors.some(i => i.id === selectedInspectorId);
      if (!isInspectorValid) {
        setSelectedInspectorId('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse, warehouses, inspectors]);

  const fetchWarehouses = async () => {
    try {
      // Use inspector-specific API if user is inspector
      const endpoint = isInspector ? '/inspector/warehouses' : '/warehouses';
      const response = await api.get(endpoint);
      const warehousesData = response.data.warehouses || [];
      setWarehouses(warehousesData);
      console.log('Warehouses loaded:', warehousesData.length);
      // Check if warehouses have assignedInspectors
      if (warehousesData.length > 0) {
        const firstWarehouse = warehousesData[0];
        console.log('First warehouse:', firstWarehouse.name);
        console.log('Has assignedInspectors:', !!firstWarehouse.assignedInspectors);
        console.log('assignedInspectors:', firstWarehouse.assignedInspectors);
      }
      if (warehousesData.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(warehousesData[0].id);
      }
    } catch (error) {
      toast.error('Failed to load warehouses');
      console.error(error);
    }
  };

  const fetchStockEntries = async (warehouseId) => {
    if (!warehouseId && !isInspector) {
      setStockEntries([]);
      return;
    }
    try {
      setLoading(true);
      
      // Use inspector-specific API if user is inspector
      if (isInspector) {
        // For inspectors, use /api/inspector/stock endpoint
        const params = new URLSearchParams();
        if (warehouseId) {
          params.append('warehouseId', warehouseId);
        }
        if (filterType) {
          params.append('type', filterType);
        }
        
        const queryString = params.toString();
        const url = `/inspector/stock${queryString ? `?${queryString}` : ''}`;
        
        console.log('Fetching stock entries (inspector API):', { warehouseId, type: filterType || null });
        
        const response = await api.get(url);
        const entries = response.data.entries || [];
        
        // Add warehouse info to each entry
        const entriesWithWarehouse = entries.map((entry) => ({
          ...entry,
          warehouse: entry.warehouse || warehouses.find((w) => w.id === entry.warehouseId),
        }));
        setStockEntries(entriesWithWarehouse);
        
        console.log('Entries received (inspector API):', entries.length);
      } else {
        // For admin/permanent secretary, use regular /stock/:warehouseId endpoint
        const params = new URLSearchParams();
        if (canFilterByInspector && selectedInspectorId) {
          params.append('inspectorId', selectedInspectorId);
        }
        
        const queryString = params.toString();
        const url = `/stock/${warehouseId}${queryString ? `?${queryString}` : ''}`;
        
        console.log('Fetching stock entries with filters:', { warehouseId, inspectorId: selectedInspectorId || null });
        
        const response = await api.get(url);
        const entries = response.data.stockEntries || [];
        
        // Add warehouse info to each entry
        const warehouse = warehouses.find((w) => w.id === warehouseId);
        const entriesWithWarehouse = entries.map((entry) => ({
          ...entry,
          warehouse: entry.warehouse || warehouse,
        }));
        setStockEntries(entriesWithWarehouse);
        
        console.log('Entries received:', entries.length);
        if (response.data.filters) {
          console.log('Applied filters:', response.data.filters);
        }
      }
    } catch (error) {
      // Handle 403 Forbidden gracefully (e.g., for permanent_secretary role)
      if (error.response?.status === 403) {
        setStockEntries([]);
        // Don't show error toast for permission issues, just show empty list
      } else {
        toast.error('Failed to load stock entries');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const [editingEntry, setEditingEntry] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity),
      };
      if (editingEntry) {
        await api.put(`/stock/entry/${editingEntry.id}`, payload);
        toast.success('Stock entry updated successfully!');
      } else {
        await api.post('/stock', payload);
        toast.success('Stock entry created successfully!');
      }
      setShowForm(false);
      setEditingEntry(null);
      setFormData({
        warehouseId: '',
        type: 'IN',
        itemName: '',
        quantity: '',
        notes: '',
      });
      if (selectedWarehouse) {
        fetchStockEntries(selectedWarehouse);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save stock entry');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      warehouseId: entry.warehouseId,
      type: entry.type,
      itemName: entry.itemName,
      quantity: entry.quantity.toString(),
      notes: entry.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this stock entry?')) {
      return;
    }
    try {
      await api.delete(`/stock/entry/${entryId}`);
      toast.success('Stock entry deleted successfully!');
      if (selectedWarehouse) {
        fetchStockEntries(selectedWarehouse);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete stock entry');
    }
  };

  // Filter stock entries
  const filteredEntries = stockEntries.filter((entry) => {
    if (filterType && entry.type !== filterType) return false;
    if (
      searchTerm &&
      !entry.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  if (loading && stockEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Entries</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage stock entries and inventory</p>
        </div>
        {canCreateEdit && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingEntry(null);
              setFormData({
                warehouseId: '',
                type: 'IN',
                itemName: '',
                quantity: '',
                notes: '',
              });
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'Create Entry'}
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && canCreateEdit && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingEntry ? 'Edit Stock Entry' : 'Create Stock Entry'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Warehouse *
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouseId: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select warehouse</option>
                  {assignedWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) =>
                    setFormData({ ...formData, itemName: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Product ABC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEntry ? 'Update Entry' : 'Create Entry'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEntry(null);
                }}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Warehouse Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isInspector ? 'Select Warehouse (Optional)' : 'Select Warehouse'}
        </label>
        <select
          value={selectedWarehouse}
          onChange={(e) => {
            const newWarehouseId = e.target.value;
            setSelectedWarehouse(newWarehouseId);
            
            // If warehouse changes, check if current inspector is still valid
            if (newWarehouseId && selectedInspectorId && canFilterByInspector) {
              const selectedWarehouseData = warehouses.find(w => w.id === newWarehouseId);
              if (selectedWarehouseData) {
                let isInspectorValid = false;
                
                if (selectedWarehouseData.assignedInspectors && Array.isArray(selectedWarehouseData.assignedInspectors)) {
                  isInspectorValid = selectedWarehouseData.assignedInspectors.some(ai => ai.id === selectedInspectorId);
                } else {
                  const currentInspector = inspectors.find(i => i.id === selectedInspectorId);
                  isInspectorValid = currentInspector?.assignedWarehouses?.includes(newWarehouseId) || false;
                }
                
                if (!isInspectorValid) {
                  setSelectedInspectorId('');
                }
              }
            } else if (!newWarehouseId) {
              setSelectedInspectorId('');
            }
          }}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">{isInspector ? 'All Assigned Warehouses' : 'Select a warehouse'}</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filters */}
      {(selectedWarehouse || isInspector) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Inspector Filter - For Super Admin and Permanent Secretary */}
            {canFilterByInspector && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Inspector
                </label>
                <select
                  value={selectedInspectorId}
                  onChange={(e) => {
                    setSelectedInspectorId(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Inspectors</option>
                  {getFilteredInspectors().length > 0 ? (
                    getFilteredInspectors().map((inspector) => (
                      <option key={inspector.id} value={inspector.id}>
                        {inspector.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No inspectors found for this warehouse
                    </option>
                  )}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>
            <div className={canFilterByInspector ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Item
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by item name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Entries Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stock Entries</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {filteredEntries.length} entries found
            {selectedWarehouse && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                {warehouses.find(w => w.id === selectedWarehouse)?.name || 'Warehouse'}
              </span>
            )}
            {selectedInspectorId && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                {inspectors.find(i => i.id === selectedInspectorId)?.name || 'Inspector'}
              </span>
            )}
          </p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
                {canCreateEdit && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={canCreateEdit ? 8 : 7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No stock entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
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
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                    {canCreateEdit && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {/* Super Admin can edit/delete any entry, Inspector can only edit/delete own entries */}
                          {(isSuperAdmin || (isInspector && entry.inspector?.id === user?.id)) && (
                            <>
                              <button
                                onClick={() => handleEdit(entry)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Stock;
