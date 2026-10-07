import React, { useState, useEffect } from "react";
import { 
  Building2, 
  GraduationCap, 
  Award, 
  BookOpen, 
  Sparkles, 
  Share2, 
  Ticket
} from "lucide-react";
import { 
  Branch 
} from "../data/branchesData";
import { 
  Specialization, 
  AccreditationItem, 
  StudySystemItem 
} from "../data/academyPortalData";
import { PortalTabsNav, TabItem } from "../components/portal/PortalTabsNav";
import { BranchesListView } from "../components/portal/BranchesListView";
import { SpecializationsView } from "../components/portal/SpecializationsView";
import { AccreditationsView } from "../components/portal/AccreditationsView";
import { StudySystemView } from "../components/portal/StudySystemView";
import { DeveloperCreditFooter } from "../components/portal/DeveloperCreditFooter";
import { AcademyAdminDashboardModal } from "../components/portal/AcademyAdminDashboardModal";
import { AcademyRegistrationModal } from "../components/portal/AcademyRegistrationModal";
import { 
  AuthModal, 
  BranchFormModal,
  SpecializationFormModal, 
  AccreditationFormModal, 
  StudySystemFormModal, 
  DeleteConfirmModal 
} from "../components/portal/PortalModals";
import { saveSiteConfig, syncAllConfigsFromDatabase } from "../utils/configSync";
import toast from "react-hot-toast";

const REFAQ_BRANCHES_KEY = "refaq_academy_branches_data_v2";
const REFAQ_HQ_KEY = "refaq_academy_hq_data_v1";
const REFAQ_SPECS_KEY = "refaq_academy_specs_data_v2";
const REFAQ_ACCS_KEY = "refaq_academy_accs_data_v2";
const REFAQ_STUDY_KEY = "refaq_academy_study_data_v2";

const DEFAULT_REFAQ_BRANCHES: Branch[] = [
  {
    id: "branch_1787638997134",
    name: "فرع بني سويف (المقر الرئيسي)",
    city: "بني سويف",
    regionCategory: "الوجه القبلي والصعيد",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    directions: "مقر متميز وسهل الوصول بقلب مدينة بني سويف",
    floor: "",
    mapUrl: "",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "من 10:00 صباحاً حتى 4:00 مساءً",
    contacts: [],
    notes: "المصروفات 15 ألف للسنتين (7500 للسنة) - مقدم الحجز 4000 ج."
  }
];

const DEFAULT_REFAQ_ACCS: AccreditationItem[] = [
  {
    id: "acc_1787639245137",
    title: "شهادة معتمدة من جامعة حكومية وموثقة من الخارجية المصرية",
    grantingBody: "الجامعات الحكومية المصرية / وزارة الخارجية / وزارة العمل",
    certificateType: "شهادة دبلومة تدريبية وتطبيقية معتمدة + بيان درجات",
    authenticationDetails: "بختم النسر وقابلة للتوثيق المباشر من وزارة الخارجية المصرية لتغيير المسمى والسفر للخارج",
    benefits: [
      "شهادة معتمدة من جامعة حكومية مصرية مع بيان درجات بكافة المواد",
      "إمكانية توثيق الشهادة بختم النسر ومن وزارة الخارجية المصرية للسفر والعمل بالخارج",
      "استخراج كارنيه النقابة والوزارة لتغيير المسمى الوظيفي في بطاقة الرقم القومي",
      "شهادة قياس مستوى المهارة وترخيص مزاولة المهنة",
      "إمكانية تأجيل التجنيد للطلاب المستحقين قانوناً وفقاً للقواعد الرسمية",
      "شهادة خبرة معتمدة بالتدريب العملي من أماكن التدريب والمستشفيات"
    ],
    notes: "اعتمادات وتراخيص رسمية لكافة الأقسام والتخصصات"
  }
];

