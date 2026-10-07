export interface SlaInfo {
  status: "green" | "yellow" | "red" | "completed";
  label: string;
  badgeClass: string;
  hoursElapsed: number;
}

export function getStudentSlaInfo(
  status: string,
  timestamp?: number | string,
  dateStr?: string
): SlaInfo {
  if (status === "completed") {
    return {
      status: "completed",
      label: "✓ تم التواصل والتعميد",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
      hoursElapsed: 0,
    };
  }

  const nowMs = Date.now();
  let leadTimeMs = Number(timestamp);
  if (!leadTimeMs || isNaN(leadTimeMs)) {
    if (dateStr) {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) leadTimeMs = parsed;
    }
  }

  if (!leadTimeMs || isNaN(leadTimeMs)) {
    leadTimeMs = nowMs;
  }

  const elapsedMs = Math.max(0, nowMs - leadTimeMs);
  const hoursElapsed = Math.floor(elapsedMs / (1000 * 60 * 60));

  if (hoursElapsed < 6) {
    return {
      status: "green",
      label: `🟢 فريش (${hoursElapsed} س - أقل من 6 س)`,
      badgeClass: "bg-emerald-500 text-white font-black shadow-3xs border border-emerald-600 animate-pulse",
      hoursElapsed,
    };
  } else if (hoursElapsed <= 24) {
    return {
      status: "yellow",
      label: `🟡 تحذير تأخير (${hoursElapsed} س - مرت 12-6 س)`,
      badgeClass: "bg-amber-500 text-white font-black shadow-3xs border border-amber-600",
      hoursElapsed,
    };
  } else {
    return {
      status: "red",
      label: `🔴 خطر تأخير حرج (${hoursElapsed} س - > 24 ساعة!)`,
      badgeClass: "bg-rose-600 text-white font-black shadow-3xs border border-rose-700 animate-bounce",
      hoursElapsed,
    };
  }
}
