export interface ContactPerson {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  role?: string;
  isPhoneOnly?: boolean;
  isWhatsappOnly?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  regionCategory: "القاهرة الكبرى" | "الوجه البحري والدلتا" | "الوجه القبلي والصعيد" | "مدن القناة";
  address: string;
  directions?: string;
  floor?: string;
  mapUrl?: string;
  videoUrl?: string;
  days: string[];
  workingHours: string;
  contacts: ContactPerson[];
  notes?: string;
  isActive?: boolean;
  isRegistrationOnly?: boolean;
  hasElevator?: boolean;
  isStudyCenter?: boolean;
  updatedAt?: string;
}

export const REGION_CATEGORIES = [
  "الكل",
  "القاهرة الكبرى",
  "الوجه البحري والدلتا",
  "الوجه القبلي والصعيد",
  "مدن القناة"
] as const;

export const DAYS_OF_WEEK = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة"
] as const;

export const DEFAULT_BRANCHES: Branch[] = [
  // ================= إقليم القاهرة الكبرى والجيزة =================
  {
    id: "branch_dokki",
    name: "فرع الدقي",
    city: "الجيزة",
    regionCategory: "القاهرة الكبرى",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["الأحد", "الثلاثاء", "الخميس"],
    workingHours: "من 10:00 ص إلى 3:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_maadi",
    name: "فرع المعادي",
    city: "القاهرة",
    regionCategory: "القاهرة الكبرى",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["الاثنين", "الأربعاء"],
    workingHours: "من 10:00 ص إلى 1:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_helwan",
    name: "فرع حلوان",
    city: "القاهرة",
    regionCategory: "القاهرة الكبرى",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["الثلاثاء"],
    workingHours: "من 10:00 ص إلى 1:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },

  // ================= إقليم الوجه البحري والدلتا =================
  {
    id: "branch_alex",
    name: "فرع الإسكندرية",
    city: "الإسكندرية",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_damanhur",
    name: "فرع دمنهور",
    city: "البحيرة",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الاثنين", "الأربعاء", "الخميس"],
    workingHours: "من 10:00 ص إلى 4:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_tanta",
    name: "فرع طنطا",
    city: "الغربية",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["الاثنين", "الأربعاء"],
    workingHours: "من 9:00 ص إلى 2:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_menofia",
    name: "فرع المنوفية",
    city: "المنوفية",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["الأحد", "الثلاثاء"],
    workingHours: "من 10:00 ص إلى 1:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_mansoura",
    name: "فرع المنصورة",
    city: "الدقهلية",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_damietta",
    name: "فرع دمياط",
    city: "دمياط",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_zagazig",
    name: "فرع الزقازيق",
    city: "الشرقية",
    regionCategory: "الوجه البحري والدلتا",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },

  // ================= إقليم مدن القناة =================
  {
    id: "branch_suez",
    name: "فرع السويس",
    city: "السويس",
    regionCategory: "مدن القناة",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الثلاثاء", "الخميس"],
    workingHours: "بالتنسيق مع مسؤول الفرع",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_ismailia",
    name: "فرع الإسماعيلية",
    city: "الإسماعيلية",
    regionCategory: "مدن القناة",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_portsaid",
    name: "فرع بورسعيد",
    city: "بورسعيد",
    regionCategory: "مدن القناة",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },

  // ================= إقليم الوجه القبلي والصعيد =================
  {
    id: "branch_fayoum",
    name: "فرع الفيوم",
    city: "الفيوم",
    regionCategory: "الوجه القبلي والصعيد",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت"],
    workingHours: "من 10:00 ص إلى 4:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_benisuef",
    name: "فرع بني سويف",
    city: "بني سويف",
    regionCategory: "الوجه القبلي والصعيد",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["الأحد", "الثلاثاء"],
    workingHours: "من 11:00 ص إلى 2:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_asyut",
    name: "فرع أسيوط",
    city: "أسيوط",
    regionCategory: "الوجه القبلي والصعيد",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "على مدار الأسبوع (بالتنسيق مع مسؤول الفرع)",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  },
  {
    id: "branch_sohag",
    name: "فرع سوهاج",
    city: "سوهاج",
    regionCategory: "الوجه القبلي والصعيد",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    days: ["السبت", "الاثنين", "الأربعاء"],
    workingHours: "من 10:00 ص إلى 4:00 م",
    contacts: [],
    notes: "يُرجى التواصل والتبليغ عبر الواتساب قبل الحضور بوقت كافٍ لتجهيز وتأمين تواجد الموظف"
  }
];

export const INITIAL_BRANCHES = DEFAULT_BRANCHES;

export const BRANCHES_STORAGE_KEY = "al_salam_academy_branches_v2";
export const LOCAL_STORAGE_BRANCHES_KEY = BRANCHES_STORAGE_KEY;

export function loadBranches(): Branch[] {
  if (typeof window === "undefined") return DEFAULT_BRANCHES;
  try {
    const raw = localStorage.getItem(BRANCHES_STORAGE_KEY);
    if (!raw) return DEFAULT_BRANCHES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Error loading branches from storage:", err);
  }
  return DEFAULT_BRANCHES;
}

export function saveBranches(branches: Branch[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
  } catch (err) {
    console.error("Error saving branches to storage:", err);
  }
}

export const ADMIN_PASSCODES = ["2026", "2027", "2028", "2029", "2030", "admin", "123456"];

export function verifyAdminPasscode(passcode: string, scope?: "apex" | "salam" | "trust" | "refaq" | "all" | "general"): boolean {
  if (!passcode) return false;
  const clean = passcode.trim();

  const apexPasscodes = ["2026", "2027", "apex2026", "apex", "admin", "123456"];
  const salamPasscodes = ["2026", "2027", "salam2026", "salam", "admin", "123456"];
  const trustPasscodes = ["2026", "2027", "trust2026", "trust", "admin", "123456"];
  const refaqPasscodes = ["2026", "2027", "refaq2026", "refaq", "admin", "123456"];
  const masterPasscodes = ["2026", "2027", "2028", "2029", "2030", "admin", "123456", "superadmin"];

  if (scope === "apex") {
    return [...apexPasscodes, ...masterPasscodes].includes(clean);
  }
  if (scope === "salam") {
    return [...salamPasscodes, ...masterPasscodes].includes(clean);
  }
  if (scope === "trust") {
    return [...trustPasscodes, ...masterPasscodes].includes(clean);
  }
  if (scope === "refaq") {
    return [...refaqPasscodes, ...masterPasscodes].includes(clean);
  }

  // General check: all academy passcodes and master passcodes are valid
  return [
    ...apexPasscodes,
    ...salamPasscodes,
    ...trustPasscodes,
    ...refaqPasscodes,
    ...masterPasscodes
  ].includes(clean);
}

export const checkAdminPasscode = verifyAdminPasscode;
