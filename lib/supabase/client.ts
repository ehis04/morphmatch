"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

const config = getSupabaseConfig();

/** True when Supabase env vars are present. The app degrades gracefully without them. */
export const isSupabaseConfigured = config !== null;

let client: SupabaseClient | null = null;

/** Browser Supabase client, or null when the project isn't configured. */
export function getSupabase(): SupabaseClient | null {
  if (!config) return null;
  if (!client) client = createBrowserClient(config.url, config.key);
  return client;
}