const DEFAULT_REFAQ_SPECS: Specialization[] = [
  {
    "id": "spec_1787644216944",
    "name": "قسم المساحة والخرائط",
    "category": "هندسي وفني",
    "duration": "سنتين مكثفين من 12 إلى 14 شهراً (4 فصول)",
    "jobTitle": "مساح عام / أخصائي مساحة وخرائط GIS",
    "totalFees": "15,000 جنيه للسنتين",
    "workplaces": "شركات المقاولات والإنشاءات الكبرى، المشروعات القومية، المكاتب الاستشارية والهندسية، هيئات المساحة.",
    "description": "يركز البرنامج على تدريب المتدرب على أساسيات المساحة وإعداد الخرائط ونظم المعلومات الجغرافية، مع التعرف على أحدث أجهزة المساحة (Total Station / GPS / Level) والتقنيات الحديثة المستخدمة في الأعمال الميدانية.\nكما يشمل التدريب إعداد الخرائط الطبوغرافية، واستخدام برامج AutoCAD وGIS، وأعمال الرفع المساحي والتوقيع الميداني.",
    "feesPerTerm": "7,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "availableInBranch": "فرع بني سويف",
    "installmentDetails": "4 آلاف مقدم حجز والباقي على أقساط مريحة تناسب الجميع."
  },
  {
    "id": "spec_1787517546140",
    "name": "تحاليل طبية (مساعد خدمات صحية)",
    "category": "طبي وتمريض",
    "duration": "سنتين مكثفين من 12 إلى 14 شهراً (4 فصول)",
    "jobTitle": "أخصائي تحاليل طبية / فني مختبرات طبية",
    "totalFees": "15,000 جنيه للسنتين",
    "workplaces": "معامل التحاليل الطبية الكبرى، المستشفيات، المراكز الطبية التخصصية، بنوك الدم، معامل ومراكز الأبحاث.",
    "description": "يركز البرنامج على التعرف على أساسيات التحاليل الطبية والعمل المعملي، بداية من التعامل الصحيح مع العينات وسحبها وتجهيزها، مروراً بالتعرف على أحدث الأجهزة المعملية، وصولاً إلى إجراءات الجودة والسلامة ومكافحة العدوى.",
    "feesPerTerm": "7,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "availableInBranch": "فرع بني سويف",
    "installmentDetails": "4 آلاف مقدم حجز والباقي على أقساط مريحة تناسب الجميع."
  },
  {
    "id": "spec_1787499584052",
    "name": "تمريض (مساعد خدمات صحية)",
    "category": "طبي وتمريض",
    "duration": "سنتين مكثفين من 12 إلى 14 شهراً (4 فصول)",
    "jobTitle": "مساعد خدمات صحية - تمريض ورعاية طبية",
    "totalFees": "15,000 جنيه للسنتين",
    "workplaces": "المستشفيات العامة والخاصة، المراكز الطبية، العيادات، دور رعاية المسنين، الرعاية المنزلية، مراكز الرعاية الصحية التخصصية.",
    "description": "يركز البرنامج على تأهيل المتدرب لاكتساب المهارات الأساسية المساندة في مجال الرعاية الصحية، وقياس العلامات الحيوية، الإسعافات الأولية، مكافحة العدوى، والعمل الميداني والسريري داخل المستشفيات.",
    "feesPerTerm": "7,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "availableInBranch": "فرع بني سويف",
    "installmentDetails": "4 آلاف مقدم حجز والباقي على أقساط مريحة تناسب الجميع."
  }
];

