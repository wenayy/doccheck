import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components' setTimeout-based resume mechanism hangs forever on the
  // Workers runtime (no real timers) — this app has no static/cached routes
  // to benefit from it, so it's off rather than patched around.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
