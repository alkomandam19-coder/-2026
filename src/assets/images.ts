// =====================================================================
// ملف تجميع وإدارة جميع صور وأصول التطبيق الموحدة (Centralized Assets)
// يمكنك تغيير أو استبدال أي صورة هنا بسهولة دون تتبع الأكواد البرمجية
// =====================================================================

// ١. استيراد الصور المحلية المخزنة في مجلد الأصول (Local Images)
import logoAcademicWhite from "./images/logo_1781734218824.jpg";
import petroleumImg from "./images/petroleum_dept_1781932589843.jpg";
import medicalAnalysisImg from "./images/medical_analysis_dept_1781932604329.jpg";
import journalismMediaImg from "./images/journalism_media_dept_1781932618933.jpg";
import wirelessTelecomImg from "./images/wireless_telecom_dept_1781932633950.jpg";
import bgImg from "./images/bg.jpg";

// ٢. تصدير الصور المحلية تحت أسماء موحدة ومقروءة
export const LOCAL_IMAGES = {
  logoAcademicWhite,
  petroleumImg,
  medicalAnalysisImg,
  journalismMediaImg,
  wirelessTelecomImg,
};

// ٣. تصدير الصور الافتراضية لأقسام وتخصصات الأكاديمية الـ 17 (Default Department Backgrounds)
export const DEPARTMENT_DEFAULT_IMAGES: Record<string, string> = {
  petroleum: petroleumImg,
  surveying: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
  construction: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80",
  clinical_nutrition: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80",
  aviation: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
  health_analysis: medicalAnalysisImg,
  nursing_assistant: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=600&q=80",
  programming: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
  systems_admin: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
  digital_marketing: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
  journalism_media: journalismMediaImg,
  fine_arts: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80",
  languages: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  special_education: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
  tourism: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  wireless_telecom: wirelessTelecomImg,
  dental_dental: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
};

// ٤. الخلفيات العامة للموقع (General Backgrounds)
export const SITE_BACKGROUNDS = {
  mainBg: bgImg,
  defaultPlaceholder: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
};
