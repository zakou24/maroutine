import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// Le serveur de dev de Next.js a besoin d'eval : la CSP n'est posée qu'en production (T-06).
const csp = [
  "default-src 'self'",
  // Le lecteur de codes-barres (ZXing) est du WebAssembly servi par l'app (D29).
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La caméra sert au scan des codes-barres, pour l'app elle-même seulement (D29).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(isProduction ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@maroutine/core"],
  // PGlite charge ses fichiers WASM depuis node_modules : ne pas l'empaqueter.
  serverExternalPackages: ["@electric-sql/pglite"],
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
