import type { NextConfig } from "next";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  // theecho.in reaches this Worker through a forwarder, so the Worker sees its *.workers.dev host while the browser's
  // origin is theecho.in; without this list Next.js rejects every Server Action (login, save, delete) as a forged request.
  experimental: { serverActions: { allowedOrigins: ["theecho.in", "www.theecho.in"] } },
  async headers() {
    // No host-based "noindex" for *.workers.dev: through the forwarder it would also be sent on theecho.in itself.
    // Every page carries a canonical link to theecho.in, which is what keeps the workers.dev copy out of the way.
    return [
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
      { source: "/share", headers: noindex },
    ];
  },
};

export default nextConfig;
