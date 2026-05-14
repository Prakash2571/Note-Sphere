import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Google (for OAuth profile pictures)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: `${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com`,
      },
    ],
  },

  // Required for react-pdf to work in Next.js
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
