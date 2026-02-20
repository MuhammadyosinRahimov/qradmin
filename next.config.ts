import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5079",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};
export default nextConfig;
