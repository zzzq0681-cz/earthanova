import type { NextConfig } from "next";

const EARTH_API = process.env.EARTH_API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // first request for a brand-new location fetches NASA data server-side and can take a minute or two
  experimental: { proxyTimeout: 240000 },
  async rewrites() {
    return [{ source: "/earth-api/api/:path*", destination: `${EARTH_API}/api/:path*` }];
  },
};

export default nextConfig;