const DEFAULT_REFAQ_STUDY: StudySystemItem[] = [
  {
    id: "study_1787639969866",
    title: "📚 نظام الدراسة والتدريب",
    type: "attendance",
    description: "سنتان دراسيتان مكثفتان (4 فصول) تجمع بين الدراسة النظرية والتطبيق العملي، بالإضافة إلى فترة تدريب عملي وميداني داخل المستشفيات والجهات المتخصصة لاكتساب خبرة حقيقية قبل التخرج.",
    details: [
      "سنتين مكثفين من 12 إلى 14 شهر مع تدريب عملي داخل المستشفيات والمعامل",
      "المصروفات 15 ألف للسنتين (7500 في السنة)",
      "مقدم الحجز 4000 جنيه والباقي أقساط ميسرة",
      "تأجيل التجنيد متاح للطلاب المستحقين"
    ],
    scheduleNotes: ""
  },
  {
    id: "study_refaq_free_courses",
    title: "🎁 الكورسات والدورات المجانية الممنوحة للطالب",
    type: "general",
    description: "يحصل الطالب مجاناً طوال فترة دراسته على باقة دورات تدريبية وتأهيلية معتمدة لرفع كفاءته لسوق العمل:",
    details: [
      "🤖 كورس الذكاء الاصطناعي (AI) وتطبيقاته الحديثة",
      "🌱 كورس التنمية البشرية وتطوير المهارات الشخصية وبناء الوعي",
      "🇬🇧 كورس اللغة الإنجليزية (English) والمصطلحات التخصصية",
      "🚑 كورس الإسعافات الأولية الشاملة والتعامل مع الطوارئ"
    ],
    scheduleNotes: "متاحة مجاناً لجميع الطلاب الملتحقين"
  },
  {
    id: "study_1787639853467",
    title: "ملف الشهادات والاعتمادات",
    type: "exams",
    description: "✅ شهادة معتمدة من جامعة حكومية وموثقة من الخارجية المصرية بختم النسر.\n\n✅ كارنيه النقابة وكارنيه الوزارة لتغيير المسمى الوظيفي.\n\n✅ شهادة قياس مستوى المهارة.\n\n✅ شهادة خبرة معتمدة من أماكن التدريب.",
    details: [
      "شهادات واعتمادات رسمية تؤهلك للعمل محلياً ودولياً"
    ],
    scheduleNotes: ""
  },
  {
    id: "study_1787639594671",
    title: "فرص بعد التخرج",
    type: "general",
    description: "🏥 العمل بالمستشفيات والمراكز الطبية والعيادات والشركات الهندسية.\n\n⭐ فرصة تعيين وتدريب للمتميزين.\n\n🌍 إمكانية السفر والعمل بالخارج بعد توثيق الشهادات من الخارجية.",
    details: [
      "العمل بالمستشفيات والمراكز الطبية والعيادات والشركات"
    ],
    scheduleNotes: ""
  },
  {
    id: "study_1787639522226",
    title: "تدريبات وزيارات ميدانية مجانية",
    type: "practical",
    description: "تدريب عملي وميداني داخل كبرى المستشفيات والمعامل والمواقع المتخصصة.",
    details: [
      "تدريب عملي بالمستشفيات العامة والخاصة",
      "إشراف نخبة من الأطباء والمهندسين والاستشاريين"
    ],
    scheduleNotes: ""
  }
];

type RefaqTabType = "branches" | "specializations" | "accreditations" | "studysystem";

function parseList<T>(data: any, fallback: T[]): T[] {
  if (data === null || data === undefined) return fallback;
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const p = JSON.parse(data);
      if (Array.isArray(p)) return p;
    } catch (e) {}
  }
  return fallback;
}

