import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app's own UI occupies top-right (header) and bottom-right (canvas
  // zoom controls + minimap) — bottom-left is the one corner nothing else
  // uses, so that's where Next.js's dev-mode indicator goes.
  devIndicators: {
    position: "bottom-left",
  },
};

export default nextConfig;
