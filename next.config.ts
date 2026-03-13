import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['jsdom', '@mozilla/readability', '@resvg/resvg-js'],
};

export default nextConfig;
