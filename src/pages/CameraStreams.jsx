import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Video, VideoOff, RefreshCw, LayoutDashboard } from 'lucide-react';
import Hls from 'hls.js';

// HLS Video Player Component
const HLSVideoPlayer = ({ src, warehouseId, cameraId, autoPlay = true }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Check if it's an HLS stream
    const isHLS = src.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for HLS streams
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
          video.play().catch(err => {
            console.log('Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, destroying HLS instance');
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      if (autoPlay) {
        video.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }
    } else if (!isHLS) {
      // Regular video stream
      video.src = src;
      if (autoPlay) {
        video.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }
    }

    return () => {
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, [src, warehouseId, cameraId, autoPlay]);

  return (
    <video
      ref={videoRef}
      key={`${warehouseId}-${cameraId}-${src}`}
      controls
      className="w-full h-full object-contain"
      muted
      playsInline
    />
  );
};

const CameraStreams = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Update selected warehouse when URL parameter changes
  useEffect(() => {
    const warehouseIdFromUrl = searchParams.get('warehouse');
    if (warehouseIdFromUrl && warehouses.length > 0) {
      const warehouseExists = warehouses.find(wh => wh.id === warehouseIdFromUrl);
      if (warehouseExists && selectedWarehouse !== warehouseIdFromUrl) {
        setSelectedWarehouse(warehouseIdFromUrl);
      }
    }
  }, [searchParams, warehouses, selectedWarehouse]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseCameras(selectedWarehouse);
    } else {
      setCameras([]);
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/warehouses');
      const warehousesData = response.data.warehouses || [];
      setWarehouses(warehousesData);
      
      // Check if warehouse ID is in URL
      const warehouseIdFromUrl = searchParams.get('warehouse');
      if (warehouseIdFromUrl && warehousesData.length > 0) {
        const warehouseExists = warehousesData.find(wh => wh.id === warehouseIdFromUrl);
        if (warehouseExists) {
          setSelectedWarehouse(warehouseIdFromUrl);
        } else {
          // If warehouse from URL doesn't exist, select first one
          setSelectedWarehouse(warehousesData[0].id);
        }
      } else if (warehousesData.length > 0) {
        // No warehouse in URL, select first one
        setSelectedWarehouse(warehousesData[0].id);
      }
    } catch (error) {
      toast.error('Failed to load warehouses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseCameras = async (warehouseId) => {
    try {
      // Clear cameras first to force re-render
      setCameras([]);
      const response = await api.get(`/warehouses/${warehouseId}/cameras`);
      setCameras(response.data.cameras || []);
    } catch (error) {
      toast.error('Failed to load cameras');
      console.error(error);
      setCameras([]);
    }
  };

  const handleRefresh = () => {
    if (selectedWarehouse) {
      fetchWarehouseCameras(selectedWarehouse);
    }
  };

  // Check if URL is a web page (needs iframe) or direct video stream
  const isWebPageUrl = (url) => {
    if (!url) return false;
    
    // Known web page domains that need iframe
    const webPageDomains = ['earthcam.com', 'youtube.com', 'youtu.be', 'vimeo.com'];
    const isWebPage = webPageDomains.some(domain => 
      url.toLowerCase().includes(domain.toLowerCase())
    );
    
    if (isWebPage) return true;
    
    // Direct video stream formats
    const directVideoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.ts'];
    const directVideoProtocols = ['rtsp://', 'rtmp://'];
    
    const hasVideoExtension = directVideoExtensions.some(ext => 
      url.toLowerCase().endsWith(ext.toLowerCase())
    );
    const hasVideoProtocol = directVideoProtocols.some(protocol => 
      url.toLowerCase().startsWith(protocol.toLowerCase())
    );
    
    // If it has video extension or protocol, it's a direct stream
    if (hasVideoExtension || hasVideoProtocol) return false;
    
    // Default: if it's an http/https URL without video extension, treat as web page
    return url.startsWith('http://') || url.startsWith('https://');
  };

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Camera Streams</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View live camera streams</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Warehouse</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
          {selectedWarehouse && (
            <button
              onClick={() => navigate(`/warehouse/${selectedWarehouse}/dashboard`)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              View Full Dashboard
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {selectedWarehouse && (
        <div>
          {cameras.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <VideoOff className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No cameras found for this warehouse</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {camera.status === 'online' ? (
                        <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <VideoOff className="w-5 h-5 text-gray-400" />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {camera.name}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        camera.status === 'online'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>
                  {camera.status === 'online' && camera.streamUrl ? (
                    <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      {isWebPageUrl(camera.streamUrl) ? (
                        // Use iframe for web pages (like EarthCam)
                        <iframe
                          key={`${selectedWarehouse}-${camera.id}-iframe`}
                          src={camera.streamUrl}
                          className="w-full h-full border-0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          title={camera.name}
                        />
                      ) : (
                        // Use HLS Video Player for direct video streams
                        <HLSVideoPlayer
                          src={camera.streamUrl}
                          warehouseId={selectedWarehouse}
                          cameraId={camera.id}
                          autoPlay={true}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full bg-gray-900 rounded-lg flex items-center justify-center" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
                      <div className="text-center">
                        <VideoOff className="w-12 h-12 text-gray-600 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Camera Offline</p>
                      </div>
                    </div>
                  )}
                  {camera.location && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Location: {camera.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedWarehouse && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Please select a warehouse to view cameras</p>
        </div>
      )}
    </div>
  );
};

export default CameraStreams;
