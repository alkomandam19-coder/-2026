/**
 * Safe localStorage wrapper with QuotaExceededError protection and automatic cleanup
 */

const NON_ESSENTIAL_PREFIXES = [
  "temp_",
  "cached_",
  "preview_",
  "draft_img_",
  "log_",
  "news_image_temp"
];

export function cleanupStorageQuota(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Remove non-essential items first
      if (NON_ESSENTIAL_PREFIXES.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      } else {
        // If an item is very large (> 500KB) and not a core config, check if it's base64 media
        try {
          const val = localStorage.getItem(key);
          if (val && val.length > 500000 && (val.startsWith("data:image") || val.startsWith("data:application"))) {
            keysToRemove.push(key);
          }
        } catch (e) {}
      }
    }

    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
  } catch (err) {
    console.warn("Storage cleanup warning:", err);
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`localStorage.setItem failed for key "${key}", attempting cleanup...`, error);
    
    // Try clearing non-essential cache and retrying
    cleanupStorageQuota();

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.warn(`localStorage.setItem permanently failed for key "${key}" due to quota limit.`, retryError);
      return false;
    }
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`localStorage.getItem failed for key "${key}":`, error);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`localStorage.removeItem failed for key "${key}":`, error);
  }
}
