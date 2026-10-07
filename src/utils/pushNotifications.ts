// Push Notification Utility for Mobile and Desktop

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (err) {
    console.warn("Service Worker registration warning:", err);
    return null;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch (e) {
    console.warn("Notification request permission error:", e);
    return false;
  }
}

export interface StudentNotificationPayload {
  studentName: string;
  reservationCode?: string;
  department?: string;
  phone?: string;
  governorate?: string;
  repName?: string;
  url?: string;
}

export async function dispatchStudentPhoneNotification(payload: StudentNotificationPayload) {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  const title = `🎉 طالب جديد في حسابك: ${payload.studentName}`;
  const body = [
    payload.reservationCode ? `كود الحجز: #${payload.reservationCode}` : "",
    payload.department ? `التخصص: ${payload.department}` : "",
    payload.governorate ? `المحافظة: ${payload.governorate}` : ""
  ].filter(Boolean).join(" | ") || "اضغط لمراجعة بيانات الطالب والتواصل الفوري";

  const options: any = {
    body,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: `student-lead-${payload.reservationCode || Date.now()}`,
    data: {
      url: payload.url || "/sales-portal",
      phone: payload.phone
    },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300]
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch (swErr) {
    console.warn("ServiceWorker notification failed, using native Notification fallback:", swErr);
  }

  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (payload.url) window.location.href = payload.url;
      notif.close();
    };
  } catch (nativeErr) {
    console.warn("Native Notification error:", nativeErr);
  }
}
