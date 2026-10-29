import type { NextConfig } from "next";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
      { source: "/share", headers: noindex },
      // test copies on *.workers.dev must never compete with theecho.in in search results
      { source: "/:path*", has: [{ type: "host", value: ".*\\.workers\\.dev" }], headers: noindex },
    ];
  },
};

export default nextConfig;
