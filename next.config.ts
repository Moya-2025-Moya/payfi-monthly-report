import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['jsdom', '@mozilla/readability'],
};

export default nextConfig;
