"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createBrowserSupabase() {
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
