import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, MapPin, CheckCircle, XCircle, Edit, Trash2, Camera, Video, VideoOff, ChevronDown, ChevronUp, UserCheck, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';

const Warehouses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [expandedWarehouses, setExpandedWarehouses] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [showCameraForm, setShowCameraForm] = useState(null);
  const [editingCamera, setEditingCamera] = useState(null);
  const [cameraFormData, setCameraFormData] = useState({
    name: '',
    ipAddress: '',
    streamUrl: '',
    status: 'online',
    location: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    status: 'active',
    capacity: '',
  });

  useEffect(() => {
    fetchWarehouses();
    fetchCameras();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      // Use inspector-specific API if user is inspector
      const endpoint = user?.role === 'inspector' ? '/inspector/warehouses' : '/warehouses';
      const response = await api.get(endpoint);
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      toast.error('Failed to load warehouses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCameras = async () => {
    try {
      const response = await api.get('/cameras');
      setCameras(response.data.cameras || []);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const toggleWarehouse = useCallback((warehouseId) => {
    if (!warehouseId) return;
    
    const idKey = String(warehouseId);
    
    setExpandedWarehouses((prev) => {
      const isCurrentlyExpanded = Boolean(prev[idKey]);
      
      if (isCurrentlyExpanded) {
        // Remove this warehouse from expanded list
        const updated = { ...prev };
        delete updated[idKey];
        return updated;
      } else {
        // Add this warehouse to expanded list
        return { ...prev, [idKey]: true };
      }
    });
  }, []);
  
  const isWarehouseExpanded = useCallback((warehouseId) => {
    if (!warehouseId) return false;
    const idKey = String(warehouseId);
    return Boolean(expandedWarehouses[idKey]);
  }, [expandedWarehouses]);

  const getWarehouseCameras = (warehouseId) => {
    return cameras.filter((camera) => camera.warehouseId === warehouseId);
  };

  const handleCameraSubmit = async (e, warehouseId) => {
    e.preventDefault();
    try {
      const payload = {
        warehouseId: warehouseId,
        name: cameraFormData.name,
        streamUrl: cameraFormData.streamUrl,
        ipAddress: cameraFormData.ipAddress,
        status: cameraFormData.status,
        location: cameraFormData.location || undefined,
      };
      if (editingCamera) {
        await api.put(`/cameras/${editingCamera.id}`, payload);
        toast.success('Camera updated successfully!');
      } else {
        await api.post('/cameras', payload);
        toast.success('Camera created successfully!');
      }
      setShowCameraForm(null);
      setEditingCamera(null);
      setCameraFormData({
        name: '',
        ipAddress: '',
        streamUrl: '',
        status: 'online',
        location: '',
      });
      fetchCameras();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save camera');
    }
  };

  const handleCameraEdit = (camera) => {
    setEditingCamera(camera);
    setCameraFormData({
      name: camera.name,
      ipAddress: camera.ipAddress || '',
      streamUrl: camera.streamUrl || '',
      status: camera.status,
      location: camera.location || '',
    });
    setShowCameraForm(camera.warehouseId);
  };

  const handleCameraDelete = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) {
      return;
    }
    try {
      await api.delete(`/cameras/${cameraId}`);
      toast.success('Camera deleted successfully!');
      fetchCameras();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete camera');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const capacityVal = formData.capacity === '' || formData.capacity == null
        ? null
        : parseInt(formData.capacity, 10);
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        capacity: Number.isNaN(capacityVal) ? null : capacityVal,
      };
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.id}`, payload);
        toast.success('Warehouse updated successfully!');
      } else {
        await api.post('/warehouses', payload);
        toast.success('Warehouse created successfully!');
      }
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        address: '',
        status: 'active',
        capacity: '',
      });
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save warehouse');
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      address: warehouse.address,
      status: warehouse.status,
      capacity: warehouse.capacity != null ? String(warehouse.capacity) : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (warehouseId) => {
    if (!window.confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/warehouses/${warehouseId}`);
      toast.success('Warehouse deleted successfully!');
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete warehouse');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isPermanentSecretary = user?.role === 'permanent_secretary';

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Warehouses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your warehouse locations</p>
        </div>
        {isSuperAdmin && !isPermanentSecretary && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingWarehouse(null);
              setFormData({
                name: '',
                latitude: '',
                longitude: '',
                address: '',
                status: 'active',
                capacity: '',
              });
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'Create Warehouse'}
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && isSuperAdmin && !isPermanentSecretary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Warehouse A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="40.7128"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="-74.0060"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="123 Main St, City, State 12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacity (optional)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g. 1000"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max units; leave empty for no limit.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingWarehouse(null);
                }}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {warehouses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            No warehouses found
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              data-warehouse-id={warehouse.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow self-start"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {warehouse.name}
                </h3>
                <div className="flex items-center gap-2">
                  {warehouse.status === 'active' ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                  {isSuperAdmin && !isPermanentSecretary && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(warehouse)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(warehouse.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1">{warehouse.address}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Coordinates: </span>
                  <span className="font-mono dark:text-gray-300">
                    {warehouse.latitude}, {warehouse.longitude}
                  </span>
                </div>
                {warehouse.capacity != null && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Capacity: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{warehouse.capacity}</span>
                  </div>
                )}
                {warehouse.createdAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                    Created: {(() => {
                      try {
                        const date = new Date(warehouse.createdAt);
                        if (isNaN(date.getTime())) {
                          return 'N/A';
                        }
                        return format(date, 'MMM dd, yyyy');
                      } catch (error) {
                        return 'N/A';
                      }
                    })()}
                  </div>
                )}
                {warehouse.assignedInspectors && warehouse.assignedInspectors.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <div className="relative">
                      {warehouse.assignedInspectors.length === 1 ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Inspector: <span className="font-medium text-gray-900 dark:text-white">{warehouse.assignedInspectors[0].name}</span>
                          </span>
                        </div>
                      ) : (
                        <details className="group">
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                {warehouse.assignedInspectorsCount || warehouse.assignedInspectors.length} Inspectors
                                <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </div>
                          </summary>
                          <div className="absolute z-10 mt-1 left-0 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
                            <div className="space-y-1">
                              {warehouse.assignedInspectors.map((inspector) => (
                                <div
                                  key={inspector.id}
                                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  {inspector.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cameras Section */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Button clicked for warehouse:', warehouse.id, 'Name:', warehouse.name);
                    toggleWarehouse(warehouse.id);
                  }}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span>Cameras ({getWarehouseCameras(warehouse.id).length})</span>
                  </div>
                  {isWarehouseExpanded(warehouse.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {isWarehouseExpanded(warehouse.id) && (
                  <div className="mt-3 space-y-3">
                    {isSuperAdmin && !isPermanentSecretary && (
                      <button
                        onClick={() => {
                          setShowCameraForm(warehouse.id);
                          setEditingCamera(null);
                          setCameraFormData({
                            name: '',
                            ipAddress: '',
                            streamUrl: '',
                            status: 'online',
                            location: '',
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Camera
                      </button>
                    )}

                    {/* Camera Form */}
                    {showCameraForm === warehouse.id && isSuperAdmin && !isPermanentSecretary && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          {editingCamera ? 'Edit Camera' : 'Add New Camera'}
                        </h4>
                        <form onSubmit={(e) => handleCameraSubmit(e, warehouse.id)} className="space-y-3">
                          <div>
                            <label htmlFor={`camera-name-${warehouse.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Camera Name *
                            </label>
                            <input
                              id={`camera-name-${warehouse.id}`}
                              name={`camera-name-${warehouse.id}`}
                              type="text"
                              placeholder="Camera Name *"
                              value={cameraFormData.name}
                              onChange={(e) =>
                                setCameraFormData({ ...cameraFormData, name: e.target.value })
                              }
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor={`camera-stream-${warehouse.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Stream URL *
                            </label>
                            <input
                              id={`camera-stream-${warehouse.id}`}
                              name={`camera-stream-${warehouse.id}`}
                              type="text"
                              placeholder="Stream URL * (e.g., rtsp://192.168.1.100:554/stream)"
                              value={cameraFormData.streamUrl}
                              onChange={(e) =>
                                setCameraFormData({ ...cameraFormData, streamUrl: e.target.value })
                              }
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor={`camera-ip-${warehouse.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                IP Address
                              </label>
                              <input
                                id={`camera-ip-${warehouse.id}`}
                                name={`camera-ip-${warehouse.id}`}
                                type="text"
                                placeholder="IP Address"
                                value={cameraFormData.ipAddress}
                                onChange={(e) =>
                                  setCameraFormData({ ...cameraFormData, ipAddress: e.target.value })
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label htmlFor={`camera-status-${warehouse.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Status
                              </label>
                              <select
                                id={`camera-status-${warehouse.id}`}
                                name={`camera-status-${warehouse.id}`}
                                value={cameraFormData.status}
                                onChange={(e) =>
                                  setCameraFormData({ ...cameraFormData, status: e.target.value })
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                <option value="online">Online</option>
                                <option value="offline">Offline</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label htmlFor={`camera-location-${warehouse.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Location (optional)
                            </label>
                            <input
                              id={`camera-location-${warehouse.id}`}
                              name={`camera-location-${warehouse.id}`}
                              type="text"
                              placeholder="Location (optional)"
                              value={cameraFormData.location}
                              onChange={(e) =>
                                setCameraFormData({ ...cameraFormData, location: e.target.value })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {editingCamera ? 'Update' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCameraForm(null);
                                setEditingCamera(null);
                              }}
                              className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Cameras List */}
                    {getWarehouseCameras(warehouse.id).length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                        No cameras found
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {getWarehouseCameras(warehouse.id).map((camera) => (
                          <div
                            key={camera.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {camera.status === 'online' ? (
                                <Video className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <VideoOff className="w-4 h-4 text-gray-400" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {camera.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {camera.ipAddress}
                                  {camera.location && ` • ${camera.location}`}
                                </p>
                              </div>
                            </div>
                            {isSuperAdmin && !isPermanentSecretary && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleCameraEdit(camera)}
                                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleCameraDelete(camera.id)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View Full Dashboard Button */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigate(`/warehouse/${warehouse.id}/dashboard`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  View Full Dashboard
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Warehouses;
