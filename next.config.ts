import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old /shop page is retired — send any direct visits to /store.
      // 307 (permanent: false) so it isn't cached by browsers while we settle;
      // switch to permanent: true (308) once we're sure /shop is gone for good.
      { source: "/shop", destination: "/store", permanent: false },
    ];
  },
};

export default nextConfig;
