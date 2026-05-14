/**
 * next.config.ts — Next.js 16 configuration
 *
 * Next.js 16 ships with Turbopack stable by default.
 * Notable changes from v15:
 *  - `serverExternalPackages` replaces `experimental.serverComponentsExternalPackages`
 *  - `bundlePagesRouterDependencies` is now on by default
 *  - Caching is opt-in (fetch cache is no longer force-cached by default)
 *  - `images.remotePatterns` entries must be static strings — no env vars at
 *    build-time inside the array, so we use a wildcard pattern for S3.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Image domains ─────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Google profile pictures (OAuth)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // AWS S3 — wildcard covers any bucket name / region
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },

  // ── Server-only packages ──────────────────────────────────────────────────
  // Mongoose and AWS SDK should never be bundled for the browser.
  serverExternalPackages: ["mongoose"],

  // ── Webpack overrides for react-pdf ──────────────────────────────────────
  // react-pdf tries to require `canvas` (a native module) — alias it to false
  // so the browser bundle doesn't break.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas:   false,
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
