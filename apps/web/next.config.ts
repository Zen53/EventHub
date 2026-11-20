import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    // Le navigateur ne parle qu'au front : chaque ressource de l'API est relayée ici.
    return [
      { source: "/auth/:path*", destination: `${apiUrl}/auth/:path*` },
      { source: "/me", destination: `${apiUrl}/me` },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Racine du dépôt : sans elle, Turbopack refuse de résoudre packages/schemas
    // (lien hors de apps/web) quand aucun lockfile parent ne l'englobe, ex. en Docker.
    root: path.join(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
