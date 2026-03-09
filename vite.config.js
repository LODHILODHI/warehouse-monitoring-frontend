import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            const target = options.target || 'http://localhost:3000';
            console.error('❌ Proxy error:', err.message);
            console.error(`   Failed to connect to backend at: ${target}`);
            console.error(`   Request: ${req.method} ${req.url}`);
            console.error('   💡 Make sure your backend server is running on port 3000');
            
            if (!res.headersSent) {
              res.writeHead(502, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({
                error: 'Backend server is not running',
                message: `Cannot connect to ${target}. Please start your backend server.`,
                target: target
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔄 Proxying:', req.method, req.url, '→', options.target);
          });
        },
      },
    },
  },
})
