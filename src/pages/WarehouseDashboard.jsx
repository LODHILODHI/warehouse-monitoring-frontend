import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Video,
  VideoOff,
  Users,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Edit,
  ArrowLeft,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import Hls from 'hls.js';
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

// HLS Video Player Component (reused from CameraStreams)
const HLSVideoPlayer = ({ src, cameraId, autoPlay = true, muted = true }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if it's an HLS stream
    const isHLS = src.includes('.m3u8');
    const isWebPage = src.startsWith('http://') || src.startsWith('https://');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.muted = muted;
          video.play().catch(err => {
            console.log('Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      video.muted = muted;
      if (autoPlay) {
        video.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }
    } else if (!isHLS && !isWebPage) {
      // Direct video URL
      video.src = src;
      video.muted = muted;
      if (autoPlay) {
        video.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }
    }
  }, [src, cameraId, autoPlay, muted]);

  // Check if URL is a web page (like EarthCam)
  const isWebPage = src && (src.startsWith('http://') || src.startsWith('https://')) && !src.includes('.m3u8') && !src.match(/\.(mp4|webm|ogg)$/i);

  if (isWebPage) {
    return (
      <iframe
        key={`iframe-${cameraId}-${src}`}
        src={src}
        className="w-full h-full min-h-[300px] border-0"
        allow="autoplay; fullscreen"
        title="Camera Stream"
      />
    );
  }

  const handleVideoClick = (e) => {
    // Prevent double-click from triggering fullscreen
    // Only allow fullscreen through the native fullscreen button
    e.stopPropagation();
  };

  return (
    <video
      key={`video-${cameraId}-${src}`}
      ref={videoRef}
      controls
      className="w-full h-full min-h-[300px] bg-black rounded-lg"
      playsInline
      muted={muted}
      autoPlay={autoPlay}
      onClick={handleVideoClick}
      onDoubleClick={(e) => {
        // Prevent default double-click behavior (fullscreen)
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, subtitle, trend }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          {Icon && <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend > 0 ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600">+{trend}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-red-600">{trend}%</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Camera Card Component
const CameraCard = ({ camera }) => {
  const isOnline = camera.status === 'online';
  const isHLS = camera.streamUrl && camera.streamUrl.includes('.m3u8');
  const isWebPage = camera.streamUrl && (camera.streamUrl.startsWith('http://') || camera.streamUrl.startsWith('https://')) && !camera.streamUrl.includes('.m3u8') && !camera.streamUrl.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{camera.name}</h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}
        >
          {isOnline ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          {camera.status}
        </span>
      </div>
      <div className="relative bg-black aspect-video">
        {isOnline && camera.streamUrl ? (
          <HLSVideoPlayer src={camera.streamUrl} cameraId={camera.id} autoPlay={true} muted={true} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <div className="text-center">
              <VideoOff className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Camera Offline</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const WarehouseDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [warehouse, setWarehouse] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [stockTrends, setStockTrends] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [stockDistribution, setStockDistribution] = useState([]);
  const [activityTimeline, setActivityTimeline] = useState([]);
  // Pagination state for inventory
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryLimit] = useState(10);
  const [inventoryPagination, setInventoryPagination] = useState(null);

  useEffect(() => {
    if (id) {
      fetchDashboardData();
    }
  }, [id]);

  // Separate function to fetch inventory with pagination
  const fetchInventory = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/warehouses/${id}/inventory`, {
        params: {
          page: inventoryPage,
          limit: inventoryLimit,
        },
      });
      const inventoryData = response.data.inventory;
      setInventory(inventoryData);
      // Set pagination data - check if it exists in response
      if (inventoryData.pagination) {
        setInventoryPagination(inventoryData.pagination);
      } else {
        // If backend doesn't return pagination, create it from available data
        const totalItems = inventoryData.totalItems || (inventoryData.items?.length || 0);
        const totalPages = Math.max(1, Math.ceil(totalItems / inventoryLimit));
        console.log('Pagination calculated:', { totalItems, inventoryLimit, totalPages, currentPage: inventoryPage });
        setInventoryPagination({
          page: inventoryPage,
          limit: inventoryLimit,
          totalPages: totalPages,
          totalItems: totalItems,
          hasNextPage: inventoryPage < totalPages,
          hasPrevPage: inventoryPage > 1,
        });
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    }
  };

  // Fetch inventory when page changes
  useEffect(() => {
    if (id && inventoryPage) {
      fetchInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, inventoryPage]);

  const fetchDashboardData = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // Fetch all data in parallel (inventory is fetched separately with pagination)
      const [
        warehouseRes,
        statsRes,
        recentEntriesRes,
        camerasRes
      ] = await Promise.allSettled([
        api.get(`/warehouses/${id}`),
        api.get(`/warehouses/${id}/stats`),
        api.get(`/warehouses/${id}/recent-entries?limit=10`),
        api.get(`/warehouses/${id}/cameras`)
      ]);

      // Handle warehouse data
      if (warehouseRes.status === 'fulfilled') {
        const warehouseData = warehouseRes.value.data.warehouse;
        setWarehouse(warehouseData);
        setInspectors(warehouseData.assignedInspectors || []);
      } else {
        toast.error('Failed to load warehouse details');
      }

      // Handle stats data
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.statistics);
      } else {
        console.error('Failed to load stats:', statsRes.reason);
      }

      // Handle recent entries
      if (recentEntriesRes.status === 'fulfilled') {
        setRecentEntries(recentEntriesRes.value.data.recentEntries || []);
      } else {
        console.error('Failed to load recent entries:', recentEntriesRes.reason);
      }

      // Handle cameras
      if (camerasRes.status === 'fulfilled') {
        const camerasData = camerasRes.value.data.cameras || [];
        setCameras(camerasData);
        // Set first camera as selected if not already set
        if (camerasData.length > 0 && !selectedCameraId) {
          setSelectedCameraId(camerasData[0].id);
        }
      } else {
        console.error('Failed to load cameras:', camerasRes.reason);
      }

      // Fetch chart data from backend
      try {
        const [trendsRes, topItemsRes, distributionRes, timelineRes] = await Promise.allSettled([
          api.get(`/warehouses/${id}/stock-trends?period=week`),
          api.get(`/warehouses/${id}/top-items?limit=5`),
          api.get(`/warehouses/${id}/stock-distribution`),
          api.get(`/warehouses/${id}/activity-timeline?days=7`)
        ]);

        // Handle stock trends
        if (trendsRes.status === 'fulfilled') {
          setStockTrends(trendsRes.value.data.trends || []);
        } else {
          console.error('Failed to load stock trends:', trendsRes.reason);
          setStockTrends([]);
        }

        // Handle top items
        if (topItemsRes.status === 'fulfilled') {
          setTopItems(topItemsRes.value.data.topItems || []);
        } else {
          console.error('Failed to load top items:', topItemsRes.reason);
          setTopItems([]);
        }

        // Handle stock distribution
        if (distributionRes.status === 'fulfilled') {
          setStockDistribution(distributionRes.value.data.distribution || []);
        } else {
          console.error('Failed to load stock distribution:', distributionRes.reason);
          setStockDistribution([]);
        }

        // Handle activity timeline
        if (timelineRes.status === 'fulfilled') {
          setActivityTimeline(timelineRes.value.data.timeline || []);
        } else {
          console.error('Failed to load activity timeline:', timelineRes.reason);
          setActivityTimeline([]);
        }
      } catch (chartError) {
        console.error('Error fetching chart data:', chartError);
        setStockTrends([]);
        setTopItems([]);
        setStockDistribution([]);
        setActivityTimeline([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setInventoryPage(1); // Reset to first page on refresh
    fetchDashboardData();
  };

  // Handle inventory pagination
  const handleInventoryPageChange = (newPage) => {
    setInventoryPage(newPage);
    // Scroll to inventory section
    const inventorySection = document.getElementById('inventory-section');
    if (inventorySection) {
      inventorySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Warehouse not found</p>
        <button
          onClick={() => navigate('/map')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Map
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/map')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{warehouse.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{warehouse.address}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  warehouse.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}
              >
                {warehouse.status}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {warehouse.latitude}, {warehouse.longitude}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => navigate(`/warehouses?edit=${warehouse.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Warehouse
            </button>
          )}
        </div>
      </div>

      {/* Main Content: YouTube-style Layout */}
      {/* Video Section: Main Player + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Player (Left - 3 columns) */}
          <div className="lg:col-span-3">
            {cameras.length > 0 && (
              <div>
                {(() => {
                  // Use selectedCameraId if set, otherwise use first camera
                  const currentCameraId = selectedCameraId || cameras[0]?.id;
                  const selectedCamera = cameras.find(c => c.id === currentCameraId) || cameras[0];
                  if (!selectedCamera) return null;
                  
                  return (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{selectedCamera.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            selectedCamera.status === 'online'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {selectedCamera.status === 'online' ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                          {selectedCamera.status}
                        </span>
                      </div>
                      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                        {selectedCamera.status === 'online' && selectedCamera.streamUrl ? (
                          <HLSVideoPlayer 
                            key={`main-${selectedCamera.id}-${selectedCamera.streamUrl}`}
                            src={selectedCamera.streamUrl} 
                            cameraId={selectedCamera.id} 
                            autoPlay={true} 
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                            <div className="text-center">
                              <VideoOff className="w-12 h-12 mx-auto mb-2" />
                              <p className="text-sm">Camera Offline</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Camera Thumbnails Sidebar (Right - 1 column) */}
          <div className="lg:col-span-1">
            {cameras.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2">
                  Other Cameras ({cameras.length - 1})
                </h3>
                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {cameras
                    .filter(camera => {
                      const currentCameraId = selectedCameraId || cameras[0]?.id;
                      return camera.id !== currentCameraId;
                    })
                    .map((camera) => (
                      <button
                        key={camera.id}
                        onClick={() => setSelectedCameraId(camera.id)}
                        className={`w-full bg-white dark:bg-gray-800 rounded-lg border overflow-hidden shadow-sm transition-all hover:shadow-md text-left ${
                          selectedCameraId === camera.id
                            ? 'border-blue-500 ring-2 ring-blue-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                        }`}
                      >
                        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                          {camera.status === 'online' && camera.streamUrl ? (
                            <HLSVideoPlayer 
                              key={`thumb-${camera.id}-${camera.streamUrl}`}
                              src={camera.streamUrl} 
                              cameraId={camera.id} 
                              autoPlay={true}
                              muted={true}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                              <VideoOff className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                camera.status === 'online'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {camera.status === 'online' ? <Video className="w-2.5 h-2.5" /> : <VideoOff className="w-2.5 h-2.5" />}
                            </span>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{camera.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {camera.status === 'online' ? 'Live' : 'Offline'}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Statistics Cards Section (Below Video) */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Entries"
              value={stats.stockEntries?.total || 0}
              icon={Package}
              subtitle={`${stats.stockEntries?.thisMonth || 0} this month`}
            />
            <StatCard
              title="Entries Today"
              value={stats.stockEntries?.today || 0}
              icon={Calendar}
              subtitle={`${stats.stockEntries?.thisWeek || 0} this week`}
            />
            <StatCard
              title="Net Stock"
              value={stats.stockSummary?.netStock || 0}
              icon={Activity}
              subtitle={`IN: ${stats.stockSummary?.totalIn || 0} | OUT: ${stats.stockSummary?.totalOut || 0}`}
            />
            <StatCard
              title="Online Cameras"
              value={`${stats.cameras?.online || 0}/${stats.cameras?.total || 0}`}
              icon={Video}
              subtitle={`${stats.cameras?.offline || 0} offline`}
            />
            <StatCard
              title="Assigned Inspectors"
              value={stats.inspectors?.assigned || 0}
              icon={Users}
            />
            <StatCard
              title="Total IN"
              value={stats.stockSummary?.totalIn || 0}
              icon={TrendingUp}
            />
            <StatCard
              title="Total OUT"
              value={stats.stockSummary?.totalOut || 0}
              icon={TrendingDown}
            />
            <StatCard
              title="This Month"
              value={stats.stockEntries?.thisMonth || 0}
              icon={Package}
              subtitle={stats.lastActivity ? `Last: ${format(new Date(stats.lastActivity), 'MMM dd, HH:mm')}` : 'No activity'}
            />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Stock Trends Chart */}
          {stockTrends.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Stock Movement Trends (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stockTrends}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="in" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorIn)" 
                  name="Stock IN"
                />
                <Area 
                  type="monotone" 
                  dataKey="out" 
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorOut)" 
                  name="Stock OUT"
                />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Items Chart */}
          {topItems.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Top Items by Net Stock
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis 
                  dataKey="itemName" 
                  type="category" 
                  width={100}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="netStock" fill="#8b5cf6" radius={[0, 8, 8, 0]}>
                  {topItems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8b5cf6', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'][index % 5]} />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stock Distribution Pie Chart */}
          {stockDistribution.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Stock Movement Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                <Pie
                  data={stockDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'IN' ? '#10b981' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Activity Timeline */}
          {activityTimeline.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Activity Timeline (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="entries" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Stock Entries"
                />
                <Line 
                  type="monotone" 
                  dataKey="inspectors" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Active Inspectors"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

      {/* Recent Stock Activity */}
      {recentEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Recent Stock Activity
            </h2>
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
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentEntries.map((entry) => (
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
                      {entry.inspector?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Summary */}
      {inventory && (
        <div id="inventory-section" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Inventory Summary
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {inventory.totalItems} items • {inventory.lowStockItems} low stock
              {inventoryPagination && (
                <span className="ml-2">
                  (Page {inventoryPagination.page} of {inventoryPagination.totalPages})
                </span>
              )}
            </p>
          </div>
          {inventory.lowStockAlerts && inventory.lowStockAlerts.length > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Low Stock Alerts</h3>
              </div>
              <div className="space-y-1">
                {inventory.lowStockAlerts.map((alert, idx) => (
                  <div key={idx} className="text-sm text-yellow-700 dark:text-yellow-400">
                    <span className="font-medium">{alert.itemName}:</span> Only {alert.netStock} units remaining
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total IN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total OUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Net Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Entries
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {inventory.items && inventory.items.length > 0 ? (
                  inventory.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.itemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.totalIn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.totalOut}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                          item.netStock < 10
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {item.netStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.entryCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No inventory data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {inventoryPagination && inventoryPagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing page {inventoryPagination.page} of {inventoryPagination.totalPages}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  ({inventoryPagination.totalItems} total items)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInventoryPageChange(inventoryPage - 1)}
                  disabled={!inventoryPagination.hasPrevPage}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    inventoryPagination.hasPrevPage
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, inventoryPagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (inventoryPagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (inventoryPage <= 3) {
                      pageNum = i + 1;
                    } else if (inventoryPage >= inventoryPagination.totalPages - 2) {
                      pageNum = inventoryPagination.totalPages - 4 + i;
                    } else {
                      pageNum = inventoryPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handleInventoryPageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          pageNum === inventoryPage
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
                  onClick={() => handleInventoryPageChange(inventoryPage + 1)}
                  disabled={!inventoryPagination.hasNextPage}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    inventoryPagination.hasNextPage
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
      )}

      {/* Assigned Inspectors */}
      {inspectors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assigned Inspectors
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspectors.map((inspector) => (
                <div
                  key={inspector.id}
                  className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {inspector.name?.charAt(0).toUpperCase() || 'I'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {inspector.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {inspector.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseDashboard;
