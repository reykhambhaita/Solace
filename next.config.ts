import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Set the workspace root to silence the warning
  // Use a relative path - Next.js will resolve it correctly
  outputFileTracingRoot: require('path').join(__dirname, '../'),

  turbopack: {},
  webpack: (config, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    // Enable async WebAssembly support
    config.experiments = {
      asyncWebAssembly: true,
      layers: true, // optional if you use module layers
    };
    // Optional: serve .wasm as files in the build
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    return config;
  },
  // Serve public/wasm properly
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;