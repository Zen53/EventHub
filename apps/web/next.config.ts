import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    // Le navigateur ne parle qu'au front : chaque ressource de l'API est relayée ici.
    return [
      { source: "/auth/:path*", destination: `${apiUrl}/auth/:path*` },
      { source: "/me", destination: `${apiUrl}/me` },
      { source: "/events", destination: `${apiUrl}/events` },
      { source: "/events/:path*", destination: `${apiUrl}/events/:path*` },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
