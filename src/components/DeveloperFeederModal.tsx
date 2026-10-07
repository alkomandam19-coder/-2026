import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { initialLeads } from "../data/initialStudents";
import { normalizeAndDeduplicateLeads } from "../lib/leadUtils";
import { 
  X, 
  Lock, 
  Briefcase, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Star, 
  Award, 
  HeartHandshake, 
  BookOpen,
  Check,
  Link,
  Share2,
  Copy,
  ExternalLink,
  QrCode,
  Users,
  Target,
  Compass,
  Layers,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Filter,
  Download,
  RefreshCw,
  Megaphone,
  Globe,
  Tag,
  MessageSquare,
  Calendar,
  Shield,
  Eye,
  CheckCircle
} from "lucide-react";
import { ACADEMY_DEPARTMENTS } from "../data";
import { DEFAULT_COMPARISON_EXTRAS, DepartmentComparisonExtra } from "../data/comparisonData";
import { supabase, hasSupabase } from "../supabaseClient";
import { saveSiteConfig, isAiGeneratedPost } from "../utils/configSync";
import { compressAndConvertToWebP, parseVideoMedia } from "../utils/imageCompression";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../utils/safeStorage";
import { defaultSalesReps } from "../data/initialConfigs";

export interface SavedMarketingLink {
  id: string;
  title: string;
  agentName: string;
  platform: string;
  destinationType: string;
  destinationPath: string;
  campaignName: string;
  discountCode: string;
  fullUrl: string;
  createdAt: string;
  notes?: string;
}

interface ROIDepartment {
  id: string;
  name: string;
  salary: number;
  careerPct: string;
  role: string;
  demandBadge?: string;
}

interface Review {
  id: number;
  studentName: string;
  department: string;
  governorate: string;
  rating: number;
  text: string;
  avatarColor: string;
  initials: string;
  date: string;
  verified: boolean;
  type?: string;
  recommendation?: string;
}

