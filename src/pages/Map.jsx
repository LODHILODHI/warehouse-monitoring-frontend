import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Video, UserCheck } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center updates
function MapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

const Map = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Center map on Pakistan
  const [mapCenter, setMapCenter] = useState([30.3753, 69.3451]);
  const [mapZoom, setMapZoom] = useState(6);

  useEffect(() => {
    fetchMapWarehouses();
  }, []);

  const fetchMapWarehouses = async () => {
    try {
      setLoading(true);
      // Try /map/warehouses first, fallback to /warehouses if it doesn't exist
      let response;
      try {
        response = await api.get('/map/warehouses');
      } catch (mapError) {
        // Fallback to regular warehouses endpoint
        response = await api.get('/warehouses');
        // Transform the response to match expected format
        if (response.data.warehouses) {
          response.data.warehouses = response.data.warehouses.map(wh => ({
            id: wh.id,
            name: wh.name,
            latitude: wh.latitude,
            longitude: wh.longitude
          }));
        }
      }
      
      const warehousesData = response.data.warehouses || [];
      setWarehouses(warehousesData);
      
      // If warehouses exist, center map on first warehouse
      if (warehousesData.length > 0) {
        const firstWarehouse = warehousesData[0];
        setMapCenter([parseFloat(firstWarehouse.latitude), parseFloat(firstWarehouse.longitude)]);
        setMapZoom(8);
      }
    } catch (error) {
      toast.error('Failed to load warehouses for map');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseClick = async (warehouseId) => {
    try {
      const response = await api.get(`/warehouses/${warehouseId}`);
      setSelectedWarehouse(response.data.warehouse);
    } catch (error) {
      toast.error('Failed to load warehouse details');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Warehouse Map</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View all warehouses on the map
        </p>
      </div>

      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" style={{ minHeight: '500px', height: '600px' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={true}
        >
          <MapCenter center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {warehouses.map((warehouse) => (
            <Marker
              key={warehouse.id}
              position={[parseFloat(warehouse.latitude), parseFloat(warehouse.longitude)]}
              eventHandlers={{
                click: () => handleWarehouseClick(warehouse.id),
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900 mb-2">{warehouse.name}</h3>
                  <button
                    onClick={() => handleWarehouseClick(warehouse.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Warehouse Details Panel */}
      {selectedWarehouse && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedWarehouse.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedWarehouse.address}
              </p>
            </div>
            <button
              onClick={() => setSelectedWarehouse(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Coordinates: </span>
              <span className="font-mono text-gray-900 dark:text-white">
                {selectedWarehouse.latitude}, {selectedWarehouse.longitude}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status: </span>
              <span
                className={`font-medium ${
                  selectedWarehouse.status === 'active'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {selectedWarehouse.status}
              </span>
            </div>
            {selectedWarehouse.assignedInspectors && selectedWarehouse.assignedInspectors.length > 0 && (
              <div className="col-span-2">
                <div className="relative pt-2 border-t border-gray-200 dark:border-gray-700">
                  {selectedWarehouse.assignedInspectors.length === 1 ? (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Inspector: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedWarehouse.assignedInspectors[0].name}
                      </span>
                    </div>
                  ) : (
                    <details className="group">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            {selectedWarehouse.assignedInspectorsCount || selectedWarehouse.assignedInspectors.length} Inspectors
                            <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </div>
                      </summary>
                      <div className="absolute z-10 mt-1 left-0 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
                        <div className="space-y-1">
                          {selectedWarehouse.assignedInspectors.map((inspector) => (
                            <div
                              key={inspector.id}
                              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                            >
                              <UserCheck className="w-3 h-3" />
                              <div>
                                <div className="font-medium">{inspector.name}</div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">{inspector.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Cameras: </span>
                  <span className="text-gray-900 dark:text-white">
                    {selectedWarehouse.cameras?.length || 0} camera(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigate(`/camera-streams?warehouse=${selectedWarehouse.id}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    <Video className="w-4 h-4" />
                    View Cameras
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/warehouse/${selectedWarehouse.id}/dashboard`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Full Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
