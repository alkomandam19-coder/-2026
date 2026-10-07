import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://qphaspuinxldwjijwyrf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaGFzcHVpbnhsZHdqaWp3eXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzY2OTgsImV4cCI6MjEwNDExMjY5OH0.i3MDlfY44UaDZLyaaTv-w7fa3NIgmIuFSY29ikYVj7c";

function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return DEFAULT_SUPABASE_URL;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.origin;
  } catch (e) {
    return rawUrl.trim().replace(/\/rest\/v1\/?.*$/, "").replace(/\/$/, "");
  }
}

const rawSupabaseUrl = 
  (typeof window !== "undefined" && (import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_URL as string) : "") ||
  (typeof process !== "undefined" && process?.env ? (process.env.SUPABASE_URL as string) : "") ||
  DEFAULT_SUPABASE_URL;

export const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);

const envKey = 
  (typeof window !== "undefined" && (import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string) : "") ||
  (typeof process !== "undefined" && process?.env ? (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY as string) : "") ||
  "";

// Prioritize working JWT key
export const supabaseKey = (envKey && envKey.startsWith("ey")) ? envKey : DEFAULT_SUPABASE_ANON_KEY;

export const hasSupabase = !!(supabaseKey && supabaseKey.trim().length > 0);

export const supabase = createClient(supabaseUrl, supabaseKey);