interface DeveloperFeederModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeveloperFeederModal({ isOpen, onClose }: DeveloperFeederModalProps) {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const savedStatus = localStorage.getItem("supabase_connection_status");
      const savedError = localStorage.getItem("supabase_error_message");
      if (savedStatus === "true") {
        setSupabaseConnected(true);
        setSupabaseError(savedError || null);
      } else if (savedStatus === "false") {
        setSupabaseConnected(false);
        setSupabaseError(savedError || null);
      } else {
        setSupabaseConnected(null);
        setSupabaseError(null);
      }
    };
    checkStatus();
    window.dispatchEvent(new CustomEvent("supabase_checked_locally", { detail: { connected: localStorage.getItem("supabase_connection_status") === "true" } }));
    window.addEventListener("supabase_status_updated", checkStatus);
    return () => {
      window.removeEventListener("supabase_status_updated", checkStatus);
    };
  }, []);

  // Job announcements ticker
  const [jobVacancies, setJobVacancies] = useState<string[]>([]);
  const [newJobText, setNewJobText] = useState("");

  // ROI Calculator dynamically mapped Array
  const [roiDepartments, setRoiDepartments] = useState<ROIDepartment[]>([]);
  
  // States to add new department
  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptSalary, setNewDeptSalary] = useState(10050);
  const [newDeptPct, setNewDeptPct] = useState("95%");
  const [newDeptRole, setNewDeptRole] = useState("");
  const [newDeptDemandBadge, setNewDeptDemandBadge] = useState("🔥 طلب شديد جداً - مقاعد محدودة متبقية");

  // Academic Departments (General "تصفح الأقسام")
  const [academyDepartmentsList, setAcademyDepartmentsList] = useState<any[]>([]);
  const [adminLeads, setAdminLeads] = useState<any[]>(() => {
    let tombstoneIds = new Set<string>();
    if (typeof window !== "undefined") {
      try {
        const deletedIds: string[] = JSON.parse(localStorage.getItem("academy_deleted_lead_identifiers") || "[]");
        tombstoneIds = new Set(deletedIds.map(s => String(s).trim().toLowerCase()));
      } catch {}

      try {
        const cached = localStorage.getItem("admin_leads_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const deduped = normalizeAndDeduplicateLeads(parsed);
            return deduped.filter((l: any) => {
              const idVal = String(l.id || "").trim().toLowerCase();
              const codeVal = String(l.reservationCode || "").trim().toLowerCase();
              return !tombstoneIds.has(idVal) && !tombstoneIds.has(codeVal);
            });
          }
        }
      } catch (e) {}
    }
    const baseline = normalizeAndDeduplicateLeads(initialLeads);
    return baseline.filter(l => {
      const idVal = String(l.id || "").trim().toLowerCase();
      const codeVal = String(l.reservationCode || "").trim().toLowerCase();
      return !tombstoneIds.has(idVal) && !tombstoneIds.has(codeVal);
    });
  });
  const [showAddAcademyForm, setShowAddAcademyForm] = useState(false);
  const [newAcademyId, setNewAcademyId] = useState("");
  const [newAcademyName, setNewAcademyName] = useState("");
  const [newAcademyIcon, setNewAcademyIcon] = useState("BookOpen");
  const [newAcademyDesc, setNewAcademyDesc] = useState("");
  const [newAcademySkills, setNewAcademySkills] = useState("");
  const [newAcademyCareers, setNewAcademyCareers] = useState("");
  const [newAcademyMaxCapacity, setNewAcademyMaxCapacity] = useState<number>(100);

  // Department Comparison Extras State
  const [comparisonExtras, setComparisonExtras] = useState<Record<string, DepartmentComparisonExtra>>({});

  const handleUpdateComparisonExtraField = (deptId: string, field: keyof DepartmentComparisonExtra, value: any) => {
    setComparisonExtras(prev => {
      const existing = prev[deptId] || DEFAULT_COMPARISON_EXTRAS[deptId] || {
        duration: "سنتان دراسيتان + تدريب ميداني معتمد",
        practicalRatio: "70% عملي - 30% نظري",
        trainingLocations: ["المؤسسات والشركات المعتمدة بالشراكة مع الأكاديمية"],
        qualifications: "جميع المؤهلات الثانوية والدبلومات الفنية",
        careerOutlook: "مستقبل فريد وفرص عمل واعدة ومطلوبة"
      };

      let updatedValue = value;
      if (field === "trainingLocations" && typeof value === "string") {
        updatedValue = value.split("\n").map(s => s.trim()).filter(Boolean);
      }

      return {
        ...prev,
        [deptId]: {
          ...existing,
          [field]: updatedValue
        }
      };
    });
  };

  const handleSaveComparisonExtras = () => {
    saveSiteConfig("department_comparison_extras", comparisonExtras);
    window.dispatchEvent(new Event("department_comparison_updated"));
    toast.success("✓ تم حفظ وتحديث بيانات مقارنة الأقسام والتخصصات بنجاح وتطبيقها في واجهة المقارنة!");
  };

  const handleResetComparisonExtras = () => {
    setComparisonExtras(DEFAULT_COMPARISON_EXTRAS);
    saveSiteConfig("department_comparison_extras", DEFAULT_COMPARISON_EXTRAS);
    window.dispatchEvent(new Event("department_comparison_updated"));
    toast.success("✓ تم إعادة ضبط بيانات المقارنة إلى القيم الافتراضية بنجاح!");
  };

  // Student Testimonials
  const [studentTestimonials, setStudentTestimonials] = useState<Review[]>([]);
  const [newReviewType, setNewReviewType] = useState<string>("enrolled_student");
  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewDept, setNewReviewDept] = useState("");
  const [newReviewGov, setNewReviewGov] = useState("الدقهلية");
  const [newReviewStars, setNewReviewStars] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");

  // AI Knowledge Prompt
  const [aiAdvisorTrainingText, setAiAdvisorTrainingText] = useState("");

  // Dynamic PDF Library File Manager States
  const [pdfLibraryList, setPdfLibraryList] = useState<any[]>([]);
  const [libraryFormId, setLibraryFormId] = useState<string>("");
  const [libraryFormName, setLibraryFormName] = useState<string>("");
  const [libraryFormUrl, setLibraryFormUrl] = useState<string>("");
  const [libraryFormSpecialization, setLibraryFormSpecialization] = useState<string>("الدليل الشامل 2026");
  const [libraryUploadProgress, setLibraryUploadProgress] = useState<string>("");
  const [libraryIsSaving, setLibraryIsSaving] = useState<boolean>(false);

  // Password-Protected Security Deletion Modal States
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"department" | "file">("department");
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityError, setSecurityError] = useState("");

  // System Feeder Sub-Tab States
  const [feederSubTab, setFeederSubTab] = useState<"database" | "marketing_links" | "leads" | "news_ads">("database");
  const [exportPassword, setExportPassword] = useState("");

  // Unlimited Marketing & Agent Referral Link Generator States
  const [linkAgentName, setLinkAgentName] = useState("");
  const [linkPlatform, setLinkPlatform] = useState("facebook");
  const [linkDestinationType, setLinkDestinationType] = useState<"home" | "booking" | "extraction" | "guide" | "specialty" | "news" | "custom">("home");
  const [linkDepartment, setLinkDepartment] = useState("petroleum");
  const [linkCustomPath, setLinkCustomPath] = useState("");
  const [linkCampaignName, setLinkCampaignName] = useState("");
  const [linkDiscountCode, setLinkDiscountCode] = useState("AM2026");
  const [linkMedium, setLinkMedium] = useState("social");
  const [linkContent, setLinkContent] = useState("");
  const [linkTitleNote, setLinkTitleNote] = useState("");
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState<string | null>(null);
  const [showQrModalUrl, setShowQrModalUrl] = useState<{ url: string; title: string; agent: string } | null>(null);
  const [savedLinksFilterAgent, setSavedLinksFilterAgent] = useState("all");
  const [savedLinksFilterPlatform, setSavedLinksFilterPlatform] = useState("all");
  const [savedLinksSearchQuery, setSavedLinksSearchQuery] = useState("");
  
  const [savedMarketingLinks, setSavedMarketingLinks] = useState<SavedMarketingLink[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("academy_saved_marketing_links");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to load saved marketing links", e);
      }
    }
    return [
      {
        id: "preset_1",
        title: "إعلان فيسبوك رئيسي - أ/ أحمد",
        agentName: "أحمد علي",
        platform: "facebook",
        destinationType: "home",
        destinationPath: "/",
        campaignName: "summer_ad_2026",
        discountCode: "AM2026",
        fullUrl: typeof window !== "undefined" ? `${window.location.origin}/?ref=ahmed_ali&agent=ahmed_ali&utm_source=facebook&utm_medium=social&utm_campaign=summer_ad_2026&discount=AM2026` : "/?ref=ahmed_ali",
        createdAt: "2026-08-20",
        notes: "حملة الترويج الرئيسية على صفحة الفيسبوك"
      },
      {
        id: "preset_2",
        title: "حملة تيك توك قسم البترول - أ/ سارة",
        agentName: "سارة ممدوح",
        platform: "tiktok",
        destinationType: "specialty",
        destinationPath: "/specialties/petroleum",
        campaignName: "tiktok_petroleum_promo",
        discountCode: "AM2026",
        fullUrl: typeof window !== "undefined" ? `${window.location.origin}/specialties/petroleum?ref=sara_mamdouh&agent=sara_mamdouh&utm_source=tiktok&utm_medium=reels&utm_campaign=tiktok_petroleum_promo&discount=AM2026` : "/specialties/petroleum",
        createdAt: "2026-08-20",
        notes: "إعلان فيديو ريلز لقسم هندسة البترول"
      }
    ];
  });

  const saveMarketingLinksToStorage = (updated: SavedMarketingLink[]) => {
    setSavedMarketingLinks(updated);
    if (typeof window !== "undefined") {
      safeSetItem("academy_saved_marketing_links", JSON.stringify(updated));
    }
  };

  const currentGeneratedUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.eg-academies.com";
    let basePath = "/";
    if (linkDestinationType === "booking") {
      basePath = "/#booking-form-wrapper";
    } else if (linkDestinationType === "extraction") {
      basePath = "/form-extraction";
    } else if (linkDestinationType === "guide") {
      basePath = "/registration-guide";
    } else if (linkDestinationType === "news") {
      basePath = "/news";
    } else if (linkDestinationType === "specialty") {
      basePath = `/specialties/${linkDepartment || "petroleum"}`;
    } else if (linkDestinationType === "custom") {
      basePath = linkCustomPath ? (linkCustomPath.startsWith("/") ? linkCustomPath : `/${linkCustomPath}`) : "/";
    }

    const [pathPart, hashPart] = basePath.split("#");
    try {
      const urlObj = new URL(pathPart || "/", origin);
      
      const cleanAgent = linkAgentName.trim();
      if (cleanAgent) {
        urlObj.searchParams.set("ref", cleanAgent);
        urlObj.searchParams.set("agent", cleanAgent);
      }
      if (linkPlatform.trim()) {
        urlObj.searchParams.set("utm_source", linkPlatform.trim());
      }
      if (linkMedium.trim()) {
        urlObj.searchParams.set("utm_medium", linkMedium.trim());
      }
      if (linkCampaignName.trim()) {
        urlObj.searchParams.set("utm_campaign", linkCampaignName.trim());
      }
      if (linkContent.trim()) {
        urlObj.searchParams.set("utm_content", linkContent.trim());
      }
      if (linkDiscountCode.trim() && linkDiscountCode.trim() !== "none") {
        urlObj.searchParams.set("discount", linkDiscountCode.trim());
      }

      let final = urlObj.toString();
      if (hashPart) {
        final += `#${hashPart}`;
      }
      return final;
    } catch {
      return `${origin}${basePath}`;
    }
  }, [linkAgentName, linkPlatform, linkDestinationType, linkDepartment, linkCustomPath, linkCampaignName, linkDiscountCode, linkMedium, linkContent]);

  // News and Articles & Ads States
  const [newsList, setNewsList] = useState<any[]>([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDesc, setNewsDesc] = useState("");
  const [newsCategory, setNewsCategory] = useState("إعلانات رسمية 📣");
  const [newsReadTime, setNewsReadTime] = useState("قراءة في ٣ دقائق");
  const [newsContent, setNewsContent] = useState("");
  const [newsImage, setNewsImage] = useState("");
  const [newsVideo, setNewsVideo] = useState("");

  // News Page customization states
  const [newsPageTitle, setNewsPageTitle] = useState("📰 المركز الإعلامي والأخبار الحصرية");
  const [newsPageSubtitle, setNewsPageSubtitle] = useState("تابع آخر أخبار التنسيق والقبول بالمعاهد الفنية المعتمدة، فعاليات التخرج، والندوات الإرشادية والتوعوية لضمان اختيار مستقبلك الأكاديمي الأنسب.");

  // Advertising States (Right Ad)
  const [rightAdVisible, setRightAdVisible] = useState(true);
  const [rightAdTitle, setRightAdTitle] = useState("مساحة إعلانية");
  const [rightAdDesc, setRightAdDesc] = useState("احجز مقعدك الدراسي الآن لضمان مستقبلك المهني الأفضل.");
  const [rightAdLink, setRightAdLink] = useState("/registration-guide");
  const [rightAdImage, setRightAdImage] = useState("");
  const [rightAdBtnText, setRightAdBtnText] = useState("تواصل معنا 📞");

  // Advertising States (Left Ad)
  const [leftAdVisible, setLeftAdVisible] = useState(true);
  const [leftAdTitle, setLeftAdTitle] = useState("مساحة إعلانية");
  const [leftAdDesc, setLeftAdDesc] = useState("حقق حلمك مع كبرى برامج التعليم والتدريب الفني المعتمد.");
  const [leftAdLink, setLeftAdLink] = useState("/registration-guide");
  const [leftAdImage, setLeftAdImage] = useState("");
  const [leftAdBtnText, setLeftAdBtnText] = useState("الموقع الرسمي 🔗");

  // Header Blocks Custom Content
  const [devHeaderRightType, setDevHeaderRightType] = useState("none"); // none, text, image, both
  const [devHeaderRightText, setDevHeaderRightText] = useState("");
  const [devHeaderRightImage, setDevHeaderRightImage] = useState("");
  const [devHeaderRightHasFrame, setDevHeaderRightHasFrame] = useState(true);
  const [devHeaderRightTextPosition, setDevHeaderRightTextPosition] = useState("below"); // below, above, right, left
  const [devHeaderRightFrameStyle, setDevHeaderRightFrameStyle] = useState("default");

  const [devHeaderLeftType, setDevHeaderLeftType] = useState("none"); // none, text, image, both
  const [devHeaderLeftText, setDevHeaderLeftText] = useState("");
  const [devHeaderLeftImage, setDevHeaderLeftImage] = useState("");
  const [devHeaderLeftHasFrame, setDevHeaderLeftHasFrame] = useState(true);
  const [devHeaderLeftTextPosition, setDevHeaderLeftTextPosition] = useState("below"); // below, above, right, left
  const [devHeaderLeftFrameStyle, setDevHeaderLeftFrameStyle] = useState("default");

  // Ticker Custom State
  const [devTickerType, setDevTickerType] = useState("auto"); // auto, custom
  const [devTickerCustomText, setDevTickerCustomText] = useState("");

  // Left Sidebar Widget State (Custom Box)
  const [devCustomBoxVisible, setDevCustomBoxVisible] = useState(true);
  const [devCustomBoxEmoji, setDevCustomBoxEmoji] = useState("📢");
  const [devCustomBoxTitle, setDevCustomBoxTitle] = useState("تنويه هام للطلاب");
  const [devCustomBoxText, setDevCustomBoxText] = useState("");
  const [devCustomBoxBtnText, setDevCustomBoxBtnText] = useState("دليل التقديم والمستندات 📄");
  const [devCustomBoxBtnUrl, setDevCustomBoxBtnUrl] = useState("/registration-guide");

  // Sales Representatives State for Dedicated Sales Portals
  const [devSalesReps, setDevSalesReps] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("dev_sales_reps_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [newRepName, setNewRepName] = useState("");
  const [newRepSlug, setNewRepSlug] = useState("");
  const [newRepPin, setNewRepPin] = useState("");
  const [newRepPhone, setNewRepPhone] = useState("");
  const [newRepTitle, setNewRepTitle] = useState("مستشار القبول والتسجيل");
  const [repSearchQuery, setRepSearchQuery] = useState("");
  const [isSavingRep, setIsSavingRep] = useState(false);
  const [isLoadingReps, setIsLoadingReps] = useState(false);
  const [editingDevRepId, setEditingDevRepId] = useState<string | null>(null);
  const [editingDevPin, setEditingDevPin] = useState<string>("");
  const [isSavingDevPin, setIsSavingDevPin] = useState(false);
  const [confirmDeleteRepKey, setConfirmDeleteRepKey] = useState<string | null>(null);
  const [isDeletingRepKey, setIsDeletingRepKey] = useState<string | null>(null);

  const fetchDevSalesReps = async () => {
    setIsLoadingReps(true);
    try {
      const res = await fetch(`/api/sales-reps?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.reps)) {
        setDevSalesReps(data.reps);
        try {
          localStorage.setItem("dev_sales_reps_cache", JSON.stringify(data.reps));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("fetch sales reps error:", e);
    } finally {
      setIsLoadingReps(false);
    }
  };

  const handleUpdateDevRepPin = async (rep: any) => {
    if (!editingDevPin.trim()) {
      toast.error("يرجى كتابة كلمة المرور الجديدة.");
      return;
    }
    setIsSavingDevPin(true);
    try {
      const res = await fetch("/api/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rep,
          pin: editingDevPin.trim()
        })
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.reps)) {
        setDevSalesReps(data.reps);
        setEditingDevRepId(null);
        setEditingDevPin("");
        toast.success(`✓ تم تحديث كلمة مرور (${rep.name}) بنجاح!`);
      } else {
        toast.error(data?.error || "فشل تحديث كلمة المرور.");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSavingDevPin(false);
    }
  };

  const handleCreateDevSalesRep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newRepName.trim()) {
      toast.error("يرجى إدخال اسم الموظف.");
      return;
    }
    if (!newRepPin.trim()) {
      toast.error("يرجى كتابة رمز PIN / كلمة مرور الموظف.");
      return;
    }
    setIsSavingRep(true);
    try {
      const cleanSlug = newRepSlug.trim() || newRepName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
      const res = await fetch("/api/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRepName.trim(),
          slug: cleanSlug || "rep_" + Date.now(),
          pin: newRepPin.trim(),
          phone: newRepPhone.trim(),
          title: newRepTitle.trim() || "مستشار القبول والتسجيل"
        })
      });
      const data = await res.json();
      if (data.success) {
        const updatedList = data.reps || [];
        setDevSalesReps(updatedList);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("admin_sales_reps_cache", JSON.stringify(updatedList));
            localStorage.setItem("dev_sales_reps_cache", JSON.stringify(updatedList));
          } catch (e) {}
        }
        toast.success(`✓ تم إنشاء وتفعيل صفحة خاصة للموظف (${newRepName}) بنجاح!`);
        setNewRepName("");
        setNewRepSlug("");
        setNewRepPhone("");
        setNewRepPin("");
      } else {
        toast.error(data.error || "فشل إنشاء الحساب.");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSavingRep(false);
    }
  };

  const handleDeleteDevSalesRep = async (idOrSlug: string, name: string) => {
    const key = String(idOrSlug || name);
    setIsDeletingRepKey(key);
    try {
      let res = await fetch("/api/sales-reps/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idOrSlug, name })
      });
      if (!res.ok) {
        res = await fetch(`/api/sales-reps/${encodeURIComponent(idOrSlug || name)}`, { method: "DELETE" });
      }
      const data = await res.json();
      if (data && data.success) {
        setDevSalesReps(data.reps || []);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("admin_sales_reps_cache", JSON.stringify(data.reps || []));
            localStorage.setItem("dev_sales_reps_cache", JSON.stringify(data.reps || []));
          } catch (e) {}
        }
        toast.success(`✓ تم حذف حساب الموظف (${name}) نهائياً`);
        setConfirmDeleteRepKey(null);
      } else {
        toast.error(data?.error || "فشل حذف الموظف.");
      }
    } catch (e) {
      toast.error("فشل حذف الموظف.");
    } finally {
      setIsDeletingRepKey(null);
    }
  };

  // Initialize News and Ads from localStorage on open
  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      fetchDevSalesReps();
      const savedNews = localStorage.getItem("custom_news_posts_v1");
      if (savedNews) {
        try {
          const parsed = JSON.parse(savedNews);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((p: any) => !isAiGeneratedPost(p));
            setNewsList(clean);
          } else {
            setNewsList([]);
          }
        } catch (e) {
          setNewsList([]);
        }
      } else {
        setNewsList([]);
      }

      // Load Right Ad
      const savedRightAd = localStorage.getItem("custom_news_ad_right_v2");
      if (savedRightAd) {
        try {
          const parsed = JSON.parse(savedRightAd);
          setRightAdVisible(parsed.visible !== false);
          setRightAdTitle(parsed.title || "مساحة إعلانية");
          setRightAdDesc(parsed.description || "احجز مقعدك الدراسي الآن لضمان مستقبلك المهني الأفضل.");
          setRightAdLink(parsed.linkUrl || "/registration-guide");
          setRightAdImage(parsed.imageUrl || "");
          setRightAdBtnText(parsed.btnText || "تواصل معنا 📞");
        } catch (e) {}
      } else {
        const savedAdLegacy = localStorage.getItem("custom_news_ad_v1");
        if (savedAdLegacy) {
          try {
            const parsed = JSON.parse(savedAdLegacy);
            setRightAdVisible(parsed.visible !== false);
            setRightAdTitle("مساحة إعلانية");
            setRightAdDesc(parsed.description || "");
            setRightAdLink(parsed.linkUrl || "/registration-guide");
            setRightAdImage(parsed.imageUrl || "");
            setRightAdBtnText("تواصل معنا 📞");
          } catch (e) {}
        }
      }

      // Load Left Ad
      const savedLeftAd = localStorage.getItem("custom_news_ad_left_v2");
      if (savedLeftAd) {
        try {
          const parsed = JSON.parse(savedLeftAd);
          setLeftAdVisible(parsed.visible !== false);
          setLeftAdTitle(parsed.title || "مساحة إعلانية");
          setLeftAdDesc(parsed.description || "حقق حلمك مع كبرى برامج التعليم والتدريب الفني المعتمد.");
          setLeftAdLink(parsed.linkUrl || "/registration-guide");
          setLeftAdImage(parsed.imageUrl || "");
          setLeftAdBtnText(parsed.btnText || "الموقع الرسمي 🔗");
        } catch (e) {}
      } else {
        const savedAdLegacy = localStorage.getItem("custom_news_ad_v1");
        if (savedAdLegacy) {
          try {
            const parsed = JSON.parse(savedAdLegacy);
            setLeftAdVisible(parsed.visible !== false);
            setLeftAdTitle("مساحة إعلانية");
            setLeftAdDesc(parsed.description || "");
            setLeftAdLink(parsed.linkUrl || "/registration-guide");
            setLeftAdImage(parsed.imageUrl || "");
            setLeftAdBtnText("الموقع الرسمي 🔗");
          } catch (e) {}
        }
      }

      // Header Custom Contents
      setDevHeaderRightType(localStorage.getItem("news_header_right_type_v1") || "none");
      setDevHeaderRightText(localStorage.getItem("news_header_right_text_v1") || "");
      setDevHeaderRightImage(localStorage.getItem("news_header_right_image_v1") || "");
      setDevHeaderRightHasFrame(localStorage.getItem("news_header_right_has_frame_v1") !== "false");
      setDevHeaderRightTextPosition(localStorage.getItem("news_header_right_text_position_v1") || "below");
      setDevHeaderRightFrameStyle(localStorage.getItem("news_header_right_frame_style_v1") || "default");

      setDevHeaderLeftType(localStorage.getItem("news_header_left_type_v1") || "none");
      setDevHeaderLeftText(localStorage.getItem("news_header_left_text_v1") || "");
      setDevHeaderLeftImage(localStorage.getItem("news_header_left_image_v1") || "");
      setDevHeaderLeftHasFrame(localStorage.getItem("news_header_left_has_frame_v1") !== "false");
      setDevHeaderLeftTextPosition(localStorage.getItem("news_header_left_text_position_v1") || "below");
      setDevHeaderLeftFrameStyle(localStorage.getItem("news_header_left_frame_style_v1") || "default");

      // Ticker Custom Contents
      setDevTickerType(localStorage.getItem("news_ticker_type_v1") || "auto");
      setDevTickerCustomText(localStorage.getItem("news_ticker_custom_text_v1") || "");

      // Custom Sidebar Box
      setDevCustomBoxVisible(localStorage.getItem("news_custom_box_visible_v1") !== "false");
      setDevCustomBoxEmoji(localStorage.getItem("news_custom_box_emoji_v1") || "📢");
      setDevCustomBoxTitle(localStorage.getItem("news_custom_box_title_v1") || "تنويه هام للطلاب");
      setDevCustomBoxText(localStorage.getItem("news_custom_box_text_v1") || "يمكنك كتابة أي إشعار أو تنويه أو إعلان هنا وتعديله فورياً من لوحة المطور لتنظيم حركة التواصل مع الطلاب.");
      setDevCustomBoxBtnText(localStorage.getItem("news_custom_box_btn_text_v1") || "دليل التقديم والمستندات 📄");
      setDevCustomBoxBtnUrl(localStorage.getItem("news_custom_box_btn_url_v1") || "/registration-guide");

      const savedPageTitle = localStorage.getItem("news_page_title_v1");
      if (savedPageTitle) {
        setNewsPageTitle(savedPageTitle);
      }
      const savedPageSubtitle = localStorage.getItem("news_page_subtitle_v1");
      if (savedPageSubtitle) {
        setNewsPageSubtitle(savedPageSubtitle);
      }
    }
  }, [isOpen]);

  const handleSaveNews = () => {
    if (!newsTitle.trim() || !newsContent.trim()) {
      toast.error("يرجى ملء عنوان الخبر ومحتواه بالتفصيل!");
      return;
    }
    const newPost = {
      id: Date.now().toString(),
      title: newsTitle.trim(),
      desc: newsDesc.trim() || (newsContent.trim().length > 100 ? newsContent.trim().substring(0, 100) + "..." : newsContent.trim()),
      category: newsCategory,
      readTime: newsReadTime,
      content: newsContent.trim(),
      imageUrl: newsImage || "",
      videoUrl: newsVideo || "",
      createdAt: new Date().toISOString()
    };
    const updatedNews = [newPost, ...newsList];
    setNewsList(updatedNews);
    saveSiteConfig("custom_news_posts_v1", updatedNews);
    window.dispatchEvent(new Event("news_posts_updated"));

    // Reset fields
    setNewsTitle("");
    setNewsDesc("");
    setNewsContent("");
    setNewsImage("");
    setNewsVideo("");
    toast.success("✓ تم نشر وحفظ الخبر الحصري بنجاح وتحديث البوابة!");
  };

  const handleDeleteNews = (id: string) => {
    const updated = newsList.filter(item => item.id !== id);
    setNewsList(updated);
    saveSiteConfig("custom_news_posts_v1", updated);
    window.dispatchEvent(new Event("news_posts_updated"));
    toast.success("🗑️ تم حذف الخبر بنجاح!");
  };

  const handleSaveRightAd = () => {
    const adObj = {
      visible: rightAdVisible,
      title: rightAdTitle.trim(),
      description: rightAdDesc.trim(),
      linkUrl: rightAdLink.trim(),
      imageUrl: rightAdImage || "",
      btnText: rightAdBtnText.trim()
    };
    saveSiteConfig("custom_news_ad_right_v2", adObj);
    window.dispatchEvent(new Event("news_ad_updated"));
    toast.success("✓ تم حفظ وتحديث الإعلان باليمين بنجاح!");
  };

  const handleSaveLeftAd = () => {
    const adObj = {
      visible: leftAdVisible,
      title: leftAdTitle.trim(),
      description: leftAdDesc.trim(),
      linkUrl: leftAdLink.trim(),
      imageUrl: leftAdImage || "",
      btnText: leftAdBtnText.trim()
    };
    saveSiteConfig("custom_news_ad_left_v2", adObj);
    window.dispatchEvent(new Event("news_ad_updated"));
    toast.success("✓ تم حفظ وتحديث الإعلان باليسار بنجاح!");
  };

  const handleSaveHeaderWidgets = () => {
    saveSiteConfig("news_header_right_type_v1", devHeaderRightType);
    saveSiteConfig("news_header_right_text_v1", devHeaderRightText.trim());
    saveSiteConfig("news_header_right_image_v1", devHeaderRightImage);
    saveSiteConfig("news_header_right_has_frame_v1", devHeaderRightHasFrame ? "true" : "false");
    saveSiteConfig("news_header_right_text_position_v1", devHeaderRightTextPosition);
    saveSiteConfig("news_header_right_frame_style_v1", devHeaderRightFrameStyle);

    saveSiteConfig("news_header_left_type_v1", devHeaderLeftType);
    saveSiteConfig("news_header_left_text_v1", devHeaderLeftText.trim());
    saveSiteConfig("news_header_left_image_v1", devHeaderLeftImage);
    saveSiteConfig("news_header_left_has_frame_v1", devHeaderLeftHasFrame ? "true" : "false");
    saveSiteConfig("news_header_left_text_position_v1", devHeaderLeftTextPosition);
    saveSiteConfig("news_header_left_frame_style_v1", devHeaderLeftFrameStyle);

    window.dispatchEvent(new Event("news_page_meta_updated"));
    toast.success("✓ تم حفظ محتويات الترويسة المخصصة بنجاح!");
  };

  const handleSaveTickerSettings = () => {
    saveSiteConfig("news_ticker_type_v1", devTickerType);
    saveSiteConfig("news_ticker_custom_text_v1", devTickerCustomText.trim());
    window.dispatchEvent(new Event("news_page_meta_updated"));
    toast.success("✓ تم حفظ إعدادات شريط عاجل بنجاح!");
  };

  const handleSaveCustomBox = () => {
    saveSiteConfig("news_custom_box_visible_v1", devCustomBoxVisible ? "true" : "false");
    saveSiteConfig("news_custom_box_emoji_v1", devCustomBoxEmoji.trim());
    saveSiteConfig("news_custom_box_title_v1", devCustomBoxTitle.trim());
    saveSiteConfig("news_custom_box_text_v1", devCustomBoxText.trim());
    saveSiteConfig("news_custom_box_btn_text_v1", devCustomBoxBtnText.trim());
    saveSiteConfig("news_custom_box_btn_url_v1", devCustomBoxBtnUrl.trim());
    window.dispatchEvent(new Event("news_page_meta_updated"));
    toast.success("✓ تم حفظ وتحديث الصندوق التعريفي الجانبي بنجاح!");
  };

  const handleSavePageMeta = () => {
    if (!newsPageTitle.trim()) {
      toast.error("عنوان الصفحة لا يمكن أن يكون فارغاً!");
      return;
    }
    saveSiteConfig("news_page_title_v1", newsPageTitle.trim());
    saveSiteConfig("news_page_subtitle_v1", newsPageSubtitle.trim());
    window.dispatchEvent(new Event("news_page_meta_updated"));
    toast.success("✓ تم حفظ وتحديث عنوان وعبارات صفحة الأخبار بنجاح!");
  };
  const fetchRoiDepartments = async () => {
    try {
      const res = await fetch("/api/roi-departments");
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setRoiDepartments(data.departments);
        safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(data.departments));
        syncLegacyV1(data.departments);
      }
    } catch (e) {
      console.warn("Failed to load ROI departments from API", e);
    }
  };

  // Load everything from localStorage/API on mount/open
  const loadAllDataFromStorage = () => {
    if (typeof window === "undefined") return;

    // 1. Ticker Jobs
    const savedJobs = localStorage.getItem("custom_job_announcements");
    const defaultAnnouncements = [
      "مطلوب فني حاسبات - شركة إنترناشونال بالقاهرة - المرتب 8000 ج",
      "مطلوب فني مختبرات - معامل البرج بالجيزة - المرتب 9500 ج",
      "عيادات كليوباترا تطلب فنيين صيانة أجهزة طبية - الإسكندرية - راتب مجزي متميز",
      "مستشفيات دار الفؤاد تعلن عن وظائف شاغرة لخريجي الأجهزة الطبية والمختبرات مع شهادة خبرة",
      "مجموعة فروع معامل المختبر تطلق بوابة لتوظيف خريجي دفعات المعاهد الفنية المعتمدة",
      "فني تكنولوجيا معلومات - بنك خاص - التجمع الخامس - المرتب 11000 ج مع مزايا كاملة"
    ];
    if (savedJobs) {
      try {
        setJobVacancies(JSON.parse(savedJobs));
      } catch (e) {
        setJobVacancies(defaultAnnouncements);
      }
    } else {
      setJobVacancies(defaultAnnouncements);
    }

    // 2. Dynamic ROI Departments
    fetchRoiDepartments();

    // 5. General Academy Departments (for DepartmentExplorer)
    const savedAcademyDepts = localStorage.getItem("custom_academy_departments_v1");
    if (savedAcademyDepts) {
      try {
        const parsed = JSON.parse(savedAcademyDepts);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map(d => ({
            ...d,
            maxCapacity: d.maxCapacity !== undefined ? Number(d.maxCapacity) : 120
          }));
          setAcademyDepartmentsList(migrated);
        } else {
          const migrated = ACADEMY_DEPARTMENTS.map(d => ({ ...d, maxCapacity: d.maxCapacity || 120 }));
          setAcademyDepartmentsList(migrated);
        }
      } catch (e) {
        const migrated = ACADEMY_DEPARTMENTS.map(d => ({ ...d, maxCapacity: d.maxCapacity || 120 }));
        setAcademyDepartmentsList(migrated);
      }
    } else {
      const migrated = ACADEMY_DEPARTMENTS.map(d => ({ ...d, maxCapacity: d.maxCapacity || 120 }));
      setAcademyDepartmentsList(migrated);
      safeSetItem("custom_academy_departments_v1", JSON.stringify(migrated));
    }

    // 5.B Department Comparison Extras
    const savedComp = localStorage.getItem("department_comparison_extras");
    if (savedComp) {
      try {
        const parsed = JSON.parse(savedComp);
        if (parsed && typeof parsed === "object") {
          setComparisonExtras(parsed);
        } else {
          setComparisonExtras(DEFAULT_COMPARISON_EXTRAS);
        }
      } catch (e) {
        setComparisonExtras(DEFAULT_COMPARISON_EXTRAS);
      }
    } else {
      setComparisonExtras(DEFAULT_COMPARISON_EXTRAS);
      safeSetItem("department_comparison_extras", JSON.stringify(DEFAULT_COMPARISON_EXTRAS));
    }
    // Dynamic ROI Departments are loaded asynchronously via fetchRoiDepartments()
    
    // 3. Reviews
    const savedReviews = localStorage.getItem("custom_student_reviews");
    const defaultReviews: Review[] = [
      {
        id: 1,
        studentName: "عبدالرحمن محمد الشافعي",
        department: "قسم البرمجة والذكاء الاصطناعي",
        governorate: "الدقهلية",
        rating: 5,
        text: "الحمد لله سجلت عن طريق البوابة وطبعت تذكرة الخصم والحجز واكتشفت إن الدعم الفني وتوصية مستشار التسجيل ممتازة جداً. المعامل والورش مجهزة بأعلى مستوى وموجود نظام مناسب للتقسيط الشهري المريح تيسيراً للجميع.",
        avatarColor: "bg-blue-600 text-white",
        initials: "ع م",
        date: "٢٠٢٦/٠٥/١٢",
        verified: true
      },
      {
        id: 2,
        studentName: "رنا سليم عبدالوهاب",
        department: "قسم مساعد خدمات صحية (تمريض)",
        governorate: "البحيرة",
        rating: 5,
        text: "حلم حياتي كان دراسة التمريض والدخول لمجال الرعاية والمساعدة. مستشاري القبول تواصلوا معي هاتفياً ووضحوا كل الأمور شرحوا الرسوم والخصم الحصري. التدريب العملي في المستشفيات ممتاز وبدأت أستفيد وأتعلم بجدية.",
        avatarColor: "bg-rose-600 text-white",
        initials: "ر س",
        date: "٢٠٢٦/٠٦/٠١",
        verified: true
      }
    ];
    if (savedReviews) {
      try {
        setStudentTestimonials(JSON.parse(savedReviews));
      } catch (e) {
        setStudentTestimonials(defaultReviews);
      }
    } else {
      setStudentTestimonials(defaultReviews);
    }

    // 4. AI Prompt
    const savedPrompt = localStorage.getItem("academy_ai_advisor_training") || "التحق الآن بالدبلومات المهنية الرائدة والمعتمدة في تكنولوجيا الحاسب والبرمجة، وصيانة الأجهزة الطبية، والسجل الطبي والسكرتارية، والتحاليل الطبية والخدمات الصحية المساعدة، والمساحة والخرائط والمقاولات. نظام الدراسة يعتمد على تقسيط شهري مريح، وتدريب نقدي وعملي بالمستشفيات والشركات الكبرى لضمان التوظيف الفوري.";
    setAiAdvisorTrainingText(savedPrompt);

    // 6. Dynamic PDF Library File Manager
    const fetchPdfLibraryData = async () => {
      try {
        const res = await fetch("/api/pdf-library");
        const data = await res.json();
        if (data && data.success && Array.isArray(data.list)) {
          setPdfLibraryList(data.list);
          safeSetItem("custom_pdf_library_v1", JSON.stringify(data.list));
        } else {
          const savedPdfLibrary = localStorage.getItem("custom_pdf_library_v1");
          if (savedPdfLibrary) {
            setPdfLibraryList(JSON.parse(savedPdfLibrary));
          }
        }
      } catch (er) {
        const savedPdfLibrary = localStorage.getItem("custom_pdf_library_v1");
        if (savedPdfLibrary) {
          try {
            setPdfLibraryList(JSON.parse(savedPdfLibrary));
          } catch (e2) {}
        }
      }
    };
    fetchPdfLibraryData();
  };

  const fetchAdminLeads = async () => {
    try {
      const res = await fetch("/api/admin/data");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        const rawSource = (data.leads.length > 0) ? data.leads : initialLeads;
        const merged = normalizeAndDeduplicateLeads(rawSource);
        setAdminLeads(merged);
        try {
          localStorage.setItem("admin_leads_cache", JSON.stringify(merged));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Failed to load admin leads in DeveloperFeederModal", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllDataFromStorage();
      fetchAdminLeads();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      fetchAdminLeads();
    };
    window.addEventListener("admin_data_updated", handleUpdate);
    window.addEventListener("academy_leads_updated", handleUpdate);

    let channel: any = null;
    if (hasSupabase) {
      channel = supabase
        .channel("feeder-student-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
          },
          () => {
            fetchAdminLeads();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("admin_data_updated", handleUpdate);
      window.removeEventListener("academy_leads_updated", handleUpdate);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen]);

  // Export Database configuration payload to JSON file
  const handleExportDatabase = () => {
    try {
      const dbPayload = {
        jobs: localStorage.getItem("custom_job_announcements") || "[]",
        roiV2: localStorage.getItem("custom_roi_calculator_constants_v2") || "[]",
        roiV1: localStorage.getItem("custom_roi_calculator_constants_v1") || "{}",
        reviews: localStorage.getItem("custom_student_reviews") || "[]",
        aiTraining: localStorage.getItem("academy_ai_advisor_training") || "",
        leads: localStorage.getItem("academy_student_leads") || "[]",
        parents: localStorage.getItem("academy_parent_inquiries") || "[]",
        exportTimestamp: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `academy_database_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast("✓ تم تصدير قاعدة بيانات المنصة بالكامل وحفظ ملف الـ JSON بنجاح!", {
        icon: "💾",
        style: {
          border: '1px solid #3b82f6',
          background: '#eff6ff',
          color: '#1e3a8a'
        }
      });
    } catch (e) {
      toast.error("عذراً، فشل تصدير البيانات: " + String(e));
    }
  };

  // Secure CSV Export Engine for Student Leads
  const handleExportLeadsCSV = () => {
    // Security check: Verify password before allowing export download
    if (exportPassword !== "Mm151997") {
      toast.error("رمز المصادقة الأمنية غير صحيح! يُرجى إدخال الباسوورد الصحيح Mm151997 للتصدير.");
      return;
    }

    try {
      if (adminLeads.length === 0) {
        toast.error("عذراً، لا توجد بيانات للطلاب لتصديرها حالياً!");
        return;
      }

      // Headers: اسم الطالب, رقم الهاتف, التخصص المحدد, تاريخ التسجيل
      const headers = ["اسم الطالب", "رقم الهاتف", "الشعبة الدراسية / الرغبات المحددة", "تاريخ وقوت التسجيل"];
      
      const rows = adminLeads.map(lead => {
        const dateStr = lead.createdAt 
          ? new Date(lead.createdAt).toLocaleString("ar-EG") 
          : (lead.consentTimestamp ? new Date(lead.consentTimestamp).toLocaleString("ar-EG") : "غير محدد");
          
        const deptStr = Array.isArray(lead.selectedDepartments) 
          ? lead.selectedDepartments.join(" | ") 
          : (lead.selectedDepartments || lead.basicCourse || "شعبة عامة غير مبوبة");
          
        return [
          `"${(lead.studentName || "").replace(/"/g, '""')}"`,
          `"${(lead.phoneNumber || "").replace(/"/g, '""')}"`,
          `"${(deptStr).replace(/"/g, '""')}"`,
          `"${(dateStr).replace(/"/g, '""')}"`
        ];
      });

      // Unified CSV payload with UTF-8 BOM indicator for Excel Arabic support
      const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `student_leads_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("🏆 تم رصد التحقق الأمني! تم تنزيل كشف CSV منسق بالكامل ببيانات الطلاب المسجلين!");
    } catch (err: any) {
      toast.error("فشل تصدير الكشف الفني: " + err.message);
    }
  };

  // Import Database configuration payload from uploaded JSON file
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed) {
          if (parsed.jobs) {
            let val = parsed.jobs;
            try { val = JSON.parse(parsed.jobs); } catch (e) {}
            saveSiteConfig("custom_job_announcements", val);
          }
          if (parsed.roiV2) {
            let val = parsed.roiV2;
            try { val = JSON.parse(parsed.roiV2); } catch (e) {}
            saveSiteConfig("custom_roi_calculator_constants_v2", val);
          }
          if (parsed.roiV1) {
            let val = parsed.roiV1;
            try { val = JSON.parse(parsed.roiV1); } catch (e) {}
            saveSiteConfig("custom_roi_calculator_constants_v1", val);
          }
          if (parsed.reviews) {
            let val = parsed.reviews;
            try { val = JSON.parse(parsed.reviews); } catch (e) {}
            saveSiteConfig("custom_student_reviews", val);
          }
          if (parsed.aiTraining) {
            saveSiteConfig("academy_ai_advisor_training", parsed.aiTraining);
            saveSiteConfig("academy_ai_prompt_base", parsed.aiTraining);
          }
          if (parsed.leads) {
            safeSetItem("academy_student_leads", parsed.leads);
          }
          if (parsed.parents) {
            safeSetItem("academy_parent_inquiries", parsed.parents);
          }

          // Force state re-sync in developer panel
          loadAllDataFromStorage();

          // Notify public views of update
          window.dispatchEvent(new Event("roi_constants_updated"));
          window.dispatchEvent(new Event("job_announcements_updated"));
          window.dispatchEvent(new Event("reviews_updated"));
          window.dispatchEvent(new Event("student_reviews_updated"));
          window.dispatchEvent(new Event("academy_prompt_updated"));

          toast.success("🏆 تهانينا! تم استيراد واستعادة قاعدة بيانات المنصة بالكامل بنجاح تام، وتجاوبت كافة المرئيات فوراً!");
        }
      } catch (err) {
        toast.error("فشل استيراد الملف، تأكد من اختيار ملف JSON صحيح. " + String(err));
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Handle addition of a new ROI major - sends real REST API POST request (Network Tab verification helper)
  const handleAddNewDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error("الرجاء كتابة اسم شعبة أو تخصص دراسي!");
      return;
    }
    const newId = "dept_" + Date.now();
    const newObj: ROIDepartment = {
      id: newId,
      name: newDeptName.trim(),
      salary: Number(newDeptSalary) || 10000,
      careerPct: newDeptPct.trim().includes("%") ? newDeptPct.trim() : `طلب بنسبة %${newDeptPct.trim()} في السوق`,
      role: newDeptRole.trim() || "فني متخصص معتمد",
      demandBadge: newDeptDemandBadge || "🔥 طلب شديد جداً - مقاعد محدودة متبقية"
    };

    try {
      const res = await fetch("/api/roi-departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newObj)
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setRoiDepartments(data.departments);
        safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(data.departments));
        syncLegacyV1(data.departments);
        window.dispatchEvent(new Event("roi_constants_updated"));
        toast.success("✓ تم إضافة التخصص المالي الجديد في قاعدة البيانات بنجاح تام وسرعة فائقة!");
      }
    } catch (e) {
      console.warn("API Add Failed, falling back to local only", e);
      const nextList = [...roiDepartments, newObj];
      setRoiDepartments(nextList);
      safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(nextList));
      syncLegacyV1(nextList);
      window.dispatchEvent(new Event("roi_constants_updated"));
      toast.success("✓ تم إضافة التخصص المالي الجديد محلياً بنجاح!");
    }

    // Reset inputs
    setNewDeptName("");
    setNewDeptSalary(10050);
    setNewDeptPct("95%");
    setNewDeptRole("");
    setShowAddDeptForm(false);
  };

  // Keep legacy v1 structure synced so no breakages occur anywhere
  const syncLegacyV1 = (list: ROIDepartment[]) => {
    try {
      const legacyObj: any = {};
      list.forEach((dept) => {
        // Map back to key style used in calculators
        let key = dept.id;
        legacyObj[key] = {
          name: dept.name,
          salary: dept.salary,
          careerPct: dept.careerPct,
          role: dept.role
        };
      });
      // Store back to legacy key as well
      safeSetItem("custom_roi_calculator_constants_v1", JSON.stringify(legacyObj));
    } catch (e) {
      console.warn("Legacy sync warn", e);
    }
  };

  // Delete a department - makes actual REST API DELETE call (guarantees real Network Tab activity)
  const handleDeleteDepartment = async (id: string) => {
    if (roiDepartments.length <= 1) {
      toast.error("عذراً، يجب إبقاء تخصص واحد على الأقل في قائمة الحاسبة لتفادي انهيار الواجهة!");
      return;
    }
    try {
      const res = await fetch(`/api/roi-departments/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setRoiDepartments(data.departments);
        safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(data.departments));
        syncLegacyV1(data.departments);
        window.dispatchEvent(new Event("roi_constants_updated"));
        toast("✓ تم حذف التخصص المالي بنجاح من قاعدة البيانات في الوقت الفعلي!", {
          icon: "🗑️",
          style: {
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1e40af"
          }
        });
      }
    } catch (e) {
      console.warn("API Delete Failed, falling back to local only", e);
      const nextList = roiDepartments.filter(d => d.id !== id);
      setRoiDepartments(nextList);
      safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(nextList));
      syncLegacyV1(nextList);
      window.dispatchEvent(new Event("roi_constants_updated"));
      toast("✓ تم حذف التخصص المالي محلياً!", {
        icon: "🗑️",
        style: {
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          color: "#1e40af"
        }
      });
    }
  };

  // Save edits of department
  const handleUpdateDepartmentField = (id: string, field: keyof ROIDepartment, value: any) => {
    const nextList = roiDepartments.map((dept) => {
      if (dept.id === id) {
        return { ...dept, [field]: value };
      }
      return dept;
    });
    setRoiDepartments(nextList);
  };

  const handleBulkSaveDepartments = async () => {
    try {
      const res = await fetch("/api/roi-departments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departments: roiDepartments })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setRoiDepartments(data.departments);
        safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(data.departments));
        syncLegacyV1(data.departments);
        window.dispatchEvent(new Event("roi_constants_updated"));
        toast.success("✓ تم حفظ تعديلات وتغييرات الأقسام في قاعدة البيانات بنجاح!");
      }
    } catch (e) {
      console.warn("Bulk save API failed, saving locally", e);
      safeSetItem("custom_roi_calculator_constants_v2", JSON.stringify(roiDepartments));
      syncLegacyV1(roiDepartments);
      window.dispatchEvent(new Event("roi_constants_updated"));
      toast.success("✓ تم حفظ تعديلات وتغييرات الأقسام محلياً وبنجاح!");
    }
  };

  // --- ACADEMIC DEPARTMENTS CRUD ACTIONS ---
  const handleAddAcademyDept = () => {
    if (!newAcademyName.trim() || !newAcademyDesc.trim()) {
      toast.error("الرجاء كتابة اسم التخصص ووصفه الفعلي!");
      return;
    }
    const id = newAcademyId.trim() || "dept_acad_" + Date.now();
    const skillsArray = newAcademySkills.split("\n").map(s => s.trim()).filter(Boolean);
    const careersArray = newAcademyCareers.split("\n").map(c => c.trim()).filter(Boolean);

    const newObj = {
      id,
      name: newAcademyName.trim(),
      iconName: newAcademyIcon.trim() || "BookOpen",
      description: newAcademyDesc.trim(),
      skills: skillsArray.length > 0 ? skillsArray : ["فهم تخصصات المسار", "التعلم والتطبيق المستمر"],
      careers: careersArray.length > 0 ? careersArray : ["العمل الحر أو في شركات متميزة"],
      maxCapacity: Number(newAcademyMaxCapacity) || 120
    };

    const nextList = [...academyDepartmentsList, newObj];
    setAcademyDepartmentsList(nextList);
    saveSiteConfig("custom_academy_departments_v1", nextList);
    window.dispatchEvent(new Event("departments_updated"));

    // Reset inputs
    setNewAcademyId("");
    setNewAcademyName("");
    setNewAcademyIcon("BookOpen");
    setNewAcademyDesc("");
    setNewAcademySkills("");
    setNewAcademyCareers("");
    setNewAcademyMaxCapacity(100);
    setShowAddAcademyForm(false);
    toast.success("✓ تم إضافة التخصص المالي الجديد وتحديث واجهة تصفح الأقسام بالكامل!");
  };

  const handleDeleteAcademyDept = (id: string) => {
    if (academyDepartmentsList.length <= 1) {
      toast.error("يجب إبقاء قسم دراسي واحد على الأقل لتفادي الفراغ التام!");
      return;
    }
    setDeleteId(id);
    setDeleteType("department");
    setSecurityPassword("");
    setSecurityError("");
    setShowSecurityModal(true);
  };

  const handleUpdateAcademyField = (id: string, field: string, value: any) => {
    const nextList = academyDepartmentsList.map((dept) => {
      if (dept.id === id) {
        if (field === "skills") {
          return { ...dept, skills: typeof value === "string" ? value.split("\n").map((s: string) => s.trim()).filter(Boolean) : value };
        }
        if (field === "careers") {
          return { ...dept, careers: typeof value === "string" ? value.split("\n").map((c: string) => c.trim()).filter(Boolean) : value };
        }
        return { ...dept, [field]: value };
      }
      return dept;
    });
    setAcademyDepartmentsList(nextList);
  };

  const handleBulkSaveAcademyDepts = () => {
    saveSiteConfig("custom_academy_departments_v1", academyDepartmentsList);
    window.dispatchEvent(new Event("departments_updated"));
    toast.success("✓ تم حفظ تعديلات وتغييرات التخصصات الدراسية (تصفح الأقسام) بنجاح فوري!");
  };

  // --- PASSWORD-PROTECTED CONFIRMATION FOR DELETES ---
  const handleSecurityConfirm = () => {
    if (securityPassword !== "Mm151997") {
      setSecurityError("كلمة المرور غير صحيحة! يرجى إدخال باسوورد المطور الصحيح.");
      return;
    }

    if (deleteType === "department") {
      const nextList = academyDepartmentsList.filter(d => d.id !== deleteId);
      setAcademyDepartmentsList(nextList);
      saveSiteConfig("custom_academy_departments_v1", nextList);
      window.dispatchEvent(new Event("departments_updated"));
      toast("✓ تم التحقق وحذف التخصص الدراسي من الموقع بالكامل!", {
        icon: "⚙️",
        style: {
          border: '1px solid #bfdbfe',
          background: '#eff6ff',
          color: '#1e40af'
        }
      });
    } else if (deleteType === "file") {
      const updatedList = pdfLibraryList.filter(f => f.id !== deleteId);
      setPdfLibraryList(updatedList);
      saveSiteConfig("custom_pdf_library_v1", updatedList);
      window.dispatchEvent(new Event("pdf_library_updated"));
      toast("✓ تم التحقق وحذف الملف وإلغاء بوابات تحميله النشطة بالكامل!", {
        icon: "⚙️",
        style: {
          border: '1px solid #bfdbfe',
          background: '#eff6ff',
          color: '#1e40af'
        }
      });
    }

    setShowSecurityModal(false);
    setDeleteId(null);
    setSecurityPassword("");
    setSecurityError("");
  };

  // --- DYNAMIC PDF LIBRARY CRUD ACTIONS ---
  const handleLibraryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLibraryUploadProgress("جاري تجهيز الملف للرفع...");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setLibraryUploadProgress("جاري رفع الملف وحفظه على السيرفر...");
      try {
        const res = await fetch("/api/pdf-library/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            fileName: file.name
          })
        });
        const data = await res.json();
        if (data && data.success) {
          setLibraryFormUrl(data.fileUrl);
          if (!libraryFormName) {
            setLibraryFormName(file.name.replace(/\.[^/.]+$/, ""));
          }
          setLibraryUploadProgress("تم رفع الملف بنجاح وحفظه على السيرفر! ✓");
        } else {
          setLibraryUploadProgress(`فشل الرفع: ${data.error || "خطأ مجهول"}`);
        }
      } catch (err) {
        console.error(err);
        setLibraryUploadProgress("فشل في الاتصال بالسيرفر أثناء عملية الرفع.");
      }
    };
    reader.onerror = () => {
      setLibraryUploadProgress("فشل في قراءة الملف من الجهاز.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLibraryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryFormName.trim() || !libraryFormUrl.trim() || !libraryFormSpecialization) {
      alert("الرجاء ملء جميع خانات الاسم والرابط واختيار القسم المرتبط!");
      return;
    }
    
    setLibraryIsSaving(true);
    try {
      const updatedList = [...pdfLibraryList];
      if (libraryFormId) {
        const index = updatedList.findIndex(item => item.id === libraryFormId);
        if (index !== -1) {
          updatedList[index] = {
            id: libraryFormId,
            name: libraryFormName.trim(),
            url: libraryFormUrl.trim(),
            specialization: libraryFormSpecialization
          };
        }
      } else {
        updatedList.push({
          id: "file_" + Date.now(),
          name: libraryFormName.trim(),
          url: libraryFormUrl.trim(),
          specialization: libraryFormSpecialization
        });
      }
      
      setPdfLibraryList(updatedList);
      saveSiteConfig("custom_pdf_library_v1", updatedList);
      window.dispatchEvent(new Event("pdf_library_updated"));
      
      // Reset inputs
      setLibraryFormId("");
      setLibraryFormName("");
      setLibraryFormUrl("");
      setLibraryUploadProgress("");
      setLibraryIsSaving(false);
      alert("✓ تم حفظ كراسة الدليل/التخصص وربطه وبوابات التحميل بنجاح تام!");
    } catch (err) {
      setLibraryIsSaving(false);
      alert("فشل في الحفظ.");
    }
  };

  const handleEditLibraryItem = (item: any) => {
    setLibraryFormId(item.id);
    setLibraryFormName(item.name);
    setLibraryFormUrl(item.url);
    setLibraryFormSpecialization(item.specialization);
    setLibraryUploadProgress("تم استدعاء بيانات ومستندات الملف لتعديلها الحاسم.");
  };

  const triggerDeleteLibraryItem = (id: string) => {
    setDeleteId(id);
    setDeleteType("file");
    setSecurityPassword("");
    setSecurityError("");
    setShowSecurityModal(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0a2463]/30 backdrop-blur-md z-[99999] flex items-center justify-center p-2 sm:p-4 text-slate-800 overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-5xl lg:max-w-7xl lg:w-[95%] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right flex flex-col my-2 sm:my-8 max-h-[96vh] sm:max-h-[90vh]">
        
        {/* HEADER BLOCK - CRITICAL Visibility rule: STARK WHITE ON DARK NAVY */}
        <div className="bg-[#0a2463] text-white p-5 flex justify-between items-center sm:px-6 shrink-0 border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">بوابة التحقق من المطور - System Feeder 🤖🛠️</h3>
              <p className="text-[10px] text-amber-300 font-bold block mt-0.5">لوحة التغذية والتحكم المشددة بنظم المرئيات العامة وقيم الاستثمار لعام 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("admin_authenticated", "true");
                  sessionStorage.setItem("admin_target_tab", "all");
                }
                onClose();
                window.location.href = "/admin?tab=all";
              }}
              className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-[10px] sm:text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              title="التبديل المباشر لواجهة الأدمن (سجل بيانات الطلاب الكامل)"
            >
              <span>لوحة الأدمن وسجل الطلاب ⚙️</span>
            </button>
            <button
              onClick={onClose}
              className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all cursor-pointer"
              title="إغلاق لوحة المطور"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Supabase Connection Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 shrink-0">
          {supabaseConnected === false && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-bold text-red-900">حالة الربط: غير متصل بقاعدة بيانات Supabase!</p>
                  <p className="text-red-700 text-[10px] sm:text-[11px] mt-0.5 leading-relaxed">
                    لم يكتشف الخادم متغيرات البيئة <code className="bg-red-100 px-1 py-0.5 rounded text-red-800">SUPABASE_URL</code> و <code className="bg-red-100 px-1 py-0.5 rounded text-red-800">SUPABASE_KEY</code>. أي تحديث تقوم به الآن سيُحفظ محلياً في هذا المتصفح فقط ولن يُعمم للطلاب. لتشغيل النظام، يرجى ملء بيانات اتصال سوباباس في بيئة الاستضافة لـ Vercel.
                  </p>
                </div>
              </div>
              <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">حفظ محلي مؤقت فقط ❌</span>
            </div>
          )}
          {supabaseConnected === true && supabaseError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs font-semibold flex flex-col items-stretch gap-2.5 animate-fade-in">
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold text-amber-900">تنبيه: متصل بـ Supabase ولكن يوجد خطأ في الجداول وقاعدة البيانات!</p>
                  <p className="text-amber-700 text-[10px] sm:text-[11px] mt-0.5 leading-relaxed">
                    تم العثور على مفاتيح الاتصال بنجاح، ولكن قاعدة بيانات سوباباس تُرجع الخطأ التالي:
                  </p>
                  <div className="bg-amber-100 p-2 rounded border border-amber-250 font-mono text-[11px] text-red-700 my-1.5 text-left" dir="ltr">
                    {supabaseError}
                  </div>
                  <p className="text-amber-700 text-[10px] sm:text-[11px] leading-relaxed">
                    هذا يعني أنك تحتاج إلى إنشاء الجداول المطلوبة داخل مشروعك في Supabase. يرجى نسخ الكود التالي وتشغيله داخل <strong className="font-bold">SQL Editor</strong> في سوباباس لتفعيل الحفظ والتقديمات بنجاح:
                  </p>
                  
                  <textarea
                    className="w-full bg-slate-900 text-slate-100 font-mono text-[10px] p-2 rounded border border-slate-700 text-left cursor-text select-all mt-1 h-32"
                    dir="ltr"
                    readOnly
                    value={`-- 1. إنشاء جدول الإعدادات العامه للموقع (Site Configs)
CREATE TABLE IF NOT EXISTS public.site_configs (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.site_configs DISABLE ROW LEVEL SECURITY;

-- 2. إنشاء جدول تقديمات الطلاب (Students Leads)
CREATE TABLE IF NOT EXISTS public.students (
    id bigserial PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    fullName text,
    phone text,
    nationalId text,
    specialization text,
    governorate text,
    status text DEFAULT 'new',
    notes text,
    isShadow boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- 3. إنشاء جدول الشكاوى والاستفسارات (Complaints)
CREATE TABLE IF NOT EXISTS public.complaints (
    id bigserial PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    fullName text,
    phone text,
    subject text,
    message text,
    status text DEFAULT 'pending'
);
ALTER TABLE public.complaints DISABLE ROW LEVEL SECURITY;`}
                  />
                </div>
              </div>
            </div>
          )}
          {supabaseConnected === true && !supabaseError && (
            <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <p className="text-emerald-900">
                  قاعدة البيانات السحابية <strong className="font-bold">Supabase نشطة ومتصلة</strong>. الحفظ السحابي التلقائي مفعل ويتم مزامنة جميع الإعدادات للطلاب في جميع المتصفحات بنجاح!
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">متصل سحابياً 🟢</span>
            </div>
          )}
          {supabaseConnected === null && (
            <div className="bg-slate-100 border border-slate-200 text-slate-600 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-1.5">
                <span>⏳</span>
                <p>جاري فحص اتصال سوباباس (Supabase)...</p>
              </div>
            </div>
          )}
        </div>

        {/* MODAL BODY CONTROLLER GRID/FLEX */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" dir="rtl">
          
          {/* Right Sidebar on Desktop (Only visible on lg) */}
          <div className="hidden lg:flex w-72 bg-slate-50 border-l border-slate-200 p-5 flex-col shrink-0 gap-4 overflow-y-auto" dir="rtl">
            <div className="text-[11px] font-black text-slate-400 select-none border-b border-slate-150 pb-2">
              🧭 بوابات النظام السريعة للمطور
            </div>
            
            <button
              type="button"
              onClick={() => setFeederSubTab("database")}
              className={`py-3.5 px-4 rounded-2xl text-right text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 shadow-3xs border ${
                feederSubTab === "database"
                  ? "bg-[#0a2463] text-white border-indigo-950 shadow-md transform -translate-x-0.5"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-sm shrink-0">⚙️</span>
              <span className="truncate">إعدادات قاعدة البيانات</span>
            </button>

            <button
              type="button"
              onClick={() => setFeederSubTab("marketing_links")}
              className={`py-3.5 px-4 rounded-2xl text-right text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-3xs border ${
                feederSubTab === "marketing_links"
                  ? "bg-[#0a2463] text-white border-indigo-950 shadow-md transform -translate-x-0.5"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm shrink-0">🔗</span>
                <span className="truncate">روابط الموظفين والحملات</span>
              </div>
              <span className="bg-emerald-500 text-white font-sans text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                جديد ♾️
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFeederSubTab("leads")}
              className={`py-3.5 px-4 rounded-2xl text-right text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-3xs border ${
                feederSubTab === "leads"
                  ? "bg-[#0a2463] text-white border-indigo-950 shadow-md transform -translate-x-0.5"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-sm shrink-0">📋</span>
                <span className="truncate">طلبات الطلاب والتصدير</span>
              </div>
              {adminLeads.length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-sans text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                  {adminLeads.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFeederSubTab("news_ads")}
              className={`py-3.5 px-4 rounded-2xl text-right text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 shadow-3xs border ${
                feederSubTab === "news_ads"
                  ? "bg-[#0a2463] text-white border-indigo-950 shadow-md transform -translate-x-0.5"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-sm shrink-0">📰</span>
              <span className="truncate">الأخبار والمساحات الإعلانية</span>
            </button>
          </div>

          {/* Left Content Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-8 font-sans text-right flex flex-col" dir="rtl">
            
            <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-start gap-3 text-xs text-indigo-900 leading-relaxed font-sans font-bold">
              <span className="text-lg">💡</span>
              <p>مرحباً بك في بوابتك كـ Developer. هذه الواجهة آمنة ومخفية تماماً عن المستخدمين العاديين، تتيح لك إدارة قواعد البيانات، إنشاء وتتبع روابط تسويقية لا نهائية لكل موظف وحملة إعلانية، وإدارة الإعلانات وتغذية المنصة.</p>
            </div>

            {/* MODERN SUB-TAB SELECTOR GRID (Only visible on mobile/tablet) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 lg:hidden" dir="rtl">
              <button
                type="button"
                onClick={() => setFeederSubTab("database")}
                className={`py-2 text-center text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  feederSubTab === "database"
                    ? "bg-[#0a2463] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>⚙️ قاعدة البيانات</span>
              </button>
              <button
                type="button"
                onClick={() => setFeederSubTab("marketing_links")}
                className={`py-2 text-center text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  feederSubTab === "marketing_links"
                    ? "bg-[#0a2463] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>🔗 روابط الموظفين</span>
              </button>
              <button
                type="button"
                onClick={() => setFeederSubTab("leads")}
                className={`py-2 text-center text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  feederSubTab === "leads"
                    ? "bg-[#0a2463] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>📋 طلبات الطلاب</span>
                {adminLeads.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-sans text-[9px] font-black px-1 py-0.2 rounded-full">
                    {adminLeads.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFeederSubTab("news_ads")}
                className={`py-2 text-center text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  feederSubTab === "news_ads"
                    ? "bg-[#0a2463] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>📰 الأخبار والإعلانات</span>
              </button>
            </div>

          {feederSubTab === "database" && (
            <>
              {/* SECTION 0: DATABASE BACKUP AND RESTORE FACILITY */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0A2463] to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4 text-right" dir="rtl">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💾</span>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-100">نسخة احتياطية آمنة واستعادة قاعدة بيانات البوابة 🏛️ (Backup & Restore Facility)</h4>
                <p className="text-[10px] text-slate-400 font-bold block mt-0.5">تصدير لوحة الإعدادات والمصروفات والوظيفة ومراجعات الطلاب كملف JSON مشفر، أو استعادته فورياً على أي كمبيوتر آخر لتفادي فقدان البيانات.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportDatabase}
                className="px-4 py-2 bg-[#FF7F50] hover:bg-[#FF7F50]/90 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>تصدير قاعدة بيانات المنصة 📥</span>
              </button>
              
              <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95">
                <span>استيراد قاعدة بيانات المنصة 📤</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* SECTION 1: DYNAMIC CRUD ROI CALCULATOR */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-650 shrink-0" />
                  <span>تعديل وحوكمة حاسبة العائد المهني واستعادة الاستثمار (Dynamic ROI CRUD)</span>
                </h4>
                <p className="text-[10.5px] text-slate-500 font-bold">يمكنك إنشاء شعب دراسية لا نهائية وتحديد رواتبها ونسب الطلب وتعديل المحتوى بكل أريحية.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddDeptForm(!showAddDeptForm)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 self-start cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>➕ إضافة مجال دراسي جديد</span>
              </button>
            </div>

            {/* Hidden Addition Form */}
            {showAddDeptForm && (
              <div className="p-4 bg-white border border-indigo-200 rounded-2xl space-y-4 animate-scale-up border-r-4 border-r-indigo-600">
                <h5 className="text-xs font-black text-indigo-950 flex items-center gap-1">
                  <span>✨ نموذج إضافة شعبة/تخصص دراسي جديد بالمنظومة والاستثمار:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">اسم التخصص / الشعبة مع إيموجي مميز:</label>
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="مثال: شعبة صيانة الشبكات والذكاء الاصطناعي 💻"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">متوسط المرتب المتوقع فورا للتخرج (جنيه):</label>
                    <input
                      type="number"
                      value={newDeptSalary}
                      onChange={(e) => setNewDeptSalary(Number(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">نسبة الطلب الإحصائي بالسوق للمسار:</label>
                    <input
                      type="text"
                      value={newDeptPct}
                      onChange={(e) => setNewDeptPct(e.target.value)}
                      placeholder="مثال: %95 أو طلب بنسبة %95 في السوق"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">الدور الفني والتوصيف الوظيفي الموجز المعتمد:</label>
                    <input
                      type="text"
                      value={newDeptRole}
                      onChange={(e) => setNewDeptRole(e.target.value)}
                      placeholder="مثال: مساعد فني شبكات ونمذجة سحابية بالشركات"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">مؤشر نبض سوق العمل والطلب الحالي:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newDeptDemandBadge}
                        onChange={(e) => setNewDeptDemandBadge(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                      <select
                        onChange={(e) => setNewDeptDemandBadge(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="🔥 طلب شديد جداً - مقاعد محدودة متبقية">🔥 طلب شديد - مقاعد محدودة</option>
                        <option value="⚡ الأعلى نمواً في الرواتب هذا الأسبوع">⚡ الأعلى نمواً في الرواتب</option>
                        <option value="✨ نسبة توظيف فورية مضمونة %100">✨ توظيف فوري مضمون</option>
                        <option value="📈 طلب نشط جداً في المستشفيات">📈 طلب نشط في المستشفيات</option>
                        <option value="💎 التخصص الأكثر رغبة لدى أولياء الأمور">💎 الأكثر رغبة لدى العوائل</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDeptForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewDepartment}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    تأكيد وإدراج الشعبة ➕
                  </button>
                </div>
              </div>
            )}

            {/* List and Fields for existing departments */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {roiDepartments.map((dept) => (
                <div 
                  key={dept.id} 
                  className="bg-white border border-slate-200 shadow-3xs p-4 rounded-2xl relative space-y-3 shrink-0 flex flex-col justify-between"
                >
                  {/* Delete button wrapper */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
                      كود فريد: {dept.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="text-xs text-rose-600 hover:text-red-700 flex items-center gap-1 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة الشعبة ❌</span>
                    </button>
                  </div>

                  {/* Form inputs with dark text on light backgrounds for perfect legibility */}
                  <div className="space-y-2.5 text-right">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">اسم القسم الإرشادي والرموز:</label>
                      <input
                        type="text"
                        value={dept.name}
                        onChange={(e) => handleUpdateDepartmentField(dept.id, "name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">المرتب (ج.م):</label>
                        <input
                          type="number"
                          value={dept.salary}
                          onChange={(e) => handleUpdateDepartmentField(dept.id, "salary", Number(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">نسبة الطلب %:</label>
                        <input
                          type="text"
                          value={dept.careerPct}
                          onChange={(e) => handleUpdateDepartmentField(dept.id, "careerPct", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">الدور الوظيفي وخلاصة المسار:</label>
                      <input
                        type="text"
                        value={dept.role}
                        onChange={(e) => handleUpdateDepartmentField(dept.id, "role", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">مؤشر نبض سوق العمل والطلب الحالي:</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={dept.demandBadge || "🔥 طلب شديد جداً - مقاعد محدودة متبقية"}
                          onChange={(e) => handleUpdateDepartmentField(dept.id, "demandBadge", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                        <select
                          value={dept.demandBadge || "🔥 طلب شديد جداً - مقاعد محدودة متبقية"}
                          onChange={(e) => handleUpdateDepartmentField(dept.id, "demandBadge", e.target.value)}
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 max-w-[120px]"
                        >
                          <option value="🔥 طلب شديد جداً - مقاعد محدودة متبقية">🔥 طلب شديد - مقاعد وبقاي</option>
                          <option value="⚡ الأعلى نمواً في الرواتب هذا الأسبوع">⚡ الأعلى نمواً في الرواتب</option>
                          <option value="✨ نسبة توظيف فورية مضمونة %100">✨ توظيف فوري مضمون</option>
                          <option value="📈 طلب نشط جداً في المستشفيات">📈 طلب نشط في المستشفيات</option>
                          <option value="💎 التخصص الأكثر رغبة لدى أولياء الأمور">💎 الأكثر رغبة لدى العوائل</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleBulkSaveDepartments}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4.5 h-4.5" />
                <span>حفظ وتثبيت تعديلات أقسام الحاسبة المترابطة 💾</span>
              </button>
            </div>

          </div>

          {/* SECTION 1.5: GENERAL ACADEMIC DEPARTMENTS SYSTEM FEEDER */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div className="space-y-1 text-right">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 justify-start">
                  <BookOpen className="w-5 h-5 text-indigo-650 shrink-0" />
                  <span>التحكم في التخصصات الدراسية وتصفح الأقسام (Academic Departments Feeder) 🩺💻</span>
                </h4>
                <p className="text-[10.5px] text-slate-500 font-bold">حوكمة التخصصات المعروضة في صفحة تصفح الأقسام والتقديم، مما يحولها من وضع ثابت إلى وضع ديناميكي تفاعلي بالكامل.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAcademyForm(!showAddAcademyForm)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 self-start cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>➕ إضافة قسم دراسي جديد للموقع</span>
              </button>
            </div>

            {/* Unified Seat Capacity and Availability Monitoring Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5 justify-start">
                  <span>📊 لوحة مراقبة قدرة الاستيعاب والمقاعد الحية (Real-time Capacity Meter)</span>
                </h5>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  تحديث فوري تلقائي ✓
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse" dir="rtl">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-205 text-slate-600 font-extrabold">
                      <th className="p-2.5">اسم التخصص الدراسي</th>
                      <th className="p-2.5 text-center">الحد الأقصى للمقاعد</th>
                      <th className="p-2.5 text-center">المحجوز الفعلي (Leads)</th>
                      <th className="p-2.5 text-center">المقاعد المتبقية</th>
                      <th className="p-2.5 text-center">مؤشر نطاق التوافر (3 أثلاث)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {academyDepartmentsList.map((dept) => {
                      const maxCap = dept.maxCapacity !== undefined ? dept.maxCapacity : 120;
                      const count = adminLeads.filter(lead => {
                        const depts = Array.isArray(lead.selectedDepartments) ? lead.selectedDepartments : [lead.selectedDepartments];
                        const spec = lead.specialization || "";
                        const allTexts = [...depts, spec].filter(Boolean).join(" ").toLowerCase();
                        const cleanName = dept.name.replace(/^قسم\s+/, "").toLowerCase();
                        return allTexts.includes(cleanName) || allTexts.includes(dept.name.toLowerCase());
                      }).length;
                      
                      const remaining = maxCap - count;
                      
                      let tierColor = "";
                      let tierLabel = "";
                      let dotColor = "";
                      
                      // 3-Tier classification:
                      if (remaining > (2 / 3) * maxCap) {
                        tierColor = "text-emerald-700 bg-emerald-50 border-emerald-250";
                        tierLabel = "أخضر (نطاق آمن)";
                        dotColor = "bg-emerald-500 animate-pulse";
                      } else if (remaining > (1 / 3) * maxCap) {
                        tierColor = "text-amber-800 bg-amber-50 border-amber-200";
                        tierLabel = "أصفر (تنبيه مسبق)";
                        dotColor = "bg-amber-500 animate-pulse";
                      } else {
                        tierColor = "text-rose-700 bg-rose-50 border-rose-250";
                        tierLabel = "أحمر (استعجال حاد)";
                        dotColor = "bg-rose-500 animate-ping";
                      }
                      
                      return (
                        <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900">{dept.name}</td>
                          <td className="p-2.5 text-center font-bold text-slate-600">{maxCap}</td>
                          <td className="p-2.5 text-center font-bold text-slate-600">{count}</td>
                          <td className="p-2.5 text-center font-black">
                            <span className={remaining <= 0 ? "text-rose-600 line-through font-extrabold" : remaining <= 10 ? "text-rose-600 font-extrabold" : "text-emerald-750"}>
                              {remaining <= 0 ? "مكتمل (0)" : `${remaining} مقعد`}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${tierColor}`}>
                              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                              <span>{tierLabel}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hidden Add Academy Form */}
            {showAddAcademyForm && (
              <div className="p-4 bg-white border border-indigo-200 rounded-2xl space-y-4 animate-scale-up border-r-4 border-r-indigo-600 text-right">
                <h5 className="text-xs font-black text-indigo-950 flex items-center gap-1 justify-start">
                  <span>✨ نموذج إضافة قسم دراسي جديد (لتصفح الأقسام):</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">كود القسم الفريد (ID) - إنجليزي بدون مسافات:</label>
                    <input
                      type="text"
                      value={newAcademyId}
                      onChange={(e) => setNewAcademyId(e.target.value)}
                      placeholder="مثال: custom_nursing_dept"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">اسم التخصص الدراسي الكلي:</label>
                    <input
                      type="text"
                      value={newAcademyName}
                      onChange={(e) => setNewAcademyName(e.target.value)}
                      placeholder="مثال: شعبة العلوم الصحية ومساعد ممرض"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">اسم أيقونة الـ Lucide (إنجليزي):</label>
                    <input
                      type="text"
                      value={newAcademyIcon}
                      onChange={(e) => setNewAcademyIcon(e.target.value)}
                      placeholder="مثال: Heart or BookOpen or Award or Briefcase"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">الحد الأقصى للمقاعد (maxCapacity):</label>
                    <input
                      type="number"
                      value={newAcademyMaxCapacity}
                      onChange={(e) => setNewAcademyMaxCapacity(Number(e.target.value) || 0)}
                      placeholder="مثال: 120"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">وصف موجز ومقنع للقسم والمستقبل الدراسي:</label>
                    <textarea
                      value={newAcademyDesc}
                      onChange={(e) => setNewAcademyDesc(e.target.value)}
                      placeholder="اكتب بالتفصيل أهمية التخصص وسنوات الدراسة والخصومات..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">المهارات والخبرات المكتسبة (سطر جديد لكل مهارة):</label>
                    <textarea
                      value={newAcademySkills}
                      onChange={(e) => setNewAcademySkills(e.target.value)}
                      placeholder="مثال:&#10;الإسعافات الأولية الأساسية&#10;قراءة تخطيط رسم القلب&#10;العناية المركزة للأطفال"
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">الوظائف ومجالات العمل السريعة (سطر جديد لكل وظيفة):</label>
                    <textarea
                      value={newAcademyCareers}
                      onChange={(e) => setNewAcademyCareers(e.target.value)}
                      placeholder="مثال:&#10;مساعد خدمات تمريضية بالمستشفيات&#10;مختص استقبال طوارئ وعناية حيوية&#10;فني بمراكز الأشعة والتحاليل"
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAcademyForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAcademyDept}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    تأكيد وإدراج القسم الدراسي ➕
                  </button>
                </div>
              </div>
            )}

            {/* Grid of Existing Academy Departments */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {academyDepartmentsList.map((dept) => (
                <div 
                  key={dept.id} 
                  className="bg-white border border-slate-200 shadow-3xs p-4 rounded-2xl relative space-y-3 shrink-0 flex flex-col justify-between text-right"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-extrabold text-blue-850 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                      كود القسم: {dept.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAcademyDept(dept.id)}
                      className="text-xs text-rose-600 hover:text-red-700 flex items-center gap-1 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف التخصص ❌</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 text-right">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">اسم التخصص الدراسي بالكامل:</label>
                      <input
                        type="text"
                        value={dept.name}
                        onChange={(e) => handleUpdateAcademyField(dept.id, "name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">الحد الأقصى للمقاعد (maxCapacity):</label>
                        <input
                          type="number"
                          value={dept.maxCapacity !== undefined ? dept.maxCapacity : 120}
                          onChange={(e) => handleUpdateAcademyField(dept.id, "maxCapacity", Number(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">اسم الأيقونة (Lucide):</label>
                        <input
                          type="text"
                          value={dept.iconName || "BookOpen"}
                          onChange={(e) => handleUpdateAcademyField(dept.id, "iconName", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">الوصف الدراسي الكامل:</label>
                      <textarea
                        value={dept.description}
                        onChange={(e) => handleUpdateAcademyField(dept.id, "description", e.target.value)}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">المهارات (سطر سطر):</label>
                        <textarea
                          value={Array.isArray(dept.skills) ? dept.skills.join("\n") : dept.skills || ""}
                          onChange={(e) => handleUpdateAcademyField(dept.id, "skills", e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">الوظائف (سطر سطر):</label>
                        <textarea
                          value={Array.isArray(dept.careers) ? dept.careers.join("\n") : dept.careers || ""}
                          onChange={(e) => handleUpdateAcademyField(dept.id, "careers", e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleBulkSaveAcademyDepts}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4.5 h-4.5" />
                <span>حفظ وتثبيت تعديلات صفحة تصفح الأقسام 💾</span>
              </button>
            </div>

          </div>

          {/* SECTION 1.5.B: DEPARTMENT COMPARISON EXTRAS CONTROL */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-6 text-right" id="developer-feeder-comparison-section" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 justify-start font-sans">
                  <span className="text-lg">📊</span>
                  <span>تعديل وتحديث تفاصيل ومعلومات مقارنة الأقسام والتخصصات (Comparison Control) ⚖️</span>
                </h4>
                <p className="text-[10.5px] text-slate-500 font-bold">
                  يمكنك من هنا تعديل مدة الدراسة، نسبة العملي والنظري، أماكن التدريب الميداني، شروط ومؤهلات القبول، ومستقبل وسوق العمل لكل قسم للتحكم المباشر بما يظهر للطلاب في أداة المقارنة.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetComparisonExtras}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
                  title="استعادة القيم الافتراضية للسيستم"
                >
                  <span>إعادة ضبط افتراضي 🔄</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveComparisonExtras}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتثبيت المقارنات 💾</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {academyDepartmentsList.map((dept) => {
                const extra = comparisonExtras[dept.id] || DEFAULT_COMPARISON_EXTRAS[dept.id] || {
                  duration: "سنتان دراسيتان + تدريب ميداني معتمد",
                  practicalRatio: "70% عملي - 30% نظري",
                  trainingLocations: ["المؤسسات والشركات المعتمدة بالشراكة مع الأكاديمية"],
                  qualifications: "جميع المؤهلات الثانوية والدبلومات الفنية",
                  careerOutlook: "مستقبل فريد وفرص عمل واعدة ومطلوبة"
                };

                return (
                  <div 
                    key={`comp-${dept.id}`}
                    className="bg-white border border-slate-200 shadow-3xs p-4 rounded-2xl space-y-3 shrink-0 text-right font-sans flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-extrabold text-xs text-[#0A2463]">
                        ⭐ {dept.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        ID: {dept.id}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">مدة الدراسة والمشروع:</label>
                        <input
                          type="text"
                          value={extra.duration || ""}
                          onChange={(e) => handleUpdateComparisonExtraField(dept.id, "duration", e.target.value)}
                          placeholder="مثال: سنتان دراسيتان (4 فصول) + تدريب ميداني"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">نسبة التطبيق العملي للنظري:</label>
                        <input
                          type="text"
                          value={extra.practicalRatio || ""}
                          onChange={(e) => handleUpdateComparisonExtraField(dept.id, "practicalRatio", e.target.value)}
                          placeholder="مثال: 75% تدريب ميداني - 25% نظري"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">شروط القبول والمؤهلات المتاحة:</label>
                        <input
                          type="text"
                          value={extra.qualifications || ""}
                          onChange={(e) => handleUpdateComparisonExtraField(dept.id, "qualifications", e.target.value)}
                          placeholder="مثال: ثانوية عامة / أزهرية / دبلومات فنية"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">مستقبل وفرص العمل بالسوق:</label>
                        <input
                          type="text"
                          value={extra.careerOutlook || ""}
                          onChange={(e) => handleUpdateComparisonExtraField(dept.id, "careerOutlook", e.target.value)}
                          placeholder="مثال: طلب عالي جداً بشركات البترول"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">أماكن التدريب الميداني (سطر سطر):</label>
                        <textarea
                          value={Array.isArray(extra.trainingLocations) ? extra.trainingLocations.join("\n") : extra.trainingLocations || ""}
                          onChange={(e) => handleUpdateComparisonExtraField(dept.id, "trainingLocations", e.target.value)}
                          rows={3}
                          placeholder="مثال:&#10;مواقع الشركات الكبرى&#10;المراكز المعتمدة"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveComparisonExtras}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4.5 h-4.5" />
                <span>حفظ وتثبيت كافة تعديلات مقارنة الأقسام 💾</span>
              </button>
            </div>
          </div>

          {/* SECTION 1.6: DYNAMIC PDF LIBRARY & FILE BOOKLET MANAGER */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-4 text-right" id="developer-feeder-pdf-library-section">
            <h4 className="font-extrabold text-sm text-slate-950 flex items-center justify-start gap-1.5 font-sans">
              <span className="text-lg">📁</span>
              <span>إدارة كراسات وكتيبات التثبيت وبوابات التحميل الديناميكية 📚 (Dynamic File Manager)</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
              يتحكم هذا القسم بجميع الملفات التي يستطيع الطلاب تنزيلها مباشرة من الموقع. يمكنك ربط كل كتيب بتخصص دراسي محدد، وتختفي خانة التحميل تلقائياً من صفحة التخصص الدراسي إذا تم مسح المستند، وتظهر فور الرفع.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Add/Edit Form Panel */}
              <div className="md:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5">
                <h5 className="text-xs font-black text-[#0A2463]">
                  {libraryFormId ? "✍️ تعديل كتيب معتمد حالي:" : "➕ إضافة وربط كتيب جديد للمنصة:"}
                </h5>

                <form onSubmit={handleSaveLibraryItem} className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">اسم مسمى الكتيب (للطلاب):</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: كتيب وخطة شعبة البرمجة لعام 2026"
                      value={libraryFormName}
                      onChange={(e) => setLibraryFormName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-505"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">القسم أو الشعبة المرتبطة بالكتيب:</label>
                    <select
                      value={libraryFormSpecialization}
                      onChange={(e) => setLibraryFormSpecialization(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-505"
                    >
                      <option value="الدليل الرسمي الشامل 2026">📙 الدليل الرسمي الشامل (الرئيسية)</option>
                      {academyDepartmentsList.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          ⭐ {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ملف الكتيب المحلي (رفع مباشر للسيرفر):</label>
                    <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleLibraryFileUpload}
                        id="developer-feeder-file-uploader"
                        className="hidden"
                      />
                      <label
                        htmlFor="developer-feeder-file-uploader"
                        className="px-3 py-1.5 bg-[#0a2463] text-white text-[10px] rounded-lg cursor-pointer font-black hover:bg-slate-900 transition flex items-center gap-1 shadow-sm"
                      >
                        <span>اختر ملف الكتيب لرفعه ⬆️</span>
                      </label>
                      {libraryUploadProgress && (
                        <p className="text-[10px] text-slate-600 font-semibold mt-2 animate-pulse leading-normal">
                          {libraryUploadProgress}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">أو رابط الملف المباشر (URL):</label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/file.pdf"
                      value={libraryFormUrl}
                      onChange={(e) => setLibraryFormUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-550"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={libraryIsSaving}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>💾 {libraryFormId ? "تحديث التعديلات" : "حفظ وربط وتثبيت"}</span>
                    </button>
                    {libraryFormId && (
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryFormId("");
                          setLibraryFormName("");
                          setLibraryFormUrl("");
                          setLibraryUploadProgress("");
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* PDF Library List Display */}
              <div className="md:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-slate-900">📑 الكتيبات المسجلة حالياً بالمحلية:</h5>
                    <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      العدد: {pdfLibraryList.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pt-2">
                    {pdfLibraryList.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs font-bold py-12">
                        لا توجد مستندات مسجلة حالياً بالمنصة.
                      </p>
                    ) : (
                      pdfLibraryList.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 bg-slate-50 hover:bg-slate-100/85 border border-slate-150 rounded-xl text-right flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans"
                        >
                          <div className="space-y-1">
                            <strong className="text-xs text-slate-900 block font-extrabold leading-tight">
                              {file.name}
                            </strong>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9.5px]">
                              <span className="bg-indigo-50 text-[#0a2463] px-1.5 py-0.2 rounded-md font-extrabold">
                                مرتبط بـ: {file.specialization}
                              </span>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-600 hover:underline font-mono truncate max-w-[150px]"
                              >
                                {file.url}
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleEditLibraryItem(file)}
                              className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-250 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerDeleteLibraryItem(file.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف ❌</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold leading-normal">
                  💡 تلميح أمني: عند حذف أي ملف، يختفي فوراً زر التحميل المطابق من واجهة الطالب، مما يزيل مخاطر الروابط المعطلة نهائياً.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: JOB VACANCIES TICKEY MANAGEMENT */}
          <div className="bg-white border border-slate-205 rounded-3xl p-4 sm:p-6 space-y-4">
            <h4 className="font-extrabold text-sm text-slate-950 flex items-center justify-start gap-1.5 font-sans">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>١. إدارة فرص التوظيف النشطة (شريط الماركي المتحرك بالرئيسية)</span>
            </h4>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newJobText}
                onChange={(e) => setNewJobText(e.target.value)}
                placeholder="مثال: مستشفيات الشرطة تعلن عن حاجتها لفنيين صيانه أجهزة طبية براتب 12000 ج..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newJobText.trim()) return;
                  const updated = [newJobText.trim(), ...jobVacancies];
                  setJobVacancies(updated);
                  saveSiteConfig("custom_job_announcements", updated);
                  window.dispatchEvent(new Event("job_announcements_updated"));
                  setNewJobText("");
                  alert("تمت إضافة الفرصة لشريط التوظيف بنجاح!");
                }}
                className="px-5 py-2.5 bg-[#0a2463] hover:bg-indigo-900 text-white font-black rounded-xl text-xs shrink-0 cursor-pointer"
              >
                إضافة فرصة ➕
              </button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {jobVacancies.map((job, index) => (
                <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-150 text-xs text-slate-800 font-bold font-sans">
                  <span className="truncate flex-1 pl-4 text-right">{job}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = jobVacancies.filter((_, i) => i !== index);
                      setJobVacancies(updated);
                      saveSiteConfig("custom_job_announcements", updated);
                      window.dispatchEvent(new Event("job_announcements_updated"));
                    }}
                    className="text-rose-600 hover:text-red-700 font-extrabold px-1 text-[11px] cursor-pointer"
                  >
                    إزالة ❌
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: REVIEWS DIRECT ENTRY */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-4">
            <h4 className="font-extrabold text-sm text-slate-950 flex items-center justify-start gap-1.5 font-sans">
              <Star className="w-5 h-5 text-amber-500" />
              <span>٢. إدارة آراء وتقييمات خريجي الأكاديميات (الشهادات الموثقة بالصفحة الرئيسية)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Form panel */}
              <div className="md:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 text-right shrink-0">
                <h5 className="text-xs font-black text-[#0A2463]">✍️ إضافة مراجعة خريج جديدة:</h5>
                
                <div className="space-y-2 text-right">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold">نوع الاستطلاع / صفة صاحب التقييم:</label>
                    <select
                      value={newReviewType}
                      onChange={(e) => setNewReviewType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                    >
                      <option value="enrolled_student">طالب مقيد وموثق 🎓 (يدرس حالياً بعد التقديم)</option>
                      <option value="visitor">زائر للبوابة 🌐 (رأيه في البوابة والخدمات)</option>
                      <option value="new_applicant">طالب جديد 🌟 (تجربة التواصل مع مستشاري التقديمات)</option>
                      <option value="graduate">طالب خريج 💼 (الحياة المهنية والمهارات المكتسبة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold">اسم صاحب التقييم:</label>
                    <input
                      type="text"
                      value={newReviewName}
                      onChange={(e) => setNewReviewName(e.target.value)}
                      placeholder="يوسف ماجد القاضي"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold">التخصص / المسار أو الخدمة:</label>
                    <input
                      type="text"
                      value={newReviewDept}
                      onChange={(e) => setNewReviewDept(e.target.value)}
                      placeholder="قسم البرمجة أو تصفح البوابة"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold">المحافظة الجغرافية:</label>
                    <input
                      type="text"
                      value={newReviewGov}
                      onChange={(e) => setNewReviewGov(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold">النجوم:</label>
                    <select
                      value={newReviewStars}
                      onChange={(e) => setNewReviewStars(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (ممتاز وموثق)</option>
                      <option value={4}>⭐⭐⭐⭐ (جيد جداً)</option>
                      <option value={3}>⭐⭐⭐ (جيد ومقبول)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold">نص المراجعة والشهادة الصادقة:</label>
                    <textarea
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 text-right"
                      placeholder="اكتب التقييم والنص المتميز هنا..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newReviewName.trim() || !newReviewText.trim()) {
                        alert("يرجى تعبئة الاسم ونص الشهادة الصادقة!");
                        return;
                      }
                      const initials = newReviewName.trim().split(" ").slice(0, 2).map(n => n[0]).join(" ");
                      const colors = ["bg-blue-600", "bg-rose-600", "bg-emerald-600", "bg-amber-600", "bg-indigo-600"];
                      const randomCol = colors[Math.floor(Math.random() * colors.length)] + " text-white";

                      const newRevObj: Review = {
                        id: Date.now(),
                        studentName: newReviewName.trim(),
                        department: newReviewDept.trim() || "تخصص الأكاديمية التطبيقي",
                        governorate: newReviewGov.trim() || "غير مدون",
                        rating: newReviewStars,
                        text: newReviewText.trim(),
                        avatarColor: randomCol,
                        initials: initials || "ط ج",
                        date: new Date().toLocaleDateString("ar-EG"),
                        verified: true,
                        type: newReviewType
                      };

                      const nextArr = [newRevObj, ...studentTestimonials];
                      setStudentTestimonials(nextArr);
                      saveSiteConfig("custom_student_reviews", nextArr);
                      window.dispatchEvent(new Event("student_reviews_updated"));

                      setNewReviewName("");
                      setNewReviewDept("");
                      setNewReviewText("");
                      alert("✓ تم حفظ وإدراج استطلاع الرأي بنجاح!");
                    }}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-750 text-white font-black text-xs rounded-lg cursor-pointer"
                  >
                    إضافة التقييم بنجاح 🌸
                  </button>
                </div>
              </div>

              {/* List panel */}
              <div className="md:col-span-7 space-y-2 max-h-[380px] overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-white">
                {studentTestimonials.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 relative text-right">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <strong className="text-indigo-900">{item.studentName} ({item.governorate})</strong>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-white border border-slate-200 text-slate-700">
                          {item.type === "visitor" ? "زائر" : item.type === "new_applicant" ? "طالب جديد" : item.type === "graduate" ? "خريج" : "طالب مقيد"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = studentTestimonials.filter(r => r.id !== item.id);
                            setStudentTestimonials(updated);
                            saveSiteConfig("custom_student_reviews", updated);
                            window.dispatchEvent(new Event("student_reviews_updated"));
                          }}
                          className="text-rose-600 hover:text-red-700 font-extrabold inline text-[10px] cursor-pointer"
                        >
                          إزالة ❌
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold">{item.department} • {"⭐".repeat(item.rating)}</p>
                    <p className="text-xs text-slate-700 font-sans leading-relaxed">"{item.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        )}

        {/* 🔗 UNLIMITED MARKETING & AGENT REFERRAL LINKS GENERATOR TAB */}
        {feederSubTab === "marketing_links" && (
          <div className="space-y-6 pt-2 animate-fade-in text-right" dir="rtl" id="developer-marketing-links-panel">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-[#0a2463] to-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔗</span>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      مولد روابط التتبع والتسويق للموظفين والحملات (Unlimited UTM & Referral Engine)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    أنشئ عدد لا نهائي من الروابط الذكية المخصصة لكل موظف، مسوق بالعمولة، أو حملة إعلانية ممولة (فيسبوك، تيك توك، سناب شات، جوجل، واتساب). عند دخول الطالب من أي رابط، يتعرف عليه الموقع ويثبت اسم الموظف والحملة وكود الخصم في استمارة الحجز تلقائياً.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span>♾️</span> روابط غير محدودة
                  </span>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span>⚡</span> تتبع تلقائي ١٠٠٪
                  </span>
                </div>
              </div>
            </div>

            {/* GENERATOR WORKSPACE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Controls Column (7 Cols) */}
              <div className="lg:col-span-7 space-y-5">
                
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚙️</span>
                      <h4 className="font-extrabold text-sm text-slate-900">تخصيص بيانات الرابط والموظف</h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">الخطوات ١ إلى ٤</span>
                  </div>

                  {/* 1. Agent Name / Ref Code */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-800">
                      ١. اسم الموظف / كود التتبع (Agent Name / Ref Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="اكتب اسم الموظف أو الكود (مثال: أحمد علي أو ahmed_ali أو fb_petroleum)..."
                      value={linkAgentName}
                      onChange={(e) => setLinkAgentName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all shadow-inner"
                    />
                    
                    {/* Quick Suggestions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold ml-1">الموظفون المسجلون:</span>
                      {devSalesReps.length > 0 ? (
                        devSalesReps.map((rep: any) => (
                          <button
                            key={rep.id || rep.slug}
                            type="button"
                            onClick={() => setLinkAgentName(rep.name)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] font-black rounded-lg border border-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>👤</span>
                            <span>{rep.name}</span>
                          </button>
                        ))
                      ) : (
                        ["أحمد علي", "سارة ممدوح", "م/محمد علي", "Mariam Mahmoud"].map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => setLinkAgentName(sugg)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200 transition-all cursor-pointer"
                          >
                            + {sugg}
                          </button>
                        ))
                      )}
                      {["إعلان_فيسبوك", "إعلان_تيك_توك", "فلاير_مطبوع"].map((sugg) => (
                        <button
                          key={sugg}
                          type="button"
                          onClick={() => setLinkAgentName(sugg)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9.5px] font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
                        >
                          + {sugg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Platform / Source */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-black text-slate-800">
                      ٢. المنصة الإعلانية / مصدر الزيارة (Traffic Source / Platform)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[
                        { id: "facebook", name: "فيسبوك", icon: "🔵", color: "hover:border-blue-500 hover:bg-blue-50/50" },
                        { id: "tiktok", name: "تيك توك", icon: "⚫", color: "hover:border-slate-800 hover:bg-slate-50" },
                        { id: "instagram", name: "إنستجرام", icon: "🟣", color: "hover:border-pink-500 hover:bg-pink-50/50" },
                        { id: "snapchat", name: "سناب شات", icon: "🟡", color: "hover:border-amber-400 hover:bg-amber-50/50" },
                        { id: "google", name: "إعلانات جوجل", icon: "🔴", color: "hover:border-red-500 hover:bg-red-50/50" },
                        { id: "whatsapp", name: "واتساب", icon: "🟢", color: "hover:border-emerald-500 hover:bg-emerald-50/50" },
                        { id: "telegram", name: "تليجرام", icon: "🔷", color: "hover:border-sky-500 hover:bg-sky-50/50" },
                        { id: "affiliate", name: "مسوق خارجي", icon: "🤝", color: "hover:border-purple-500 hover:bg-purple-50/50" },
                        { id: "direct", name: "مطبوعات QR", icon: "📄", color: "hover:border-indigo-500 hover:bg-indigo-50/50" },
                        { id: "custom", name: "مخصص", icon: "🌐", color: "hover:border-slate-500 hover:bg-slate-50" }
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLinkPlatform(p.id)}
                          className={`p-2.5 rounded-2xl border text-center text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shadow-3xs ${
                            linkPlatform === p.id
                              ? "bg-[#0a2463] text-white border-indigo-950 shadow-md ring-2 ring-indigo-400/20"
                              : `bg-white text-slate-700 border-slate-200 ${p.color}`
                          }`}
                        >
                          <span className="text-base">{p.icon}</span>
                          <span className="text-[10.5px] truncate w-full">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Destination Page */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-black text-slate-800">
                      ٣. الصفحة المستهدفة للرابط (Target Destination Page)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: "home", label: "🏠 الصفحة الرئيسية", desc: "/" },
                        { id: "booking", label: "📝 استمارة الحجز المباشرة", desc: "/#booking-form-wrapper" },
                        { id: "extraction", label: "📄 استخراج ومراجعة الاستمارة", desc: "/form-extraction" },
                        { id: "guide", label: "📘 دليل التسجيل والشروط", desc: "/registration-guide" },
                        { id: "specialty", label: "🎓 صفحة تخصص محدد", desc: "/specialties/..." },
                        { id: "news", label: "📰 الأخبار والمقالات", desc: "/news" },
                      ].map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => setLinkDestinationType(dest.id as any)}
                          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                            linkDestinationType === dest.id
                              ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-black shadow-xs ring-1 ring-indigo-500"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                          }`}
                        >
                          <span className="text-xs">{dest.label}</span>
                          <span className="text-[9.5px] text-slate-400 font-mono" dir="ltr">{dest.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* If Specialty chosen */}
                    {linkDestinationType === "specialty" && (
                      <div className="pt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 animate-fade-in">
                        <label className="block text-xs font-black text-amber-900">
                          اختر التخصص المستهدف للرابط:
                        </label>
                        <select
                          value={linkDepartment}
                          onChange={(e) => setLinkDepartment(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs font-black text-slate-900 focus:outline-none"
                        >
                          {ACADEMY_DEPARTMENTS.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.id})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-amber-800 font-bold">
                          💡 سينتقل الطالب مباشرةً إلى صفحة تخصص <span className="underline font-black">{ACADEMY_DEPARTMENTS.find(d => d.id === linkDepartment)?.name}</span> مع تثبيت كود الموظف فوراً في جلسته.
                        </p>
                      </div>
                    )}

                    {/* If Custom Path chosen */}
                    {linkDestinationType === "custom" && (
                      <div className="pt-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-fade-in">
                        <label className="block text-xs font-black text-slate-800">
                          اكتب المسار المخصص (Custom Path):
                        </label>
                        <input
                          type="text"
                          placeholder="/trending أو /faq أو /certificates"
                          value={linkCustomPath}
                          onChange={(e) => setLinkCustomPath(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. Advanced Campaign Customization */}
                  <div className="border-t border-slate-150 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>٤. إعدادات الحملة والخصم (اختياري)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 mb-1">اسم الحملة (Campaign):</span>
                        <input
                          type="text"
                          placeholder="summer_batch_2026"
                          value={linkCampaignName}
                          onChange={(e) => setLinkCampaignName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 mb-1">كود الخصم التلقائي:</span>
                        <input
                          type="text"
                          placeholder="AM2026"
                          value={linkDiscountCode}
                          onChange={(e) => setLinkDiscountCode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 mb-1">نوع الوسيط (Medium):</span>
                        <select
                          value={linkMedium}
                          onChange={(e) => setLinkMedium(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                          dir="ltr"
                        >
                          <option value="social">social (منشورات)</option>
                          <option value="cpc">cpc (إعلانات ممولة)</option>
                          <option value="reels">reels / video (فيديوهات)</option>
                          <option value="story">story (ستوري مؤقت)</option>
                          <option value="chat">chat / dm (رسائل خاصة)</option>
                          <option value="flyer_qr">flyer_qr (مطبوعات)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">عنوان أو تسمية للرابط في المفضلة:</span>
                      <input
                        type="text"
                        placeholder="مثال: إعلان ريلز تمريض - حملة أغسطس لأحمد علي"
                        value={linkTitleNote}
                        onChange={(e) => setLinkTitleNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* Live Preview & Action Output Column (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Result Card */}
                <div className="bg-gradient-to-b from-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-indigo-800/60 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h4 className="font-extrabold text-xs text-indigo-100">معاينة الرابط الذكي المولد</h4>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-300 font-bold">READY TO SHARE</span>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-indigo-850 text-indigo-200 border border-indigo-700/50 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      👤 الموظف: {linkAgentName.trim() || "عام (غير محدد)"}
                    </span>
                    <span className="bg-indigo-850 text-indigo-200 border border-indigo-700/50 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      🌐 المنصة: {linkPlatform}
                    </span>
                    {linkDiscountCode && linkDiscountCode !== "none" && (
                      <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        🎟️ الخصم: {linkDiscountCode}
                      </span>
                    )}
                  </div>

                  {/* URL Textbox */}
                  <div className="bg-slate-950/90 border border-indigo-900 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>الرابط النهائي الكامل:</span>
                      <span>{currentGeneratedUrl.length} حرف</span>
                    </div>
                    <div className="p-2.5 bg-black/50 rounded-xl border border-white/5 font-mono text-xs text-emerald-300 break-all select-all max-h-28 overflow-y-auto" dir="ltr">
                      {currentGeneratedUrl}
                    </div>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    
                    {/* 1. Copy Full Link */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentGeneratedUrl);
                        setCopiedLinkFeedback("link");
                        toast.success("✓ تم نسخ الرابط التسويقي بنجاح!");
                        setTimeout(() => setCopiedLinkFeedback(null), 2500);
                      }}
                      className="py-3 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedLinkFeedback === "link" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم النسخ! ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>نسخ الرابط 📋</span>
                        </>
                      )}
                    </button>

                    {/* 2. Test in New Tab */}
                    <a
                      href={currentGeneratedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs rounded-2xl border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>تجربة الرابط ↗️</span>
                    </a>

                    {/* 3. Copy WhatsApp Message */}
                    <button
                      type="button"
                      onClick={() => {
                        const waText = `🏛️ *بوابة التنسيق والقبول المعتمدة للمعاهد والأكاديميات الخاصة ٢٠٢٦* 🎓\n\nمرحباً بك! يمكنك الآن التقديم المباشر وحجز مقعدك الدراسي في أضخم التخصصات المعتمدة (بترول، تمريض، مساحة، حاسبات، صحافة، سياحة وفنادق).\n\n✨ *مميزات التسجيل:* استخراج استمارة رسمية فورية، تخفيض حصري ${linkDiscountCode ? `[كود الخصم: ${linkDiscountCode}]` : ''}، وتدريب عملي معتمد.\n\n🔗 *رابط التقديم والاستعلام المباشر:*\n${currentGeneratedUrl}\n\n${linkAgentName.trim() ? `👤 *مسؤول المتابعة والاستفسارات:* ${linkAgentName.trim()}\n` : ''}📞 بالتوفيق لجميع الطلاب الراغبين في الالتحاق!`;
                        navigator.clipboard.writeText(waText);
                        setCopiedLinkFeedback("wa");
                        toast.success("✓ تم نسخ الرسالة الإعلانية للواتساب!");
                        setTimeout(() => setCopiedLinkFeedback(null), 2500);
                      }}
                      className="py-2.5 px-3 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-black text-[11px] rounded-2xl border border-emerald-700/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{copiedLinkFeedback === "wa" ? "تم نسخ النص! ✓" : "رسالة واتساب 💬"}</span>
                    </button>

                    {/* 4. Show QR Code Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowQrModalUrl({
                          url: currentGeneratedUrl,
                          title: linkTitleNote || (linkAgentName ? `رابط الموظف: ${linkAgentName}` : "رابط التقديم الرسمي"),
                          agent: linkAgentName || "بوابة القبول والتنسيق"
                        });
                      }}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-[11px] rounded-2xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>رمز QR 📱</span>
                    </button>

                  </div>

                  {/* 5. Save Link to Saved Library */}
                  <button
                    type="button"
                    onClick={() => {
                      const newSaved: SavedMarketingLink = {
                        id: "m_link_" + Date.now(),
                        title: linkTitleNote.trim() || (linkAgentName.trim() ? `رابط ${linkAgentName.trim()} (${linkPlatform})` : `رابط حملة ${linkPlatform}`),
                        agentName: linkAgentName.trim() || "عام",
                        platform: linkPlatform,
                        destinationType: linkDestinationType,
                        destinationPath: linkDestinationType === "specialty" ? `/specialties/${linkDepartment}` : linkDestinationType === "custom" ? linkCustomPath : "/",
                        campaignName: linkCampaignName.trim() || "general",
                        discountCode: linkDiscountCode.trim() || "AM2026",
                        fullUrl: currentGeneratedUrl,
                        createdAt: new Date().toLocaleDateString("ar-EG"),
                        notes: linkTitleNote.trim()
                      };

                      const nextList = [newSaved, ...savedMarketingLinks];
                      saveMarketingLinksToStorage(nextList);
                      toast.success("✓ تم حفظ الرابط في مكتبة الروابط المحفوظة بنجاح!");
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⭐</span>
                    <span>حفظ الرابط في المفضلة لإعادة استخدامه لاحقاً</span>
                  </button>

                </div>

                {/* Instant Educational Tip */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-extrabold">
                    <span>💡</span>
                    <span>كيف يستفيد الموظف من هذا الرابط؟</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                    ينسخ الموظف هذا الرابط ويضعه في إعلاناته أو يرسله للطلاب على واتساب أو ماسنجر. عندما يفتح الطالب الرابط ويسجل استمارته، يظهر اسم الموظف فوراً في لوحة التحكم ويتم ربط الطالب به تلقائياً.
                  </p>
                </div>

              </div>

            </div>

            {/* SECTION 2: SAVED LINKS LIBRARY & CONVERSION STATS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📚</span>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      مكتبة الروابط المحفوظة وعدادات التسجيل الفعلي
                    </h4>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {savedMarketingLinks.length} رابط محفوظ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    إدارة ومتابعة الروابط التي تم إنشاؤها مسبقاً مع إمكانية نسخها، واختبارها، ورؤية عدد الطلاب الذين سجلوا منها.
                  </p>
                </div>

                {/* Export & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (savedMarketingLinks.length === 0) {
                        toast.error("لا توجد روابط لتصديرها.");
                        return;
                      }
                      const csvContent = "\uFEFF" + [
                        ["تسمية الرابط", "الموظف المسؤول", "المنصة", "الصفحة", "كود الخصم", "الرابط الكامل", "تاريخ الإنشاء"].join(","),
                        ...savedMarketingLinks.map(l => [
                          `"${l.title}"`,
                          `"${l.agentName}"`,
                          `"${l.platform}"`,
                          `"${l.destinationPath}"`,
                          `"${l.discountCode}"`,
                          `"${l.fullUrl}"`,
                          `"${l.createdAt}"`
                        ].join(","))
                      ].join("\n");

                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `marketing_agent_links_${Date.now()}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success("✓ تم تصدير ملف إكسل بجميع الروابط بنجاح!");
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl border border-slate-300 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير CSV 📊</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      saveMarketingLinksToStorage([]);
                      toast.success("تم مسح القائمة.");
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black rounded-xl border border-rose-200 transition cursor-pointer"
                  >
                    مسح الكل 🗑️
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="🔍 ابحث باسم الموظف أو الرابط..."
                    value={savedLinksSearchQuery}
                    onChange={(e) => setSavedLinksSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                {/* Filter Platform */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span>المنصة:</span>
                  <select
                    value={savedLinksFilterPlatform}
                    onChange={(e) => setSavedLinksFilterPlatform(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl p-2 text-xs font-black text-slate-800 focus:outline-none"
                  >
                    <option value="all">جميع المنصات (الكل)</option>
                    <option value="facebook">فيسبوك (Facebook)</option>
                    <option value="tiktok">تيك توك (TikTok)</option>
                    <option value="instagram">إنستجرام (Instagram)</option>
                    <option value="snapchat">سناب شات (Snapchat)</option>
                    <option value="google">إعلانات جوجل</option>
                    <option value="whatsapp">واتساب (WhatsApp)</option>
                  </select>
                </div>

              </div>

              {/* Saved Links Cards List */}
              {savedMarketingLinks.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <span className="text-3xl block">🔗</span>
                  <p className="text-xs text-slate-500 font-extrabold">لا توجد روابط محفوظة حتى الآن.</p>
                  <p className="text-[11px] text-slate-400 font-bold">استخدم النموذج أعلاه لتوليد رابط جديد ثم اضغط "حفظ الرابط في المفضلة".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {savedMarketingLinks
                    .filter((link) => {
                      if (savedLinksFilterPlatform !== "all" && link.platform !== savedLinksFilterPlatform) return false;
                      if (savedLinksSearchQuery.trim()) {
                        const q = savedLinksSearchQuery.trim().toLowerCase();
                        return (
                          link.title.toLowerCase().includes(q) ||
                          link.agentName.toLowerCase().includes(q) ||
                          link.platform.toLowerCase().includes(q) ||
                          link.fullUrl.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((link) => {
                      // Live conversion calculation from adminLeads
                      const matchedStudents = adminLeads.filter((lead: any) => {
                        const agName = (lead.agentName || lead.agent_name || "").trim().toLowerCase();
                        const target = link.agentName.trim().toLowerCase();
                        if (target && target !== "عام" && (agName === target || (lead.notes && lead.notes.toLowerCase().includes(target)))) {
                          return true;
                        }
                        return false;
                      });

                      return (
                        <div
                          key={link.id}
                          className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 space-y-3 transition-all relative group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                <span className="text-sm">📌</span>
                                <span>{link.title}</span>
                              </h5>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-md">
                                  👤 الموظف: {link.agentName}
                                </span>
                                <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                                  🌐 {link.platform}
                                </span>
                                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md">
                                  🎯 {link.destinationPath}
                                </span>
                              </div>
                            </div>

                            {/* Live Conversion Count Pill */}
                            <div className="text-center bg-white border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 shadow-3xs">
                              <span className="text-[9.5px] text-slate-400 font-bold block">سجل من الرابط</span>
                              <span className="text-xs font-mono font-black text-indigo-700">
                                {matchedStudents.length} طالب 🎓
                              </span>
                            </div>
                          </div>

                          {/* URL Box */}
                          <div className="bg-white border border-slate-200 rounded-xl p-2 font-mono text-[10px] text-slate-600 truncate" dir="ltr">
                            {link.fullUrl}
                          </div>

                          {/* Card Action Buttons */}
                          <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-200/60">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(link.fullUrl);
                                  toast.success(`✓ تم نسخ رابط ${link.agentName}!`);
                                }}
                                className="px-2.5 py-1.5 bg-[#0a2463] hover:bg-indigo-950 text-white text-[11px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 shadow-3xs"
                              >
                                <Copy className="w-3 h-3" />
                                <span>نسخ</span>
                              </button>

                              <a
                                href={link.fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>فتح</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowQrModalUrl({
                                    url: link.fullUrl,
                                    title: link.title,
                                    agent: link.agentName
                                  });
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>QR</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const next = savedMarketingLinks.filter(l => l.id !== link.id);
                                saveMarketingLinksToStorage(next);
                                toast.success("تم حذف الرابط من القائمة.");
                              }}
                              className="text-rose-500 hover:text-rose-700 text-[11px] font-bold p-1 rounded transition cursor-pointer"
                            >
                              حذف 🗑️
                            </button>
                          </div>

                        </div>
                      );
                    })}
                </div>
              )}

            </div>

            {/* SECTION 2.5: SALES REPRESENTATIVES & DEDICATED PORTALS MANAGEMENT */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-[#0a2463] text-white border border-indigo-500/30 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/50 flex items-center justify-center text-2xl shadow-inner">
                    💼
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-base text-white">
                        بوابات موظفي ومستشاري المبيعات المعزولة (Sales Representatives Portals)
                      </h4>
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-lg">
                        خاص وحصري 🔐
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
                      أنشئ لكل موظف حساباً ورمز PIN ورابط بوابة خاص به ليرى ويتابع طلابه فقط، مع مزامنة فورية مع لوحة تسجيلات الطلاب الرئيسية.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={fetchDevSalesReps}
                    disabled={isLoadingReps}
                    className="px-3 py-1.5 bg-indigo-800/80 hover:bg-indigo-700 border border-indigo-500/50 text-indigo-100 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <span>{isLoadingReps ? "جاري التحديث..." : "🔄 تحديث القائمة"}</span>
                  </button>
                  <span className="text-xs font-bold text-indigo-200 bg-indigo-900/60 border border-indigo-700/60 px-3.5 py-1.5 rounded-xl">
                    الموظفون النشطون: {devSalesReps.length}
                  </span>
                </div>
              </div>

              {/* Form to Add New Sales Rep */}
              <form onSubmit={handleCreateDevSalesRep} className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <span>➕</span>
                  <span>إضافة وتفعيل موظف مبيعات جديد وإنشاء بوابته فوراً:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. Name */}
                  <div className="space-y-1.5 lg:col-span-1">
                    <label className="block text-[11px] font-bold text-indigo-200">
                      اسم الموظف <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: م/محمد علي"
                      value={newRepName}
                      onChange={(e) => {
                        setNewRepName(e.target.value);
                        if (!newRepSlug) {
                          setNewRepSlug(e.target.value.trim().toLowerCase().replace(/\s+/g, "_"));
                        }
                      }}
                      className="w-full bg-slate-900/80 border border-indigo-500/40 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* 2. Slug / Code */}
                  <div className="space-y-1.5 lg:col-span-1">
                    <label className="block text-[11px] font-bold text-indigo-200">
                      كود الرابط (Slug)
                    </label>
                    <input
                      type="text"
                      placeholder="mohamed_ali"
                      value={newRepSlug}
                      onChange={(e) => setNewRepSlug(e.target.value)}
                      className="w-full bg-slate-900/80 border border-indigo-500/40 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* 3. PIN / Password */}
                  <div className="space-y-1.5 lg:col-span-1">
                    <label className="block text-[11px] font-bold text-indigo-200">
                      رمز الـ PIN / كلمة المرور <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="اكتب باسوورد الموظف"
                      value={newRepPin}
                      onChange={(e) => setNewRepPin(e.target.value)}
                      className="w-full bg-slate-900/80 border border-indigo-500/40 rounded-xl p-2.5 text-xs font-bold text-amber-300 placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:outline-none text-center tracking-widest font-mono"
                    />
                  </div>

                  {/* 4. Phone for WhatsApp */}
                  <div className="space-y-1.5 lg:col-span-1">
                    <label className="block text-[11px] font-bold text-indigo-200">
                      رقم واتساب الموظف
                    </label>
                    <input
                      type="tel"
                      placeholder="010XXXXXXXX"
                      value={newRepPhone}
                      onChange={(e) => setNewRepPhone(e.target.value)}
                      className="w-full bg-slate-900/80 border border-indigo-500/40 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:outline-none text-left font-mono"
                    />
                  </div>

                  {/* 5. Submit Button */}
                  <div className="flex items-end lg:col-span-1">
                    <button
                      type="submit"
                      disabled={isSavingRep}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:shadow-amber-400/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingRep ? "جاري الحفظ..." : "تفعيل الصفحة 🚀"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Reps Cards Grid */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold text-indigo-200">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-black">قائمة الموظفين وبواباتهم المفعلة ({devSalesReps.length}):</span>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="🔍 ابحث عن موظف (بالاسم أو الكود أو رقم الهاتف)..."
                      value={repSearchQuery}
                      onChange={(e) => setRepSearchQuery(e.target.value)}
                      className="w-full py-2 px-3.5 bg-slate-900/90 border border-indigo-400/40 rounded-xl text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition shadow-inner"
                    />
                    {repSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRepSearchQuery("")}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white text-xs font-black cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {devSalesReps.length === 0 ? (
                  <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 text-indigo-200 text-xs font-bold">
                    لا يوجد موظفون مضافون حالياً. استخدم النموذج أعلاه لإنشاء صفحة لموظف جديد.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {devSalesReps
                      .filter((rep: any) => {
                        if (!repSearchQuery.trim()) return true;
                        const q = repSearchQuery.trim().toLowerCase();
                        return (
                          (rep.name || "").toLowerCase().includes(q) ||
                          (rep.slug || "").toLowerCase().includes(q) ||
                          (rep.phone || "").includes(q) ||
                          (rep.pin || "").includes(q)
                        );
                      })
                      .map((rep: any) => {
                      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.eg-academies.com";
                      const portalUrl = `${origin}/sales-portal/${rep.slug}`;
                      const studentReferralUrl = `${origin}/?ref=${encodeURIComponent(rep.slug)}&agent=${encodeURIComponent(rep.name)}`;
                      
                      // Count students assigned to this rep from adminLeads with comprehensive normalization
                      const normalizeStr = (str: any) => String(str || "").toLowerCase().replace(/[\s_\-\.\u200B-\u200D\uFEFF]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();
                      const repNameNorm = normalizeStr(rep.name);
                      const repSlugNorm = normalizeStr(rep.slug);

                      const assignedCount = adminLeads.filter((l: any) => {
                        const leadAgentNorm = normalizeStr(l.agentName || l.agent_name);
                        const leadRefNorm = normalizeStr(l.refCode);
                        const leadNotes = String(l.notes || "");
                        if (leadAgentNorm && (leadAgentNorm === repNameNorm || leadAgentNorm === repSlugNorm)) return true;
                        if (leadRefNorm && (leadRefNorm === repSlugNorm || leadRefNorm === repNameNorm)) return true;
                        if (repNameNorm && repNameNorm.length >= 4 && leadNotes.includes(rep.name)) return true;
                        return false;
                      }).length;

                      const dispatchWhatsappMessage = () => {
                        const msg = `مرحباً بك يا ${rep.name} 🎓\nتم تجهيز وتفعيل بوابتك الخاصة لمتابعة تسجيلات الطلاب 💼:\n\n🔗 رابط بوابتك الشخصية:\n${portalUrl}\n\n🔐 رمز الدخول الخاص بك (PIN):\n${rep.pin || "1234"}\n\n📲 رابطك التسويقي لإرساله للطلاب للتسجيل من خلالك:\n${studentReferralUrl}\n\nنتمنى لك كل التوفيق والتميز! ✨`;
                        if (rep.phone) {
                          let digits = rep.phone.replace(/[^0-9]/g, "");
                          if (digits.startsWith("0020")) {
                            digits = digits.slice(2);
                          } else if (digits.startsWith("002")) {
                            digits = digits.slice(2);
                          } else if (digits.startsWith("01")) {
                            digits = "2" + digits;
                          } else if (digits.startsWith("1") && digits.length === 10) {
                            digits = "20" + digits;
                          }
                          window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, "_blank");
                        } else {
                          navigator.clipboard.writeText(msg);
                          toast.success("✓ تم نسخ رسالة بيانات الدخول وروابط الموظف إلى الحافظة!");
                        }
                      };

                      return (
                        <div
                          key={rep.id || rep.slug}
                          className="bg-slate-900/90 border border-indigo-400/30 hover:border-indigo-400/60 rounded-2xl p-4 space-y-3.5 transition-all shadow-md"
                        >
                          {/* Top Row: Name, PIN & Count */}
                          <div className="flex items-center justify-between border-b border-indigo-950 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-lg font-black text-amber-400">
                                👤
                              </div>
                              <div>
                                <h5 className="font-extrabold text-sm text-white">{rep.name}</h5>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[10px] text-indigo-300 font-bold">{rep.title || "مستشار القبول والتسجيل"}</p>
                                  {rep.phone && (
                                    <span className="text-[10px] text-emerald-400 font-mono font-bold" dir="ltr">
                                      📞 {rep.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {editingDevRepId === (rep.id || rep.slug) ? (
                                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-amber-400">
                                  <input
                                    type="text"
                                    value={editingDevPin}
                                    onChange={(e) => setEditingDevPin(e.target.value)}
                                    placeholder="الباسوورد الجديد"
                                    className="w-28 bg-slate-900 text-amber-300 px-2 py-0.5 text-xs font-mono font-bold rounded focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    disabled={isSavingDevPin}
                                    onClick={() => handleUpdateDevRepPin(rep)}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    ✓ حفظ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingDevRepId(null); setEditingDevPin(""); }}
                                    className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] rounded cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-mono font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    <span>PIN:</span>
                                    <span className="text-white bg-amber-500/30 px-1.5 py-0.5 rounded font-bold">{rep.pin || "1234"}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDevRepId(rep.id || rep.slug);
                                      setEditingDevPin(rep.pin || "");
                                    }}
                                    title="تعديل كلمة مرور هذا الموظف"
                                    className="p-1 text-amber-400 hover:text-amber-200 hover:bg-amber-400/20 rounded text-[11px] transition cursor-pointer"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )}
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1 rounded-lg">
                                {assignedCount} طالب 🎓
                              </span>
                            </div>
                          </div>

                          {/* Portal Link Box */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-300">
                              <span>🔗 رابط البوابة الخاصة بالموظف (لرؤية طلابه فقط):</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-indigo-900/80 rounded-xl p-1.5 px-2.5">
                              <span className="text-[11px] font-mono text-indigo-200 truncate flex-1 text-left" dir="ltr">
                                {portalUrl}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(portalUrl);
                                  toast.success(`✓ تم نسخ رابط بوابة (${rep.name})!`);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition cursor-pointer shrink-0"
                              >
                                نسخ الرابط 📋
                              </button>
                              <a
                                href={portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-indigo-200 text-[10px] font-bold rounded-lg transition shrink-0"
                              >
                                تجربة ↗️
                              </a>
                            </div>
                          </div>

                          {/* Student Referral Link Box */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300">
                              <span>📲 رابط تسجيل الطلاب المنسوب للموظف:</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-emerald-900/50 rounded-xl p-1.5 px-2.5">
                              <span className="text-[11px] font-mono text-emerald-200 truncate flex-1 text-left" dir="ltr">
                                {studentReferralUrl}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(studentReferralUrl);
                                  toast.success(`✓ تم نسخ رابط التسجيل المنسوب لـ (${rep.name})!`);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg transition cursor-pointer shrink-0"
                              >
                                نسخ 📋
                              </button>
                            </div>
                          </div>

                          {/* Actions Bar */}
                          <div className="flex items-center justify-between pt-1 border-t border-indigo-950/80">
                            <button
                              type="button"
                              onClick={dispatchWhatsappMessage}
                              className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                            >
                              <span>📲</span>
                              <span>{rep.phone ? `إرسال بيانات الدخول واتساب (${rep.phone})` : "نسخ رسالة الترحيب وبيانات الدخول"}</span>
                            </button>

                            {confirmDeleteRepKey === (rep.id || rep.slug || rep.name) ? (
                              <div className="flex items-center gap-1.5 animate-fadeIn">
                                <button
                                  type="button"
                                  disabled={isDeletingRepKey === (rep.id || rep.slug || rep.name)}
                                  onClick={() => handleDeleteDevSalesRep(rep.id || rep.slug, rep.name)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer shadow-sm flex items-center gap-1"
                                >
                                  {isDeletingRepKey === (rep.id || rep.slug || rep.name) ? (
                                    <span>جاري الحذف...</span>
                                  ) : (
                                    <span>تأكيد الحذف نهائياً ⚠️</span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeletingRepKey === (rep.id || rep.slug || rep.name)}
                                  onClick={() => setConfirmDeleteRepKey(null)}
                                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10.5px] rounded-lg transition cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRepKey(rep.id || rep.slug || rep.name)}
                                className="text-rose-400 hover:text-rose-300 text-[11px] font-bold p-1 transition cursor-pointer flex items-center gap-1 hover:bg-rose-950/30 rounded"
                                title="حذف هذا الموظف نهائياً"
                              >
                                <span>حذف الموظف 🗑️</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: SALES & MARKETING ANALYTICS LEADERBOARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      لوحة تحليلات أداء الموظفين والحملات (Lead Attribution Analytics)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-bold">
                      تحليل مباشر لجميع الطلاب المسجلين بقاعدة البيانات مصنفين حسب كود الموظف أو رابط الإعلان.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                  إجمالي الطلاب: {adminLeads.length}
                </span>
              </div>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الموظف / كود التتبع</th>
                      <th className="p-3 text-center">إجمالي المسجلين</th>
                      <th className="p-3 text-center">قيد الانتظار ⏳</th>
                      <th className="p-3 text-center">مؤكد / مقبول ✅</th>
                      <th className="p-3 text-center">حضر المقابلة 🏛️</th>
                      <th className="p-3">أبرز المحافظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-bold text-slate-800">
                    {(() => {
                      // Group leads by agentName
                      const agentMap: { [key: string]: { total: number; pending: number; confirmed: number; attended: number; govs: { [g: string]: number } } } = {};

                      adminLeads.forEach((lead: any) => {
                        let ag = (lead.agentName || lead.agent_name || "").trim();
                        if (!ag && lead.notes) {
                          const match = lead.notes.match(/الموظف\/الرابط:\s*([^|\]]+)/);
                          if (match && match[1]) ag = match[1].trim();
                        }
                        if (!ag) ag = "زيارة مباشرة (بدون موظف)";

                        if (!agentMap[ag]) {
                          agentMap[ag] = { total: 0, pending: 0, confirmed: 0, attended: 0, govs: {} };
                        }
                        agentMap[ag].total += 1;

                        const st = (lead.status || "pending").toLowerCase();
                        if (st === "pending") agentMap[ag].pending += 1;
                        else if (st === "confirmed" || st === "accepted") agentMap[ag].confirmed += 1;
                        else if (st === "attended" || st === "interviewed") agentMap[ag].attended += 1;

                        const gov = lead.governorate || "أخرى";
                        agentMap[ag].govs[gov] = (agentMap[ag].govs[gov] || 0) + 1;
                      });

                      const sortedAgents = Object.entries(agentMap).sort((a, b) => b[1].total - a[1].total);

                      if (sortedAgents.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                              لا توجد بيانات تسجيلات حتى الآن في قاعدة البيانات.
                            </td>
                          </tr>
                        );
                      }

                      return sortedAgents.map(([agent, stats], idx) => {
                        const topGov = Object.entries(stats.govs).sort((a, b) => b[1] - a[1])[0]?.[0] || "متنوع";
                        const isDirect = agent.includes("بدون موظف");

                        return (
                          <tr key={agent} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isDirect ? "bg-slate-400" : "bg-emerald-500"}`}></span>
                                <span className={`font-black ${isDirect ? "text-slate-600" : "text-indigo-950"}`}>
                                  {agent}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                {stats.total} طالب
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-amber-600">{stats.pending}</td>
                            <td className="p-3 text-center font-mono text-emerald-600">{stats.confirmed}</td>
                            <td className="p-3 text-center font-mono text-blue-600">{stats.attended}</td>
                            <td className="p-3 text-slate-500 font-normal">{topGov}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* QR CODE PREVIEW & DOWNLOAD MODAL */}
        {showQrModalUrl && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center animate-scale-up" dir="rtl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <h4 className="text-xs font-black text-slate-950">باركود QR مخصص للمطبوعات</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModalUrl(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1 text-right">
                <h5 className="text-xs font-black text-indigo-950">{showQrModalUrl.title}</h5>
                <p className="text-[10px] text-slate-500 font-bold">مسؤول المتابعة: {showQrModalUrl.agent}</p>
              </div>

              {/* QR Image */}
              <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(showQrModalUrl.url)}`}
                  alt="QR Code"
                  className="w-48 h-48 rounded-xl shadow-md bg-white p-2"
                />
                <span className="text-[10px] text-slate-400 font-mono mt-2 break-all max-h-12 overflow-hidden" dir="ltr">
                  {showQrModalUrl.url}
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(showQrModalUrl.url)}`}
                  download={`qr_agent_${Date.now()}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-[#0a2463] hover:bg-indigo-950 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل الصورة بجودة عالية 📥</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowQrModalUrl(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {feederSubTab === "leads" && (
          <div className="space-y-6 pt-2 animate-fade-in" dir="rtl">
            
            {/* Header inside Tab */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-right flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="text-lg">📋</span>
                  <span>كشوفات ومستندات طلبات الطلاب المسجلين بالمنصة</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-bold">
                  إدارة بيانات الطلاب المسجلين واستخراج تقارير التوزيع مباشرةً للمؤسسة الراعية والموزعين.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded-lg">
                  العدد الإجمالي بالخلاصة: <strong className="text-indigo-650 font-mono text-sm">{adminLeads.length}</strong> طالب
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("admin_authenticated", "true");
                      sessionStorage.setItem("admin_target_tab", "all");
                    }
                    onClose();
                    window.location.href = "/admin?tab=all";
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>فتح سجل الطلاب في لوحة الأدمن (265 طالب) 👨‍🎓⚙️</span>
                </button>
              </div>
            </div>

            {/* SECURE CSV EXPORT PANEL */}
            <div className="bg-[#0A2463] text-white rounded-3xl p-5 border border-indigo-950 shadow-md space-y-4 text-right">
              <div className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <div className="space-y-0.5">
                  <h5 className="font-extrabold text-xs sm:text-sm text-amber-300">مصدّر البيانات المركزي وتنزيل كشوفات الطلاب (Excel / CSV)</h5>
                  <p className="text-[10px] text-slate-200 font-bold leading-normal">
                    تحميل فوري لكافة سجلات الطلاب الجدد والمسجلين بصيغة Excel تدعم اللغة العربية 100%.
                  </p>
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-indigo-200">
                  <p className="font-bold text-white mb-1">تنزيل مباشر وشامل لكافة الطلاب:</p>
                  <p className="text-[10px]">كافة البيانات، الهواتف، الأكواد ومسؤولي المبيعات في ملف واحد جاهز للطباعة والترحيل.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href="/api/admin/export/students-excel"
                    download="students_database_excel.xlsx"
                    className="px-5 py-3 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/40"
                    title="ملف إكسيل حقيقي (.xlsx) يفتح فوراً في أعمدة منفصلة تماماً مثل سوبابيس وبدون تداخل"
                  >
                    <span>📗 تحميل كشف الطلاب Excel حقيقي (.xlsx) 📥</span>
                  </a>

                  <a
                    href="/api/admin/export/students-csv"
                    download="students_database.csv"
                    className="px-4 py-3 rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white/15 hover:bg-white/25 text-white active:scale-95 border border-white/20"
                    title="تنزيل بصيغة CSV للمنظومات والأنظمة الخارجية"
                  >
                    <span>📄 تحميل كشف (CSV)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* STUDENTS LEAD TABLE PREVIEW */}
            <div className="bg-white border border-slate-205 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-rose-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">📋 السجلات الحالية بقاعدة البيانات (مأخوذة من مراميز leads_db)</span>
                <span className="text-[10px] text-slate-500 font-mono">آخر تحديث مباشر</span>
              </div>
              
              {adminLeads.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold leading-relaxed">
                  <span className="text-3xl block mb-2">📥</span>
                  لم يتم رصد تسجيلات دخول بمحاكاة السيرفر المحلي حالياً.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-250">
                      <tr>
                        <th className="p-3.5 pr-4">اسم الطالب</th>
                        <th className="p-3.5">رقم الهاتف</th>
                        <th className="p-3.5">التخصص / الشعب المطلوبة</th>
                        <th className="p-3.5 pl-4">تاريخ التسجيل بالبوابة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {adminLeads.map((lead, idx) => {
                        const dateStr = lead.createdAt 
                          ? new Date(lead.createdAt).toLocaleDateString("ar-EG") 
                          : (lead.consentTimestamp ? new Date(lead.consentTimestamp).toLocaleDateString("ar-EG") : "غير محدد");
                        
                        const deptStr = Array.isArray(lead.selectedDepartments) 
                          ? lead.selectedDepartments.join(" | ") 
                          : (lead.selectedDepartments || lead.basicCourse || "عامة");

                        return (
                          <tr key={lead.id || idx} className="hover:bg-slate-50/80 transition-all font-sans">
                            <td className="p-3.5 pr-4 font-black text-slate-900">{lead.studentName || "مجهول الاسم"}</td>
                            <td className="p-3.5 font-mono font-bold text-slate-600">{lead.phoneNumber || "بلا هاتف"}</td>
                            <td className="p-3.5 text-indigo-650 font-bold">
                              <span className="inline-block bg-indigo-50 text-[#0f172a] text-[10px] px-2 py-1 rounded-md">
                                {deptStr}
                              </span>
                            </td>
                            <td className="p-3.5 pl-4 text-[10.5px] text-slate-400 font-bold">{dateStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {feederSubTab === "news_ads" && (
          <div className="space-y-6 pt-2 animate-fade-in text-right" dir="rtl">
            <div className="bg-gradient-to-r from-[#0a2463] to-slate-900 text-white rounded-3xl p-5 border border-indigo-950 shadow-md space-y-2">
              <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 justify-start">
                <span>📰 لوحة الأخبار الحصرية والمقالات والمساحات الإعلانية</span>
              </h4>
              <p className="text-[10.5px] text-slate-300 font-bold leading-relaxed font-sans">
                تتيح لك هذه اللوحة نشر أخبار حصرية وتحديثات المعاهد والجامعات وصور الفعاليات والأنشطة الطلابية فورياً، بالإضافة إلى التحكم الكامل بالمساحة الإعلانية الممولة المدمجة بصفحة الأخبار.
              </p>
            </div>

            {/* قسم التحكم وتخصيص عناوين صفحة الأخبار الفرعية */}
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-4 text-right">
              <h5 className="text-xs font-black text-[#0a2463] flex items-center gap-1.5 justify-start">
                <span>⚙️ التحكم في العناوين والنصوص لصفحة الأخبار</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-slate-700 font-bold">عنوان صفحة الأخبار الرئيسي:</label>
                  <input
                    type="text"
                    value={newsPageTitle}
                    onChange={(e) => setNewsPageTitle(e.target.value)}
                    placeholder="اكتب العنوان الرئيسي لصفحة الأخبار..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-slate-700 font-bold">العبارة الوصفية الفرعية (تحت العنوان):</label>
                  <textarea
                    value={newsPageSubtitle}
                    onChange={(e) => setNewsPageSubtitle(e.target.value)}
                    placeholder="اكتب الوصف أو العبارة التوجيهية التي تظهر أسفل العنوان مباشرة..."
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSavePageMeta}
                  className="px-5 py-2 bg-[#0a2463] hover:bg-slate-900 text-white font-extrabold text-[11px] rounded-xl cursor-pointer transition shadow-xs"
                >
                  حفظ العناوين والنصوص المحدثة 💾✓
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* NEWS CREATOR FORM (Left side on desktop - 7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="text-xs font-black text-[#0a2463] flex items-center gap-1.5 justify-start">
                    <span>✍️ صياغة ونشر مقال/خبر جديد</span>
                  </h5>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">تصنيف الخبر:</label>
                      <select
                        value={newsCategory}
                        onChange={(e) => setNewsCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="إعلانات رسمية 📣">إعلانات رسمية 📣</option>
                        <option value="توجيه مهني 🧭">توجيه مهني 🧭</option>
                        <option value="أخبار المعاهد 🏛️">أخبار المعاهد 🏛️</option>
                        <option value="أخبار الفعاليات والطلاب 🎓">أخبار الفعاليات والطلاب 🎓</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">وقت القراءة المقدر:</label>
                      <input
                        type="text"
                        value={newsReadTime}
                        onChange={(e) => setNewsReadTime(e.target.value)}
                        placeholder="مثال: قراءة في ٣ دقائق..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-600 font-bold">عنوان المقال/الخبر الرئيسي:</label>
                    <input
                      type="text"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      placeholder="اكتب عنواناً جذاباً ومختصراً للخبر..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-600 font-bold">نبذة أو مخلص قصير للخبر:</label>
                    <textarea
                      value={newsDesc}
                      onChange={(e) => setNewsDesc(e.target.value)}
                      placeholder="ملخص قصير للخبر يظهر في بطاقات التصفح بالبوابة الرئيسية..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-600 font-bold">محتوى الخبر المفصل:</label>
                    <textarea
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      placeholder="اكتب المقال أو الخبر بالكامل بالتفصيل هنا..."
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  {/* Dual Image Option: File Upload (compressed WebP) OR Direct URL + Dimensions Badge */}
                  <div className="space-y-2 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-[11px] text-slate-800 font-black flex items-center gap-1">
                        <span>📸 صورة الخبر / المقال:</span>
                      </label>
                      <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                        📐 المقاس الموصى به: 1200 × 630 px (نسبة 16:9)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {/* Option A: Upload File */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl p-2.5 cursor-pointer bg-white hover:bg-indigo-50/50 transition-all text-center">
                        <span className="text-lg">📁</span>
                        <span className="text-[10px] font-bold text-slate-700 mt-0.5">رفع صورة من الجهاز (ضغط WebP تلقائي)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedWebP = await compressAndConvertToWebP(file);
                                setNewsImage(compressedWebP);
                                toast.success("⚡ تم ضغط الصورة وتحويلها إلى صيغة WebP الخفيفة بنجاح!");
                              } catch (err) {
                                const reader = new FileReader();
                                reader.onloadend = () => setNewsImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                      </label>

                      {/* Option B: Direct Image URL */}
                      <div className="flex flex-col justify-center bg-white border border-slate-200 rounded-xl p-2 space-y-1">
                        <label className="text-[9.5px] font-bold text-slate-500 block">أو أدخل رابط الصورة مباشرة (URL):</label>
                        <input
                          type="text"
                          value={newsImage.startsWith("data:") ? "" : newsImage}
                          onChange={(e) => setNewsImage(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {newsImage && (
                      <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl mt-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img src={newsImage} alt="News preview" className="w-12 h-10 object-cover rounded-lg border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] text-slate-600 font-mono truncate">{newsImage.slice(0, 45)}...</span>
                            {newsImage.startsWith("data:image/webp") && (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded w-fit">
                                ⚡ صيغة WebP مضغوطة ومحسنة للسرعة
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewsImage("")}
                          className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-bold rounded-lg cursor-pointer transition shrink-0"
                        >
                          إزالة الصورة ✖
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Video Link Option (YouTube, Vimeo, MP4, WebM) */}
                  <div className="space-y-2 bg-indigo-50/60 border border-indigo-200/80 p-3 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-[11px] text-indigo-950 font-black flex items-center gap-1">
                        <span>🎬 إضافة رابط فيديو (اختياري - حفلات، آراء طلاب، فعاليات):</span>
                      </label>
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                        يوتيوب، فيميو، أو رابط فيديو MP4/WebM مباشر
                      </span>
                    </div>

                    <input
                      type="text"
                      value={newsVideo}
                      onChange={(e) => setNewsVideo(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... أو رابط فيديو MP4 مباشر"
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                      dir="ltr"
                    />

                    {newsVideo && (
                      <div className="bg-white p-2 rounded-xl border border-indigo-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                            <span>🎥 معاينة تشغيل الفيديو التفاعلية:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setNewsVideo("")}
                            className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-md cursor-pointer transition"
                          >
                            إزالة الفيديو ✖
                          </button>
                        </div>
                        {(() => {
                          const parsed = parseVideoMedia(newsVideo);
                          if (parsed.isYouTube) {
                            return (
                              <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                <iframe
                                  src={parsed.embedUrl}
                                  title="Video preview"
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            );
                          } else {
                            return (
                              <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-black flex items-center justify-center">
                                <video src={parsed.rawUrl} controls className="max-h-full max-w-full rounded-lg" />
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewsTitle("");
                        setNewsDesc("");
                        setNewsContent("");
                        setNewsImage("");
                        setNewsVideo("");
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      إلغاء وتفريغ
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNews}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                    >
                      نشر وحفظ الخبر الفوري 🚀✓
                    </button>
                  </div>
                </div>
              </div>

              {/* AD ADVERTISING CONFIG (Right side on desktop - 5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. RIGHT AD CONFIG */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-[#0A2463] flex items-center gap-1.5 justify-start">
                      <span>📢 إدارة المساحة الإعلانية (بنر اليمين)</span>
                    </h5>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-[#0A2463]/5 rounded-xl border border-[#0A2463]/10">
                      <span className="text-xs font-extrabold text-[#0A2463]">تفعيل وعرض إعلان اليمين:</span>
                      <input
                        type="checkbox"
                        checked={rightAdVisible}
                        onChange={(e) => setRightAdVisible(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">عنوان الإعلان الرئيسي:</label>
                      <input
                        type="text"
                        value={rightAdTitle}
                        onChange={(e) => setRightAdTitle(e.target.value)}
                        placeholder="مثال: إعلان ممول..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">وصف وجيز للإعلان:</label>
                      <input
                        type="text"
                        value={rightAdDesc}
                        onChange={(e) => setRightAdDesc(e.target.value)}
                        placeholder="مثال: سجل الآن واحصل على خصم..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">رابط التوجيه عند الضغط:</label>
                      <input
                        type="text"
                        value={rightAdLink}
                        onChange={(e) => setRightAdLink(e.target.value)}
                        placeholder="مثال: /registration-guide..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">نص زر الإعلان اليمين:</label>
                      <input
                        type="text"
                        value={rightAdBtnText}
                        onChange={(e) => setRightAdBtnText(e.target.value)}
                        placeholder="مثال: تواصل معنا 📞"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Dual Image Option: Right Ad */}
                    <div className="space-y-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10.5px] text-slate-700 font-black">صورة بنر الإعلان:</label>
                        <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">📐 600 × 400 px</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={rightAdImage.startsWith("data:") ? "" : rightAdImage}
                            onChange={(e) => setRightAdImage(e.target.value)}
                            placeholder="رابط الصورة المباشر (URL)..."
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-800"
                            dir="ltr"
                          />
                          <label className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-xs shrink-0">
                            رفع ملف 📁
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const webp = await compressAndConvertToWebP(file);
                                    setRightAdImage(webp);
                                  } catch {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setRightAdImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                        {rightAdImage && (
                          <div className="flex items-center justify-between bg-white p-1 rounded-lg border border-slate-200">
                            <img src={rightAdImage} alt="Right ad preview" className="w-10 h-8 object-cover rounded" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setRightAdImage("")}
                              className="text-red-600 text-[10px] font-bold px-1.5 py-0.5 hover:bg-red-50 rounded"
                            >
                              إزالة ✖
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveRightAd}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      حفظ إعلان اليمين 💾✓
                    </button>
                  </div>
                </div>

                {/* 2. LEFT AD CONFIG */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-[#dc2626] flex items-center gap-1.5 justify-start">
                      <span>📢 إدارة المساحة الإعلانية (بنر اليسار)</span>
                    </h5>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-red-500/5 rounded-xl border border-red-500/10">
                      <span className="text-xs font-extrabold text-red-900">تفعيل وعرض إعلان اليسار:</span>
                      <input
                        type="checkbox"
                        checked={leftAdVisible}
                        onChange={(e) => setLeftAdVisible(e.target.checked)}
                        className="w-4 h-4 text-red-600 accent-red-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">عنوان الإعلان الرئيسي:</label>
                      <input
                        type="text"
                        value={leftAdTitle}
                        onChange={(e) => setLeftAdTitle(e.target.value)}
                        placeholder="مثال: إعلان ممول..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">وصف وجيز للإعلان:</label>
                      <input
                        type="text"
                        value={leftAdDesc}
                        onChange={(e) => setLeftAdDesc(e.target.value)}
                        placeholder="مثال: سجل الآن واحصل على خصم..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">رابط التوجيه عند الضغط:</label>
                      <input
                        type="text"
                        value={leftAdLink}
                        onChange={(e) => setLeftAdLink(e.target.value)}
                        placeholder="مثال: /registration-guide..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">نص زر الإعلان اليسار:</label>
                      <input
                        type="text"
                        value={leftAdBtnText}
                        onChange={(e) => setLeftAdBtnText(e.target.value)}
                        placeholder="مثال: الموقع الرسمي 🔗"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Dual Image Option: Left Ad */}
                    <div className="space-y-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10.5px] text-slate-700 font-black">صورة بنر الإعلان:</label>
                        <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">📐 600 × 400 px</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={leftAdImage.startsWith("data:") ? "" : leftAdImage}
                            onChange={(e) => setLeftAdImage(e.target.value)}
                            placeholder="رابط الصورة المباشر (URL)..."
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-800"
                            dir="ltr"
                          />
                          <label className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-xs shrink-0">
                            رفع ملف 📁
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const webp = await compressAndConvertToWebP(file);
                                    setLeftAdImage(webp);
                                  } catch {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setLeftAdImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                        {leftAdImage && (
                          <div className="flex items-center justify-between bg-white p-1 rounded-lg border border-slate-200">
                            <img src={leftAdImage} alt="Left ad preview" className="w-10 h-8 object-cover rounded" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setLeftAdImage("")}
                              className="text-red-600 text-[10px] font-bold px-1.5 py-0.5 hover:bg-red-50 rounded"
                            >
                              إزالة ✖
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveLeftAd}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      حفظ إعلان اليسار 💾✓
                    </button>
                  </div>
                </div>

                {/* 3. CUSTOM HEADER BLOCKS CONFIG */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-amber-600 flex items-center gap-1.5 justify-start">
                      <span>✨ محتوى مخصص يمين ويسار عنوان الصفحة</span>
                    </h5>
                  </div>

                  <div className="space-y-4">
                    {/* Header Right */}
                    <div className="p-3 bg-amber-50/40 rounded-2xl border border-amber-200/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-[#0A2463]">المحتوى المخصص باليمين:</span>
                        <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">إعلان اليمين</span>
                      </div>
                      <select 
                        value={devHeaderRightType}
                        onChange={(e) => setDevHeaderRightType(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="none">مخفي / معطل</option>
                        <option value="text">نص فقط</option>
                        <option value="image">صورة فقط</option>
                        <option value="both">نص وصورة معاً</option>
                      </select>

                      {(devHeaderRightType === "text" || devHeaderRightType === "both") && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold block">نص الإعلان المخصص:</label>
                          <input
                            type="text"
                            value={devHeaderRightText}
                            onChange={(e) => setDevHeaderRightText(e.target.value)}
                            placeholder="اكتب النص هنا..."
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                          />
                        </div>
                      )}

                      {(devHeaderRightType === "image" || devHeaderRightType === "both") && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-700 font-bold block">رابط أو رفع الصورة الخلفية:</label>
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">📐 300 × 150 px</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={devHeaderRightImage}
                              onChange={(e) => setDevHeaderRightImage(e.target.value)}
                              placeholder="رابط الصورة المباشر أو ارفع ملف..."
                              className="flex-1 bg-white border border-[#3b82f6]/20 rounded-xl px-2 py-1.5 text-[10px] font-mono"
                              dir="ltr"
                            />
                            <label className="bg-[#0A2463] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-[#0A2463]/90 shrink-0">
                              رفع ملف 📁
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const webp = await compressAndConvertToWebP(file);
                                      setDevHeaderRightImage(webp);
                                    } catch {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setDevHeaderRightImage(reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Frame selection fields if image or both is chosen */}
                      {(devHeaderRightType === "image" || devHeaderRightType === "both") && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 font-bold block">شكل التأطير:</label>
                            <select
                              value={devHeaderRightHasFrame ? "true" : "false"}
                              onChange={(e) => setDevHeaderRightHasFrame(e.target.value === "true")}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold"
                            >
                              <option value="true">بإطار كما هي الآن 🖼️</option>
                              <option value="false">بدون إطار بشكل حر (صورة كاملة) 🔓</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 font-bold block">ستايل الإطار (15 خياراً):</label>
                            <select
                              value={devHeaderRightFrameStyle}
                              onChange={(e) => setDevHeaderRightFrameStyle(e.target.value)}
                              disabled={!devHeaderRightHasFrame}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                            >
                              <option value="no_frame">بدون إطار (حر لتظهر الصورة كاملة) 🔓</option>
                              <option value="dotted">منقط 🔗</option>
                              <option value="dashed">متقطع 🟠</option>
                              <option value="double">مزدوج 🟣</option>
                              <option value="neon_glow">توهج نيون ✨</option>
                              <option value="royal_gold">ظل ذهبي ملكي 👑</option>
                              <option value="rounded_navy">كحلي مدور 🌀</option>
                              <option value="glassmorphic">جلاسمورفيك 🧊</option>
                              <option value="smooth_3d">حدود ناعمة ثلاثية الأبعاد 🔳</option>
                              <option value="gradient_borders">حدود متدرجة 🌈</option>
                              <option value="thick_classic">كلاسيكية سميكة 🏛️</option>
                              <option value="floating_shadows">ظلال عائمة ☁️</option>
                              <option value="sharp_minimal">الحد الأدنى الحاد ⬛</option>
                              <option value="vintage_wave">موجة عتيقة 📜</option>
                              <option value="super_elegant">أنيق للغاية 🔮</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Text placement choice if "both" is chosen */}
                      {devHeaderRightType === "both" && (
                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] text-slate-600 font-bold block">موضع النص بالنسبة للصورة:</label>
                          <select
                            value={devHeaderRightTextPosition}
                            onChange={(e) => setDevHeaderRightTextPosition(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold"
                          >
                            <option value="below">تحت الصورة (الوضع الكلاسيكي) 👇</option>
                            <option value="above">فوق الصورة 👆</option>
                            <option value="right">يمين الصورة 👉</option>
                            <option value="left">يسار الصورة 👈</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Header Left */}
                    <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-200/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-[#0A2463]">المحتوى المخصص باليسار:</span>
                        <span className="text-[9px] bg-indigo-200 text-indigo-900 font-extrabold px-1.5 py-0.5 rounded">إعلان اليسار</span>
                      </div>
                      <select 
                        value={devHeaderLeftType}
                        onChange={(e) => setDevHeaderLeftType(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="none">مخفي / معطل</option>
                        <option value="text">نص فقط</option>
                        <option value="image">صورة فقط</option>
                        <option value="both">نص وصورة معاً</option>
                      </select>

                      {(devHeaderLeftType === "text" || devHeaderLeftType === "both") && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold block">نص الإعلان المخصص:</label>
                          <input
                            type="text"
                            value={devHeaderLeftText}
                            onChange={(e) => setDevHeaderLeftText(e.target.value)}
                            placeholder="اكتب النص هنا..."
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                          />
                        </div>
                      )}

                      {(devHeaderLeftType === "image" || devHeaderLeftType === "both") && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-700 font-bold block">رابط أو رفع الصورة الخلفية:</label>
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">📐 300 × 150 px</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={devHeaderLeftImage}
                              onChange={(e) => setDevHeaderLeftImage(e.target.value)}
                              placeholder="رابط الصورة المباشر أو ارفع ملف..."
                              className="flex-1 bg-white border border-[#3b82f6]/20 rounded-xl px-2 py-1.5 text-[10px] font-mono"
                              dir="ltr"
                            />
                            <label className="bg-[#0A2463] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-[#0A2463]/90 shrink-0">
                              رفع ملف 📁
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const webp = await compressAndConvertToWebP(file);
                                      setDevHeaderLeftImage(webp);
                                    } catch {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setDevHeaderLeftImage(reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Frame selection fields if image or both is chosen */}
                      {(devHeaderLeftType === "image" || devHeaderLeftType === "both") && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 font-bold block">شكل التأطير:</label>
                            <select
                              value={devHeaderLeftHasFrame ? "true" : "false"}
                              onChange={(e) => setDevHeaderLeftHasFrame(e.target.value === "true")}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold"
                            >
                              <option value="true">بإطار كما هي الآن 🖼️</option>
                              <option value="false">بدون إطار بشكل حر (صورة كاملة) 🔓</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 font-bold block">ستايل الإطار (15 خياراً):</label>
                            <select
                              value={devHeaderLeftFrameStyle}
                              onChange={(e) => setDevHeaderLeftFrameStyle(e.target.value)}
                              disabled={!devHeaderLeftHasFrame}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                            >
                              <option value="no_frame">بدون إطار (حر لتظهر الصورة كاملة) 🔓</option>
                              <option value="dotted">منقط 🔗</option>
                              <option value="dashed">متقطع 🟠</option>
                              <option value="double">مزدوج 🟣</option>
                              <option value="neon_glow">توهج نيون ✨</option>
                              <option value="royal_gold">ظل ذهبي ملكي 👑</option>
                              <option value="rounded_navy">كحلي مدور 🌀</option>
                              <option value="glassmorphic">جلاسمورفيك 🧊</option>
                              <option value="smooth_3d">حدود ناعمة ثلاثية الأبعاد 🔳</option>
                              <option value="gradient_borders">حدود متدرجة 🌈</option>
                              <option value="thick_classic">كلاسيكية سميكة 🏛️</option>
                              <option value="floating_shadows">ظلال عائمة ☁️</option>
                              <option value="sharp_minimal">الحد الأدنى الحاد ⬛</option>
                              <option value="vintage_wave">موجة عتيقة 📜</option>
                              <option value="super_elegant">أنيق للغاية 🔮</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Text placement choice if "both" is chosen */}
                      {devHeaderLeftType === "both" && (
                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] text-slate-600 font-bold block">موضع النص بالنسبة للصورة:</label>
                          <select
                            value={devHeaderLeftTextPosition}
                            onChange={(e) => setDevHeaderLeftTextPosition(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold"
                          >
                            <option value="below">تحت الصورة (الوضع الكلاسيكي) 👇</option>
                            <option value="above">فوق الصورة 👆</option>
                            <option value="right">يمين الصورة 👉</option>
                            <option value="left">يسار الصورة 👈</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveHeaderWidgets}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      مزامنة محتويات الترويسة المخصصة 💾✓
                    </button>
                  </div>
                </div>

                {/* 4. TICKER CUSTOM SETTINGS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-red-600 flex items-center gap-1.5 justify-start">
                      <span>⚡ إدارة شريط الأخبار التمريري (عاجل)</span>
                    </h5>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">مصدر محتوى الشريط التمريري:</label>
                      <select 
                        value={devTickerType}
                        onChange={(e) => setDevTickerType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="auto">تلقائي (عرض عناوين الأخبار المنشورة)</option>
                        <option value="custom">مخصص (كتابة نص مخصص بالكامل)</option>
                      </select>
                    </div>

                    {devTickerType === "custom" && (
                      <div className="space-y-1">
                        <label className="block text-[11px] text-slate-600 font-bold">النص المخصص لعرضه في شريط عاجل:</label>
                        <textarea
                          rows={2}
                          value={devTickerCustomText}
                          onChange={(e) => setDevTickerCustomText(e.target.value)}
                          placeholder="اكتب هنا ما تريده ممرراً في شريط عاجل..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveTickerSettings}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      تحديث وحفظ شريط عاجل ⚡✓
                    </button>
                  </div>
                </div>

                {/* 5. SIDEBAR CUSTOM BOX */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-[#0A2463] flex items-center gap-1.5 justify-start">
                      <span>📦 إدارة الصندوق التعريفي الجانبي المخصص</span>
                    </h5>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-[#0A2463]/5 rounded-xl border border-[#0A2463]/10">
                      <span className="text-xs font-extrabold text-[#0A2463]">عرض الصندوق الجانبي باليسار:</span>
                      <input
                        type="checkbox"
                        checked={devCustomBoxVisible}
                        onChange={(e) => setDevCustomBoxVisible(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-bold">أيقونة/إيموجي:</label>
                        <input
                          type="text"
                          value={devCustomBoxEmoji}
                          onChange={(e) => setDevCustomBoxEmoji(e.target.value)}
                          placeholder="📢"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-center"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-bold">عنوان الصندوق الجانبي:</label>
                        <input
                          type="text"
                          value={devCustomBoxTitle}
                          onChange={(e) => setDevCustomBoxTitle(e.target.value)}
                          placeholder="تنويه هام للطلاب..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-bold">محتوى ونص الصندوق:</label>
                      <textarea
                        rows={3}
                        value={devCustomBoxText}
                        onChange={(e) => setDevCustomBoxText(e.target.value)}
                        placeholder="اكتب هنا محتوى وتفاصيل التنويه أو التوضيح..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-slate-600 font-bold">اسم الزر (اختياري):</label>
                        <input
                          type="text"
                          value={devCustomBoxBtnText}
                          onChange={(e) => setDevCustomBoxBtnText(e.target.value)}
                          placeholder="مثال: دليل التقديم..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-slate-600 font-bold">رابط الزر (اختياري):</label>
                        <input
                          type="text"
                          value={devCustomBoxBtnUrl}
                          onChange={(e) => setDevCustomBoxBtnUrl(e.target.value)}
                          placeholder="مثال: /registration-guide..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveCustomBox}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      تحديث وحفظ الصندوق الجانبي 📦✓
                    </button>
                  </div>
                </div>

                {/* MANAGE CURRENT NEWS LIST */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h5 className="text-xs font-black text-slate-900">📑 الأخبار والفعاليات المنشورة حالياً:</h5>
                    <span className="text-[10px] font-mono font-black text-[#0a2463] bg-indigo-50 px-2 rounded-full">
                      العدد: {newsList.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {newsList.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-6">
                        لا توجد أخبار منشورة حالياً.
                      </p>
                    ) : (
                      newsList.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3 text-right">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-block text-[9px] text-[#0a2463] font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                {item.category}
                              </span>
                              {item.imageUrl && (
                                <span className="text-[9px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded-md">
                                  📸 صورة WebP
                                </span>
                              )}
                              {item.videoUrl && (
                                <span className="text-[9px] text-red-600 bg-red-50 font-bold px-1.5 py-0.5 rounded-md">
                                  🎬 فيديو
                                </span>
                              )}
                            </div>
                            <h6 className="text-xs font-black text-slate-900 truncate">{item.title}</h6>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(item.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 border border-rose-100"
                          >
                            حذف 🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-150 p-4 shrink-0 flex justify-end gap-2 px-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            إغلاق اللوحة 닫기
          </button>
        </div>

      </div>

      {/* 🏛️ CRITICAL SECURITY MODAL OVERLAY FOR PASSWORDS */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-205 p-6 space-y-4 text-right animate-scale-up" dir="rtl">
            <div className="flex items-center gap-2.5 text-rose-650 border-b border-slate-100 pb-3">
              <span className="text-xl">🔐</span>
              <strong className="text-sm font-black text-slate-950">المصادقة الأمنية للمطور</strong>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 font-extrabold leading-relaxed">
                {deleteType === "department" 
                  ? "⚠️ تنبيه حرج: أنت على وشك حذف تخصص دراسي بأكمله من قاعدة البيانات وبوابات الحجز للطلاب. يُرجى تأكيد العملية بإدخال كلمة مرور الحماية:"
                  : "⚠️ تنبيه حرج: أنت على وشك حذف مستند كراسة تحميل وإلغاء خيار تنزيلها وبوابات مطابقتها فوراً. يُرجى تأكيد العملية بإدخال كلمة مرور الحماية:"
                }
              </p>

              <input
                type="password"
                required
                placeholder="أدخل باسوورد المطور (Mm151997)..."
                value={securityPassword}
                onChange={(e) => setSecurityPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSecurityConfirm();
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center text-xs font-mono font-bold tracking-widest text-[#0a2463] focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              />

              {securityError && (
                <p className="text-[10px] text-rose-600 font-extrabold text-center leading-normal">
                  ❌ {securityError}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSecurityConfirm}
                className="flex-1 py-2.5 bg-[#dc2626] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition shadow-md"
              >
                تأكيد الحذف 🗑️
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSecurityModal(false);
                  setDeleteId(null);
                  setSecurityPassword("");
                  setSecurityError("");
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl cursor-pointer transition"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
