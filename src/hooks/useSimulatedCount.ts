import { useState, useEffect } from "react";

const COUNTER_KEY = "academy_simulated_count_v1";
const LAST_INCREMENT_KEY = "academy_simulated_count_last_increment_time";
const EVENT_NAME = "academy_simulated_count_changed";

export function getSimulatedCount(): number {
  if (typeof window === "undefined") return 4872;
  const saved = localStorage.getItem(COUNTER_KEY);
  if (!saved) {
    localStorage.setItem(COUNTER_KEY, "4872");
    return 4872;
  }
  return parseInt(saved, 10);
}

export function setSimulatedCount(val: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COUNTER_KEY, val.toString());
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: val }));
}

export function useSimulatedCount() {
  const [count, setCount] = useState<number>(getSimulatedCount);

  useEffect(() => {
    const handleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail !== undefined) {
        setCount(customEvent.detail);
      } else {
        setCount(getSimulatedCount());
      }
    };

    window.addEventListener(EVENT_NAME, handleChanged);
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === COUNTER_KEY) {
        setCount(getSimulatedCount());
      }
    };
    window.addEventListener("storage", handleStorage);

    // Dynamic auto-increment loop
    let timeoutId: any;
    const runLoop = () => {
      const current = getSimulatedCount();
      const now = Date.now();
      const lastInc = parseInt(localStorage.getItem(LAST_INCREMENT_KEY) || "0", 10);
      
      const isPast5000 = current >= 5000;
      const intervalMs = isPast5000 
        ? (90 + Math.random() * 90) * 1000 // 90 to 180 seconds
        : (15 + Math.random() * 15) * 1000; // 15 to 30 seconds

      const elapsed = now - lastInc;
      const isSimActive = typeof window !== "undefined" && localStorage.getItem("academy_simulated_ticker_active") !== "false";
      if (isSimActive && (elapsed >= intervalMs || lastInc === 0)) {
        const nextVal = current + 1;
        setSimulatedCount(nextVal);
        localStorage.setItem(LAST_INCREMENT_KEY, now.toString());
      }

      const nextDelay = isPast5000 ? 5000 : 2000;
      timeoutId = setTimeout(runLoop, nextDelay);
    };

    runLoop();

    return () => {
      window.removeEventListener(EVENT_NAME, handleChanged);
      window.removeEventListener("storage", handleStorage);
      clearTimeout(timeoutId);
    };
  }, []);

  return count;
}
