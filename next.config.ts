import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Set the workspace root to silence the warning
  // Use a relative path - Next.js will resolve it correctly
  outputFileTracingRoot: path.join(process.cwd(), '../'),

  // Configure Turbopack to handle Node.js modules in browser context
  turbopack: {
    resolveAlias: {
      // Provide empty modules for Node.js built-ins in browser
      fs: { browser: './lib/polyfills/empty.js' },
      path: { browser: './lib/polyfills/empty.js' },
      crypto: { browser: './lib/polyfills/empty.js' },
    },
  },

  // Use serverExternalPackages to handle web-tree-sitter properly
  serverExternalPackages: ['web-tree-sitter'],
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