export default function RefaqAcademyPage() {
  // 1. Tab State with URL query sync
  const [activeTab, setActiveTab] = useState<RefaqTabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "specializations" || tabParam === "accreditations" || tabParam === "studysystem" || tabParam === "branches" || tabParam === "hq") {
        return (tabParam === "hq" ? "branches" : tabParam) as RefaqTabType;
      }
    } catch (e) {
      console.error(e);
    }
    return "branches";
  });

  const handleSelectTab = (tab: RefaqTabType) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Data States
  const [branches, setBranches] = useState<Branch[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedBranches = localStorage.getItem(REFAQ_BRANCHES_KEY);
        if (savedBranches) return parseList(savedBranches, DEFAULT_REFAQ_BRANCHES);
        const savedHq = localStorage.getItem(REFAQ_HQ_KEY);
        if (savedHq) {
          const parsed = JSON.parse(savedHq);
          if (parsed && typeof parsed === "object") return [parsed];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_REFAQ_BRANCHES;
  });

  const [specializations, setSpecializations] = useState<Specialization[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(REFAQ_SPECS_KEY);
        if (saved) return parseList(saved, DEFAULT_REFAQ_SPECS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_REFAQ_SPECS;
  });

  const [accreditations, setAccreditations] = useState<AccreditationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(REFAQ_ACCS_KEY);
        if (saved) return parseList(saved, DEFAULT_REFAQ_ACCS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_REFAQ_ACCS;
  });

  const [studySystemItems, setStudySystemItems] = useState<StudySystemItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(REFAQ_STUDY_KEY);
        if (saved) return parseList(saved, DEFAULT_REFAQ_STUDY);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_REFAQ_STUDY;
  });

  // 3. Admin & Registration Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Sub-entity Form Modals
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | undefined>();

  const [isSpecFormOpen, setIsSpecFormOpen] = useState(false);
  const [specToEdit, setSpecToEdit] = useState<Specialization | undefined>();

  const [isAccFormOpen, setIsAccFormOpen] = useState(false);
  const [accToEdit, setAccToEdit] = useState<AccreditationItem | undefined>();

  const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);
  const [studyToEdit, setStudyToEdit] = useState<StudySystemItem | undefined>();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "branch" | "spec" | "acc" | "study"; item: any } | null>(null);

  // Persistence & Cloud Sync
  useEffect(() => {
    let isMounted = true;

    async function loadCloudData() {
      const configs = await syncAllConfigsFromDatabase();
      if (isMounted && configs) {
        if (configs[REFAQ_BRANCHES_KEY] !== undefined) {
          const b = parseList(configs[REFAQ_BRANCHES_KEY], DEFAULT_REFAQ_BRANCHES);
          setBranches(b);
        } else if (configs[REFAQ_HQ_KEY]) {
          setBranches([configs[REFAQ_HQ_KEY]]);
        }
        if (configs[REFAQ_SPECS_KEY] !== undefined) {
          const s = parseList(configs[REFAQ_SPECS_KEY], DEFAULT_REFAQ_SPECS);
          setSpecializations(s);
        }
        if (configs[REFAQ_ACCS_KEY] !== undefined) {
          const a = parseList(configs[REFAQ_ACCS_KEY], DEFAULT_REFAQ_ACCS);
          setAccreditations(a);
        }
        if (configs[REFAQ_STUDY_KEY] !== undefined) {
          const st = parseList(configs[REFAQ_STUDY_KEY], DEFAULT_REFAQ_STUDY);
          setStudySystemItems(st);
        }
      }
    }
    loadCloudData();

    const handleConfigsUpdated = () => {
      try {
        const savedB = localStorage.getItem(REFAQ_BRANCHES_KEY);
        if (savedB !== null) setBranches(parseList(savedB, DEFAULT_REFAQ_BRANCHES));

        const savedS = localStorage.getItem(REFAQ_SPECS_KEY);
        if (savedS !== null) setSpecializations(parseList(savedS, DEFAULT_REFAQ_SPECS));

        const savedA = localStorage.getItem(REFAQ_ACCS_KEY);
        if (savedA !== null) setAccreditations(parseList(savedA, DEFAULT_REFAQ_ACCS));

        const savedSt = localStorage.getItem(REFAQ_STUDY_KEY);
        if (savedSt !== null) setStudySystemItems(parseList(savedSt, DEFAULT_REFAQ_STUDY));
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("site_configs_updated", handleConfigsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("site_configs_updated", handleConfigsUpdated);
    };
  }, []);

  // 3-Click Footer Trigger: Open Passcode auth if locked, or Dashboard directly if unlocked
  const handleFooterTrigger = () => {
    if (isAdminUnlocked) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  // Auth Success
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsAdminUnlocked(true);
    setIsAdminDashboardOpen(true);
    toast.success("تم فتح لوحة تحكم أكاديمية الرفاق بنجاح 🛡️");
  };

  // Lock Admin
  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setIsAdminDashboardOpen(false);
    toast.success("تم قفل لوحة التحكم وتأمين الواجهة بنجاح 🔒");
  };

  // Dispatch Auth for in-view actions
  const handleRequestAuth = (
    type: "branch" | "specialization" | "accreditation" | "studysystem",
    action: "add" | "edit" | "delete",
    targetItem?: any
  ) => {
    if (!isAdminUnlocked) {
      setIsAuthModalOpen(true);
      return;
    }

    if (action === "delete") {
      setDeleteTarget({
        type: type === "branch" ? "branch" : type === "specialization" ? "spec" : type === "accreditation" ? "acc" : "study",
        item: targetItem
      });
      setIsDeleteModalOpen(true);
      return;
    }

    if (type === "branch") {
      setBranchToEdit(action === "edit" ? targetItem : undefined);
      setIsBranchFormOpen(true);
    } else if (type === "specialization") {
      setSpecToEdit(action === "edit" ? targetItem : undefined);
      setIsSpecFormOpen(true);
    } else if (type === "accreditation") {
      setAccToEdit(action === "edit" ? targetItem : undefined);
      setIsAccFormOpen(true);
    } else if (type === "studysystem") {
      setStudyToEdit(action === "edit" ? targetItem : undefined);
      setIsStudyFormOpen(true);
    }
  };

  // Save Branch
  const handleSaveBranch = (branch: Branch) => {
    setBranches((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      const next = exists ? prev.map((b) => (b.id === branch.id ? branch : b)) : [branch, ...prev];
      saveSiteConfig(REFAQ_BRANCHES_KEY, next);
      return next;
    });
    setIsBranchFormOpen(false);
    toast.success("تم حفظ بيانات الفرع بنجاح");
  };

  // Save Specialization
  const handleSaveSpecialization = (spec: Specialization) => {
    setSpecializations((prev) => {
      const exists = prev.some((s) => s.id === spec.id);
      const next = exists ? prev.map((s) => (s.id === spec.id ? spec : s)) : [spec, ...prev];
      saveSiteConfig(REFAQ_SPECS_KEY, next);
      return next;
    });
    setIsSpecFormOpen(false);
    toast.success("تم حفظ بيانات التخصص بنجاح");
  };

  // Save Accreditation
  const handleSaveAccreditation = (acc: AccreditationItem) => {
    setAccreditations((prev) => {
      const exists = prev.some((a) => a.id === acc.id);
      const next = exists ? prev.map((a) => (a.id === acc.id ? acc : a)) : [acc, ...prev];
      saveSiteConfig(REFAQ_ACCS_KEY, next);
      return next;
    });
    setIsAccFormOpen(false);
    toast.success("تم حفظ بيانات الاعتماد بنجاح");
  };

  // Save Study System
  const handleSaveStudySystem = (item: StudySystemItem) => {
    setStudySystemItems((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      const next = exists ? prev.map((s) => (s.id === item.id ? item : s)) : [item, ...prev];
      saveSiteConfig(REFAQ_STUDY_KEY, next);
      return next;
    });
    setIsStudyFormOpen(false);
    toast.success("تم حفظ بيانات نظام الدراسة بنجاح");
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;

    if (type === "branch") {
      setBranches((prev) => {
        const next = prev.filter((b) => b.id !== item.id);
        saveSiteConfig(REFAQ_BRANCHES_KEY, next);
        return next;
      });
      toast.success("تم حذف الفرع بنجاح");
    } else if (type === "spec") {
      setSpecializations((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(REFAQ_SPECS_KEY, next);
        return next;
      });
      toast.success("تم حذف التخصص بنجاح");
    } else if (type === "acc") {
      setAccreditations((prev) => {
        const next = prev.filter((a) => a.id !== item.id);
        saveSiteConfig(REFAQ_ACCS_KEY, next);
        return next;
      });
      toast.success("تم حذف الاعتماد بنجاح");
    } else if (type === "study") {
      setStudySystemItems((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(REFAQ_STUDY_KEY, next);
        return next;
      });
      toast.success("تم حذف البند بنجاح");
    }

    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // Share direct tab link
  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "بوابة أكاديمية الرفاق الدولية",
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط البوابة بنجاح لمشاركته");
    }
  };

  const navTabs: TabItem[] = [
    {
      id: "branches",
      label: "الفروع والمقرات",
      subLabel: "العناوين، الاستقبال، والتواصل",
      icon: Building2,
      count: branches.length,
      activeColor: "bg-blue-600 text-white shadow-xs border-blue-700",
      pillColor: "bg-blue-950/30 text-white"
    },
    {
      id: "specializations",
      label: "التخصصات والمصروفات",
      subLabel: "الأقسام الدراسية، المصاريف، والأقساط",
      icon: GraduationCap,
      count: specializations.length,
      activeColor: "bg-cyan-600 text-white shadow-xs border-cyan-700",
      pillColor: "bg-cyan-950/30 text-white"
    },
    {
      id: "accreditations",
      label: "الاعتمادات والشهادات",
      subLabel: "التوثيقات الحكومية والشهادات المهنية",
      icon: Award,
      count: accreditations.length,
      activeColor: "bg-indigo-600 text-white shadow-xs border-indigo-700",
      pillColor: "bg-indigo-950/30 text-white"
    },
    {
      id: "studysystem",
      label: "نظام الدراسة والمميزات",
      subLabel: "الحضور والتدريب العملي والامتحانات",
      icon: BookOpen,
      count: studySystemItems.length,
      activeColor: "bg-purple-600 text-white shadow-xs border-purple-700",
      pillColor: "bg-purple-950/30 text-white"
    }
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white flex flex-col justify-between" dir="rtl">
      
      <div>
        {/* 1. Header Banner & Branding */}
        <header className="relative bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 pt-7 pb-8 overflow-hidden print:hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-950 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span>المنظومة الرسمية للطلاب والدارسين بأكاديمية الرفاق</span>
                <span className="bg-blue-200/80 text-blue-950 text-[11px] px-2 py-0.5 rounded font-mono font-bold">2026 - 2027</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareLink}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs transition flex items-center gap-1.5"
                  title="مشاركة رابط الصفحة"
                >
                  <Share2 className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">مشاركة الرابط</span>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="max-w-3xl space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                بوابة <span className="text-blue-600 font-extrabold">أكاديمية الرفاق الدولية للتعليم والتدريب</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                دليلك المعتمد لمقرات وفروع الأكاديمية، التخصصات الدراسية المعتمدة، المصروفات والأقساط، التوثيقات والشهادات الرسمية، ونظام الدراسة والتدريب الميداني.
              </p>
            </div>

            {/* Register Now Button Directly Under Header */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                id="refaq-register-now-btn"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-400 text-white font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95"
              >
                <Ticket className="w-5 h-5 text-white" />
                <span>سجل الآن بأكاديمية الرفاق الدولية</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>

              <div className="text-xs font-bold text-slate-600 bg-blue-50/80 px-3.5 py-2 rounded-xl border border-blue-200/80 flex items-center gap-2">
                <span>🎓 البرامج المعتمدة:</span>
                <span className="text-blue-900 font-black">شعبة إدارة الأعمال واللغات والعلوم التطبيقية والمهنية</span>
              </div>
            </div>

          </div>
        </header>

        {/* 2. Sub-Pages Navigation Tabs */}
        <PortalTabsNav
          activeTab={activeTab}
          onSelectTab={(tab) => handleSelectTab(tab as RefaqTabType)}
          tabs={navTabs}
        />

        {/* 3. Main Views Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* TAB 1: BRANCHES */}
          {activeTab === "branches" && (
            <BranchesListView
              branches={branches}
              onSaveBranch={handleSaveBranch}
              onRequestAuth={(action, branch) => handleRequestAuth("branch", action, branch)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 2: SPECIALIZATIONS */}
          {activeTab === "specializations" && (
            <SpecializationsView
              specializations={specializations}
              onSave={setSpecializations}
              onRequestAuth={(action, spec) => handleRequestAuth("specialization", action, spec)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 3: ACCREDITATIONS */}
          {activeTab === "accreditations" && (
            <AccreditationsView
              accreditations={accreditations}
              onSave={setAccreditations}
              onRequestAuth={(action, item) => handleRequestAuth("accreditation", action, item)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 4: STUDY SYSTEM */}
          {activeTab === "studysystem" && (
            <StudySystemView
              studySystemItems={studySystemItems}
              onSave={setStudySystemItems}
              onRequestAuth={(action, item) => handleRequestAuth("studysystem", action, item)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

        </main>
      </div>

      {/* 4. Unified Clean Footer with 3-Click Developer Credit Trigger */}
      <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-xs py-8 px-4 sm:px-6 lg:px-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          
          <div className="space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>أكاديمية الرفاق الدولية للتعليم والتدريب © 2026</span>
            </div>
            <p className="text-[11px] text-slate-500">
              بوابة الدارسين والفروع المعتمدة لكافة التخصصات والاعتمادات الرسمية
            </p>
          </div>

          <DeveloperCreditFooter
            onTriggerAdmin={handleFooterTrigger}
            isAdminUnlocked={isAdminUnlocked}
            onLockAdmin={handleLockAdmin}
          />

        </div>
      </footer>

      {/* =========================================================
          Admin Modals & Forms
      ========================================================= */}
      
      {/* 1. Register Now Modal */}
      <AcademyRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        academyName="أكاديمية الرفاق الدولية للتعليم والتدريب"
        availableSpecializations={specializations.map(s => ({ id: s.id, name: s.name }))}
      />

      {/* 2. Admin Passcode Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        academyScope="refaq"
        academyName="أكاديمية الرفاق الدولية"
        actionTitle="التحقق من صلاحية الإدارة للوحة تحكم أكاديمية الرفاق"
      />

      {/* 3. Central Admin Dashboard Modal */}
      <AcademyAdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        academyName="أكاديمية الرفاق الدولية للتعليم والتدريب"
        onAddBranch={() => {
          setIsAdminDashboardOpen(false);
          setBranchToEdit(undefined);
          setIsBranchFormOpen(true);
        }}
        onAddSpecialization={() => {
          setIsAdminDashboardOpen(false);
          setSpecToEdit(undefined);
          setIsSpecFormOpen(true);
        }}
        onAddAccreditation={() => {
          setIsAdminDashboardOpen(false);
          setAccToEdit(undefined);
          setIsAccFormOpen(true);
        }}
        onAddStudySystem={() => {
          setIsAdminDashboardOpen(false);
          setStudyToEdit(undefined);
          setIsStudyFormOpen(true);
        }}
        onLockAdmin={handleLockAdmin}
        isLiveAdminMode={isAdminUnlocked}
        onToggleLiveAdminMode={() => setIsAdminUnlocked(!isAdminUnlocked)}
      />

      {/* 4. Branch Form Modal (Add / Edit) */}
      {isBranchFormOpen && (
        <BranchFormModal
          isOpen={isBranchFormOpen}
          onClose={() => setIsBranchFormOpen(false)}
          onSave={handleSaveBranch}
          branchToEdit={branchToEdit}
        />
      )}

      {/* 5. Specialization Form Modal */}
      {isSpecFormOpen && (
        <SpecializationFormModal
          isOpen={isSpecFormOpen}
          onClose={() => setIsSpecFormOpen(false)}
          onSave={handleSaveSpecialization}
          initialData={specToEdit}
        />
      )}

      {/* 6. Accreditation Form Modal */}
      {isAccFormOpen && (
        <AccreditationFormModal
          isOpen={isAccFormOpen}
          onClose={() => setIsAccFormOpen(false)}
          onSave={handleSaveAccreditation}
          initialData={accToEdit}
        />
      )}

      {/* 7. Study System Form Modal */}
      {isStudyFormOpen && (
        <StudySystemFormModal
          isOpen={isStudyFormOpen}
          onClose={() => setIsStudyFormOpen(false)}
          onSave={handleSaveStudySystem}
          initialData={studyToEdit}
        />
      )}

      {/* 8. Delete Confirm Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={deleteTarget.item.name || deleteTarget.item.title || "هذا البند"}
          itemType={deleteTarget.type === "branch" ? "فرع" : deleteTarget.type === "spec" ? "تخصص" : deleteTarget.type === "acc" ? "اعتماد" : "بند دراسي"}
        />
      )}

    </div>
  );
}
