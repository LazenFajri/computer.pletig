import type { NextConfig } from "next";

// output: 'export' diaktifkan saat build APK Capacitor (via environment variable CAPACITOR_BUILD=true)
// atau secara langsung jika seluruh project diexport menjadi static HTML.
const isExport = process.env.CAPACITOR_BUILD === "true" || process.env.OUTPUT_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isExport ? "export" : undefined,
  images: {
    unoptimized: true,
  },
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
