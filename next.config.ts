import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint the app source. The generated Prisma contract is excluded so its empty codec maps cannot fail the build.
  eslint: {
    dirs: ["src/app", "src/components", "src/features", "src/lib", "src/messages", "src/server", "src/styles"],
  },
  // Headers that help PWA install prompts and basic hardening.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
