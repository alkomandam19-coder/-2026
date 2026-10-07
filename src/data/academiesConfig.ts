import { DEFAULT_BRANCHES, LOCAL_STORAGE_BRANCHES_KEY } from "./branchesData";

export interface PartnerAcademyConfig {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  storageBranchesKey: string;
  defaultBranches: { id: string; name: string; city?: string }[];
  description: string;
}

export const OFFICIAL_PARTNER_ACADEMIES: PartnerAcademyConfig[] = [
  {
    id: "salam",
    name: "أكاديمية السلام للتدريب",
    shortName: "السلام للتدريب",
    slug: "salam",
    storageBranchesKey: LOCAL_STORAGE_BRANCHES_KEY,
    defaultBranches: DEFAULT_BRANCHES.map(b => ({ id: b.id, name: b.name, city: b.city })),
    description: "فروع الإسكندرية، الدقي، وطنطا"
  },
  {
    id: "trust",
    name: "أكاديمية تراست للعلوم الطبية",
    shortName: "تراست للعلوم الطبية",
    slug: "trust",
    storageBranchesKey: "trust_academy_branches_data_v2",
    defaultBranches: [
      { id: "trust-branch-1", name: "المقر الرئيسي - القاهرة", city: "القاهرة" }
    ],
    description: "المقر الرئيسي - القاهرة"
  },
  {
    id: "apex",
    name: "أكاديمية أبيكس",
    shortName: "أبيكس",
    slug: "apex",
    storageBranchesKey: "apex_college_branches_data_v2",
    defaultBranches: [
      { id: "apex-branch-1", name: "فرع الجيزة (المقر الرئيسي)", city: "الجيزة" },
      { id: "apex-branch-2", name: "فرع الإسكندرية", city: "الإسكندرية" }
    ],
    description: "فرع الجيزة وفرع الإسكندرية"
  },
  {
    id: "refaq",
    name: "أكاديمية الرفاق للتدريب",
    shortName: "الرفاق للتدريب",
    slug: "refaq",
    storageBranchesKey: "refaq_academy_branches_data_v2",
    defaultBranches: [
      { id: "refaq-branch-1", name: "فرع بني سويف (المقر الرئيسي)", city: "بني سويف" }
    ],
    description: "فرع بني سويف ومقرات الصعيد"
  }
];

export const OTHER_ACADEMY_OPTION_KEY = "__OTHER_ACADEMY__";

// Helper function to dynamically retrieve branches for an academy (reading updated LocalStorage/Config)
export function getDynamicAcademyBranches(academyName: string): string[] {
  if (!academyName || academyName === OTHER_ACADEMY_OPTION_KEY) return [];

  const cleanTarget = academyName.trim().toLowerCase();
  const found = OFFICIAL_PARTNER_ACADEMIES.find(
    ac => ac.name.trim().toLowerCase() === cleanTarget || 
          cleanTarget.includes(ac.id) || 
          cleanTarget.includes(ac.shortName.toLowerCase()) ||
          ac.name.toLowerCase().includes(cleanTarget)
  );

  if (!found) return [];

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(found.storageBranchesKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed
            .filter((b: any) => b && (b.name || b.title) && b.isActive !== false)
            .map((b: any) => String(b.name || b.title).trim())
            .filter(Boolean);
          if (names.length > 0) {
            return Array.from(new Set(names));
          }
        }
      }
    } catch (e) {
      console.warn("Could not read dynamic branches for", academyName, e);
    }
  }

  // Fallback to default branches configured
  return found.defaultBranches.map(b => b.name);
}
