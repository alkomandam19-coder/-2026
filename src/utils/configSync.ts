/**
 * Utility helper to synchronize any client-side configuration with the Supabase site_configs database.
 * This ensures that admin custom news, advertisements, testimonials, banners, branches, specializations,
 * and visual settings are permanently stored and shared among all website visitors in real-time.
 */

import { supabase, hasSupabase } from "../supabaseClient";
import { safeSetItem, safeRemoveItem } from "./safeStorage";

export async function saveSiteConfig(key: string, value: any): Promise<boolean> {
  // 1. Instantly update localStorage as a fast local fallback
  if (typeof window !== "undefined") {
    try {
      if (value === null || value === undefined) {
        safeRemoveItem(key);
      } else {
        const stringVal = typeof value === "object" ? JSON.stringify(value) : String(value);
        safeSetItem(key, stringVal);
      }
    } catch (e) {
      console.warn(`localStorage write failed for key ${key}:`, e);
    }

    // Dispatch events immediately on client
    window.dispatchEvent(new Event("site_configs_updated"));
    if (key === "custom_news_posts_v1") {
      window.dispatchEvent(new Event("news_posts_updated"));
    }
  }

  let persisted = false;

  // 2. Persist directly to Supabase Database (Guaranteed to work across all domains: eg-academies.com, Vercel, localhost, etc.)
  if (hasSupabase) {
    try {
      const { error } = await supabase
        .from("site_configs")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (!error) {
        persisted = true;
        if (typeof window !== "undefined") {
          safeSetItem("supabase_connection_status", "true");
          safeRemoveItem("supabase_error_message");
          window.dispatchEvent(new Event("supabase_status_updated"));
        }
      } else {
        console.warn("Direct Supabase save warning:", error.message);
      }
    } catch (err) {
      console.warn("Direct Supabase save exception:", err);
    }
  }

  // 3. Also notify /api/site-config if server environment is present
  try {
    const res = await fetch("/api/site-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) persisted = true;
    }
  } catch (err) {
    // API route might not exist on static hosting (e.g. Vercel static export), which is fine since direct Supabase handles it
  }

  return persisted;
}

const AI_FAKE_TITLES = [
  "كيف تكتشف شغفك",
  "أسرار سوق العمل",
  "تجهيز المستندات",
  "التوفير المالي",
  "تأجيل التجنيد",
  "الفرق الجوهري",
  "الأنشطة والرحلات",
  "بدء فتح باب قيد الشعب",
];

export function isAiGeneratedPost(p: any): boolean {
  if (!p) return true;
  const title = String(p.title || "");
  const id = String(p.id || "");
  if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(id)) {
    if (AI_FAKE_TITLES.some(t => title.includes(t))) return true;
  }
  return AI_FAKE_TITLES.some(t => title.includes(t));
}

/**
 * Loads all site configurations from the database and updates localStorage
 */
export async function syncAllConfigsFromDatabase(): Promise<Record<string, any>> {
  const configs: Record<string, any> = {};

  // 1. Direct Supabase Query (Primary and reliable on all domains/hosting)
  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from("site_configs")
        .select("*");

      if (!error && data && data.length > 0) {
        data.forEach((row: { key: string; value: any }) => {
          if (row && row.key && row.value !== undefined && row.value !== null) {
            let val = row.value;
            if (row.key === "custom_news_posts_v1") {
              if (Array.isArray(val)) {
                val = val.filter((p: any) => !isAiGeneratedPost(p));
              } else {
                val = [];
              }
              // If server has no user posts, check if client has valid non-AI user posts
              if (typeof window !== "undefined") {
                const localSaved = localStorage.getItem("custom_news_posts_v1");
                if (localSaved) {
                  try {
                    const localParsed = JSON.parse(localSaved);
                    if (Array.isArray(localParsed)) {
                      const userPosts = localParsed.filter((p: any) => !isAiGeneratedPost(p));
                      if (userPosts.length > 0 && val.length === 0) {
                        val = userPosts;
                        // Sync client user posts back to Supabase
                        supabase.from("site_configs").upsert(
                          { key: "custom_news_posts_v1", value: userPosts, updated_at: new Date().toISOString() },
                          { onConflict: "key" }
                        ).then(() => {});
                      }
                    }
                  } catch (e) {}
                }
              }
            }
            configs[row.key] = val;
            if (typeof window !== "undefined") {
              const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
              safeSetItem(row.key, stringVal);
            }
          }
        });

        if (typeof window !== "undefined") {
          safeSetItem("supabase_connection_status", "true");
          safeRemoveItem("supabase_error_message");
          window.dispatchEvent(new Event("supabase_status_updated"));
          window.dispatchEvent(new Event("news_posts_updated"));
          window.dispatchEvent(new Event("site_configs_updated"));
        }
        return configs;
      }
    } catch (err) {
      console.warn("Direct Supabase query exception:", err);
    }
  }

  // 2. Secondary fallback via /api/site-configs endpoint
  try {
    const res = await fetch("/api/site-configs");
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.configs) {
        Object.entries(data.configs).forEach(([key, val]: [string, any]) => {
          if (val !== undefined && val !== null) {
            let cleanVal = val;
            if (key === "custom_news_posts_v1") {
              if (Array.isArray(cleanVal)) {
                cleanVal = cleanVal.filter((p: any) => !isAiGeneratedPost(p));
              } else {
                cleanVal = [];
              }
              // If server has no user posts, check if client has valid non-AI user posts
              if (typeof window !== "undefined") {
                const localSaved = localStorage.getItem("custom_news_posts_v1");
                if (localSaved) {
                  try {
                    const localParsed = JSON.parse(localSaved);
                    if (Array.isArray(localParsed)) {
                      const userPosts = localParsed.filter((p: any) => !isAiGeneratedPost(p));
                      if (userPosts.length > 0 && cleanVal.length === 0) {
                        cleanVal = userPosts;
                      }
                    }
                  } catch (e) {}
                }
              }
            }
            configs[key] = cleanVal;
            if (typeof window !== "undefined") {
              const stringVal = typeof cleanVal === "object" ? JSON.stringify(cleanVal) : String(cleanVal);
              safeSetItem(key, stringVal);
            }
          }
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("news_posts_updated"));
          window.dispatchEvent(new Event("site_configs_updated"));
        }
        return configs;
      }
    }
  } catch (err) {
    console.warn("API route site-configs fallback error:", err);
  }

  return configs;
}

/**
 * Subscribes to realtime changes from Supabase site_configs table
 */
export function subscribeToSiteConfigsRealtime(onChange?: (key: string, value: any) => void) {
  if (!hasSupabase || typeof window === "undefined") return () => {};

  try {
    const channel = supabase
      .channel("public:site_configs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_configs" },
        (payload: any) => {
          const newRow = payload.new;
          if (newRow && newRow.key) {
            const key = newRow.key;
            const val = newRow.value;
            const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
            safeSetItem(key, stringVal);

            window.dispatchEvent(new Event("site_configs_updated"));
            if (key === "custom_news_posts_v1") {
              window.dispatchEvent(new Event("news_posts_updated"));
            }
            if (onChange) {
              onChange(key, val);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn("Supabase realtime subscription failed:", e);
    return () => {};
  }
}

