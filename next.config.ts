import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy to /card subpath under WordPress domain
  basePath: "/card",

  // Asset prefix for proper static file serving
  assetPrefix: "/card",

  // Trailing slash to match WordPress conventions
  trailingSlash: true,

  // Production optimizations
  reactStrictMode: true,
};

export default nextConfig;
