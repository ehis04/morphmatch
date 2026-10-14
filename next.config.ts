import type { NextConfig } from "next";
import { getSupabaseConfig, isSecretSupabaseKey } from "./lib/supabase/config";

if (
  [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].some(isSecretSupabaseKey)
) {
  throw new Error("Secret and service-role keys must never be set in NEXT_PUBLIC_* variables.");
}

const hasSupabaseSettings = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
);
if (hasSupabaseSettings && !getSupabaseConfig()) {
  throw new Error(
    "Set a valid Supabase URL and public key together, or leave both empty to disable accounts. Secret and service-role keys must never be public."
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/commons/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
