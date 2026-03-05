import { createClient } from "@supabase/supabase-js";

// Vite env vars are injected at build time.
// We also support runtime injection via /public/env.js:
// window.__CAR_SHOWROOM_ENV__ = { VITE_SUPABASE_URL: "...", VITE_SUPABASE_ANON_KEY: "..." }

const readEnv = (key) => {
  const viteVal = import.meta?.env?.[key];
  if (viteVal !== undefined && viteVal !== "") return viteVal;

  if (typeof window !== "undefined") {
    const runtime = window.__CAR_SHOWROOM_ENV__ || window.__env__ || {};
    const v = runtime[key];
    if (v !== undefined && v !== "") return v;
  }

  return undefined;
};

export const supabaseUrl = readEnv("VITE_SUPABASE_URL");
export const supabaseAnonKey = readEnv("VITE_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
