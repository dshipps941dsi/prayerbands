import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The help assistant reads its guide from disk at runtime; make sure the
  // file travels with the function.
  outputFileTracingIncludes: { "/api/help": ["./content/help-guide.md"] },
  async redirects() {
    return [
      // One host, always. www served the site as a second origin with its own
      // cookies, so a sign-in started on www could not finish on the apex
      // (the PKCE verifier lived on the other host). Everything canonical
      // lives on prayerbands.com.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.prayerbands.com" }],
        destination: "https://prayerbands.com/:path*",
        permanent: true,
      },
      // The old /shop page is retired — send any direct visits to /store.
      // 307 (permanent: false) so it isn't cached by browsers while we settle;
      // switch to permanent: true (308) once we're sure /shop is gone for good.
      { source: "/shop", destination: "/store", permanent: false },
    ];
  },
};

export default nextConfig;
