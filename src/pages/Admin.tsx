import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { supabase, hasSupabase } from "../supabaseClient";
import { saveSiteConfig, isAiGeneratedPost } from "../utils/configSync";
import { ACADEMY_DEPARTMENTS, Department } from "../data";
import { LOCAL_IMAGES, DEPARTMENT_DEFAULT_IMAGES } from "../assets/images";
import ExecutiveReportModal from "../components/ExecutiveReportModal";
import { StudentMessagingModal, StudentLeadForMessage } from "../components/StudentMessagingModal";
import { getStudentSlaInfo } from "../utils/slaUtils";
import { studentMessages, DEFAULT_DISCOUNT_CODE } from "../utils/messages";
import { checkAdminPasscode } from "../data/branchesData";
import { MASTER_ADMIN_PASSWORDS, isMasterAdminPasswordValid } from "../config/adminSecurity";
import { initialLeads } from "../data/initialStudents";
import { normalizeAndDeduplicateLeads } from "../lib/leadUtils";
import { ImportFromGoogleSheetsModal } from "../components/ImportFromGoogleSheetsModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import {
  Lock,
  X,
  Check,
  Users,
  Search,
  BookOpen,
  Compass,
  ShieldAlert,
  Award,
  Globe,
  Trash2,
  Settings2,
  ArrowRightLeft,
  Phone,
  MessageCircle,
  Copy,
  MapPin,
  Calendar,
  Sparkles,
  Clock,
  Volume2,
  VolumeX,
  RefreshCw,
  Bell,
  Ticket,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  LogOut,
  AlertTriangle,
  User,
  HeartHandshake,
  Briefcase,
  Star,
  Megaphone,
  MessageSquare,
  Edit3,
  UserPlus,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Send,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";

interface Lead {
  id: string;
  reservationCode: string;
  studentName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  graduationYear?: string;
  governorate?: string;
  educationLevel: string;
  basicCourse?: string;
  selectedDepartments: string[];
  notes: string;
  date: string;
  timestamp: number;
  expiresAt: string;
  status: "pending" | "completed" | "no_reply";
  agentName?: string;
  specialization?: string;
  academyName?: string;
  internalNotes?: string;
  reassignedTimestamp?: number;
  reassignedDateStr?: string;
  updatedAt?: number;
}

interface CallbackRequest {
  id: string;
  phoneNumber: string;
  studentName?: string;
  date: string;
  status: "pending" | "completed" | "no_reply";
  agentName?: string;
  internalNotes?: string;
}

interface Complaint {
  id: string;
  studentName: string;
  phoneNumber: string;
  type: "complaint" | "suggestion";
  text: string;
  date: string;
}

export function formatEgyptDateTime(d: Date | number = new Date()): string {
  const dateObj = typeof d === "number" ? new Date(d) : (d instanceof Date ? d : new Date(d));
  if (isNaN(dateObj.getTime())) return "غير محدد";

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    };
    const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(dateObj);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const ampm = (map.dayPeriod || "").toUpperCase() === "PM" ? "م" : "ص";
    return `${map.year}/${map.month}/${map.day} - ${map.hour}:${map.minute}:${map.second} ${ampm} (بتوقيت مصر)`;
  } catch {
    // Mathematical fallback for Egypt time:
    // Egypt is UTC+3 in summer (May through Oct), UTC+2 in winter (Nov through April)
    const month = dateObj.getUTCMonth() + 1;
    const offsetHours = (month >= 5 && month <= 10) ? 3 : 2;
    const egDate = new Date(dateObj.getTime() + offsetHours * 3600000);
    const y = egDate.getUTCFullYear();
    const mo = String(egDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(egDate.getUTCDate()).padStart(2, "0");
    let h = egDate.getUTCHours();
    const ampm = h >= 12 ? "م" : "ص";
    h = h % 12 || 12;
    const hStr = String(h).padStart(2, "0");
    const min = String(egDate.getUTCMinutes()).padStart(2, "0");
    const sec = String(egDate.getUTCSeconds()).padStart(2, "0");
    return `${y}/${mo}/${day} - ${hStr}:${min}:${sec} ${ampm} (بتوقيت مصر)`;
  }
}

export default function Admin() {
  const navigate = useNavigate();
  
  // Security Verification State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_authenticated") === "true";
    }
    return false;
  });
  const [adminPinInput, setAdminPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Google Sheets Management State
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [customSheetUrl, setCustomSheetUrl] = useState("");
  const [isSavingSheetUrl, setIsSavingSheetUrl] = useState(false);
  const [isSyncingAllSheets, setIsSyncingAllSheets] = useState(false);
  const [sheetSyncFeedback, setSheetSyncFeedback] = useState<string | null>(null);
  const [currentSheetConfig, setCurrentSheetConfig] = useState<{
    googleSheetUrl: string;
    isCustom: boolean;
    totalStudents: number;
  } | null>(null);

  const fetchGoogleSheetsConfig = async () => {
    try {
      const res = await fetch("/api/google-sheets/config");
      const data = await res.json();
      if (data.success) {
        setCurrentSheetConfig(data);
        if (data.googleSheetUrl) {
          setCustomSheetUrl(data.googleSheetUrl);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGoogleSheetsConfig();
    }
  }, [isAuthenticated]);

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
    window.addEventListener("supabase_status_updated", checkStatus);
    return () => {
      window.removeEventListener("supabase_status_updated", checkStatus);
    };
  }, []);

  // Administrative Main Data Lists
  const [adminLeads, setAdminLeads] = useState<Lead[]>(() => {
    let tombstoneIds = new Set<string>();
    let tombstonePhones = new Set<string>();
    if (typeof window !== "undefined") {
      try {
        const rawStored = localStorage.getItem("academy_deleted_lead_identifiers");
        if (rawStored) {
          const deletedList: string[] = JSON.parse(rawStored);
          tombstoneIds = new Set(deletedList.map(s => String(s).trim().toLowerCase()));
          deletedList.forEach(s => {
            const d = String(s).replace(/\D/g, "");
            if (d.length >= 6) {
              tombstonePhones.add(d);
              if (d.startsWith("201") && d.length === 12) tombstonePhones.add(d.substring(1));
              if (d.startsWith("00201") && d.length === 14) tombstonePhones.add(d.substring(3));
            }
          });
        }
      } catch {}

      const filterByTombstones = (list: any[]) => {
        return list.filter((l: any) => {
          const idVal = String(l.id || "").trim().toLowerCase();
          const codeVal = String(l.reservationCode || "").trim().toLowerCase();
          const nameVal = String(l.studentName || "").trim().toLowerCase();
          if (idVal && tombstoneIds.has(idVal)) return false;
          if (codeVal && tombstoneIds.has(codeVal)) return false;
          if (nameVal && tombstoneIds.has(nameVal)) return false;

          const phoneDigits = String(l.phoneNumber || l.whatsappNumber || "").replace(/\D/g, "");
          if (phoneDigits.length >= 6) {
            if (tombstonePhones.has(phoneDigits)) return false;
            if (phoneDigits.startsWith("201") && phoneDigits.length === 12 && tombstonePhones.has(phoneDigits.substring(1))) return false;
            if (phoneDigits.startsWith("00201") && phoneDigits.length === 14 && tombstonePhones.has(phoneDigits.substring(3))) return false;
          }
          return true;
        });
      };

      try {
        const cached = localStorage.getItem("admin_leads_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const deduped = normalizeAndDeduplicateLeads(parsed) as unknown as Lead[];
            return filterByTombstones(deduped);
          }
        }
      } catch (e) {}

      // Filter baseline by tombstones as well so deleted students never appear on initial render
      const baseline = normalizeAndDeduplicateLeads(initialLeads) as unknown as Lead[];
      return filterByTombstones(baseline);
    }
    const baseline = normalizeAndDeduplicateLeads(initialLeads) as unknown as Lead[];
    return baseline;
  });
  const [adminCallbacks, setAdminCallbacks] = useState<CallbackRequest[]>([]);
  const [adminComplaints, setAdminComplaints] = useState<Complaint[]>([]);
  const [adminPdfLeads, setAdminPdfLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Real registered students counter state & animation
  const realTotalStudentsCount = adminLeads.length;
  const [animatedAdminTotalLeadsCount, setAnimatedAdminTotalLeadsCount] = useState(0);
  const adminCounterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let observer: IntersectionObserver;

    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              let startTime: number | null = null;
              const duration = 1500;

              const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing outQuad
                const ease = progress * (2 - progress);

                setAnimatedAdminTotalLeadsCount(Math.round(ease * realTotalStudentsCount));

                if (progress < 1) {
                  animationFrameId = requestAnimationFrame(animate);
                }
              };

              cancelAnimationFrame(animationFrameId);
              animationFrameId = requestAnimationFrame(animate);
            } else {
              setAnimatedAdminTotalLeadsCount(realTotalStudentsCount);
            }
          });
        },
        { threshold: 0.1 }
      );

      if (adminCounterRef.current) {
        observer.observe(adminCounterRef.current);
      }
    } else {
      setAnimatedAdminTotalLeadsCount(realTotalStudentsCount);
    }

    return () => {
      if (observer) observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [realTotalStudentsCount]);

  // Active Filter Tabs
  type TabType = 
    | "all" 
    | "new" 
    | "completed" 
    | "no_reply" 
    | "callbacks" 
    | "pdf_leads"
    | "complaints" 
    | "stats" 
    | "alert_config" 
    | "sales_performance" 
    | "parent_registrations"
    | "free_shadowing_tickets"
    | "partnerships_and_hiring"
    | "live_tracker_manager"
    | "pdf_library"
    | "department_manager"
    | "academy_portals";
  const [activeFilterTab, setActiveFilterTab] = useState<TabType>("all");
  const [partnerAcademiesList, setPartnerAcademiesList] = useState<{ name: string; studentCount: number }[]>([]);
  const [newAcademyNameInput, setNewAcademyNameInput] = useState<string>("");
  const [copiedAcademyName, setCopiedAcademyName] = useState<string | null>(null);
  const [pdfSettings, setPdfSettings] = useState<Record<string, string>>({});
  const [pdfSettingsLoading, setPdfSettingsLoading] = useState(false);
  // Sales reps detailed state with localStorage caching
  const [salesRepsDetailed, setSalesRepsDetailed] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("admin_sales_reps_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [editingRepPinId, setEditingRepPinId] = useState<string | null>(null);
  const [newPinValue, setNewPinValue] = useState<string>("");
  const [savingPinId, setSavingPinId] = useState<string | null>(null);
  const [confirmDeleteRepId, setConfirmDeleteRepId] = useState<string | null>(null);
  const [deletingRepId, setDeletingRepId] = useState<string | null>(null);
  const [showAddRepModal, setShowAddRepModal] = useState<boolean>(false);
  const [newRepName, setNewRepName] = useState<string>("");
  const [newRepSlug, setNewRepSlug] = useState<string>("");
  const [newRepPhone, setNewRepPhone] = useState<string>("");
  const [newRepTitle, setNewRepTitle] = useState<string>("مستشار القبول والتسجيل والمبيعات");
  const [newRepPin, setNewRepPin] = useState<string>("1234");
  const [isAddingRep, setIsAddingRep] = useState<boolean>(false);

  // Round-Robin automated sales distribution state
  const [roundRobinData, setRoundRobinData] = useState<{
    enabled: boolean;
    lastIndex: number;
    lastAssignedAgentName: string;
    lastAssignedAt: string;
    activeRepsCount: number;
    totalRepsCount: number;
    nextAgentName: string;
    repsQueue?: Array<{ id: string; name: string; slug: string; isNext: boolean; isLast: boolean }>;
  } | null>(null);
  const [isTogglingRoundRobin, setIsTogglingRoundRobin] = useState<boolean>(false);

  const fetchRoundRobinStatus = async () => {
    try {
      const res = await fetch("/api/admin/round-robin");
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          setRoundRobinData(data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch round robin status:", e);
    }
  };

  // States for Sidebar Ads Customization
  const [adminRightAd, setAdminRightAd] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_news_ad_right_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            visible: parsed.visible !== false,
            title: parsed.title || "مساحة إعلانية",
            description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
            linkUrl: parsed.linkUrl || "/registration-guide",
            imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1525921429571-473b94195b9d?q=80&w=600&auto=format&fit=crop",
            btnText: parsed.btnText || "تواصل معنا 📞",
            hasFrame: parsed.hasFrame !== false,
            mode: parsed.mode || "image_and_text",
            textPosition: parsed.textPosition || "below",
            frameStyle: parsed.frameStyle || "default"
          };
        } catch (e) {}
      }
    }
    return {
      visible: true,
      title: "مساحة إعلانية",
      description: "احجز مقعدك الدراسي الآن لضمان مستقبلك المهني الأفضل.",
      linkUrl: "/registration-guide",
      imageUrl: "https://images.unsplash.com/photo-1525921429571-473b94195b9d?q=80&w=600&auto=format&fit=crop",
      btnText: "تواصل معنا 📞",
      hasFrame: true,
      mode: "image_and_text",
      textPosition: "below",
      frameStyle: "default"
    };
  });

  const [adminLeftAd, setAdminLeftAd] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_news_ad_left_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            visible: parsed.visible !== false,
            title: parsed.title || "مساحة إعلانية",
            description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
            linkUrl: parsed.linkUrl || "/registration-guide",
            imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
            btnText: parsed.btnText || "الموقع الرسمي 🔗",
            hasFrame: parsed.hasFrame !== false,
            mode: parsed.mode || "image_and_text",
            textPosition: parsed.textPosition || "below",
            frameStyle: parsed.frameStyle || "default"
          };
        } catch (e) {}
      }
    }
    return {
      visible: true,
      title: "مساحة إعلانية",
      description: "حقق حلمك مع كبرى برامج التعليم والتدريب الفني المعتمد.",
      linkUrl: "/registration-guide",
      imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
      btnText: "الموقع الرسمي 🔗",
      hasFrame: true,
      mode: "image_and_text",
      textPosition: "below",
      frameStyle: "default"
    };
  });

  const handleSaveAdsConfig = () => {
    saveSiteConfig("custom_news_ad_right_v2", adminRightAd);
    saveSiteConfig("custom_news_ad_left_v2", adminLeftAd);
    toast.success("تم حفظ وتحديث تصميم الإعلانات الجانبية للبوابة بنجاح! 🎉");
  };

  // States for Department Customization and Image Management
  const [adminAcademyDepartments, setAdminAcademyDepartments] = useState<any[]>(() => {
    const saved = localStorage.getItem("custom_academy_departments_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error parsing custom_academy_departments_v1 in Admin initial state", e);
      }
    }
    return ACADEMY_DEPARTMENTS;
  });

  const handleUpdateDepartmentImage = (deptId: string, imageUrl: string) => {
    const updated = adminAcademyDepartments.map(dept => {
      if (dept.id === deptId) {
        return { ...dept, imageUrl: imageUrl };
      }
      return dept;
    });
    setAdminAcademyDepartments(updated);
  };

  const handleDeleteDepartmentImage = (deptId: string) => {
    const updated = adminAcademyDepartments.map(dept => {
      if (dept.id === deptId) {
        const copy = { ...dept };
        delete copy.imageUrl;
        return copy;
      }
      return dept;
    });
    setAdminAcademyDepartments(updated);
    saveSiteConfig("custom_academy_departments_v1", updated);
    toast.success("تم حذف الصورة المخصصة وإرجاع الصورة الافتراضية بنجاح! 🗑️");
  };

  const handleSaveDepartmentsConfig = () => {
    saveSiteConfig("custom_academy_departments_v1", adminAcademyDepartments);
    toast.success("تم حفظ وتحديث صور وإعدادات التخصصات بنجاح! 🖼️");
  };

  // States for PDF Digital Library File Manager
  const [pdfLibraryList, setPdfLibraryList] = useState<any[]>([]);
  const [libraryFormId, setLibraryFormId] = useState<string>("");
  const [libraryFormName, setLibraryFormName] = useState<string>("");
  const [libraryFormUrl, setLibraryFormUrl] = useState<string>("");
  const [libraryFormSpecialization, setLibraryFormSpecialization] = useState<string>("الدليل الشامل 2026");
  const [libraryUploadProgress, setLibraryUploadProgress] = useState<string>("");
  const [libraryIsSaving, setLibraryIsSaving] = useState<boolean>(false);

  const [simulatedTickerActive, setSimulatedTickerActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_simulated_ticker_active") !== "false";
    }
    return true;
  });

  const handleToggleSimulatedTicker = () => {
    const newVal = !simulatedTickerActive;
    setSimulatedTickerActive(newVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("academy_simulated_ticker_active", newVal.toString());
      // Dispatch storage event so other components receive notification immediately
      window.dispatchEvent(new StorageEvent("storage", { key: "academy_simulated_ticker_active", newValue: newVal.toString() }));
    }
  };

  // Local storage synchronized states for the 4 data receiver tables
  const [parentInquiries, setParentInquiries] = useState<any[]>([]);
  const [shadowTickets, setShadowTickets] = useState<any[]>([]);
  const [partnershipLeads, setPartnershipLeads] = useState<any[]>([]);
  const [liveTrackerStatusMap, setLiveTrackerStatusMap] = useState<{ [key: string]: string }>({});

  // States for Content Config Panel
  const [jobVacancies, setJobVacancies] = useState<string[]>([]);
  const [newJobText, setNewJobText] = useState("");

  const [roiConstants, setRoiConstants] = useState<any>({
    computers: { name: "", salary: 0, careerPct: "", role: "" },
    medical: { name: "", salary: 0, careerPct: "", role: "" },
    labs: { name: "", salary: 0, careerPct: "", role: "" },
    office: { name: "", salary: 0, careerPct: "", role: "" }
  });

  const [studentTestimonials, setStudentTestimonials] = useState<any[]>([]);
  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewDept, setNewReviewDept] = useState("");
  const [newReviewGov, setNewReviewGov] = useState("الدقهلية");
  const [newReviewStars, setNewReviewStars] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");

  const loadLocalStorageTables = () => {
    if (typeof window !== "undefined") {
      const parents = JSON.parse(localStorage.getItem("academy_parent_inquiries") || "[]");
      const tickets = JSON.parse(localStorage.getItem("academy_shadow_tickets") || "[]");
      const partnerships = JSON.parse(localStorage.getItem("academy_business_leads") || "[]");
      const statusMap = JSON.parse(localStorage.getItem("academy_live_tracker_status") || "{}");

      setParentInquiries(parents);
      setShadowTickets(tickets);
      setPartnershipLeads(partnerships);
      setLiveTrackerStatusMap(statusMap);

      // Job Vacancies Ticker Loader
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
        setJobVacancies(JSON.parse(savedJobs));
      } else {
        setJobVacancies(defaultAnnouncements);
      }

      // ROI Constants
      const defaultRoi = {
        computers: {
          name: "البرمجة والذكاء الاصطناعي (نظم معلومات) 💻",
          salary: 13000,
          careerPct: "طلب بنسبة %97 في السوق",
          role: "مطور برمجيات وفني قواعد بيانات ونظم ذكاء اصطناعي وتطبيقات الويب"
        },
        medical: {
          name: "تحاليل طبية وأشعة (مساعد خدمات صحية) 🧪",
          salary: 11000,
          careerPct: "طلب بنسبة %96 في السوق",
          role: "مساعد فني بمعامل التحاليل الطبية ومراكز الأشعة والتشخيص المعتمدة"
        },
        labs: {
          name: "مساحة وخرائط 🗺️",
          salary: 12000,
          careerPct: "طلب بنسبة %94 في السوق",
          role: "فني مساحي ورسام مخططات هندسية بشركات المقاولات والإنشاءات الكبرى"
        },
        office: {
          name: "بترول وبتروكيماويات 🛢️",
          salary: 15000,
          careerPct: "طلب بنسبة %95 في السوق",
          role: "فني تشغيل وتنقيب قطاع البترول والغاز والبتروكيماويات بمواقع الإنتاج"
        }
      };
      const savedRoi = localStorage.getItem("custom_roi_calculator_constants_v1");
      if (savedRoi) {
        setRoiConstants(JSON.parse(savedRoi));
      } else {
        setRoiConstants(defaultRoi);
      }

      // Reviews
      const defaultReviews = [
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
      const savedReviews = localStorage.getItem("custom_student_reviews");
      if (savedReviews) {
        setStudentTestimonials(JSON.parse(savedReviews));
      } else {
        setStudentTestimonials(defaultReviews);
      }
    }
  };

  const loadAdminAds = () => {
    if (typeof window !== "undefined") {
      const savedRight = localStorage.getItem("custom_news_ad_right_v2");
      if (savedRight) {
        try {
          const parsed = JSON.parse(savedRight);
          setAdminRightAd({
            visible: parsed.visible !== false,
            title: parsed.title || "مساحة إعلانية",
            description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
            linkUrl: parsed.linkUrl || "/registration-guide",
            imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1525921429571-473b94195b9d?q=80&w=600&auto=format&fit=crop",
            btnText: parsed.btnText || "تواصل معنا 📞",
            hasFrame: parsed.hasFrame !== false,
            mode: parsed.mode || "image_and_text",
            textPosition: parsed.textPosition || "below",
            frameStyle: parsed.frameStyle || "default"
          });
        } catch (e) {}
      }
      const savedLeft = localStorage.getItem("custom_news_ad_left_v2");
      if (savedLeft) {
        try {
          const parsed = JSON.parse(savedLeft);
          setAdminLeftAd({
            visible: parsed.visible !== false,
            title: parsed.title || "مساحة إعلانية",
            description: parsed.description || "سجل الآن لضمان مقعدك الدراسي في التخصصات الأكثر طلباً بسوق العمل والحصول على المزايا الخاصة.",
            linkUrl: parsed.linkUrl || "/registration-guide",
            imageUrl: parsed.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
            btnText: parsed.btnText || "الموقع الرسمي 🔗",
            hasFrame: parsed.hasFrame !== false,
            mode: parsed.mode || "image_and_text",
            textPosition: parsed.textPosition || "below",
            frameStyle: parsed.frameStyle || "default"
          });
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    loadLocalStorageTables();
    loadAdminAds();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleRefresh = () => {
      loadLocalStorageTables();
      loadAdminNews();
      loadAdminAds();
      
      // Reload academy departments in state from localStorage
      const savedDepts = localStorage.getItem("custom_academy_departments_v1");
      if (savedDepts) {
        try {
          const parsed = JSON.parse(savedDepts);
          if (Array.isArray(parsed)) {
            setAdminAcademyDepartments(parsed);
          }
        } catch (e) {
          console.error("Error reloading synced departments:", e);
        }
      }
    };
    window.addEventListener("news_posts_updated", handleRefresh);
    window.addEventListener("news_ad_updated", handleRefresh);
    window.addEventListener("reviews_updated", handleRefresh);
    window.addEventListener("student_reviews_updated", handleRefresh);
    window.addEventListener("academy_prompt_updated", handleRefresh);
    window.addEventListener("departments_updated", handleRefresh);
    window.addEventListener("roi_constants_updated", handleRefresh);
    window.addEventListener("job_announcements_updated", handleRefresh);
    window.addEventListener("news_page_meta_updated", handleRefresh);
    return () => {
      window.removeEventListener("news_posts_updated", handleRefresh);
      window.removeEventListener("news_ad_updated", handleRefresh);
      window.removeEventListener("reviews_updated", handleRefresh);
      window.removeEventListener("student_reviews_updated", handleRefresh);
      window.removeEventListener("academy_prompt_updated", handleRefresh);
      window.removeEventListener("departments_updated", handleRefresh);
      window.removeEventListener("roi_constants_updated", handleRefresh);
      window.removeEventListener("job_announcements_updated", handleRefresh);
      window.removeEventListener("news_page_meta_updated", handleRefresh);
    };
  }, []);

  // News Manager CRUD system & default articles
  const DEFAULT_NEWS_POSTS: any[] = [];

  const [adminNewsPosts, setAdminNewsPosts] = useState<any[]>([]);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostDesc, setNewPostDesc] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("توجيه أكاديمي 🧭");
  const [newPostReadTime, setNewPostReadTime] = useState("");
  const [newPostContent, setNewPostContent] = useState("");

  const loadAdminNews = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_news_posts_v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((p: any) => !isAiGeneratedPost(p));
            setAdminNewsPosts(clean);
            localStorage.setItem("custom_news_posts_v1", JSON.stringify(clean));
            return;
          }
        } catch (e) {}
      }
      setAdminNewsPosts([]);
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostDesc.trim() || !newPostContent.trim()) {
      alert("يرجى ملء كافة الخانات المطلوبة لنشر المقال بنجاح!");
      return;
    }
    const newPost = {
      id: String(Date.now()),
      title: newPostTitle,
      desc: newPostDesc,
      category: newPostCategory,
      readTime: newPostReadTime || "قراءة في ٣ دقائق",
      content: newPostContent
    };
    const updated = [newPost, ...adminNewsPosts];
    setAdminNewsPosts(updated);
    saveSiteConfig("custom_news_posts_v1", updated);
    window.dispatchEvent(new Event("news_posts_updated"));
    setNewPostTitle("");
    setNewPostDesc("");
    setNewPostReadTime("");
    setNewPostContent("");
    toast.success("✓ تم حفظ ونشر وتعميم المقال بنجاح!");
  };

  const handleDeletePost = (id: string) => {
    const updated = adminNewsPosts.filter(p => p.id !== id);
    setAdminNewsPosts(updated);
    saveSiteConfig("custom_news_posts_v1", updated);
    toast.success("✓ تم حذف المقال من قائمة الأخبار");
    window.dispatchEvent(new Event("news_posts_updated"));
  };

  const handleMovePost = (id: string, direction: "up" | "down") => {
    const index = adminNewsPosts.findIndex(p => p.id === id);
    if (index === -1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= adminNewsPosts.length) return;

    const updated = [...adminNewsPosts];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    setAdminNewsPosts(updated);
    saveSiteConfig("custom_news_posts_v1", updated);
    window.dispatchEvent(new Event("news_posts_updated"));
  };

  useEffect(() => {
    loadAdminNews();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabType | null;
      const targetTabSession = sessionStorage.getItem("admin_target_tab") as TabType | null;
      if (tabParam) {
        setActiveFilterTab(tabParam);
      } else if (targetTabSession) {
        setActiveFilterTab(targetTabSession);
        sessionStorage.removeItem("admin_target_tab");
      }
    }
  }, []);

  // Advanced Multi-Criteria Filter States
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminFilterDate, setAdminFilterDate] = useState("all");
  const [adminFilterGov, setAdminFilterGov] = useState("all");
  const [adminFilterDept, setAdminFilterDept] = useState("all");
  const [adminFilterAgent, setAdminFilterAgent] = useState("all");
  const [slaFilter, setSlaFilter] = useState<"all" | "green" | "yellow" | "red" | "completed">("all");
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Executive PDF Report & Password Protection States
  const [showExecutiveReportPasswordModal, setShowExecutiveReportPasswordModal] = useState(false);
  const [pdfReportPasswordInput, setPdfReportPasswordInput] = useState("");
  const [pdfReportPasswordError, setPdfReportPasswordError] = useState(false);
  const [showExecutiveReportModal, setShowExecutiveReportModal] = useState(false);

  // Alert & Sound configuration
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true);
  const [autoToastEnabled, setAutoToastEnabled] = useState(true);
  const [preferredAlertTone, setPreferredAlertTone] = useState<"registration" | "callback">("registration");
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "lead" | "callback"; time: string }[]>([]);

  // Automated WhatsApp / SMS Messaging Modal & Follow-up Trigger
  const [messagingStudent, setMessagingStudent] = useState<StudentLeadForMessage | null>(null);
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);

  const handleOpenMessaging = (student: any) => {
    setMessagingStudent({
      id: student.id,
      studentName: student.studentName,
      phoneNumber: student.phoneNumber,
      whatsappNumber: student.whatsappNumber,
      basicCourse: student.basicCourse,
      selectedDepartments: student.selectedDepartments,
      reservationCode: student.reservationCode,
      agentName: student.agentName,
      governorate: student.governorate,
      educationLevel: student.educationLevel
    });
    setIsMessagingModalOpen(true);
  };

  // Expanded student cards record
  const [expandedStudents, setExpandedStudents] = useState<{ [id: string]: boolean }>({});
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  // For callback tracking workflow
  const [callbackPromptId, setCallbackPromptId] = useState<string | null>(null);
  const [callbackAgentInput, setCallbackAgentInput] = useState("");
  const [callbackError, setCallbackError] = useState("");

  // Session authorization for deleting in each list
  const [unlockedDeleteTabs, setUnlockedDeleteTabs] = useState<{ [category: string]: boolean }>(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("unlocked_delete_tabs");
      return raw ? JSON.parse(raw) : {};
    }
    return {};
  });

  // State to track current delete operation intent which needs password authorization
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{
    listKey: "lead_new" | "lead_completed" | "lead_no_reply" | "callback" | "complaint" | "parent" | "ticket" | "pdfLead";
    id: string;
    studentName: string;
    onConfirmed: () => void;
  } | null>(null);

  const [deleteConfirmationAction, setDeleteConfirmationAction] = useState<{
    studentName?: string;
    onConfirmed: () => void;
  } | null>(null);

  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");

  const triggerSecureDelete = (
    listKey: "lead_new" | "lead_completed" | "lead_no_reply" | "callback" | "complaint" | "parent" | "ticket" | "pdfLead",
    id: string,
    studentName: string,
    onConfirmed: () => void
  ) => {
    const isUnlocked = unlockedDeleteTabs[listKey];
    if (isUnlocked) {
      setDeleteConfirmationAction({
        studentName,
        onConfirmed
      });
    } else {
      setPendingDeleteAction({
        listKey,
        id,
        studentName,
        onConfirmed
      });
      setDeletePasswordInput("");
      setDeletePasswordError("");
    }
  };

  // Internal Notes modification
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  // Representative/Sales Assignment
  const [editingSalesStudentId, setEditingSalesStudentId] = useState<string | null>(null);
  const [tempSalesOption, setTempSalesOption] = useState("");
  const [tempSalesInput, setTempSalesInput] = useState("");
  const [transferCheckedList, setTransferCheckedList] = useState<{ [key: string]: boolean }>({});
  const [officialSalesReps, setOfficialSalesReps] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("admin_sales_reps_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
              .map((r: any) => r.name?.trim())
              .filter(Boolean);
          }
        }
      } catch (e) {}
    }
    return [];
  });

  // High Administration Reassignment Modal (Password Protected - 2-step flow)
  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    type: "lead" | "callback" | "pdfLead";
    id: string;
    studentName: string;
    currentAgent: string;
    reservationCode?: string;
    phone?: string;
  } | null>(null);
  const [reassignStep, setReassignStep] = useState<1 | 2>(1); // Step 1: Password, Step 2: Choose Agent
  const [reassignPasswordInput, setReassignPasswordInput] = useState("");
  const [showReassignPassword, setShowReassignPassword] = useState(false);
  const [reassignSelectedAgent, setReassignSelectedAgent] = useState("");
  const [reassignCustomAgentInput, setReassignCustomAgentInput] = useState("");
  const [reassignRepSearch, setReassignRepSearch] = useState("");
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignLoading, setReassignLoading] = useState(false);

  // Sales Reps Filter Management & Exclusion (can hide/delete any sales rep from the search filter)
  const [hiddenFilterReps, setHiddenFilterReps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("admin_hidden_filter_reps");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showFilterManagerModal, setShowFilterManagerModal] = useState(false);

  const toggleHideRepFromFilter = (repName: string) => {
    setHiddenFilterReps(prev => {
      const updated = prev.includes(repName)
        ? prev.filter(r => r !== repName)
        : [...prev, repName];
      try {
        localStorage.setItem("admin_hidden_filter_reps", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const resetHiddenReps = () => {
    setHiddenFilterReps([]);
    try {
      localStorage.removeItem("admin_hidden_filter_reps");
    } catch {}
  };

  // Bulk Reassign Modal State (convert all leads of one agent to another)
  const [bulkReassignModal, setBulkReassignModal] = useState<{
    isOpen: boolean;
    fromAgent: string;
    toAgent: string;
    leadsCount: number;
    step: 1 | 2;
    password: string;
    error: string | null;
    loading: boolean;
  } | null>(null);

  // References to track database row additions on interval
  const prevLeadsCountRef = useRef<number | null>(null);
  const prevCallbacksCountRef = useRef<number | null>(null);

  // Focus password input safely without causing page jumps/scroll
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (reassignModal && reassignModal.isOpen && reassignStep === 1) {
      setTimeout(() => {
        passwordInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [reassignModal, reassignStep]);

  // 1. Authenticate check on component render
  useEffect(() => {
    document.title = "لوحة التحكم السريّة";
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("admin_authenticated");
      if (auth === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Web Audio ultra-premium elegant synthesizer (Crystalline E major 7 and A major ascending harmonic chime)
  const playNotificationSound = (forcedTone?: "registration" | "callback") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(e => console.warn("Could not resume AudioContext:", e));
      }
      
      const playBeep = (freq: number, type: "sine" | "triangle" | "square" | "sawtooth", startTime: number, duration: number, vol: number) => {
        try {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, startTime);
          
          // Connect smooth volume envelope: dynamic attack and exponential decay
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        } catch (oscErr) {
          console.error("Oscillator play error:", oscErr);
        }
      };

      const toneToPlay = forcedTone || preferredAlertTone;

      if (toneToPlay === "registration") {
        const now = audioCtx.currentTime;
        // Warm crystalline E major 7 elegant ascending arpeggio
        playBeep(659.25, "sine", now, 0.8, 0.06);        // E5
        playBeep(830.61, "sine", now + 0.12, 0.8, 0.06);   // G#5
        playBeep(987.77, "sine", now + 0.24, 1.0, 0.06);   // B5
        playBeep(1318.51, "sine", now + 0.36, 1.4, 0.07);  // E6
      } else {
        const now = audioCtx.currentTime;
        // Premium soft crystal ascending A major chord
        playBeep(880.00, "sine", now, 0.8, 0.06);        // A5
        playBeep(1109.73, "sine", now + 0.12, 0.8, 0.06); // C#6
        playBeep(1318.51, "sine", now + 0.24, 1.2, 0.07); // E6
      }
    } catch (e) {
      console.warn("Could not play notification chime:", e);
    }
  };

  // Load PDF URLs
  const fetchPdfSettings = async () => {
    setPdfSettingsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/pdf-settings", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && data.success) {
        setPdfSettings(data.settings);
      }
      await fetchPdfLibrary();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("PDF settings fetch deferred:", err?.message || err);
      }
    } finally {
      setPdfSettingsLoading(false);
    }
  };

  const fetchPdfLibrary = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/pdf-library", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && data.success) {
        setPdfLibraryList(data.list);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("PDF library fetch deferred:", err?.message || err);
      }
    }
  };

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
          // Set name if empty
          if (!libraryFormName) {
            setLibraryFormName(file.name.replace(/\.[^/.]+$/, ""));
          }
          setLibraryUploadProgress("تم رفع الملف بنجاح وحفظه على السيرفر! ✓");
        } else {
          setLibraryUploadProgress(`فشل الرفع: ${data.error || "خطأ مجهول"}`);
        }
      } catch (err: any) {
        console.error(err);
        setLibraryUploadProgress("فشل في الاتصال بالسيرفر أثناء عملية الرفع.");
      }
    };
    reader.onerror = () => {
      setLibraryUploadProgress("فشل في قراءة الملف من الجهاز.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLibraryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryFormName.trim() || !libraryFormUrl.trim() || !libraryFormSpecialization) {
      alert("الرجاء تعبئة جميع الحقول المطلوبة (مسمى الملف، الرابط، والقسم المرتبط).");
      return;
    }

    setLibraryIsSaving(true);
    try {
      const res = await fetch("/api/pdf-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: libraryFormId || undefined,
          name: libraryFormName.trim(),
          url: libraryFormUrl.trim(),
          specialization: libraryFormSpecialization
        })
      });
      const data = await res.json();
      if (data && data.success) {
        // Update both library and settings
        setPdfLibraryList(data.list);
        setPdfSettings(data.settings);
        
        // Reset form
        setLibraryFormId("");
        setLibraryFormName("");
        setLibraryFormUrl("");
        setLibraryUploadProgress("");
        alert("تم حفظ الملف بنجاح وربطه فوراً بـ بوابة التحميل (Lead Magnet) للتخصص المختار! 📚");
      } else {
        alert(`فشل الحفظ: ${data.error || "خطأ مجهول"}`);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الاتصال بالسيرفر لحفظ الملف.");
    } finally {
      setLibraryIsSaving(false);
    }
  };

  const handleEditLibraryItem = (item: any) => {
    setLibraryFormId(item.id);
    setLibraryFormName(item.name);
    setLibraryFormUrl(item.url);
    setLibraryFormSpecialization(item.specialization);
    setLibraryUploadProgress("تم تحميل بيانات الملف للتعديل الحاسم.");
  };

  const handleDeleteLibraryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/pdf-library/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data && data.success) {
        setPdfLibraryList(data.list);
        toast.success("تم حذف الملف من المكتبة الرقمية بنجاح.");
      } else {
        toast.error("فشل حذف الملف.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطأ أثناء محاولة حذف الملف.");
    }
  };

  const handleUpdatePdfUrl = (specialization: string, newUrl: string) => {
    setPdfSettings((prev) => ({ ...prev, [specialization]: newUrl }));
  };

  const handleSavePdfSettings = async () => {
    try {
      setPdfSettingsLoading(true);
      const res = await fetch("/api/pdf-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: pdfSettings })
      });
      const data = await res.json();
      if (data && data.success) {
        alert("تم حفظ وتحديث روابط ملفات الـ PDF بنجاح! سيتم تطبيقها فوراً على أدوات تفعيل العملاء الـ Lead Magnet.");
      } else {
        alert("فشل حفظ التغييرات، يرجى المحاولة لاحقاً.");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الإعدادات.");
    } finally {
      setPdfSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPdfSettings();
    }
  }, [isAuthenticated]);

  // 2. Load API database values with safe fallback & timeout shield
  const fetchAdminData = async (isFirstLoad = false) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/admin/data", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn("Could not fetch database records, status:", res.status);
        return;
      }
      const data = await res.json();
      if (data && data.success) {
        let leads: Lead[] = data.leads || [];
        const callbacks: CallbackRequest[] = data.callbacks || [];
        const complaints: Complaint[] = data.complaints || [];
        const pdfLeads: any[] = data.pdfLeads || [];

        // Direct client-side fetch from Supabase to guarantee live cloud sync across all hosting platforms
        let supaLeads: Lead[] = [];
        if (hasSupabase) {
          try {
            const { data: supaRows } = await supabase
              .from('students')
              .select('*')
              .order('created_at', { ascending: false });
            if (supaRows && supaRows.length > 0) {
              supaLeads = normalizeAndDeduplicateLeads(supaRows) as unknown as Lead[];
            }
          } catch (e) {
            console.warn("Client Supabase load warning:", e);
          }
        }

        // Guarantee all students are preserved and strictly normalized & deduplicated
        const combinedSource = [...supaLeads, ...leads];
        const rawSource = (combinedSource.length > 0) ? combinedSource : initialLeads;
        let mergedLeads: Lead[] = normalizeAndDeduplicateLeads(rawSource) as unknown as Lead[];

        // Comprehensive tombstone filtering: ID, reservation code, student name, and phone numbers
        let tombstoneIds = new Set<string>();
        let tombstonePhones = new Set<string>();
        try {
          const rawStored = localStorage.getItem("academy_deleted_lead_identifiers");
          if (rawStored) {
            const deletedList: string[] = JSON.parse(rawStored);
            tombstoneIds = new Set(deletedList.map(s => String(s).trim().toLowerCase()));
            deletedList.forEach(s => {
              const d = String(s).replace(/\D/g, "");
              if (d.length >= 6) {
                tombstonePhones.add(d);
                if (d.startsWith("201") && d.length === 12) tombstonePhones.add(d.substring(1));
                if (d.startsWith("00201") && d.length === 14) tombstonePhones.add(d.substring(3));
              }
            });
          }
        } catch (e) {}

        mergedLeads = mergedLeads.filter((l: any) => {
          if (l.status === "deleted" || (l.notes && String(l.notes).includes("[DELETED_PERMANENTLY]"))) {
            return false;
          }
          const idVal = String(l.id || "").trim().toLowerCase();
          const codeVal = String(l.reservationCode || l.reservation_code || "").trim().toLowerCase();
          const nameVal = String(l.studentName || l.full_name || "").trim().toLowerCase();

          if (idVal && tombstoneIds.has(idVal)) return false;
          if (codeVal && tombstoneIds.has(codeVal)) return false;
          if (nameVal && tombstoneIds.has(nameVal)) return false;

          const phoneDigits = String(l.phoneNumber || l.phone || l.whatsappNumber || l.whatsapp_number || "").replace(/\D/g, "");
          if (phoneDigits.length >= 6) {
            if (tombstonePhones.has(phoneDigits)) return false;
            if (phoneDigits.startsWith("201") && phoneDigits.length === 12 && tombstonePhones.has(phoneDigits.substring(1))) return false;
            if (phoneDigits.startsWith("00201") && phoneDigits.length === 14 && tombstonePhones.has(phoneDigits.substring(3))) return false;
          }
          return true;
        });

        setAdminLeads(mergedLeads);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("admin_leads_cache", JSON.stringify(mergedLeads));
          } catch (e) {}
        }
        setAdminCallbacks(callbacks);
        setAdminComplaints(complaints);
        setAdminPdfLeads(pdfLeads);

        // Analyze count increase to play auditory alerts strictly for callback contact requests
        if (!isFirstLoad) {
          if (prevCallbacksCountRef.current !== null && callbacks.length > prevCallbacksCountRef.current) {
            const latestCb = callbacks[0];
            if (alertSoundEnabled) {
              playNotificationSound("callback");
            }
            // Trigger floating screen-level premium toast
            toast(`📞 طلب اتصال هاتفي عاجل: "${latestCb?.studentName || 'مجهول'}" ☎️`, {
              icon: "⚡",
              duration: 8000,
              style: {
                background: "#022c22",
                color: "#f0fdf4",
                borderRadius: "1rem",
                border: "1px solid #115e59",
                fontWeight: "900",
                fontSize: "13px",
                direction: "rtl"
              }
            });
            if (autoToastEnabled) {
              setToasts(prev => [
                {
                  id: String(Date.now()),
                  message: `📞 طلب اتصال هاتفي عاجل: العميل "${latestCb?.studentName || 'مجهول'}" يطلب استشارة هاتفية!`,
                  type: "callback",
                  time: new Date().toLocaleTimeString("ar-EG")
                },
                ...prev
              ]);
            }
          }
        }

        prevLeadsCountRef.current = leads.length;
        prevCallbacksCountRef.current = callbacks.length;
      }

      // Load official sales reps list
      try {
        const repsRes = await fetch("/api/sales-reps");
        if (repsRes.ok) {
          const repsData = await repsRes.json();
          if (repsData?.reps && Array.isArray(repsData.reps)) {
            setSalesRepsDetailed(repsData.reps);
            setOfficialSalesReps(repsData.reps.map((r: any) => r.name?.trim()).filter(Boolean));
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("admin_sales_reps_cache", JSON.stringify(repsData.reps));
              } catch (e) {}
            }
          }
        }
      } catch (repsErr) {
        console.warn("Could not fetch sales-reps:", repsErr);
      }

      // Load round-robin lead distribution status
      fetchRoundRobinStatus().catch(() => {});

      // Load partner academies list
      try {
        const acRes = await fetch("/api/academy-portal/list");
        if (acRes.ok) {
          const acData = await acRes.json();
          if (acData?.success && Array.isArray(acData.academies)) {
            setPartnerAcademiesList(acData.academies);
          }
        }
      } catch (acErr) {
        console.warn("Could not fetch academy portal list:", acErr);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Database fetch deferred:", err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull records on load and refresh on timer interval (6 seconds for real-time tracking)
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchAdminData(true);

    const interval = setInterval(() => {
      fetchAdminData(false);
    }, 6000);

    // Listen to Supabase update triggers directly
    let channel: any = null;
    if (hasSupabase) {
      channel = supabase
        .channel("admin-realtime-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
          },
          () => {
            fetchAdminData(false);
          }
        )
        .subscribe();
    }

    // Unlock Audio Context on first click/touch interaction
    const unlockAudio = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
        // Remove event listeners after successfully trying to unlock
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("touchstart", unlockAudio);
      } catch (err) {
        console.warn("Failed to automatically unlock browser audio context:", err);
      }
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [isAuthenticated, alertSoundEnabled, autoToastEnabled]);

  // Handle Verify PIN Submit
  const handleVerifyAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = adminPinInput.trim().toLowerCase();
    if (
      checkAdminPasscode(pin) ||
      pin === "admin123" || 
      pin === "eng2026" || 
      pin === "mamdouh2026" || 
      pin === "engmamdouh2026" || 
      pin === "mm151997"
    ) {
      setPinError(false);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("admin_authenticated", "true");
      }
      fetchAdminData(true);
    } else {
      setPinError(true);
    }
  };

  // Sign out handler
  const handleSignout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_authenticated");
    }
    setIsAuthenticated(false);
    navigate("/");
  };

  // Toggle single row expansion
  const toggleStudentExpand = (id: string) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Update contact status
  const handleUpdateStatus = async (type: "lead" | "callback", id: string, status: string, name?: string) => {
    try {
      if (name && type === "lead") {
        setAdminLeads(prev => prev.map(l => {
          if (String(l.id) === String(id) || String(l.reservationCode) === String(id)) {
            return { ...l, agentName: name, status: status as any };
          }
          return l;
        }));
      }

      const res = await fetch("/api/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, status, agentName: name })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.leads) setAdminLeads(data.leads);
        if (data.callbacks) setAdminCallbacks(data.callbacks);
        if (data.pdfLeads) setAdminPdfLeads(data.pdfLeads);
      }
      fetchAdminData(false);
    } catch (err) {
      console.error("Could not update status:", err);
    }
  };

  // Save Sales Representative Assignment
  const handleSaveSalesAssignment = async (studentId: string, name: string) => {
    try {
      await handleUpdateStatus("lead", studentId, "pending", name);
      setEditingSalesStudentId(null);
      setTempSalesOption("");
      setTempSalesInput("");
    } catch (err) {
      console.error("Sales Assignment update failure:", err);
    }
  };

  // High Administration Reassignment Step 1: Verify Password
  const handleVerifyReassignPassword = () => {
    setReassignError(null);
    const password = reassignPasswordInput.trim();
    const validPasswords = ["Mm151997", "mm151997", "151997", "admin123", "eng2026", "mamdouh2026", "engmamdouh2026"];
    if (!password) {
      setReassignError("يرجى إدخال رمز الحماية للمتابعة");
      return;
    }
    const cleanLower = password.toLowerCase();
    const isValid =
      validPasswords.includes(password) ||
      validPasswords.includes(cleanLower) ||
      checkAdminPasscode(password) ||
      checkAdminPasscode(cleanLower);

    if (!isValid) {
      setReassignError("رمز الحماية غير صحيح! لا تملك صلاحية تغيير أو تعيين السيلز.");
      return;
    }
    // Password verified, advance to Step 2
    setReassignStep(2);
    setReassignError(null);
  };

  // High Administration Reassignment Step 2: Execution
  const handleExecuteReassign = async () => {
    if (!reassignModal) return;
    setReassignError(null);

    const password = reassignPasswordInput.trim();
    if (!password) {
      setReassignStep(1);
      setReassignError("يرجى إدخال رمز الحماية لتأكيد التحويل.");
      return;
    }

    const finalAgentName = reassignSelectedAgent === "__CUSTOM__"
      ? reassignCustomAgentInput.trim()
      : reassignSelectedAgent.trim();

    if (!finalAgentName) {
      setReassignError("يرجى تحديد أو كتابة اسم مستشار المبيعات المراد التحويل إليه");
      return;
    }

    setReassignLoading(true);
    const transferNowTs = Date.now();
    const transferNowStr = formatEgyptDateTime(transferNowTs);
    try {
      // Optimistic update so user sees instant result with correct status (pending, not completed)
      if (reassignModal.type === "lead") {
        setAdminLeads(prev => prev.map(l => {
          if (String(l.id) === String(reassignModal.id) || String(l.reservationCode) === String(reassignModal.id)) {
            return { 
              ...l, 
              agentName: finalAgentName, 
              status: "pending",
              reassignedTimestamp: transferNowTs,
              reassignedDateStr: transferNowStr,
              updatedAt: transferNowTs
            };
          }
          return l;
        }));
      } else if (reassignModal.type === "callback") {
        setAdminCallbacks(prev => prev.map(c => {
          if (String(c.id) === String(reassignModal.id)) {
            return { 
              ...c, 
              agentName: finalAgentName, 
              status: "pending", 
              date: transferNowStr 
            };
          }
          return c;
        }));
      } else if (reassignModal.type === "pdfLead") {
        setAdminPdfLeads(prev => prev.map(p => {
          if (String(p.id) === String(reassignModal.id)) {
            return { 
              ...p, 
              agentName: finalAgentName, 
              status: "pending", 
              date: transferNowStr 
            };
          }
          return p;
        }));
      }

      const res = await fetch("/api/admin/reassign-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reassignModal.type,
          id: reassignModal.id,
          reservationCode: reassignModal.reservationCode,
          phone: reassignModal.phone,
          newAgentName: finalAgentName,
          password: password,
          transferDateStr: transferNowStr,
          transferTimestamp: transferNowTs
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setReassignError(data.error || "تعذر إجراء التحويل. يرجى المحاولة مرة أخرى.");
        setReassignLoading(false);
        fetchAdminData(false);
        return;
      }

      toast.success(data.message || `✓ تم تعيين وتحويل العميل إلى ${finalAgentName} بنجاح!`);
      if (data.leads) setAdminLeads(data.leads);
      if (data.callbacks) setAdminCallbacks(data.callbacks);
      if (data.pdfLeads) setAdminPdfLeads(data.pdfLeads);

      setReassignModal(null);
      setReassignStep(1);
      setReassignPasswordInput("");
      setShowReassignPassword(false);
      setReassignSelectedAgent("");
      setReassignCustomAgentInput("");
      setReassignError(null);
      fetchAdminData(false);
    } catch (err: any) {
      setReassignError(err.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setReassignLoading(false);
    }
  };

  // High Administration Bulk Reassignment Execution
  const handleBulkReassignExecute = async () => {
    if (!bulkReassignModal) return;
    const { fromAgent, toAgent, password } = bulkReassignModal;
    if (!password.trim()) {
      setBulkReassignModal(prev => prev ? { ...prev, error: "يرجى إدخال رمز الحماية للإدارة للمتابعة" } : null);
      return;
    }
    if (!toAgent || toAgent.trim() === fromAgent.trim()) {
      setBulkReassignModal(prev => prev ? { ...prev, error: "يرجى اختيار مستشار جديد مختلف عن المستشار الحالي" } : null);
      return;
    }

    setBulkReassignModal(prev => prev ? { ...prev, loading: true, error: null } : null);
    try {
      const res = await fetch("/api/admin/bulk-reassign-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAgent: fromAgent.trim(), toAgent: toAgent.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBulkReassignModal(prev => prev ? { ...prev, loading: false, error: data.error || "فشل التحويل الجماعي" } : null);
        return;
      }
      toast.success(data.message || `تم تحويل جميع طلاب (${fromAgent}) إلى (${toAgent}) بنجاح!`);
      if (data.leads) setAdminLeads(data.leads);
      if (data.callbacks) setAdminCallbacks(data.callbacks);
      if (data.pdfLeads) setAdminPdfLeads(data.pdfLeads);
      setBulkReassignModal(null);
      fetchAdminData(false);
    } catch (err: any) {
      setBulkReassignModal(prev => prev ? { ...prev, loading: false, error: err.message || "حدث خطأ في الاتصال" } : null);
    }
  };

  // Save staff internal notes
  const handleSaveInternalNote = async (type: "lead" | "callback", id: string, customDirectNote?: string) => {
    try {
      const noteToSend = customDirectNote !== undefined ? customDirectNote : tempNoteText;
      const res = await fetch("/api/admin/update-internal-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, internalNotes: noteToSend })
      });
      if (res.ok) {
        setEditingNoteId(null);
        setTempNoteText("");
        fetchAdminData(false);
      }
    } catch (err) {
      console.error("Failed to save internal note:", err);
    }
  };

  // Delete admissions, callback or complaint
  const handleDeleteItem = async (
    type: "lead" | "callback" | "complaint" | "pdfLead",
    id: string,
    extraInfo?: { reservationCode?: string; phone?: string; studentName?: string }
  ) => {
    // 1. Optimistic UI update immediately
    if (type === "lead") {
      setAdminLeads(prev => {
        const next = prev.filter(l => 
          l.id !== id && 
          (!extraInfo?.reservationCode || (l.reservationCode !== extraInfo.reservationCode && (l as any).reservation_code !== extraInfo.reservationCode)) &&
          (!extraInfo?.phone || (l.phoneNumber !== extraInfo.phone && (l as any).phone !== extraInfo.phone)) &&
          (!extraInfo?.studentName || (l.studentName !== extraInfo.studentName && (l as any).full_name !== extraInfo.studentName))
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("admin_leads_cache", JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      try {
        const stored = JSON.parse(localStorage.getItem("academy_deleted_lead_identifiers") || "[]");
        const set = new Set(stored.map((s: any) => String(s).trim().toLowerCase()));
        if (id) set.add(String(id).trim().toLowerCase());
        if (extraInfo?.reservationCode) set.add(String(extraInfo.reservationCode).trim().toLowerCase());
        if (extraInfo?.studentName) set.add(String(extraInfo.studentName).trim().toLowerCase());
        const phoneDigits = String(extraInfo?.phone || "").replace(/\D/g, "");
        if (phoneDigits) set.add(phoneDigits);
        localStorage.setItem("academy_deleted_lead_identifiers", JSON.stringify(Array.from(set)));
      } catch (e) {}
    } else if (type === "callback") {
      setAdminCallbacks(prev => prev.filter(c => c.id !== id));
    } else if (type === "complaint") {
      setAdminComplaints(prev => prev.filter(c => c.id !== id));
    } else if (type === "pdfLead") {
      setAdminPdfLeads(prev => prev.filter(p => p.id !== id));
    }

    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          id,
          reservationCode: extraInfo?.reservationCode,
          phone: extraInfo?.phone,
          studentName: extraInfo?.studentName
        })
      });
      if (res.ok) {
        fetchAdminData(false);
      }
    } catch (err) {
      console.error("Deletion error:", err);
    }
  };

  // Copy click feedback helper
  const handleCopySingleNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedFeedback(num);
    setTimeout(() => setCopiedFeedback(null), 2000);
  };

  // WhatsApp helper
  const getWhatsAppLink = (phone: string, name: string) => {
    let cleanPhone = phone.trim();
    if (cleanPhone.startsWith("01")) {
      cleanPhone = "2" + cleanPhone;
    }
    const txt = encodeURIComponent(`أهلاً بك يا طالبنا العزيز ${name}، نتواصل معك من إدارة شؤون التسجيل في بوابة المعاهد والأكاديميات الخاصة بخصوص تأكيد طلب حجز مقعدك...`);
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${txt}`;
  };

  // Compute stats details to produce live Visual Analytics Chart
  const getDepartmentStatsForChart = () => {
    const counts: { [name: string]: number } = {};
    adminLeads.forEach(lead => {
      if (lead.selectedDepartments && lead.selectedDepartments.length > 0) {
        lead.selectedDepartments.forEach(deptId => {
          const dept = ACADEMY_DEPARTMENTS.find(d => d.id === deptId || d.name === deptId);
          const label = dept ? dept.name.slice(0, 18) + "..." : "تخصص رئيسي";
          counts[label] = (counts[label] || 0) + 1;
        });
      } else if (lead.basicCourse) {
        const label = lead.basicCourse.slice(0, 18);
        counts[label] = (counts[label] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 5);
  };

  const getGovernorateStatsForChart = () => {
    const counts: { [name: string]: number } = {};
    adminLeads.forEach(lead => {
      const gov = lead.governorate?.trim() || "غير مدون";
      counts[gov] = (counts[gov] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 5);
  };

  const chartData = getDepartmentStatsForChart();
  const govData = getGovernorateStatsForChart();

  // Filter student applications according to Tab + Advanced filters
  const filteredLeadsList = adminLeads.filter(lead => {
    // 1. Core Tab State Filter
    if (activeFilterTab === "new") {
      if (lead.status === "completed" || lead.status === "no_reply") return false;
    } else if (activeFilterTab === "completed") {
      if (lead.status !== "completed") return false;
    } else if (activeFilterTab === "no_reply") {
      if (lead.status !== "no_reply") return false;
    }

    // 2. Search Query (studentName, phone, code, governorate, agent, notes)
    const query = adminSearchQuery.trim().toLowerCase();
    if (query) {
      const match = (
        (lead.studentName || "").toLowerCase().includes(query) ||
        (lead.phoneNumber || "").includes(query) ||
        (lead.whatsappNumber || "").includes(query) ||
        (lead.reservationCode || "").toLowerCase().includes(query) ||
        (lead.governorate || "").toLowerCase().includes(query) ||
        (lead.agentName || "").toLowerCase().includes(query) ||
        (lead.specialization || "").toLowerCase().includes(query) ||
        (lead.notes || "").toLowerCase().includes(query)
      );
      if (!match) return false;
    }

    // 3. Date Interval Period
    if (adminFilterDate !== "all") {
      const studentTime = Number(lead.timestamp) || (lead.date ? Date.parse(lead.date) : 0);
      if (!studentTime) return false;
      const startOfToday = new Date().setHours(0, 0, 0, 0);

      if (adminFilterDate === "today") {
        if (studentTime < startOfToday) return false;
      } else if (adminFilterDate === "yesterday_today") {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        if (studentTime < startOfYesterday) return false;
      } else if (adminFilterDate === "week") {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (studentTime < sevenDaysAgo) return false;
      } else if (adminFilterDate === "month") {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        if (studentTime < startOfMonth) return false;
      }
    }

    // 4. Governorate filter
    if (adminFilterGov !== "all") {
      const leadGov = (lead.governorate || "").trim().toLowerCase();
      const filterGov = adminFilterGov.trim().toLowerCase();
      if (!leadGov.includes(filterGov) && !filterGov.includes(leadGov)) return false;
    }

    // 5. Department filter (robust match against ID, name, or specialization)
    if (adminFilterDept !== "all") {
      const targetDept = ACADEMY_DEPARTMENTS.find(d => d.id === adminFilterDept || d.name === adminFilterDept);
      const targetTerms = [adminFilterDept];
      if (targetDept) {
        targetTerms.push(targetDept.id);
        targetTerms.push(targetDept.name);
      }

      const matchDept = (lead.selectedDepartments && lead.selectedDepartments.some((d: string) => 
        targetTerms.some(term => d.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(d.toLowerCase()))
      )) ||
      targetTerms.some(term => (lead.basicCourse || "").toLowerCase().includes(term.toLowerCase())) ||
      targetTerms.some(term => (lead.specialization || "").toLowerCase().includes(term.toLowerCase()));

      if (!matchDept) return false;
    }

    // 6. Sales rep agent filter
    if (adminFilterAgent !== "all") {
      if (adminFilterAgent === "unassigned") {
        if (lead.agentName && lead.agentName.trim() !== "") return false;
      } else {
        const leadAgent = (lead.agentName || "").trim().toLowerCase();
        const filterAgent = adminFilterAgent.trim().toLowerCase();
        const matchAgent = leadAgent === filterAgent || 
                           leadAgent.includes(filterAgent) || 
                           filterAgent.includes(leadAgent) ||
                           (lead.notes && lead.notes.includes(adminFilterAgent));
        if (!matchAgent) return false;
      }
    }

    // 7. SLA Status filter
    if (slaFilter !== "all") {
      const slaInfo = getStudentSlaInfo(lead.status, lead.timestamp, lead.date);
      if (slaInfo.status !== slaFilter) return false;
    }

    return true;
  });

  // Filter callbacks list to display search
  const filteredCallbacksList = adminCallbacks.filter(cb => {
    const q = adminSearchQuery.trim().toLowerCase();
    if (q) {
      return (cb.phoneNumber.includes(q) || (cb.studentName || "").toLowerCase().includes(q));
    }
    return true;
  });

  // Filter PDF leads list to display search
  const filteredPdfLeadsList = adminPdfLeads.filter(pl => {
    const q = adminSearchQuery.trim().toLowerCase();
    
    // Support Sales Rep filtering on PDF leads if active
    if (adminFilterAgent !== "all") {
      if (adminFilterAgent === "unassigned") {
        if (pl.agentName && pl.agentName.trim() !== "") return false;
      } else {
        if ((pl.agentName || "").trim().toLowerCase() !== adminFilterAgent.toLowerCase()) return false;
      }
    }
    
    if (q) {
      return (
        pl.phone.includes(q) || 
        (pl.name || "").toLowerCase().includes(q) || 
        (pl.specialization || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Unique lists from data to feed filter select options
  const uniqueGovs = Array.from(new Set(adminLeads.map(l => l.governorate?.trim()).filter(Boolean))).sort();
  // Strict sales reps list: ONLY the reps created/managed in the Sales Reps Panel
  const allDataSalesReps = Array.from(
    new Set(salesRepsDetailed.map((r: any) => (r.name || "").trim()).filter(Boolean))
  ).sort();

  // Active reps in search filter dropdown: excludes those explicitly hidden/deleted by admin
  const activeSalesReps = allDataSalesReps.filter(name => !hiddenFilterReps.includes(name));

  // Count leads per sales rep for display in filter and manager
  const repLeadsCountMap: { [key: string]: number } = {};
  adminLeads.forEach(l => {
    const ag = (l.agentName || "").trim();
    if (ag) repLeadsCountMap[ag] = (repLeadsCountMap[ag] || 0) + 1;
  });
  adminCallbacks.forEach(c => {
    const ag = (c.agentName || "").trim();
    if (ag) repLeadsCountMap[ag] = (repLeadsCountMap[ag] || 0) + 1;
  });
  adminPdfLeads.forEach(p => {
    const ag = (p.agentName || "").trim();
    if (ag) repLeadsCountMap[ag] = (repLeadsCountMap[ag] || 0) + 1;
  });

  // Helper to parse date string or timestamp to milliseconds
  const parseToTimestamp = (dateStr?: string, ts?: number): number => {
    if (ts && !isNaN(Number(ts)) && Number(ts) > 1000000000) {
      return Number(ts);
    }
    if (dateStr) {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) return parsed;
      // Handle Arabic locale string e.g. "03/09/2026, 04:30:00 م"
      const cleaned = dateStr.replace(/[ص]/g, "AM").replace(/[م]/g, "PM");
      const parsedCleaned = Date.parse(cleaned);
      if (!isNaN(parsedCleaned)) return parsedCleaned;
    }
    return 0;
  };

  // Helper to format timestamp or date string into clean Arabic format (strictly Egypt time)
  const formatArabicDateTime = (ts: number, fallbackDateStr?: string): string => {
    if (!ts || isNaN(ts)) {
      if (fallbackDateStr && fallbackDateStr.trim()) return fallbackDateStr.trim();
      return "لا يوجد تاريخ مسجل";
    }
    const d = new Date(ts);
    if (isNaN(d.getTime())) {
      if (fallbackDateStr && fallbackDateStr.trim()) return fallbackDateStr.trim();
      return "لا يوجد تاريخ مسجل";
    }

    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      };
      const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(d);
      const map: Record<string, string> = {};
      parts.forEach(p => { map[p.type] = p.value; });
      const ampm = (map.dayPeriod || "").toUpperCase() === "PM" ? "م" : "ص";
      const timePart = `${map.hour}:${map.minute} ${ampm}`;

      // Today / yesterday comparison in Egypt timezone
      const egyptTodayParts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const todayMap: Record<string, string> = {};
      egyptTodayParts.forEach(p => { todayMap[p.type] = p.value; });

      const isToday = map.year === todayMap.year && map.month === todayMap.month && map.day === todayMap.day;
      if (isToday) {
        return `اليوم ${timePart}`;
      }
      return `${map.year}/${map.month}/${map.day} - ${timePart}`;
    } catch {
      const month = d.getUTCMonth() + 1;
      const offsetHours = (month >= 5 && month <= 10) ? 3 : 2;
      const egDate = new Date(d.getTime() + offsetHours * 3600000);
      const y = egDate.getUTCFullYear();
      const mo = String(egDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(egDate.getUTCDate()).padStart(2, "0");
      let h = egDate.getUTCHours();
      const ampm = h >= 12 ? "م" : "ص";
      h = h % 12 || 12;
      const hStr = String(h).padStart(2, "0");
      const min = String(egDate.getUTCMinutes()).padStart(2, "0");
      return `${y}/${mo}/${day} - ${hStr}:${min} ${ampm}`;
    }
  };

  // Detailed statistics per sales rep: Count of students, time & date of last student transferred or registered, and student name
  const salesRepsStatsMap = useMemo(() => {
    const map: {
      [repName: string]: {
        count: number;
        lastTimestamp: number;
        lastDateFormatted: string;
        lastStudentName: string;
      };
    } = {};

    allDataSalesReps.forEach((rep) => {
      const repKey = rep.trim().toLowerCase();
      const records: Array<{ name: string; timestamp: number; dateStr: string }> = [];

      // 1. Leads
      adminLeads.forEach((l) => {
        if ((l.agentName || "").trim().toLowerCase() === repKey) {
          let effectiveTs = l.reassignedTimestamp || l.updatedAt || 0;
          let effectiveDateStr = l.reassignedDateStr || l.date || "";

          // Check notes for transfer tag if not yet extracted
          if (l.notes && typeof l.notes === "string") {
            const transferMatch = l.notes.match(/\[تحويل لمستشار:\s*([^|\]]+?)\s*بتاريخ\s*([^|\]]+?)(?:\s*\|\s*([^\]]+))?\]/);
            if (transferMatch) {
              if (transferMatch[3]) {
                const pTs = Date.parse(transferMatch[3].trim());
                if (!isNaN(pTs)) {
                  effectiveTs = pTs;
                  effectiveDateStr = formatEgyptDateTime(pTs);
                }
              }
              if (!effectiveDateStr) {
                effectiveDateStr = transferMatch[2]?.trim() || effectiveDateStr;
              }
            }
          }

          if (!effectiveTs) {
            effectiveTs = parseToTimestamp(l.date, l.timestamp);
          }

          records.push({
            name: l.studentName || "طالب مسجل",
            timestamp: effectiveTs,
            dateStr: effectiveDateStr || l.date || ""
          });
        }
      });

      // 2. Callbacks
      adminCallbacks.forEach((c) => {
        if ((c.agentName || "").trim().toLowerCase() === repKey) {
          records.push({
            name: c.studentName || "طلب اتصال",
            timestamp: parseToTimestamp(c.date),
            dateStr: c.date || ""
          });
        }
      });

      // 3. PDF leads
      adminPdfLeads.forEach((p) => {
        if ((p.agentName || "").trim().toLowerCase() === repKey) {
          records.push({
            name: p.studentName || "دليل القبول",
            timestamp: parseToTimestamp(p.date || (p as any).downloadDate),
            dateStr: p.date || (p as any).downloadDate || ""
          });
        }
      });

      const count = records.length;
      if (count === 0) {
        map[rep] = {
          count: 0,
          lastTimestamp: 0,
          lastDateFormatted: "لم يُسند له طلاب بعد",
          lastStudentName: ""
        };
      } else {
        // Sort descending by timestamp
        records.sort((a, b) => b.timestamp - a.timestamp);
        const latest = records[0];
        map[rep] = {
          count,
          lastTimestamp: latest.timestamp,
          lastDateFormatted: formatArabicDateTime(latest.timestamp, latest.dateStr),
          lastStudentName: latest.name
        };
      }
    });

    return map;
  }, [allDataSalesReps, adminLeads, adminCallbacks, adminPdfLeads]);

  // ---------------- SECURITY LOGIN GATE ----------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-right font-sans" dir="rtl">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
          
          <div className="bg-slate-950 p-6 text-white text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-500/25">
              <Lock className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-extrabold font-sans">بوابة الإشراف وتسجيل مستشاري القبول 🔐</h2>
            <p className="text-xs text-slate-400 mt-1">تشفير تام لحماية خصوصية وسرية بيانات المسجلين</p>
          </div>

          <form onSubmit={handleVerifyAdminPinSubmit} className="p-6 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              لوحة التحكم هذه مخصصة فقط لمؤسس المنصة (الباشمهندس محمد الروبي) وفريق عمل الاستشارات والمبيعات لدى (ايه ام جروب للتسويق). يرجى تأكيد الهوية بإدخال الرمز السري:
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">أدخل رمز الحماية السري لتأكيد الصلاحية :</label>
              <input
                type="password"
                required
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  if (pinError) setPinError(false);
                }}
                placeholder="••••"
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A2463]/15 focus:outline-none focus:border-slate-800 text-center font-bold tracking-widest text-lg text-slate-850"
                autoFocus
              />
            </div>

            {pinError && (
              <p className="text-xs text-red-650 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-1.5 animate-bounce font-bold">
                <span>⚠️ الرمز غير صحيح، حاول مرة أخرى!</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>تأكيد الرمز وفتح لوحة الإدارة 🔓</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              الرجوع للصفحة الرئيسية للموقع
            </button>
          </form>

        </div>

      </div>
    );
  }

  // ---------------- AUTHENTICATED PANEL LAYOUT ----------------
  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 md:p-8 font-sans transition-all text-right" dir="rtl">
      
      {/* Supabase Connection Status Bar */}
      <div className="max-w-7xl mx-auto mb-4">
        {supabaseConnected === false && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl shadow-sm text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold text-red-900">تحذير: الموقع غير متصل بقاعدة بيانات Supabase!</p>
                <p className="text-red-700 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  لم يتم العثور على متغيرات البيئة الخاصة بـ Supabase في نظام التشغيل (Vercel أو خادم الاستضافة). التعديلات التي تقوم بها الآن سيتم حفظها في متصفحك الحالي فقط كحفظ مؤقت، ولن تظهر للطلاب أو الزوار في المتصفحات والأجهزة الأخرى. يرجى تهيئة المتغيرات البيئية <code className="bg-red-100 px-1 py-0.5 rounded text-red-800">SUPABASE_URL</code> و <code className="bg-red-100 px-1 py-0.5 rounded text-red-800">SUPABASE_KEY</code> في لوحة تحكم Vercel لتفعيل الحفظ السحابي الدائم.
                </p>
              </div>
            </div>
            <span className="bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0">غير متصل ❌</span>
          </div>
        )}
        {supabaseConnected === true && supabaseError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl shadow-sm text-xs sm:text-sm font-semibold flex flex-col items-stretch gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-bold text-amber-950 text-base">تحذير هام: متصل بـ Supabase ولكن يوجد خطأ في الجداول وقاعدة البيانات!</p>
                <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                  تم اكتشاف مفاتيح الاتصال بنجاح، ولكن قاعدة بيانات سوباباس تُرجع الخطأ التالي عند محاولة قراءة أو كتابة الإعدادات:
                </p>
                <div className="bg-amber-100 p-2.5 rounded-lg border border-amber-200 font-mono text-xs text-red-700 my-2 text-left" dir="ltr">
                  {supabaseError}
                </div>
                <p className="text-amber-800 text-xs leading-relaxed">
                  هذا يحدث غالباً لأنك لم تقم بإنشاء الجداول المطلوبة داخل مشروعك في Supabase. لحل هذه المشكلة فوراً وبشكل نهائي، يرجى نسخ الكود البرمجي (SQL) التالي، ولصقه وتشغيله داخل <strong className="font-bold">SQL Editor</strong> في لوحة تحكم مشروعك في Supabase:
                </p>
                
                <textarea
                  className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-lg mt-2 h-44 border border-slate-700 text-left cursor-text select-all"
                  dir="ltr"
                  readOnly
                  value={`-- 1. إنشاء جدول الإعدادات العامه للموقع (Site Configs)
CREATE TABLE IF NOT EXISTS public.site_configs (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- تفعيل الصلاحيات للجميع لقراءة وتحديث الإعدادات تلقائياً (أو تعطيل RLS مؤقتاً لتسهيل الربط)
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
                <p className="text-amber-900 font-bold mt-2 text-[11px] sm:text-xs">
                  💡 بمجرد تشغيل هذا السكريبت في سوباباس، سيختفي هذا التنبيه وسيبدأ الموقع في الحفظ السحابي فوراً لجميع الزوار!
                </p>
              </div>
            </div>
          </div>
        )}
        {supabaseConnected === true && !supabaseError && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 px-4 rounded-2xl shadow-sm text-xs font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <p className="text-emerald-900">
                الموقع متصل بقاعدة بيانات <strong className="font-bold">Supabase السحابية</strong> بنجاح. أي تعديل تقوم به يتم حفظه فوراً لجميع الأجهزة والزوار تلقائياً!
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0">متصل سحابياً 🟢</span>
          </div>
        )}
        {supabaseConnected === null && (
          <div className="bg-slate-50 border border-slate-200 text-slate-600 p-3 px-4 rounded-2xl shadow-sm text-xs font-semibold flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <span>⏳</span>
              <p>جاري التحقق من حالة الاتصال بقاعدة بيانات Supabase السحابية...</p>
            </div>
          </div>
        )}
      </div>

      {/* A. Header Workspace */}
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
              <Globe className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">البيئة الإدارية المستقلة الشاملة</h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-extrabold flex items-center gap-1.5 mt-0.5">
                <span>قاعدة بيانات الطلاب والمسجلين الحية 🟢</span>
                <span className="text-[9px] sm:text-[10px] bg-indigo-150 text-indigo-700 px-1.5 sm:px-2 py-0.2 rounded">تحديث حي تلقائي</span>
              </p>
            </div>
          </div>

          {/* Simulated Ticker Master Control */}
          <div className="bg-slate-950 border border-slate-850 p-2.5 px-4 rounded-xl flex items-center gap-3.5 shadow-lg shrink-0 mt-2 sm:mt-0" id="simulated-ticker-master-container">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${simulatedTickerActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${simulatedTickerActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-[11px] font-black text-[#F1F5F9]">🤖 محاكي النشاط والتسجيلات الذكية الخلفية:</span>
            <button
              onClick={handleToggleSimulatedTicker}
              type="button"
              className={`min-w-[70px] h-7 px-2.5 rounded-lg text-[10px] font-black tracking-tight transition-all uppercase cursor-pointer ${
                simulatedTickerActive
                  ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/10"
                  : "bg-red-500 hover:bg-red-650 text-white font-black"
              }`}
            >
              {simulatedTickerActive ? "نشط (ON)" : "معطل (OFF)"}
            </button>
          </div>
        </div>

        {/* Mobile-Only Combined Action Row & Dropdown / Desktop Split Action Row */}
        <div className="w-full md:w-auto flex flex-row items-center justify-between gap-2 md:gap-3">
          
          {/* Dropdown for Mobile Only */}
          <div className="md:hidden flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-600 mb-1 px-0.5">
              <span className="flex items-center gap-1">
                <span>قائمة الأقسام والتبويبات:</span>
              </span>
              <span className="text-amber-600 font-extrabold flex items-center gap-0.5 animate-pulse">
                انقر لعرض كافة الاختيارات ▾
              </span>
            </div>
            
            <div className="relative">
              {/* Left Arrow & Badge Indicator */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs z-10">
                <span>قائمة ▾</span>
                <ChevronDown className="w-3.5 h-3.5 stroke-[3] text-slate-950" />
              </div>

              {/* Right Compass Filter Icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-amber-300 z-10">
                <Compass className="w-4 h-4" />
              </div>

              <select
                value={activeFilterTab}
                onChange={(e) => setActiveFilterTab(e.target.value as TabType)}
                className="w-full bg-[#0A2463] hover:bg-[#0c2b75] text-white font-extrabold text-[11px] sm:text-xs pr-9 pl-20 py-2.5 rounded-xl border-2 border-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer text-right appearance-none shadow-md transition-all"
                style={{ minHeight: "42px" }}
              >
                <option value="all">📁 إجمالي المسجلين ({animatedAdminTotalLeadsCount} طالب) ▾</option>
                <option value="new">⏳ جديد لم يتم التواصل ▾</option>
                <option value="completed">✓ طلاب تم التواصل معهم ▾</option>
                <option value="no_reply">📞 لم يتم الرد ▾</option>
                <option value="callbacks">📞 طلب اتصال سريع ▾</option>
                <option value="complaints">📢 الشكاوى والمقترحات ▾</option>
                <option value="stats">📊 إحصائيات فورية ▾</option>
                <option value="alert_config">🔊 نظام رنين وتنبيهات ▾</option>
                <option value="sales_performance">💼 تقييم أداء Sales ▾</option>
                <option value="pdf_leads">📄 مسجلي روابط PDF ▾</option>
                <option value="parent_registrations">👨‍👩‍👦 بوابة أولياء الأمور ▾</option>
                <option value="free_shadowing_tickets">🎟️ تذاكر المعايشة المجانية ▾</option>
                <option value="partnerships_and_hiring">💼 توطيد الشراكات والتوظيف ▾</option>
                <option value="live_tracker_manager">🟢 تحديث حالات ملفات الطلاب ▾</option>
                <option value="pdf_library">📚 مكتبة كتب الوزارة والـ PDF ▾</option>
                <option value="department_manager">🏢 إدارة الأقسام الإدارية والـ ROI ▾</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/api/admin/export/students-excel"
              download={`students_database_${new Date().toISOString().slice(0, 10)}.xlsx`}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md border border-emerald-500/40"
              style={{ minHeight: "38px" }}
              title="تحميل كشف جميع الطلاب بصيغة Excel حقيقية (.xlsx) بأعمدة منفصلة ومنسقة"
              id="admin-btn-export-excel"
            >
              <span>تحميل كشف الطلاب (Excel .xlsx) 📗</span>
            </a>

            <button
              onClick={() => {
                setPdfReportPasswordInput("");
                setPdfReportPasswordError(false);
                setShowExecutiveReportPasswordModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 hover:from-indigo-800 hover:to-purple-800 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md border border-indigo-400/30"
              style={{ minHeight: "38px" }}
              id="admin-btn-executive-pdf"
            >
              <Award className="w-4 h-4 text-amber-300 shrink-0" />
              <span>تقارير الإدارة PDF 📊</span>
            </button>

            <button
              onClick={() => fetchAdminData(false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              style={{ minHeight: "38px" }}
            >
              <span>{loading ? "جاري..." : "تحديث فوري 🔄"}</span>
            </button>

            <button
              onClick={handleSignout}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition cursor-pointer"
              style={{ minHeight: "38px" }}
            >
              <span>تسجيل الخروج 🚪</span>
            </button>
          </div>
        </div>
      </div>

      {/* C. Interactive Tab buttons (Counters Tab Controls - Clean Borderless Design - Desktop Only) */}
      <div ref={adminCounterRef} className="mb-6 w-full hidden md:block">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-right">
          
          {/* Tab 1: All admission list */}
          <button
            onClick={() => setActiveFilterTab("all")}
            className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
              activeFilterTab === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-md transform -translate-y-0.5"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-350"
            }`}
          >
            <span className="text-[11px] font-bold block opacity-75">إجمالي المسجلين</span>
            <strong className="text-xl font-black block mt-1 leading-none font-mono">
              {animatedAdminTotalLeadsCount} طالب
            </strong>
            <div className="absolute top-3 left-3 text-sm">📁</div>
          </button>

            {/* Tab 2: New Students */}
            <button
              onClick={() => setActiveFilterTab("new")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "new"
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md transform -translate-y-0.5"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black block opacity-95">جديد لم يتم التواصل</span>
                {adminLeads.filter(l => l.status === "pending" || !l.status).length > 0 && (
                  <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">جديد</span>
                )}
              </div>
              <strong className="text-xl font-black block mt-1 leading-none font-mono">
                {adminLeads.filter(l => l.status === "pending" || !l.status).length} طالب
              </strong>
              <div className="absolute top-3 left-3 text-sm">⏳</div>
            </button>

            {/* Tab 3: Completed */}
            <button
              onClick={() => setActiveFilterTab("completed")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "completed"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md transform -translate-y-0.5"
                  : "bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span className="text-[11px] font-black block opacity-75">طلاب تم التواصل معهم</span>
              <strong className="text-xl font-black block mt-1 leading-none font-mono">
                {adminLeads.filter(l => l.status === "completed").length} طالب
              </strong>
              <div className="absolute top-3 left-3 text-sm">✓</div>
            </button>

            {/* Tab 4: No reply */}
            <button
              onClick={() => setActiveFilterTab("no_reply")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "no_reply"
                  ? "bg-orange-600 text-white border-orange-600 shadow-md transform -translate-y-0.5"
                  : "bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100"
              }`}
            >
              <span className="text-[11px] font-bold block opacity-75">لم يتم الرد</span>
              <strong className="text-xl font-black block mt-1 leading-none font-mono">
                {adminLeads.filter(l => l.status === "no_reply").length} طالب
              </strong>
              <div className="absolute top-3 left-3 text-sm">📞</div>
            </button>

            {/* Tab 5: Callbacks */}
            <button
              onClick={() => setActiveFilterTab("callbacks")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "callbacks"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5"
                  : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-amber-100"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black block opacity-75">طلب اتصال سريع</span>
                {adminCallbacks.filter(c => c.status === "pending" || !c.status).length > 0 && (
                  <span className="bg-red-500 text-white rounded-full w-2 h-2 animate-ping" />
                )}
              </div>
              <strong className="text-xl font-black block mt-1 leading-none font-mono">
                {adminCallbacks.length} طلب
              </strong>
              <div className="absolute top-3 left-3 text-sm">📞</div>
            </button>

            {/* Tab 6: Complaints */}
            <button
              onClick={() => setActiveFilterTab("complaints")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "complaints"
                  ? "bg-rose-500 text-white border-rose-500 shadow-md transform -translate-y-0.5"
                  : "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100"
              }`}
            >
              <span className="text-[11px] font-bold block opacity-75">الشكاوى والمقترحات</span>
              <strong className="text-xl font-black block mt-1 leading-none font-mono">
                {adminComplaints.length} إرسال
              </strong>
              <div className="absolute top-3 left-3 text-sm">📢</div>
            </button>

            {/* Tab 7: Stats */}
            <button
              onClick={() => setActiveFilterTab("stats")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "stats"
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-md transform -translate-y-0.5"
                  : "bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span className="text-[11px] font-bold block opacity-75">إحصائيات فورية 📊</span>
              <strong className="text-xs font-black block mt-2 leading-none whitespace-nowrap">
                مخطط ونسب الطلب حياً
              </strong>
              <div className="absolute top-3 left-3 text-sm">📈</div>
            </button>

            {/* Tab 8: Alert Config */}
            <button
              onClick={() => setActiveFilterTab("alert_config")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "alert_config"
                  ? "bg-[#4338ca] text-white border-[#4338ca] shadow-md transform -translate-y-0.5"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-350"
              }`}
            >
              <span className="text-[11px] font-bold block opacity-75">خيارات التنبيهات ونظام الرنين</span>
              <strong className="text-xs font-black block mt-2 leading-none whitespace-nowrap">
                نظام الرنين والتنبيهات
              </strong>
              <div className="absolute top-3 left-3 text-sm">🔊</div>
            </button>

            {/* Tab 9: Sales performance */}
            <button
              onClick={() => setActiveFilterTab("sales_performance")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "sales_performance"
                  ? "bg-amber-600 text-white border-amber-600 shadow-md transform -translate-y-0.5 font-bold"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-350"
              }`}
            >
              <span className="text-[11px] font-bold block opacity-75">أداء مستشاري المبيعات والتسجيل</span>
              <strong className="text-xs font-black block mt-2 leading-none whitespace-nowrap font-sans">
                كشوف السيلز والمتابعة
              </strong>
              <div className="absolute top-3 left-3 text-sm">🏆</div>
            </button>

            {/* Tab: PDF Leads Download Log */}
            <button
              onClick={() => setActiveFilterTab("pdf_leads")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "pdf_leads"
                  ? "bg-teal-600 text-white border-teal-600 shadow-md transform -translate-y-0.5"
                  : "bg-teal-50 text-teal-950 border-teal-200 hover:bg-teal-100"
              }`}
              id="admin-tab-pdf-leads"
            >
              <span className="text-[11px] font-bold block opacity-75">محملي الملفات التعريفية PDF 📑</span>
              <strong className="text-xs font-black block mt-2 leading-none whitespace-nowrap">
                {adminPdfLeads.length} تحميلات نشطة
              </strong>
              <div className="absolute top-3 left-3 text-sm">📄</div>
            </button>

            {/* Tab 11: Parent Registrations */}
            <button
              onClick={() => setActiveFilterTab("parent_registrations")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "parent_registrations"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md transform -translate-y-0.5"
                  : "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
              }`}
              id="admin-tab-parent-regs"
            >
              <span className="text-[11px] font-bold block opacity-75 font-sans">تسجيلات أولياء الأمور 👨‍👩‍👦</span>
              <strong className="text-sm font-black block mt-1 leading-none font-mono">
                {parentInquiries.length} طلبات عوائل
              </strong>
              <div className="absolute top-3 left-3 text-sm">👨‍👩‍👦</div>
            </button>

            {/* Tab 12: Free shadowing tickets */}
            <button
              onClick={() => setActiveFilterTab("free_shadowing_tickets")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "free_shadowing_tickets"
                  ? "bg-teal-600 text-white border-teal-600 shadow-md transform -translate-y-0.5"
                  : "bg-teal-50 text-teal-950 border-teal-200 hover:bg-teal-100"
              }`}
              id="admin-tab-shadow-tickets"
            >
              <span className="text-[11px] font-bold block opacity-75">تذاكر الحضور المجانية 🎫</span>
              <strong className="text-sm font-black block mt-1 leading-none font-mono">
                {shadowTickets.length} تذكرة حضور
              </strong>
              <div className="absolute top-3 left-3 text-sm">🎫</div>
            </button>

            {/* Tab 13: Corporate partnerships and recruitment */}
            <button
              onClick={() => setActiveFilterTab("partnerships_and_hiring")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "partnerships_and_hiring"
                  ? "bg-indigo-700 text-white border-indigo-700 shadow-md transform -translate-y-0.5"
                  : "bg-indigo-50 text-indigo-950 border-indigo-200 hover:bg-indigo-100"
              }`}
              id="admin-tab-partnerships"
            >
              <span className="text-[11px] font-bold block opacity-75">بوابة توطيد الشراكات والتوظيف 💼</span>
              <strong className="text-sm font-black block mt-1 leading-none font-mono">
                {partnershipLeads.length} جهة استقطاب
              </strong>
              <div className="absolute top-3 left-3 text-sm">🤝</div>
            </button>

            {/* Tab 14: Live state student tracker manager */}
            <button
              onClick={() => setActiveFilterTab("live_tracker_manager")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "live_tracker_manager"
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md transform -translate-y-0.5"
                  : "bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100"
              }`}
              id="admin-tab-tracker"
            >
              <span className="text-[11px] font-bold block opacity-75 font-sans">تحديث حالات ملفات الطلاب 🔍</span>
              <strong className="text-xs font-semibold block mt-1.5 leading-none">
                نظام تتبع الاستحقاق والدراسة
              </strong>
              <div className="absolute top-3 left-3 text-sm">📍</div>
            </button>

            {/* Tab 15: Library and Files Management */}
            <button
              onClick={() => setActiveFilterTab("pdf_library")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "pdf_library"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md transform -translate-y-0.5"
                  : "bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100"
              }`}
              id="admin-tab-pdf-library"
            >
              <span className="text-[11px] font-bold block opacity-75 font-sans">إدارة المكتبة والملفات (PDF) 📚</span>
              <strong className="text-xs font-semibold block mt-1.5 leading-none">
                تعديل كتيبات التخصصات وأدلة التحميل
              </strong>
              <div className="absolute top-3 left-3 text-sm">📚</div>
            </button>

            {/* Tab 16: Department Images Management */}
            <button
              onClick={() => setActiveFilterTab("department_manager")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "department_manager"
                  ? "bg-[#0A2463] text-white border-[#0A2463] shadow-md transform -translate-y-0.5 font-bold"
                  : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
              }`}
              id="admin-tab-department-manager"
            >
              <span className="text-[11px] font-bold block opacity-75 font-sans">إدارة صور وقوائم التخصصات 🖼️</span>
              <strong className="text-xs font-semibold block mt-1.5 leading-none">
                تغيير وحذف صور الأقسام والـ 17 شعبة
              </strong>
              <div className="absolute top-3 left-3 text-sm">🖼️</div>
            </button>

            {/* Tab 17: Partner Academy Portals (Option A) */}
            <button
              onClick={() => setActiveFilterTab("academy_portals")}
              className={`p-3 rounded-2xl border transition-all text-right flex flex-col justify-between font-sans w-full relative cursor-pointer ${
                activeFilterTab === "academy_portals"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md transform -translate-y-0.5 font-bold"
                  : "bg-indigo-50/80 text-indigo-950 border-indigo-200 hover:bg-indigo-100"
              }`}
              id="admin-tab-academy-portals"
            >
              <span className="text-[11px] font-bold block opacity-75 font-sans">روابط بوابات الأكاديميات 🏢</span>
              <strong className="text-xs font-semibold block mt-1.5 leading-none">
                نسخ وإرسال روابط كشوف الشركاء
              </strong>
              <div className="absolute top-3 left-3 text-sm">🏢</div>
            </button>

        </div>
      </div>

        {/* D. Main Listing Area with Search & Filters Segment */}
        <div className="bg-white p-2 sm:p-3 md:p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-2.5 sm:space-y-4 md:space-y-6">
          
          {/* 1. Collapsible smart search and quick filters block */}
          {(() => {
            const hasActiveFilters = 
              adminSearchQuery.trim() !== "" || 
              adminFilterDate !== "all" || 
              adminFilterGov !== "all" || 
              adminFilterDept !== "all" || 
              adminFilterAgent !== "all";

            const activeFiltersCount = [
              adminSearchQuery.trim() !== "",
              adminFilterDate !== "all",
              adminFilterGov !== "all",
              adminFilterDept !== "all",
              adminFilterAgent !== "all"
            ].filter(Boolean).length;

            const handleResetFilters = (e: React.MouseEvent) => {
              e.stopPropagation();
              setAdminSearchQuery("");
              setAdminFilterDate("all");
              setAdminFilterGov("all");
              setAdminFilterDept("all");
              setAdminFilterAgent("all");
              toast.success("تم إعادة ضبط كافة التصفيات والبحث بنجاح 🔄");
            };

            return (
              <div className="bg-slate-50 rounded-2xl border border-slate-205 overflow-hidden transition-all shadow-3xs">
                {/* Collapsible Header Bar (Clickable) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsFilterBarOpen(!isFilterBarOpen);
                    }
                  }}
                  className="w-full p-2.5 sm:p-3.5 bg-slate-100/80 hover:bg-slate-200/60 transition flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-right cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4 text-amber-600 animate-spin-slow" />
                    </span>
                    <span className="text-[11px] sm:text-xs font-black text-slate-850">
                      شريط الفرز والبحث المتقدم الذكي (تصفية تامة للمسجلين)
                    </span>
                    
                    {hasActiveFilters ? (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-3xs">
                        <Filter className="w-3 h-3" />
                        <span>نشط ({activeFiltersCount} تصفية)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md hidden sm:inline">
                        (اضغط لفتح/غلق قائمة الفلترة ▾)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mr-auto sm:mr-0">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[10.5px] font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="إعادة ضبط الفلاتر"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">إعادة ضبط</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 bg-white border border-slate-250 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-slate-50 transition">
                      <span>{isFilterBarOpen ? "إخفاء الفلترة" : "عرض الفلترة والبحث"}</span>
                      {isFilterBarOpen ? (
                        <ChevronUp className="w-4 h-4 text-amber-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Always-Visible Quick Search Preview when Collapsed & Filter Active */}
                {!isFilterBarOpen && hasActiveFilters && (
                  <div className="px-3 py-2 bg-amber-50/60 border-t border-amber-200/50 flex items-center justify-between text-xs font-bold text-amber-900">
                    <div className="flex items-center gap-2 truncate">
                      <span>🔍 نتائج التصفية النشطة:</span>
                      {adminSearchQuery && <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">البحث: "{adminSearchQuery}"</span>}
                      {adminFilterGov !== "all" && <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">المحافظة: {adminFilterGov}</span>}
                      {adminFilterDate !== "all" && <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">التاريخ: {adminFilterDate}</span>}
                    </div>
                    <button
                      onClick={() => setIsFilterBarOpen(true)}
                      className="text-[10.5px] underline font-extrabold text-amber-700 hover:text-amber-900 shrink-0 mr-2 cursor-pointer"
                    >
                      تعديل ✎
                    </button>
                  </div>
                )}

                {/* Collapsible Content Body */}
                {isFilterBarOpen && (
                  <div className="p-3 sm:p-4 border-t border-slate-200 flex flex-col gap-3 animate-fade-in bg-slate-50/70">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">
                      💡 استخدم هذه الحقول لتحديد البحث المباشر في قاعدة بيانات الطلاب:
                    </div>

                    <div className="flex flex-col md:grid md:grid-cols-12 gap-2 sm:gap-3.5 w-full">
                      {/* Search box */}
                      <div className="md:col-span-4 relative">
                        <label className="text-[10px] font-extrabold text-slate-650 block mb-1">🔍 ابحث باسم الطالب، رقم هاتفه، أو كود الحجز:</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            placeholder="امسح واكتب للبحث الفوري..."
                            className="w-full bg-white border border-slate-205 font-bold text-xs text-slate-800 rounded-lg p-1.5 sm:p-2.5 pr-8 focus:ring-1 focus:ring-amber-500 focus:outline-none text-right shadow-3xs"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Date Filter */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-extrabold text-slate-650 block mb-1">📆 فترة التسجيل :</label>
                        <select
                          value={adminFilterDate}
                          onChange={(e) => setAdminFilterDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 font-bold text-xs text-slate-800 rounded-lg p-1.5 sm:p-2.5 focus:ring-1 focus:ring-amber-500 cursor-pointer text-right shadow-3xs"
                        >
                          <option value="all">📁 جميع التواريخ (الكل)</option>
                          <option value="today">🌞 سجلات اليوم فقط</option>
                          <option value="yesterday_today">🗓️ سجلات اليوم وأمس</option>
                          <option value="week">⏳ آخر 7 أيام</option>
                          <option value="month">📊 سجلات هذا الشهر</option>
                        </select>
                      </div>

                      {/* Governorate flag filter */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-extrabold text-slate-650 block mb-1">📍 المحافظة الجغرافية:</label>
                        <select
                          value={adminFilterGov}
                          onChange={(e) => setAdminFilterGov(e.target.value)}
                          className="w-full bg-white border border-slate-200 font-bold text-xs text-slate-800 rounded-lg p-1.5 sm:p-2.5 focus:ring-1 focus:ring-amber-500 cursor-pointer text-right shadow-3xs"
                        >
                          <option value="all">🗺️ جميع المحافظات ({uniqueGovs.length})</option>
                          {uniqueGovs.map((gov: any) => (
                            <option key={gov} value={gov}>📍 {gov}</option>
                          ))}
                        </select>
                      </div>

                      {/* Department study course */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-extrabold text-slate-650 block mb-1">📚 التخصص والشعبة المهتم بها:</label>
                        <select
                          value={adminFilterDept}
                          onChange={(e) => setAdminFilterDept(e.target.value)}
                          className="w-full bg-white border border-slate-200 font-bold text-xs text-slate-800 rounded-lg p-1.5 sm:p-2.5 focus:ring-1 focus:ring-amber-500 cursor-pointer text-right shadow-3xs"
                        >
                          <option value="all">🎓 جميع الأقسام والدورات</option>
                          {ACADEMY_DEPARTMENTS.map((dept) => (
                            <option key={dept.id} value={dept.id}>📚 {dept.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Assigned Representative */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-extrabold text-slate-650">👤 مستشار السيلز المتابع:</label>
                          <button
                            type="button"
                            onClick={() => setShowFilterManagerModal(true)}
                            className="text-[9.5px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition"
                            title="تخصيص مستشاري الفلتر وحذفهم أو تحويل طلابهم"
                          >
                            <Settings2 className="w-2.5 h-2.5" />
                            <span>تخصيص الفلتر / تحويل</span>
                          </button>
                        </div>
                        <select
                          value={adminFilterAgent}
                          onChange={(e) => setAdminFilterAgent(e.target.value)}
                          className="w-full bg-white border border-slate-200 font-bold text-xs text-slate-800 rounded-lg p-1.5 sm:p-2.5 focus:ring-1 focus:ring-amber-500 cursor-pointer text-right shadow-3xs"
                        >
                          <option value="all">👥 جميع مستشاري المبيعات ({adminLeads.length} طالب)</option>
                          <option value="unassigned">⚠️ طلاب بدون موظف سيلز ({adminLeads.filter(l => !l.agentName || !l.agentName.trim()).length} طالب)</option>
                          {activeSalesReps.map((rep: string) => {
                            const stats = salesRepsStatsMap[rep];
                            const count = stats?.count || 0;
                            const countLabel = count === 1 ? "طالب واحد" : count === 2 ? "طالبان" : (count >= 3 && count <= 10) ? `${count} طلاب` : `${count} طالب`;
                            const lastTime = stats?.lastDateFormatted ? ` — ⏱️ آخر طالب: ${stats.lastDateFormatted}` : '';
                            const studentNote = stats?.lastStudentName ? ` (${stats.lastStudentName})` : '';
                            return (
                              <option key={rep} value={rep}>
                                📞 سيلز: {rep} ({countLabel}){lastTime}{studentNote}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Active Filter Notice & Bulk Transfer Action Bar */}
                    {adminFilterAgent !== "all" && adminFilterAgent !== "unassigned" && (
                      <div className="mt-3 p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in">
                        <div className="flex flex-wrap items-center gap-2 text-indigo-950 font-bold">
                          <span>أنت الآن تستعرض طلاب السيلز:</span>
                          <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-3xs">
                            {adminFilterAgent}
                          </span>
                          <span className="text-slate-600 font-bold">
                            ({salesRepsStatsMap[adminFilterAgent]?.count || repLeadsCountMap[adminFilterAgent] || 0} طالب مسجل)
                          </span>
                          {salesRepsStatsMap[adminFilterAgent]?.lastDateFormatted && (
                            <span className="text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-lg border border-purple-200 text-[11px] font-mono">
                              ⏱️ آخر طالب: {salesRepsStatsMap[adminFilterAgent]?.lastDateFormatted}
                              {salesRepsStatsMap[adminFilterAgent]?.lastStudentName ? ` (${salesRepsStatsMap[adminFilterAgent]?.lastStudentName})` : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkReassignModal({
                                isOpen: true,
                                fromAgent: adminFilterAgent,
                                toAgent: "",
                                leadsCount: repLeadsCountMap[adminFilterAgent] || 0,
                                step: 1,
                                password: "",
                                error: null,
                                loading: false
                              });
                            }}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer shadow-3xs"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>تحويل جميع طلاب ({adminFilterAgent}) لسيلز آخر 🔄</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleHideRepFromFilter(adminFilterAgent);
                              setAdminFilterAgent("all");
                              toast.success(`تم حذف/إخفاء (${adminFilterAgent}) من قائمة البحث.`);
                            }}
                            className="px-2 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 font-bold rounded-lg text-[10.5px] flex items-center gap-1 cursor-pointer transition"
                            title="إخفاء هذا السيلز من قائمة خيارات البحث"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>حذف من قائمة الفلتر</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. Database Grid / Render List according to Tabs */}
          <div className="space-y-4">
            
            {activeFilterTab === "complaints" ? (
              /* PANEL A: COMPLAINTS RENDERING LIST */
              <div className="space-y-4 text-right">
                <div className="p-4 bg-rose-50 border-r-4 border-rose-500 rounded-2xl flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <p className="text-xs text-rose-800 font-bold">صندوق الوارد للشكاوى والمقترحات (سرية تامة لحفظ الخصوصية)</p>
                </div>

                {adminComplaints.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <ShieldAlert className="w-12 h-12 text-slate-200 mb-3" />
                    <span className="text-xs font-bold">صندوق وارد المقترحات فارغ تماماً حالياً. 👍</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                    {adminComplaints.map((item) => (
                      <div key={item.id} className="block bg-white p-2.5 sm:p-4 rounded-xl mb-2 sm:mb-0 border border-slate-200 hover:border-rose-400 transition-all relative space-y-2 sm:space-y-3 shadow-xs text-right">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 sm:pb-2.5">
                          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${
                            item.type === "complaint" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}>
                            {item.type === "complaint" ? "⚠️ شكوى رسمية من عميل" : "💡 فكرة / مقترح تطوير"}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-slate-450 font-mono">{item.date}</span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                            <span>{item.studentName}</span>
                          </h4>
                          
                          {/* Quick Dial and Copy */}
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400 font-sans">رقم الهاتف:</span>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-950 font-bold">{item.phoneNumber}</strong>
                              <a
                                href={`tel:${item.phoneNumber}`}
                                className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                                style={{ minWidth: "26px", minHeight: "26px" }}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleCopySingleNumber(item.phoneNumber)}
                                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                                style={{ minWidth: "26px", minHeight: "26px" }}
                              >
                                {copiedFeedback === item.phoneNumber ? "✓" : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-100 leading-relaxed font-sans text-right">
                          <strong className="text-[10px] text-rose-600 block mb-1 font-bold">تفاصيل الشكوى المقدمة:</strong>
                          "{item.text}"
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              triggerSecureDelete("complaint", item.id, item.studentName || "مشتكي", () => {
                                handleDeleteItem("complaint", item.id);
                              });
                            }}
                            className="text-xs text-rose-600 hover:text-red-700 transition flex items-center gap-1 p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-[10px] text-red-655 font-bold">حذف الإرسال</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeFilterTab === "callbacks" ? (
              /* PANEL B: CALLBACK REQUEST RENDERING LIST */
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border-r-4 border-blue-500 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-right">
                  <p className="text-xs text-blue-900 font-bold">قائمة الاستعلامات وطلبات الاتصال الهاتفي السريع من أولياء الأمور والطلاب الجدد 📞</p>
                  <button
                    onClick={() => {
                      const phoneNumbers = filteredCallbacksList.map(c => c.phoneNumber).filter(Boolean);
                      if (phoneNumbers.length === 0) {
                        alert("لا توجد أرقام هواتف لتصديرها!");
                        return;
                      }
                      navigator.clipboard.writeText(phoneNumbers.join(", "));
                      alert("✓ تم نسخ أرقام طلبات الاتصال الهاتفي السريعة المفلترة بنجاح!");
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold shadow-3xs"
                  >
                    📋 نسخ أرقام الهواتف لهذه القائمة المصفاة
                  </button>
                </div>

                {filteredCallbacksList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-bold">لا توجد طلبات اتصال مطابقة للبحث حالياً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                    {filteredCallbacksList.map((cb) => (
                      <div key={cb.id} className={`block bg-white p-2.5 sm:p-4 rounded-xl mb-2 sm:mb-0 border transition-all space-y-2 sm:space-y-3 shadow-xs text-right overflow-hidden ${
                        cb.status === 'completed' ? 'border-slate-200 opacity-80' : 'border-amber-350 bg-amber-50/10'
                      }`}>
                        
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 sm:pb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[8.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full ${
                              cb.status === "completed" ? "bg-slate-150 text-slate-700" : "bg-amber-500 text-slate-950 animate-pulse"
                            }`}>
                              {cb.status === "completed" ? "✓ تم مكالمته" : "⏳ انتظار مكالمة"}
                            </span>
                            {cb.agentName ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignModal({
                                    isOpen: true,
                                    type: "callback",
                                    id: cb.id,
                                    studentName: cb.studentName || cb.phoneNumber,
                                    currentAgent: cb.agentName || "",
                                    phone: cb.phoneNumber
                                  });
                                  setReassignStep(1);
                                  setReassignSelectedAgent(cb.agentName || "");
                                  setReassignCustomAgentInput("");
                                  setReassignPasswordInput("");
                                  setShowReassignPassword(false);
                                  setReassignError(null);
                                }}
                                className="text-[8.5px] sm:text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-150 px-1.5 sm:px-2 py-0.5 rounded font-black max-w-[130px] truncate cursor-pointer transition flex items-center gap-1"
                                title="تغيير مسؤول الاتصال (بكلمة مرور الإدارة)"
                              >
                                <span>المسؤول: {cb.agentName}</span>
                                <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignModal({
                                    isOpen: true,
                                    type: "callback",
                                    id: cb.id,
                                    studentName: cb.studentName || cb.phoneNumber,
                                    currentAgent: "",
                                    phone: cb.phoneNumber
                                  });
                                  setReassignStep(1);
                                  setReassignSelectedAgent(activeSalesReps[0] || "");
                                  setReassignCustomAgentInput("");
                                  setReassignPasswordInput("");
                                  setShowReassignPassword(false);
                                  setReassignError(null);
                                }}
                                className="text-[8.5px] sm:text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-1.5 sm:px-2 py-0.5 rounded font-bold cursor-pointer transition flex items-center gap-1"
                                title="تعيين مستشار اتصال"
                              >
                                <UserPlus className="w-2.5 h-2.5 text-amber-700" />
                                <span>تعيين سيلز</span>
                              </button>
                            )}
                          </div>
                          <span className="text-[8.5px] sm:text-[10px] text-slate-400 font-mono">{cb.date}</span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                            <span>{cb.studentName || "عميل اتصال غير مسمى الاسم"}</span>
                          </h4>

                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-mono">
                            <span className="text-slate-400 font-sans">الهاتف للتواصل الهاتفي:</span>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-950 font-bold">{cb.phoneNumber}</strong>
                              <a
                                href={`tel:${cb.phoneNumber}`}
                                className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                                style={{ minWidth: "26px", minHeight: "26px" }}
                              >
                                <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                              </a>
                              <a
                                href={getWhatsAppLink(cb.phoneNumber, cb.studentName || "مستعلم")}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-emerald-55 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                                style={{ minWidth: "26px", minHeight: "26px" }}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleCopySingleNumber(cb.phoneNumber)}
                                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                                style={{ minWidth: "26px", minHeight: "26px" }}
                              >
                                {copiedFeedback === cb.phoneNumber ? "✓" : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Internal Note */}
                        <div className="bg-slate-900 p-2.5 rounded-lg text-xs text-white border border-slate-800 text-right space-y-1">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1.5">
                            <span className="text-[10px] text-amber-400 font-bold">🔐 تعليق داخلي للسيلز:</span>
                            {editingNoteId !== cb.id ? (
                              <button
                                onClick={() => {
                                  setEditingNoteId(cb.id);
                                  setTempNoteText(cb.internalNotes || "");
                                }}
                                className="text-[9px] text-amber-300 font-bold underline"
                              >
                                {cb.internalNotes ? "تعديل ✍️" : "تسجيل ملاحظات ➕"}
                              </button>
                            ) : null}
                          </div>

                          {editingNoteId === cb.id ? (
                            <div className="space-y-1.5">
                              <textarea
                                value={tempNoteText}
                                onChange={(e) => setTempNoteText(e.target.value)}
                                className="w-full p-2 bg-slate-950 text-white rounded text-xs text-right border border-slate-751 focus:outline-none focus:border-amber-400"
                                rows={2}
                                placeholder="اكتب ملاحظة العميل هنا..."
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveInternalNote("callback", cb.id)}
                                  className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold text-[10px] rounded"
                                >
                                  حفظ ✓
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-300 italic">"{cb.internalNotes || 'لا توجد ملاحظات داخلية مكتوبة للمستعلم'}"</p>
                          )}
                        </div>

                        {/* Status Checkbox Operations */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 w-full text-right animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-2 w-full">
                            <div className="flex gap-1.5">
                              {cb.status === "completed" ? (
                                <button
                                  onClick={() => handleUpdateStatus("callback", cb.id, "pending")}
                                  className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-lg cursor-pointer"
                                >
                                  إرجاع للانتظار ⏳
                                </button>
                              ) : (
                                <>
                                  {callbackPromptId === cb.id ? (
                                    <div className="mt-1 p-2.5 bg-slate-50 border border-emerald-200 rounded-xl space-y-2 text-right w-full sm:max-w-xs">
                                      <label className="block text-[10px] font-black text-slate-705">أدخل اسم الموظف المسؤول عن المكالمة للتأكيد والتوثيق (إلزامي):</label>
                                      <input 
                                        type="text"
                                        value={callbackAgentInput}
                                        onChange={(e) => setCallbackAgentInput(e.target.value)}
                                        placeholder="اكتب اسم الموظف هنا..."
                                        className="w-full p-2 bg-white border border-slate-205 rounded-lg text-[11px] font-bold text-slate-850 text-right focus:border-emerald-500 focus:outline-none"
                                        autoFocus
                                      />
                                      {callbackError && (
                                        <p className="text-[10px] text-red-655 font-bold">{callbackError}</p>
                                      )}
                                      <div className="flex gap-1.5 justify-end">
                                        <button 
                                          onClick={() => {
                                            if (!callbackAgentInput.trim()) {
                                              setCallbackError("الاسم إلزامي لتوثيق المكالمة!");
                                              return;
                                            }
                                            handleUpdateStatus("callback", cb.id, "completed", callbackAgentInput.trim());
                                            setCallbackPromptId(null);
                                            setCallbackAgentInput("");
                                            setCallbackError("");
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer rounded text-[10px] font-bold"
                                        >
                                          تأكيد وحفظ 💾
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setCallbackPromptId(null);
                                            setCallbackAgentInput("");
                                            setCallbackError("");
                                          }}
                                          className="px-2.5 py-1 bg-slate-200 text-slate-650 hover:bg-slate-300 cursor-pointer rounded text-[10px]"
                                        >
                                          إلغاء
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setCallbackPromptId(cb.id);
                                        setCallbackAgentInput("");
                                        setCallbackError("");
                                      }}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black text-white hover:text-white rounded-lg transition cursor-pointer"
                                    >
                                      تم مكالمته وتوثيق التواصل ✓
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                triggerSecureDelete("callback", cb.id, cb.studentName || "عميل", () => {
                                  handleDeleteItem("callback", cb.id);
                                });
                              }}
                              className="text-slate-400 hover:text-red-550 border-r border-slate-100 pr-2 pl-1 flex items-center gap-1 text-xs cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-[10px] text-red-655 font-bold">حذفه</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeFilterTab === "stats" ? (
              /* PANEL D: STATS PANEL */
              <div className="space-y-6 text-right animate-fade-in">
                <div className="p-4 bg-violet-50 border-r-4 border-violet-500 rounded-2xl flex items-center gap-2">
                  <Compass className="w-5 h-5 text-violet-600 shrink-0" />
                  <p className="text-xs text-violet-800 font-bold">لوحة الإحصائيات الفورية والتحليلات البيانية الذكية لحركة التحاق الطلاب</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between text-right">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">🎯 إجمالي الطلاب المسجلين</span>
                    <strong className="text-2xl font-black block text-slate-900 font-mono">{animatedAdminTotalLeadsCount} طالب</strong>
                    <span className="text-[10px] text-slate-400 mt-2 block">في كل التخصصات والمستويات</span>
                  </div>

                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between text-right">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">⏳ جديد بانتظار التواصل والاستعلام</span>
                    <strong className="text-2xl font-black block text-amber-600 font-mono">{adminLeads.filter(l => l.status === "pending" || !l.status).length} طالب</strong>
                    <span className="text-[10px] text-slate-400 mt-2 block">يحتاجون إلى ترحيل فوري لمستشاري المبيعات</span>
                  </div>

                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between text-right">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">✓ تم التواصل والتعميد بنجاح</span>
                    <strong className="text-2xl font-black block text-emerald-600 font-mono">{adminLeads.filter(l => l.status === "completed").length} طالب</strong>
                    <span className="text-[10px] text-slate-400 mt-2 block">معدل الإنجاز العام: <strong className="font-sans text-emerald-700">{adminLeads.length > 0 ? ((adminLeads.filter(l => l.status === "completed").length / adminLeads.length) * 100).toFixed(1) : "0"}%</strong></span>
                  </div>

                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between text-right">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">📞 طلاب لم يرد عليهم تليفونياً</span>
                    <strong className="text-2xl font-black block text-orange-600 font-mono">{adminLeads.filter(l => l.status === "no_reply").length} طالب</strong>
                    <span className="text-[10px] text-slate-400 mt-2 block">ممن تمت محاولات الاتصال بهم من Sales</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Governorate performance */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs space-y-4 text-right">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 justify-end">
                      <span>🗺️ النطاق الجغرافي للطلاب (أعلى المحافظات حضوراً)</span>
                    </h3>
                    <div className="space-y-3.5">
                      {govData.length === 0 ? (
                        <p className="text-xs text-slate-400">لا توجد بيانات جغرافية مخزنة للطلاب بعد.</p>
                      ) : (
                        govData.map((item, i) => {
                          const maxVal = Math.max(...govData.map(g => g.value), 1);
                          const pct = (item.value / maxVal) * 100;
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between items-center text-xs text-slate-700 font-bold" dir="rtl">
                                <span>📍 {item.name || "غير محدد"}</span>
                                <span>{item.value} طالب</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-gradient-to-l from-violet-550 from-violet-500 to-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Course demands */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-3xs space-y-4 text-right">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 justify-end">
                      <span>📚 التخصصات والأشعبة المهتم بها الطلاب</span>
                    </h3>
                    <div className="space-y-3.5">
                      {chartData.length === 0 ? (
                        <p className="text-xs text-slate-400">لا توجد سجلات تخصصات مسجلة للطلاب بعد.</p>
                      ) : (
                        chartData.map((item, i) => {
                          const maxVal = Math.max(...chartData.map(c => c.value), 1);
                          const pct = (item.value / maxVal) * 100;
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between items-center text-xs text-slate-700 font-bold" dir="rtl">
                                <span>📚 {item.name}</span>
                                <span>{item.value} طالب مهتم</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-gradient-to-l from-amber-500 to-orange-550 to-orange-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeFilterTab === "alert_config" ? (
              /* PANEL E: ALERT CONFIG PANEL */
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-3xs space-y-6 text-right animate-fade-in" dir="rtl">
                <div className="p-4 bg-indigo-50 border-r-4 border-indigo-500 rounded-2xl flex items-center gap-2">
                  <span className="text-base">🔊</span>
                  <p className="text-xs text-indigo-800 font-bold">خيارات التنبيهات المنبثقة وإعدادات نظام الرنين للإعلانات الطلابية الجديدة</p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-150 gap-3">
                    <div className="space-y-1 w-full sm:w-auto text-right">
                      <h4 className="text-xs font-black text-slate-900 font-sans text-right">تشغيل الرنين الموسيقي للإشعارات الجديدة بالتطبيق</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed text-right">سيصدر النظام صوت رنين منبه هادئ لتنبيه مسؤول الدعم فور حجز أو تسجيل أي طالب جديد لطلب الالتحاق.</p>
                    </div>
                    <button
                      onClick={() => setAlertSoundEnabled(!alertSoundEnabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-3xs min-w-[120px] transition-all cursor-pointer ${
                        alertSoundEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {alertSoundEnabled ? "مفعّل الرنين 🟢" : "معطّل الرنين 🛑"}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-150 gap-3">
                    <div className="space-y-1 w-full sm:w-auto text-right">
                      <h4 className="text-xs font-black text-slate-900 font-sans text-right">إنشاء وتوليد لافتات تنبيه منبثقة فورية (Toast Notification)</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed tracking-normal font-sans text-right">تنبيهات عائمة منبثقة تظهر أسفل الشاشة تخولك برؤية تفاصيل الطالب فوراً دون إعادة تحميل الصفحة يدوياً.</p>
                    </div>
                    <button
                      onClick={() => setAutoToastEnabled(!autoToastEnabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-3xs min-w-[120px] transition-all cursor-pointer ${
                        autoToastEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {autoToastEnabled ? "مفعّلة التنبيهات 🟢" : "معطّلة التنبيهات 🛑"}
                    </button>
                  </div>

                  <div className="flex justify-end pt-3 gap-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const oscillator = audioCtx.createOscillator();
                          const gainNode = audioCtx.createGain();
                          
                          oscillator.type = 'sine';
                          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 key sound
                          oscillator.connect(gainNode);
                          gainNode.connect(audioCtx.destination);
                          
                          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                          oscillator.start();
                          oscillator.stop(audioCtx.currentTime + 0.35);
                        } catch (err) {
                          console.error("Test ring error:", err);
                        }
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-3xs"
                    >
                      <span>🔊 اختبار مخرجات الرنين الفوري للأجهزة</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeFilterTab === "sales_performance" ? (
              /* PANEL F: SALES PERFORMANCE PANEL */
              <div className="space-y-6 text-right animate-fade-in" dir="rtl">
                <div className="p-4 bg-amber-50 border-r-4 border-amber-500 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-right">
                  <p className="text-xs text-amber-900 font-bold text-right">بوابة أداء مستشاري المبيعات والتسجيل - لوحة المخطط والنسب والإنتاج النشط للتواصل 🏆</p>
                </div>

                {/* Star Agent Designation Card */}
                {(() => {
                  let leader = "";
                  let maxCompleted = -1;
                  activeSalesReps.forEach(rep => {
                    const totalCompleted = adminLeads.filter(l => l.agentName?.trim() === rep && l.status === "completed").length;
                    if (totalCompleted > maxCompleted && totalCompleted > 0) {
                      maxCompleted = totalCompleted;
                      leader = rep;
                    }
                  });

                  if (!leader) return null;

                  return (
                    <div className="p-6 bg-gradient-to-l from-amber-500/10 via-white to-transparent border border-amber-300 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xs text-right">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center text-2xl shadow-md border border-amber-400">
                          🏆
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] text-amber-800 font-extrabold tracking-widest block uppercase text-right">قائد التسجيل ومستشار المبيعات الأعلى إنتاجاً</span>
                          <h4 className="text-base font-black text-slate-900 text-right">{leader}</h4>
                          <p className="text-xs text-slate-500 text-right">تمكن بنجاح من إقفال وتصفية ومتابعة وتثبيت <strong className="font-mono text-emerald-600">{maxCompleted} طالب</strong> في المنصة الإدارية بنجاح.</p>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-3xs cursor-default">
                        نجم الشهر الحالي ⭐
                      </div>
                    </div>
                  );
                })()}

                {/* Scoreboard table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden text-right">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-700 text-right">
                    كشف الترتيب العام وجرد كفاءة المبيعات والتعميد:
                  </div>

                  <div className="divide-y divide-slate-100">
                    {activeSalesReps.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 font-bold text-xs" dir="rtl">
                        ℹ️ لم يتم العثور على أي مستشار مبيعات مسجل بالمنظومة لغاية الآن. سيظهر المستشارون وأداؤهم هنا تلقائياً بمجرد تعيينهم وطباعة أسمائهم يدوياً على طلبات الاتصال أو قبول الطلاب بنجاح.
                      </div>
                    ) : (
                      activeSalesReps.map((rep) => {
                        const totalAssigned = adminLeads.filter(l => l.agentName?.trim() === rep).length;
                        const totalCompleted = adminLeads.filter(l => l.agentName?.trim() === rep && l.status === "completed").length;
                        const totalNoReply = adminLeads.filter(l => l.agentName?.trim() === rep && l.status === "no_reply").length;
                        const ratio = totalAssigned > 0 ? ((totalCompleted / totalAssigned) * 100).toFixed(0) : "0";

                        return (
                          <div key={rep} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-right">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <strong className="text-slate-900 text-sm">{rep}</strong>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <span className="text-slate-500">الطلاب المسندين: <strong className="text-slate-950 font-mono font-bold">{totalAssigned}</strong></span>
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-bold">تم التعميد: <strong className="font-mono font-black">{totalCompleted}</strong></span>
                              <span className="text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg font-bold">لم يرد تليفونياً: <strong className="font-mono font-bold">{totalNoReply}</strong></span>
                              <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg font-bold">معدل التحويل: <strong className="font-mono font-black">{ratio}%</strong></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Round-Robin Automated Lead Distribution Management Card */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 border border-indigo-700/50 rounded-2xl shadow-xl overflow-hidden text-right text-white p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-lg">🔄</span>
                        <h4 className="text-base font-black text-white">نظام التوزيع التلقائي العادل للطلاب (Round-Robin)</h4>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          roundRobinData?.enabled !== false
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}>
                          {roundRobinData?.enabled !== false ? "● التوزيع التلقائي نَشِط" : "⏸️ التوزيع التلقائي متوقف"}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200/80 max-w-3xl leading-relaxed">
                        عندما يسجل أي طالب من رابط الموقع الأساسي (أو الحملات الإعلانية العامة بدون رابط موظف معين)، يقوم النظام فوراً بإسناده تلقائياً إلى أحد مستشاري المبيعات بالتساوي والتناوب الدوري، ويظهر في حسابه وشيت جوجل فوراً دون أي تدخل يدوي.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                      <button
                        type="button"
                        disabled={isTogglingRoundRobin}
                        onClick={async () => {
                          setIsTogglingRoundRobin(true);
                          try {
                            const newEnabled = roundRobinData?.enabled === false ? true : false;
                            const res = await fetch("/api/admin/round-robin", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ enabled: newEnabled })
                            });
                            const json = await res.json();
                            if (json.success) {
                              toast.success(json.message || "تم تحديث إعدادات التوزيع التلقائي");
                              fetchRoundRobinStatus();
                            } else {
                              toast.error(json.error || "تعذر تحديث الحالة");
                            }
                          } catch (e: any) {
                            toast.error("خطأ في الاتصال: " + e.message);
                          } finally {
                            setIsTogglingRoundRobin(false);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer ${
                          roundRobinData?.enabled !== false
                            ? "bg-amber-600 hover:bg-amber-500 text-white"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        {isTogglingRoundRobin ? (
                          <span>⏳ جاري الحفظ...</span>
                        ) : roundRobinData?.enabled !== false ? (
                          <span>⏸️ إيقاف التوزيع مؤقتاً</span>
                        ) : (
                          <span>▶️ تفعيل التوزيع التلقائي الآن</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/admin/round-robin", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ resetIndex: true })
                            });
                            const json = await res.json();
                            if (json.success) {
                              toast.success(json.message);
                              fetchRoundRobinStatus();
                            }
                          } catch (e: any) {
                            toast.error("خطأ: " + e.message);
                          }
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                        title="إعادة مؤشر التوزيع للبدء من أول موظف"
                      >
                        ⏮️ البدء من أول موظف
                      </button>
                    </div>
                  </div>

                  {/* Status Indicator Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-800/80 border border-indigo-500/30 rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-bold text-indigo-300 block">🎯 الموظف القادم في الدور (Next Lead):</span>
                      <strong className="text-sm font-black text-emerald-400 block truncate">
                        {roundRobinData?.nextAgentName || "جاري التحديد..."}
                      </strong>
                      <span className="text-[10px] text-slate-400">سيتلقى الطالب القادم المسجل من الموقع مباشرة</span>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block">👤 آخر موظف تم إسناد طالب له:</span>
                      <strong className="text-sm font-black text-white block truncate">
                        {roundRobinData?.lastAssignedAgentName || "لم يبدأ بعد / من البداية"}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {roundRobinData?.lastAssignedAt
                          ? `بتاريخ: ${new Date(roundRobinData.lastAssignedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`
                          : "جاهز للتوزيع"}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block">👥 فريق السيلز المشمول في التوزيع:</span>
                      <strong className="text-sm font-black text-indigo-300 block">
                        {roundRobinData?.activeRepsCount || salesRepsDetailed.length} موظفاً نشطاً
                      </strong>
                      <span className="text-[10px] text-slate-400">يتم تدوير الطلاب عليهم بالتساوي 1:1</span>
                    </div>
                  </div>

                  {/* Live Queue Visualizer */}
                  {roundRobinData?.repsQueue && roundRobinData.repsQueue.length > 0 && (
                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                        <span>ترتيب دور السيلز الحالي في حلقة التوزيع:</span>
                        <span className="text-indigo-400 text-[10px]">المميز بالأخضر هو صاحب الدور التالي مباشرة</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        {roundRobinData.repsQueue.map((rep, idx) => (
                          <div
                            key={rep.id || rep.name || idx}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                              rep.isNext
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/40"
                                : rep.isLast
                                ? "bg-slate-800 border-slate-600 text-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-400"
                            }`}
                          >
                            <span className="text-[10px] opacity-70 font-mono">#{idx + 1}</span>
                            <span>{rep.name}</span>
                            {rep.isNext && <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1 rounded">التالي</span>}
                            {rep.isLast && <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded">الأخير</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sales Reps PIN & Passwords Management Panel */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden text-right space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>🔐 إدارة وتعيين كلمات مرور موظفي السيلز (PIN / Passwords)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        يمكنك تعديل باسوورد أي موظف سيلز، أو إضافة موظف جديد مباشرة من هذه اللوحة أو من ملف <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">/sales-reps.json</code>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setShowAddRepModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-3xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span>➕ إضافة مستشار سيلز جديد</span>
                      </button>
                      <div className="bg-indigo-50 text-indigo-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-indigo-100">
                        إجمالي المسجلين: {salesRepsDetailed.length}
                      </div>
                    </div>
                  </div>

                  {/* Modal / Form to Add New Sales Rep */}
                  {showAddRepModal && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-indigo-950">➕ تسجيل مستشار مبيعات جديد في النظام</h5>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddRepModal(false);
                            setNewRepName("");
                            setNewRepSlug("");
                            setNewRepPhone("");
                          }}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕ إغلاق
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">الاسم الكامل *</label>
                          <input
                            type="text"
                            value={newRepName}
                            onChange={(e) => {
                              setNewRepName(e.target.value);
                              if (!newRepSlug) {
                                setNewRepSlug(e.target.value.trim().toLowerCase().replace(/\s+/g, "_"));
                              }
                            }}
                            placeholder="مثال: سارة محمد"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">المعرف (Slug)</label>
                          <input
                            type="text"
                            value={newRepSlug}
                            onChange={(e) => setNewRepSlug(e.target.value)}
                            placeholder="sara_mohamed"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">رقم الهاتف / واتساب</label>
                          <input
                            type="text"
                            value={newRepPhone}
                            onChange={(e) => setNewRepPhone(e.target.value)}
                            placeholder="01012345678"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">كلمة المرور (PIN)</label>
                          <input
                            type="text"
                            value={newRepPin}
                            onChange={(e) => setNewRepPin(e.target.value)}
                            placeholder="1234"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddRepModal(false);
                            setNewRepName("");
                            setNewRepSlug("");
                            setNewRepPhone("");
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          disabled={isAddingRep}
                          onClick={async () => {
                            if (!newRepName.trim()) {
                              toast.error("يرجى إدخال اسم مستشار السيلز");
                              return;
                            }
                            setIsAddingRep(true);
                            try {
                              const res = await fetch("/api/sales-reps", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: newRepName.trim(),
                                  slug: newRepSlug.trim() || newRepName.trim().toLowerCase().replace(/\s+/g, "_"),
                                  phone: newRepPhone.trim() || "01000000000",
                                  title: newRepTitle.trim() || "مستشار القبول والتسجيل والمبيعات",
                                  pin: newRepPin.trim() || "1234",
                                  active: true
                                })
                              });
                              const data = await res.json();
                              if (data && data.success) {
                                toast.success(`✓ تم إضافة (${newRepName}) بنجاح!`);
                                const updatedList = data.reps || [];
                                setSalesRepsDetailed(updatedList);
                                setOfficialSalesReps(updatedList.map((r: any) => r.name?.trim()).filter(Boolean));
                                if (typeof window !== "undefined") {
                                  try {
                                    localStorage.setItem("admin_sales_reps_cache", JSON.stringify(updatedList));
                                    localStorage.setItem("dev_sales_reps_cache", JSON.stringify(updatedList));
                                  } catch (e) {}
                                }
                                setShowAddRepModal(false);
                                setNewRepName("");
                                setNewRepSlug("");
                                setNewRepPhone("");
                                setNewRepPin("1234");
                              } else {
                                toast.error(data?.error || "فشل إضافة السيلز");
                              }
                            } catch (err) {
                              toast.error("حدث خطأ أثناء الإضافة");
                            } finally {
                              setIsAddingRep(false);
                            }
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-3xs transition cursor-pointer"
                        >
                          {isAddingRep ? "جاري الإضافة..." : "حفظ الموظف ✓"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {salesRepsDetailed.map((rep) => {
                      const isEditing = editingRepPinId === rep.id;
                      const isSaving = savingPinId === rep.id;

                      return (
                        <div key={rep.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-2.5 hover:border-indigo-200 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <h5 className="font-extrabold text-xs text-slate-900">{rep.name}</h5>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">
                                المعرف: {rep.slug} | الهاتف: {rep.phone || "غير محدد"}
                              </p>
                            </div>
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                              {rep.title || "مستشار مبيعات"}
                            </span>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10.5px] font-bold text-slate-600">كلمة المرور / PIN:</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={newPinValue}
                                  onChange={(e) => setNewPinValue(e.target.value)}
                                  placeholder="اكتب الباسوورد الجديد..."
                                  className="w-32 bg-amber-50 border border-amber-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  autoFocus
                                />
                              ) : (
                                <strong className="font-mono text-indigo-700 text-xs tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {rep.pin || "1234"}
                                </strong>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={async () => {
                                      if (!newPinValue.trim()) {
                                        toast.error("يرجى كتابة كلمة المرور");
                                        return;
                                      }
                                      setSavingPinId(rep.id);
                                      try {
                                        const res = await fetch("/api/sales-reps", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            ...rep,
                                            pin: newPinValue.trim()
                                          })
                                        });
                                        const data = await res.json();
                                        if (data && data.success) {
                                          toast.success(`✓ تم حفظ باسوورد (${rep.name}) بنجاح!`);
                                          const updatedList = data.reps || [];
                                          setSalesRepsDetailed(updatedList);
                                          setOfficialSalesReps(updatedList.map((r: any) => r.name?.trim()).filter(Boolean));
                                          if (typeof window !== "undefined") {
                                            try {
                                              localStorage.setItem("admin_sales_reps_cache", JSON.stringify(updatedList));
                                              localStorage.setItem("dev_sales_reps_cache", JSON.stringify(updatedList));
                                            } catch (e) {}
                                          }
                                          setEditingRepPinId(null);
                                          setNewPinValue("");
                                        } else {
                                          toast.error("فشل حفظ التعديل");
                                        }
                                      } catch (err) {
                                        toast.error("حدث خطأ أثناء الحفظ");
                                      } finally {
                                        setSavingPinId(null);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {isSaving ? "جاري الحفظ..." : "حفظ ✓"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRepPinId(null);
                                      setNewPinValue("");
                                    }}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRepPinId(rep.id);
                                      setNewPinValue(rep.pin || "1234");
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                                  >
                                    <span>تعديل الباسوورد ✏️</span>
                                  </button>
                                  {confirmDeleteRepId === rep.id ? (
                                    <div className="flex items-center gap-1.5 animate-fadeIn">
                                      <button
                                        type="button"
                                        disabled={deletingRepId === rep.id}
                                        onClick={async () => {
                                          try {
                                            setDeletingRepId(rep.id);
                                            let res = await fetch("/api/sales-reps/delete", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ id: rep.id, slug: rep.slug, name: rep.name })
                                            });
                                            if (!res.ok) {
                                              res = await fetch(`/api/sales-reps/${encodeURIComponent(rep.id || rep.slug || rep.name)}`, {
                                                method: "DELETE"
                                              });
                                            }
                                            const data = await res.json();
                                            if (data && data.success) {
                                              toast.success(`✓ تم حذف حساب الموظف (${rep.name}) نهائياً`);
                                              const updatedList = data.reps || [];
                                              setSalesRepsDetailed(updatedList);
                                              setOfficialSalesReps(updatedList.map((r: any) => r.name?.trim()).filter(Boolean));
                                              if (typeof window !== "undefined") {
                                                try {
                                                  localStorage.setItem("admin_sales_reps_cache", JSON.stringify(updatedList));
                                                  localStorage.setItem("dev_sales_reps_cache", JSON.stringify(updatedList));
                                                  localStorage.setItem("sales_reps_cache", JSON.stringify(updatedList));
                                                } catch (e) {}
                                              }
                                              setAdminLeads(prev => prev.map(l => (l.agentName?.trim() === rep.name?.trim() ? { ...l, agentName: "" } : l)));
                                              setConfirmDeleteRepId(null);
                                            } else {
                                              toast.error(data?.error || "فشل حذف الموظف");
                                            }
                                          } catch (err) {
                                            toast.error("حدث خطأ أثناء حذف الموظف");
                                          } finally {
                                            setDeletingRepId(null);
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition cursor-pointer shadow-sm flex items-center gap-1"
                                      >
                                        {deletingRepId === rep.id ? <span>جاري الحذف...</span> : <span>تأكيد الحذف نهائياً ⚠️</span>}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={deletingRepId === rep.id}
                                        onClick={() => setConfirmDeleteRepId(null)}
                                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition cursor-pointer"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRepId(rep.id)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                                      title="حذف هذا الموظف نهائياً"
                                    >
                                      <span>حذف 🗑️</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : activeFilterTab === "parent_registrations" ? (
              /* PANEL H: PARENT REGISTRATIONS VIEW SCREEN */
              <div className="space-y-4 text-right animate-fade-in" dir="rtl" id="admin-parent-panel">
                <div className="p-4 bg-purple-50 border-r-4 border-purple-500 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-right">
                  <p className="text-xs text-purple-900 font-bold">تسجيلات أولياء الأمور وطلبات الحجز والتقسيط والمتابعة مع العوائل 👨‍👩‍👦</p>
                  <button
                    onClick={() => {
                      const phones = parentInquiries.map(p => p.parentPhone).filter(Boolean);
                      if (phones.length === 0) {
                        alert("لا توجد هواتف لتصديرها!");
                        return;
                      }
                      navigator.clipboard.writeText(phones.join(", "));
                      alert("تم نسخ جميع هواتف أولياء الأمور!");
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-3xs cursor-pointer"
                  >
                    📋 نسخ هواتف أولياء الأمور
                  </button>
                </div>

                {parentInquiries.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-bold">لا توجد تسجيلات من أولياء الأمور حالياً بالمنصة.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parentInquiries.map((item: any) => (
                      <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs text-right hover:border-purple-300 transition-all">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-purple-800 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                            👨‍👩‍👦 طلب ولي أمر VIP
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-purple-500 shrink-0" />
                            <span>اسم ولي الأمر: {item.parentName}</span>
                          </h4>
                          <p className="text-xs text-slate-600 font-bold">معدل الطالب التراكمي: <strong className="font-mono text-purple-705">%{item.studentGpa}</strong></p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-sans">هاتف ولي الأمر للتواصل:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900">{item.parentPhone}</strong>
                            <a
                              href={`tel:${item.parentPhone}`}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.parentPhone);
                                alert("تم النسخ!");
                              }}
                              className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded transition flex items-center justify-center shrink-0 cursor-pointer"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {item.preferredSlot && (
                          <div className="p-2 bg-amber-50 border border-amber-200 text-right text-amber-800 rounded-lg text-xs leading-relaxed font-semibold flex items-center gap-1.5 justify-end">
                            <span>{item.preferredSlot}</span>
                            <strong className="text-amber-600">🕰️</strong>
                          </div>
                        )}

                        {item.notes && (
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-705 leading-relaxed font-sans">
                            <strong className="text-[10px] text-slate-400 block mb-0.5 font-bold">الاستفسارات والدعم المالي المطلوب:</strong>
                            "{item.notes}"
                          </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              triggerSecureDelete("parent", item.id, item.parentName || "ولي أمر", () => {
                                const updated = parentInquiries.filter((p: any) => p.id !== item.id);
                                setParentInquiries(updated);
                                localStorage.setItem("academy_parent_inquiries", JSON.stringify(updated));
                              });
                            }}
                            className="text-xs text-rose-650 hover:text-red-700 transition flex items-center gap-1 p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-[10px] font-bold">حذف الاستفسار</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeFilterTab === "free_shadowing_tickets" ? (
              /* PANEL I: FREE SHADOWING TICKETS ADMISSION LIST */
              <div className="space-y-4 text-right animate-fade-in" dir="rtl" id="admin-tickets-panel">
                <div className="p-4 bg-teal-50 border-r-4 border-teal-500 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-right">
                  <p className="text-xs text-teal-900 font-bold">تذاكر الحضور المجانية لليوم الاستكشافي الميداني بالأكاديميات 🎫</p>
                  <button
                    onClick={() => {
                      const phones = shadowTickets.map(t => t.phoneNumber || t.phone).filter(Boolean);
                      if (phones.length === 0) {
                        alert("لا توجد هواتف للتصدير!");
                        return;
                      }
                      navigator.clipboard.writeText(phones.join(", "));
                      alert("تم نسخ جميع هواتف تذاكر المعاينة والمطابقة مجمعاً!");
                    }}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold shadow-3xs cursor-pointer"
                  >
                    📋 نسخ هواتف تذاكر الحضور
                  </button>
                </div>

                {shadowTickets.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-bold">لا توجد حجوزات لتذاكر اليوم الاستكشافي حالياً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shadowTickets.map((ticket: any) => (
                      <div key={ticket.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs text-right hover:border-teal-300 transition-all">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            ticket.confirmed ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-800 border border-amber-100"
                          }`}>
                            {ticket.confirmed ? "🟢 تم التأكيد هاتفياً ✓" : "⏳ انتظار المكالمة والتأكيد"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-450 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            كود التذكرة: #{ticket.ticketCode || ticket.code || "SHADOW-501"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <Ticket className="w-4 h-4 text-teal-500 shrink-0" />
                            <span>اسم الطالب: {ticket.studentName || ticket.name}</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-bold">القسم المستهدف للمعاينة: <strong className="text-teal-900">{ticket.selectedDept || ticket.dept}</strong></p>
                          <p className="text-[10px] text-slate-400 font-serif">تاريخ الصدور الفوري: {ticket.date}</p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-sans">هاتف الطالب المسجل:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900">{ticket.phoneNumber || ticket.phone}</strong>
                            <a
                              href={`tel:${ticket.phoneNumber || ticket.phone}`}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(ticket.phoneNumber || ticket.phone);
                                alert("تم النسخ!");
                              }}
                              className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-350 rounded flex items-center justify-center shrink-0 cursor-pointer"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const updated = shadowTickets.map((t: any) => {
                                if (t.id === ticket.id) {
                                  return { ...t, confirmed: !t.confirmed };
                                }
                                return t;
                              });
                              setShadowTickets(updated);
                              localStorage.setItem("academy_shadow_tickets", JSON.stringify(updated));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                              ticket.confirmed ? "bg-slate-100 text-slate-600 hover:bg-slate-205" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {ticket.confirmed ? "تراجع عن التأكيد ↩" : "✓ تأكيد التذكرة هاتفياً"}
                          </button>

                          <button
                            onClick={() => {
                              triggerSecureDelete("ticket", ticket.id, ticket.studentName || ticket.name || "صاحب التذكرة", () => {
                                const updated = shadowTickets.filter((t: any) => t.id !== ticket.id);
                                setShadowTickets(updated);
                                localStorage.setItem("academy_shadow_tickets", JSON.stringify(updated));
                              });
                            }}
                            className="text-xs text-rose-600 hover:text-red-751 transition flex items-center gap-1 p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-505 shrink-0" />
                            <span className="text-[10px] font-bold">حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeFilterTab === "pdf_leads" ? (
              /* PANEL: LIVE PDF LEADS DOWNLOAD LOG */
              <div className="space-y-4 animate-fade-in text-right" dir="rtl" id="admin-pdf-leads-panel">
                <div className="p-4 bg-teal-50 border-r-4 border-teal-500 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-right">
                  <div>
                    <h3 className="text-xs text-teal-900 font-bold flex items-center gap-1.5">
                      <span>سجل تحميل الملفات التعريفية وكراسات التخصصات المعتمدة (PDF Leads Live) 📄</span>
                    </h3>
                    <p className="text-[10px] text-teal-700 font-semibold mt-1">
                      هؤلاء الطلاب قاموا بملء النموذج وتحميل الملف التعريفي لشُعب الأكاديمية أو الدليل الشامل 2026.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const phones = filteredPdfLeadsList.map(p => p.phone).filter(Boolean);
                      if (phones.length === 0) {
                        alert("لا توجد أرقام هواتف لتصديرها!");
                        return;
                      }
                      navigator.clipboard.writeText(phones.join(", "));
                      alert("✓ تم نسخ جميع أرقام هواتف محملي كراسات التقديم المفلترة!");
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold shadow-3xs cursor-pointer transition select-none"
                  >
                    📋 نسخ أرقام هواتف القائمة المصفاة
                  </button>
                </div>

                {filteredPdfLeadsList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-bold">لا توجد طلبات تحميل موافقة لفلاتر البحث الحالية.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPdfLeadsList.map((pl: any) => (
                      <div key={pl.id} className={`p-5 bg-white border rounded-2xl space-y-4 shadow-3xs text-right transition-all hover:shadow-xs hover:border-teal-300 ${
                        pl.status === 'completed' ? 'border-slate-200 opacity-80 bg-slate-50/50' : 'border-teal-300 bg-teal-500/5'
                      }`}>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              pl.status === "completed" 
                                ? "bg-slate-150 text-slate-750" 
                                : pl.status === "no_reply"
                                ? "bg-rose-150 text-rose-800"
                                : "bg-teal-500 text-white animate-pulse"
                            }`}>
                              {pl.status === "completed" ? "✓ تواصل ناجح" : pl.status === "no_reply" ? "🔇 لا يرد" : "⏳ معلق للمتابعة"}
                            </span>
                            {pl.agentName ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignModal({
                                    isOpen: true,
                                    type: "pdfLead",
                                    id: pl.id,
                                    studentName: pl.name || pl.phone,
                                    currentAgent: pl.agentName || "",
                                    phone: pl.phone
                                  });
                                  setReassignStep(1);
                                  setReassignSelectedAgent(pl.agentName || "");
                                  setReassignCustomAgentInput("");
                                  setReassignPasswordInput("");
                                  setShowReassignPassword(false);
                                  setReassignError(null);
                                }}
                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-150 px-2 py-0.5 rounded font-black max-w-[130px] truncate cursor-pointer transition flex items-center gap-1"
                                title="تغيير مسؤول المتابعة"
                              >
                                <span>المسؤول: {pl.agentName}</span>
                                <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignModal({
                                    isOpen: true,
                                    type: "pdfLead",
                                    id: pl.id,
                                    studentName: pl.name || pl.phone,
                                    currentAgent: "",
                                    phone: pl.phone
                                  });
                                  setReassignStep(1);
                                  setReassignSelectedAgent(activeSalesReps[0] || "");
                                  setReassignCustomAgentInput("");
                                  setReassignPasswordInput("");
                                  setShowReassignPassword(false);
                                  setReassignError(null);
                                }}
                                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold cursor-pointer transition flex items-center gap-1"
                                title="تعيين مستشار متابعة"
                              >
                                <UserPlus className="w-2.5 h-2.5 text-amber-700" />
                                <span>تعيين سيلز</span>
                              </button>
                            )}
                          </div>
                          
                          <span className="text-[9.5px] font-mono text-slate-400">
                            تاريخ التحميل: {new Date(pl.downloadDate).toLocaleString("ar-EG")}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                            <span>الاسم: {pl.name}</span>
                          </h4>
                          <div className="p-2.5 bg-slate-55 border border-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-650">
                            <span className="text-[11px] font-bold">الملف التعريفي المحمل:</span>
                            <strong className="text-teal-900 text-[11px] font-extrabold">📙 {pl.specialization}</strong>
                          </div>
                        </div>

                        {/* Phone details and links */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-sans">رقم الهاتف للتواصل:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900">{pl.phone}</strong>
                            <a
                              href={`tel:${pl.phone}`}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(pl.phone);
                                alert("✓ تم نسخ رقم هاتف العميل!");
                              }}
                              className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-350 rounded flex items-center justify-center shrink-0 cursor-pointer"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Action controllers (change status, record sales rep, or secure delete) */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={async () => {
                                const repName = prompt("برجاء إدخال اسم موظف السيلز (المبيعات) المسؤول عن توثيق هذا التواصل:");
                                if (!repName || repName.trim() === "") {
                                  alert("توثيق اسم الموظف إلزامي لتحديث حالة تواصل كراسة الشروط!");
                                  return;
                                }
                                try {
                                  const reqBody = {
                                    type: "pdfLead",
                                    id: pl.id,
                                    status: "completed",
                                    agentName: repName.trim()
                                  };
                                  const resp = await fetch("/api/admin/update-status", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(reqBody)
                                  });
                                  const result = await resp.json();
                                  if (result.success) {
                                    setAdminPdfLeads(result.pdfLeads || []);
                                    alert(`✓ تم توثيق تواصل العميل بنجاح باسم مستشار المبيعات: ${repName}`);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("فشل تحديث وتوثيق الحالة.");
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition shadow-3xs cursor-pointer"
                            >
                              ✓ تم التواصل وتوثيق المكالمة
                            </button>

                            <button
                              onClick={async () => {
                                const repName = prompt("برجاء إدخال اسم موظف السيلز (المبيعات) للتوثيق المكتبي:");
                                if (!repName || repName.trim() === "") {
                                  alert("توثيق اسم الموظف إلزامي لتحديث حالة لا يرد!");
                                  return;
                                }
                                try {
                                  const reqBody = {
                                    type: "pdfLead",
                                    id: pl.id,
                                    status: "no_reply",
                                    agentName: repName.trim()
                                  };
                                  const resp = await fetch("/api/admin/update-status", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(reqBody)
                                  });
                                  const result = await resp.json();
                                  if (result.success) {
                                    setAdminPdfLeads(result.pdfLeads || []);
                                    alert(`✓ تم حِفظ الحالة (لا يرد) باسم موظف السيلز: ${repName}`);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("فشل تحديث وتوثيق الحالة.");
                                }
                              }}
                              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-205 text-rose-800 font-extrabold text-[10px] rounded-lg transition cursor-pointer"
                            >
                              🔇 العميل لا يرد
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              triggerSecureDelete("pdfLead", pl.id, pl.name || "العضو حمّال الكتيب", async () => {
                                try {
                                  const resp = await fetch("/api/admin/delete", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ type: "pdfLead", id: pl.id })
                                  });
                                  const result = await resp.json();
                                  if (result.success) {
                                    setAdminPdfLeads(result.pdfLeads || []);
                                    alert("✓ تم حذف العميل من سجل تحميلات الملفات التعريفية بنجاح.");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("تعذر حذف العميل.");
                                }
                              });
                            }}
                            className="text-xs text-rose-600 hover:text-red-700 transition flex items-center gap-1 p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-[10px] font-bold">حذف مؤمن</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeFilterTab === "partnerships_and_hiring" ? (
              /* PANEL J: PARTNERSHIPS AND RECRUITMENT GATE */
              <div className="space-y-4 text-right animate-fade-in" dir="rtl" id="admin-partnerships-panel">
                <div className="p-4 bg-indigo-50 border-r-4 border-indigo-500 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-right">
                  <p className="text-xs text-indigo-900 font-bold">بوابة الشراكات، المستشفيات والجهات الساعية لتوظيف واستيعاب الخريجين 🏥💼</p>
                  <button
                    onClick={() => {
                      const phones = partnershipLeads.map(p => p.representativePhone || p.phone).filter(Boolean);
                      if (phones.length === 0) {
                        alert("لا توجد هواتف للتصدير!");
                        return;
                      }
                      navigator.clipboard.writeText(phones.join(", "));
                      alert("تم نسخ جميع هواتف منسقي الشركات والمستشفيات!");
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-3xs cursor-pointer"
                  >
                    📋 نسخ هواتف منسقي الجهات
                  </button>
                </div>

                {partnershipLeads.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-bold">لا تتوفر طلبات شراكة أو توظيف من شركات أو مستشفيات حالياً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {partnershipLeads.map((item: any) => (
                      <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs text-right hover:border-indigo-300 transition-all">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[10.5px] font-black text-indigo-850 bg-indigo-50 px-2 py-0.5 rounded-full">
                            🏢 طلب شراكة وتوظيف معتمد
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.date || "قريب"}</span>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-start gap-1.5">
                            <HeartHandshake className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>اسم المؤسسة: <strong className="text-indigo-950 font-black">{item.hospitalName || item.hospital || "جهة رسمية"}</strong></span>
                          </h4>

                          <p className="text-xs text-slate-605 font-bold">اسم منسق الشراكة: <strong className="text-slate-800">{item.repName || item.representative || "ممثّل الجهة"}</strong></p>
                          <p className="text-xs text-slate-605 font-bold">الأقسام والشعبة المطلوبة للتوظيف: <strong className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{item.requiredMajor || "غير محدد"}</strong></p>
                          <p className="text-xs text-slate-605 font-bold">إجمالي خريجين مستهدفين للتشغيل: <strong className="text-slate-850 font-mono">{item.graduatesCount || "غير محدد"}</strong></p>
                        </div>

                        {item.fullDetails && (
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 leading-relaxed font-sans">
                            <strong className="text-[10px] text-slate-400 block mb-0.5 font-bold">ملاحظات وبنود التعاقد المطلوبة:</strong>
                            "{item.fullDetails}"
                          </div>
                        )}

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-sans">هاتف ممثل الجهة:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900">{item.representativePhone || item.phone}</strong>
                            <a
                              href={`tel:${item.representativePhone || item.phone}`}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.representativePhone || item.phone);
                                toast.success("تم النسخ بنجاح!");
                              }}
                              className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded flex items-center justify-center shrink-0 cursor-pointer"
                              style={{ minWidth: "26px", minHeight: "26px" }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              const updated = partnershipLeads.filter((p: any) => p.id !== item.id);
                              setPartnershipLeads(updated);
                              localStorage.setItem("academy_business_leads", JSON.stringify(updated));
                              toast.success("تم حذف طلب الاستقطاب بنجاح");
                            }}
                            className="text-xs text-rose-600 hover:text-red-700 transition flex items-center gap-1 p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-[10px] font-extrabold">حذف طلب الاستقطاب</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeFilterTab === "live_tracker_manager" ? (
              /* PANEL K: LIVE TRACKER MANAGER SCREEN */
              <div className="space-y-4 text-right animate-fade-in" dir="rtl" id="admin-tracker-panel">
                <div className="p-4 bg-amber-50 border-r-4 border-amber-500 rounded-2xl flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-600 shrink-0 animate-spin-slow" />
                  <p className="text-xs text-amber-950 font-bold">لوحة تتبع ومتابعة حالة ملف الطالب الفوري (Live Tracker Manager) 🔍</p>
                </div>

                <div className="p-3 bg-indigo-50 rounded-xl text-xs text-indigo-900 border border-indigo-100 mb-2 leading-relaxed">
                  <p className="font-bold">💡 شرح النظام الإداري:</p>
                  <p className="mt-1">اختر حالة الملف لكل طالب مسجل بالأسفل؛ فور قيام الطالب بإدخال رقم هاتفه في الحقل الاستعلامي بالصفحة التتبعية لملفات الطلاب بالرئيسية، ستظهر له تفاصيل الحالة الحقيقية التي حددتها له هنا فورياً.</p>
                </div>

                {adminLeads.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-205">
                    <p className="text-xs font-bold">لا يوجد طلاب مسجلون لعرضهم في نظام تتبع الملفات في الوقت الحالي. قم بالتسجيل اولاً.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-3xs">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-705 font-extrabold">
                          <th className="p-3">اسم الطالب المسجل</th>
                          <th className="p-3 font-mono">الرقم الهاتفي</th>
                          <th className="p-3">الشعبة</th>
                          <th className="p-3 text-center">رقم كود الحجز</th>
                          <th className="p-3 text-center">حالة الملف النشطة للبحث والدراسة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminLeads.map((student) => {
                          const currentStatus = liveTrackerStatusMap[student.phoneNumber] || "تحت المراجعة";

                          return (
                            <tr key={student.id} className="hover:bg-slate-55 transition font-sans">
                              <td className="p-3 font-extrabold text-slate-900">{student.studentName}</td>
                              <td className="p-3 font-mono text-slate-600 font-semibold">{student.phoneNumber}</td>
                              <td className="p-3 text-slate-500 font-bold">{student.basicCourse?.replace("دورة ", "") || "الشعبة المفتوحة"}</td>
                              <td className="p-3 text-center font-mono text-rose-600 font-bold">#{student.reservationCode || "1024"}</td>
                              <td className="p-3 text-center">
                                <select
                                  value={currentStatus}
                                  onChange={(e) => {
                                    const nextStatus = e.target.value;
                                    const nextMap = { ...liveTrackerStatusMap, [student.phoneNumber]: nextStatus };
                                    setLiveTrackerStatusMap(nextMap);
                                    localStorage.setItem("academy_live_tracker_status", JSON.stringify(nextMap));
                                  }}
                                  className="mx-auto block bg-slate-50 hover:bg-slate-100 border border-slate-202 rounded-lg p-2 font-black text-slate-800 text-[11px] cursor-pointer focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                >
                                  <option value="تحت المراجعة">🔍 تحت المراجعة الفنية</option>
                                  <option value="تم قبول الأوراق">🟢 تم قبول الأوراق بالمنظومة</option>
                                  <option value="مرحلة المقابلة الشخصية">🤝 مرحلة المقابلة والنزول العملي</option>
                                  <option value="تم صدور الكارنيه المبدئي">🏆 تم صدور الكارنيه المعتمد</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : activeFilterTab === "pdf_library" ? (
              /* PANEL L: LIBRARY AND FILES MANAGEMENT MODULE */
              <div className="space-y-6 text-right font-sans" dir="rtl" id="admin-pdf-library-panel">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                      <span>📚 نظام مديرة الملفات الرقمية والمكتبة الذكية (PDF Lead Magnet)</span>
                    </h3>
                    <p className="text-xs text-emerald-950 leading-relaxed font-semibold">
                      ارفع كتيبات ومناهج الأقسام مباشرة للتثبيت التلقائي وتفعيل بوابات التحميل الفورية للطلاب.
                    </p>
                  </div>
                  <div className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-[10px] font-black self-start md:self-auto shadow-sm">
                    حالة النظام: نشط ومتصل بقاعدة البيانات الحية ✓
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* RIGHT COLUMN: FILE MANAGER UPLOADER & EDIT FORM (2/5 span) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h4 className="text-xs font-black text-amber-400 flex items-center gap-2">
                          <span>⚙️ {libraryFormId ? "تعديل بيانات الملف الحالي" : "رفع وإضافة ملف جديد للمكتبة"}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">تحديد المسمى، الرفع على خوادم الموقع، والربط بالـ Lead Magnet.</p>
                      </div>

                      <form onSubmit={handleSaveLibraryItem} className="space-y-3.5">
                        
                        {/* 1. File Name */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-300">مسمى الملف (مثال: دليل قسم تكنولوجيا البرمجيات 2026):</label>
                          <input 
                            type="text" 
                            required
                            value={libraryFormName}
                            onChange={(e) => setLibraryFormName(e.target.value)}
                            placeholder="اكتب اسم الملف التوضيحي للطالب..."
                            className="w-full text-xs font-bold text-slate-100 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 focus:bg-slate-850 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* 2. Specialization Linkage Dropdown */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-300">القسم/التخصص المرتبط به (لتثبيت بوابة التحميل):</label>
                          <select 
                            value={libraryFormSpecialization}
                            onChange={(e) => setLibraryFormSpecialization(e.target.value)}
                            className="w-full text-xs font-bold text-white bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
                          >
                            <option value="الدليل الشامل 2026">📙 الدليل الشامل لجميع الأقسام</option>
                            <option value="الدليل الرسمي الشامل 2026">📙 الدليل الشامل (تسمية بديلة)</option>
                            {ACADEMY_DEPARTMENTS.map(d => (
                              <option key={d.id} value={d.name}>📂 {d.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Direct File Upload Component */}
                        <div className="bg-slate-800 border border-dashed border-slate-750 p-4 rounded-xl text-center space-y-2">
                          <span className="block text-[10px] font-black text-amber-400 font-sans">📁 الرفع المباشر على السيرفر المحلي:</span>
                          <p className="text-[9px] text-slate-400">اختر الملف من جهازك ليتم الرفع بصورة فائقة السرعة.</p>
                          <input 
                            type="file" 
                            accept=".pdf,application/pdf"
                            onChange={handleLibraryFileUpload}
                            className="hidden" 
                            id="library-direct-uploader"
                          />
                          <label 
                            htmlFor="library-direct-uploader"
                            className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-[10px] font-black cursor-pointer shadow-sm transition"
                          >
                            🖱️ اختر ملف الـ PDF من جهازك
                          </label>

                          {libraryUploadProgress && (
                            <div className="text-[10px] font-semibold text-emerald-300 bg-slate-850/65 py-1.5 px-2 rounded-md mt-2 leading-relaxed text-center">
                              {libraryUploadProgress}
                            </div>
                          )}
                        </div>

                        {/* 4. External URL (Optional/Manual override) */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black text-slate-300">رابط الملف المرفوع أو الرابط الخارجي (Google Drive):</label>
                            <span className="text-[8px] bg-indigo-500/25 px-1.5 py-0.5 rounded text-indigo-300 font-bold">تلقائي أو خارجي</span>
                          </div>
                          <input 
                            type="text" 
                            required
                            value={libraryFormUrl}
                            onChange={(e) => setLibraryFormUrl(e.target.value)}
                            placeholder="https://drive.google.com/your-pdf-file-url"
                            className="w-full text-xs font-mono text-slate-100 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 focus:bg-slate-850 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex gap-2">
                          <button
                            type="submit"
                            disabled={libraryIsSaving}
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-98 cursor-pointer text-center"
                          >
                            {libraryIsSaving ? "جاري الحفظ والتطبيق..." : "💾 حفظ وتحديث وتثبيت فوراً"}
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
                              className="px-3 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              إلغاء التعديل
                            </button>
                          )}
                        </div>

                      </form>
                    </div>
                  </div>

                  {/* LEFT COLUMN: UPLOADED FILES DIRECTORY LIST (3/5 span) */}
                  <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-3xs border border-slate-200">
                      <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <span>📂 دليل الملفات المرفوعة حالياً بالمكتبة</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">الملفات التي تظهر للزوار عند الضغط على أزرار تحميل الـ PDF.</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                          إجمالي ملفات المكتبة: {pdfLibraryList.length}
                        </span>
                      </div>

                      {pdfSettingsLoading ? (
                        <div className="p-12 text-center text-xs font-bold text-slate-400">جاري جلب ملفات المكتبة...</div>
                      ) : pdfLibraryList.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-400 font-bold border border-dashed rounded-xl">
                          لا يوجد أي ملفات مرفوعة حالياً. ابدأ برفع أول ملف باستخدام لوحة الرفع الذكية لدليل القبول.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-black">
                                <th className="p-3">مسمى الملف</th>
                                <th className="p-3">القسم المرتبط ومفتاح الربط</th>
                                <th className="p-3">نوع الرابط</th>
                                <th className="p-3 text-center">إجراءات التحكم</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pdfLibraryList.map((file) => (
                                <tr key={file.id} className="hover:bg-slate-50/70 transition">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900 flex items-center gap-1">
                                      <span>📙</span>
                                      <span className="line-clamp-2">{file.name}</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400 block mt-0.5" dir="ltr">
                                      {file.url}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-black text-slate-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md inline-block">
                                      {file.specialization}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${file.mode === 'uploaded' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                      {file.mode === 'uploaded' ? 'مرفوع محلياً' : 'رابط خارجي'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex gap-1.5 justify-center">
                                      <button 
                                        onClick={() => handleEditLibraryItem(file)}
                                        className="px-2 py-1 text-[10px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border rounded transition cursor-pointer"
                                      >
                                        تعديل
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteLibraryItem(file.id)}
                                        className="px-2 py-1 text-[10px] font-black text-red-650 bg-red-50 hover:bg-red-100 border border-red-100 rounded transition cursor-pointer"
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* CONVENIENT KEY-VALUE DIRECT BINDINGS EDITOR */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <div className="mb-4">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>⚙️ المسار السريع: خريطة روابط الأزرار المباشرة</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">تعديل فوري على روابط بوابات التحميل النشطة لكل قسم بصفحات الهبوط:</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(pdfSettings).map(([specialization, downloadUrl]) => (
                          <div key={specialization} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span className="block text-[10px] font-bold text-slate-700">{specialization}:</span>
                            <input
                              type="text"
                              value={downloadUrl}
                              onChange={(e) => handleUpdatePdfUrl(specialization, e.target.value)}
                              className="w-full text-[10px] font-mono text-slate-700 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          onClick={handleSavePdfSettings}
                          disabled={pdfSettingsLoading}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          💾 حفظ وتحديث خريطة الأزرار المباشرة
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeFilterTab === "department_manager" ? (
              /* PANEL M: DEPARTMENT IMAGES & INFOS MANAGEMENT PANEL */
              <div className="space-y-6 text-right animate-fade-in" dir="rtl" id="admin-dept-images-manager-panel">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 text-right space-y-4 shadow-3xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-[#0A2463]">🖼️ لوحة التحكم بصور وقوائم التخصصات الأكاديمية والـ 17 شعبة</h3>
                      <p className="text-[10px] text-slate-500 font-semibold">تحكم بالخلفيات والصور الحية للأقسام وتعيين روابط مخصصة وحذفها لتعود للشكل الأصلي فوراً</p>
                    </div>
                    <BookOpen className="w-5 h-5 text-amber-500 animate-pulse" />
                  </div>

                  <div className="bg-amber-50 border border-amber-200/65 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-lg">💡</span>
                    <div className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                      <p className="font-bold">نصائح إدارة الأصول:</p>
                      <p>١. يمكنك كتابة رابط أي صورة خارجية مباشرة (مثل Unsplash أو Imgur) لتغيير خلفية بطاقة التخصص بصفحة الأقسام والدليل.</p>
                      <p>٢. عند الضغط على زر "حذف واستعادة"، سيقوم النظام بإلغاء التخصيص وإرجاع الصورة الموحدة من ملف الأصول الافتراضي تلقائياً.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    {adminAcademyDepartments.map((dept) => {
                      const hasCustom = !!dept.imageUrl;
                      const currentBg = dept.imageUrl || DEPARTMENT_DEFAULT_IMAGES[dept.id] || LOCAL_IMAGES.logoAcademicWhite;

                      return (
                        <div key={dept.id} className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-xs transition duration-250">
                          {/* Image preview top */}
                          <div className="relative h-28 bg-slate-200 overflow-hidden">
                            <img 
                              src={currentBg} 
                              alt={dept.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                            <div className="absolute bottom-2.5 right-3 text-right">
                              <span className="text-[9px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black mb-1 inline-block">
                                {dept.id}
                              </span>
                              <h4 className="text-xs font-black text-white">{dept.name}</h4>
                            </div>
                            
                            <div className="absolute top-2.5 left-3">
                              {hasCustom ? (
                                <span className="text-[8px] bg-emerald-500 text-white font-black px-2 py-1 rounded-md shadow-xs">
                                  ✨ صورة مخصصة
                                </span>
                              ) : (
                                <span className="text-[8px] bg-slate-600/75 text-white font-semibold px-2 py-1 rounded-md">
                                  🔗 صورة افتراضية
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls bottom */}
                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-2">
                              {dept.description}
                            </p>

                            <div className="space-y-2">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[9.5px] font-black text-slate-700 block">صورة خلفية القسم:</label>
                                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">📐 800 × 600 px (4:3)</span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <input 
                                    type="text" 
                                    value={dept.imageUrl || ""} 
                                    onChange={(e) => handleUpdateDepartmentImage(dept.id, e.target.value)}
                                    placeholder="أدخل رابط صورة مباشر..."
                                    className="flex-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-[10.5px] text-left font-mono"
                                    dir="ltr"
                                  />
                                  <label className="bg-[#0A2463] hover:bg-[#0A2463]/90 text-white px-2 py-1.5 rounded-xl text-[9.5px] font-black cursor-pointer shrink-0">
                                    رفع صورة 📁
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            handleUpdateDepartmentImage(dept.id, reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                {hasCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDepartmentImage(dept.id)}
                                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 hover:border-rose-300 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center"
                                  >
                                    ❌ حذف واستعادة
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDepartmentImage(dept.id, dept.imageUrl || "")}
                                  className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-850 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center"
                                >
                                  🔄 معاينة التغيير
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                    <button 
                      type="button"
                      onClick={handleSaveDepartmentsConfig}
                      className="px-8 py-3 bg-[#0A2463] hover:bg-[#0A2463]/90 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                    >
                      <span>💾 حفظ وتثبيت كافة خلفيات التخصصات فوراً بالمنصة</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeFilterTab === "academy_portals" ? (
              /* PANEL N: PARTNER ACADEMIES DIRECT PORTAL LINKS (OPTION A) */
              <div className="space-y-6 text-right font-sans animate-fade-in" dir="rtl" id="admin-academy-portals-panel">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-800/60 p-5 sm:p-6 rounded-3xl text-white shadow-md space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-lg">🏢</span>
                        <h3 className="text-base font-extrabold text-white">
                          بوابات الأكاديميات والمعاهد الشريكة (روابط الكشوف المباشرة)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                        انسخ رابط البوابة المباشر لكل أكاديمية وابعته ليهم على واتساب. عند فتح الرابط سيظهر لهم حصرياً كشف الطلاب المسجلين باسم أكاديميتهم فقط بدون أي بيانات للأكاديميات الأخرى.
                      </p>
                    </div>
                    <div className="bg-indigo-600/40 border border-indigo-400/30 px-3.5 py-1.5 rounded-xl text-[11px] font-black text-indigo-200 self-start md:self-auto shrink-0">
                      ⚡ نظام آمن وخاص لكل أكاديمية
                    </div>
                  </div>
                </div>

                {/* Quick New Academy Link Generator */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>✨ إنشاء وتوليد رابط فوري لأي أكاديمية جديدة:</span>
                    </h4>
                    <p className="text-[10px] text-slate-500">اكتب اسم الأكاديمية وهيتم توليد رابط مخصص وكود واتساب فوري جاهز للإرسال.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text"
                      value={newAcademyNameInput}
                      onChange={(e) => setNewAcademyNameInput(e.target.value)}
                      placeholder="مثال: أكاديمية النخبة الدولية، معهد الدلتا، إلخ..."
                      className="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                    {newAcademyNameInput.trim() && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const baseUrl = window.location.origin;
                            const portalUrl = `${baseUrl}/academy-portal?academy=${encodeURIComponent(newAcademyNameInput.trim())}`;
                            navigator.clipboard.writeText(portalUrl);
                            setCopiedAcademyName(newAcademyNameInput.trim());
                            toast.success(`تم نسخ رابط بوابة "${newAcademyNameInput.trim()}" بنجاح!`);
                            setTimeout(() => setCopiedAcademyName(null), 3000);
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedAcademyName === newAcademyNameInput.trim() ? "✓ تم النسخ" : "نسخ الرابط"}</span>
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `السلام عليكم ورحمة الله وبركاته،\nتحياتنا لإدارة ${newAcademyNameInput.trim()}،\n\nمرفق لحضراتكم رابط البوابة الرسمية الحية لكشف الطلاب المتقدمين والمستوفين لشروط القبول والتسجيل لديكم:\n${window.location.origin}/academy-portal?academy=${encodeURIComponent(newAcademyNameInput.trim())}\n\nيمكنكم متابعة كشف الطلاب وتحديث الحالات فوراً.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>إرسال واتساب</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* List of Registered & Default Partner Academies */}
                <div className="space-y-4">
                  {/* VIP: Master View Link for Admin & Staff (Unifies all 4 academies) */}
                  <div className="bg-gradient-to-r from-amber-500/15 via-indigo-600/15 to-purple-600/15 border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl">
                          🌟
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-black text-slate-900">
                              الرابط المركزي الموحّد لكافة الأكاديميات (خاص بالإدارة والموظفين)
                            </h4>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                              VIP موحّد 👑
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            هذا الرابط مخصص لك وللموظفين: يجمع كشوفات الـ 4 أكاديميات في لوحة واحدة، ويتيح التبديل السريع بينها لمتابعة جميع من سجل استمارة فوراً.
                          </p>
                        </div>
                      </div>
                      
                      <a
                        href={`${typeof window !== "undefined" ? window.location.origin : ""}/academy-portal?master=true`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح الكشف المركزي المجمع ↗</span>
                      </a>
                    </div>

                    {/* Direct Master Link Input & Copy */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-amber-200">
                      <input 
                        type="text"
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/academy-portal?master=true`}
                        className="flex-1 text-xs font-mono text-slate-700 px-3 py-1.5 bg-transparent border-none select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const masterUrl = `${window.location.origin}/academy-portal?master=true`;
                          navigator.clipboard.writeText(masterUrl);
                          toast.success("✓ تم نسخ الرابط المركزي المجمّع بنجاح!");
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط الموحّد</span>
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `رابط الكشف المركزي الموحّد لبوابات الأكاديميات الشريكة (خاص بالإدارة والموظفين):\n${typeof window !== "undefined" ? window.location.origin : ""}/academy-portal?master=true`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>مشاركة واتساب</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <span>🏛️ روابط الكشوف المستقلة الخاصة بكل أكاديمية (معزولة ومغلقة):</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      روابط آمنة وخاصة بكل شريك
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "أكاديمية السلام للتدريب",
                      "أكاديمية تراست للعلوم الطبية",
                      "أكاديمية أبيكس كولج",
                      "أكاديمية الرفاق للتدريب"
                    ].map((academyName) => {
                      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
                      const portalUrl = `${baseUrl}/academy-portal?academy=${encodeURIComponent(academyName)}`;
                      const academyStats = partnerAcademiesList.find(a => a.name.trim().toLowerCase() === academyName.trim().toLowerCase());
                      const studentCount = academyStats ? academyStats.studentCount : adminLeads.filter(l => (l.academyName || "").includes(academyName) || (l.notes || "").includes(academyName)).length;
                      const isCopied = copiedAcademyName === academyName;

                      return (
                        <div 
                          key={academyName}
                          className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-300 transition-all shadow-3xs space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                  🏛️
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">{academyName}</h4>
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                    {studentCount} طالب مسجل بالكشف
                                  </span>
                                </div>
                              </div>
                              <a
                                href={portalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>معاينة</span>
                              </a>
                            </div>

                            {/* Direct URL input with copy */}
                            <div className="relative">
                              <input 
                                type="text"
                                readOnly
                                value={portalUrl}
                                className="w-full text-[10px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-16 select-all focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(portalUrl);
                                  setCopiedAcademyName(academyName);
                                  toast.success(`تم نسخ رابط بوابة ${academyName}!`);
                                  setTimeout(() => setCopiedAcademyName(null), 3000);
                                }}
                                className={`absolute left-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[9.5px] font-black transition cursor-pointer flex items-center gap-1 ${
                                  isCopied 
                                    ? "bg-emerald-600 text-white" 
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                }`}
                              >
                                {isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? "تم النسخ" : "نسخ"}</span>
                              </button>
                            </div>
                          </div>

                          {/* WhatsApp Ready Share Action */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-semibold">
                              إرسال الكشف لمسؤول الأكاديمية:
                            </span>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `السلام عليكم ورحمة الله وبركاته،\nتحياتنا لإدارة ${academyName}،\n\nمرفق لحضراتكم رابط البوابة الرسمية الحية لكشف الطلاب المتقدمين والمستوفين لشروط القبول والتسجيل لديكم:\n${portalUrl}\n\nيمكنكم متابعة كشف الطلاب وتحديث الحالات فوراً.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>مشاركة عبر واتساب 📲</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* PANEL C: STUDENT ADMISSIONS REGISTRATIONS RENDERING LIST */
              <div className="space-y-4">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="admin-pulse-leads">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={num} className="p-5 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4 shadow-3xs">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-slate-200 rounded-md w-28"></div>
                          <div className="h-3 bg-slate-200 rounded-md w-16 font-mono"></div>
                        </div>
                        <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                        <div className="space-y-1.5">
                          <div className="h-3 bg-slate-100 rounded-md w-full"></div>
                          <div className="h-3 bg-slate-100 rounded-md w-5/6"></div>
                        </div>
                        <div className="pt-2 flex justify-between gap-2 border-t border-slate-50 pt-3">
                          <div className="h-8 bg-slate-200 rounded-lg w-20"></div>
                          <div className="h-8 bg-slate-200 rounded-lg w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Lead SLA & Follow-up Timer Filter Toolbar */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-900/50 text-white shadow-md space-y-3 text-right">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-white">⏱️ مؤشر سرعة المتابعة والتواصل (Lead SLA & Follow-up Timer)</h4>
                            <p className="text-[10px] text-slate-300">مراقبة توقيت استجابة مستشاري القبول وتحديد حالة التأخير فوراً</p>
                          </div>
                        </div>
                        
                        <div className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg shrink-0">
                          مستهدف الاستجابة: أقل من 6 ساعات ⚡
                        </div>
                      </div>

                      {/* SLA Quick Filter Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                        <button
                          onClick={() => setSlaFilter("all")}
                          className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            slaFilter === "all"
                              ? "bg-white text-slate-900 border-white shadow-sm font-black"
                              : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                          }`}
                        >
                          <span>جميع الحالات</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-700/50 rounded">{adminLeads.length}</span>
                        </button>

                        <button
                          onClick={() => setSlaFilter("green")}
                          className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            slaFilter === "green"
                              ? "bg-emerald-500 text-white border-emerald-400 shadow-sm font-black"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60"
                          }`}
                        >
                          <span className="flex items-center gap-1">🟢 فريش (&lt; 6س)</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-emerald-900/60 rounded">
                            {adminLeads.filter(l => getStudentSlaInfo(l.status, l.timestamp, l.date).status === "green").length}
                          </span>
                        </button>

                        <button
                          onClick={() => setSlaFilter("yellow")}
                          className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            slaFilter === "yellow"
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black"
                              : "bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60"
                          }`}
                        >
                          <span className="flex items-center gap-1">🟡 تحذير (12-6س)</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-amber-900/60 rounded">
                            {adminLeads.filter(l => getStudentSlaInfo(l.status, l.timestamp, l.date).status === "yellow").length}
                          </span>
                        </button>

                        <button
                          onClick={() => setSlaFilter("red")}
                          className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            slaFilter === "red"
                              ? "bg-rose-600 text-white border-rose-500 shadow-sm font-black"
                              : "bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900/60"
                          }`}
                        >
                          <span className="flex items-center gap-1">🔴 متأخر (&gt; 24س)</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-rose-900/60 rounded">
                            {adminLeads.filter(l => getStudentSlaInfo(l.status, l.timestamp, l.date).status === "red").length}
                          </span>
                        </button>

                        <button
                          onClick={() => setSlaFilter("completed")}
                          className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between col-span-2 sm:col-span-1 ${
                            slaFilter === "completed"
                              ? "bg-blue-600 text-white border-blue-500 shadow-sm font-black"
                              : "bg-blue-950/60 text-blue-300 border-blue-800/60 hover:bg-blue-900/60"
                          }`}
                        >
                          <span className="flex items-center gap-1">✓ تم التواصل</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-blue-900/60 rounded">
                            {adminLeads.filter(l => l.status === "completed").length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions Bar: Direct Excel/CSV Export & Google Sheets Sync */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black rounded-full">
                            قاعدة البيانات: {adminLeads.length} طالب محفوظ
                          </span>
                          <span className="text-xs font-black text-amber-300">
                            ⚡ تصدير ومزامنة كشوفات الطلاب المعتمدة
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          يمكنك تنزيل سجل كافة الطلاب المعتمد بصيغة Excel / CSV، أو ترحيل ومزامنة كافة السجلات لشيت جوجل بضغطة زر واحدة.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Direct 1-Click Genuine Excel (.xlsx) Download */}
                        <a
                          href="/api/admin/export/students-excel"
                          download={`students_registry_${new Date().toISOString().slice(0, 10)}.xlsx`}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md active:scale-95"
                          title="تنزيل فوري لملف إكسيل حقيقي (.xlsx) بأعمدة منفصلة ومنسقة"
                        >
                          <span>📗 تحميل كشف الطلاب Excel (.xlsx)</span>
                        </a>

                        <a
                          href="/api/admin/export/students-csv"
                          download={`students_registry_${new Date().toISOString().slice(0, 10)}.csv`}
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm active:scale-95 border border-slate-600"
                          title="تنزيل كشف بصيغة CSV"
                        >
                          <span>📄 CSV</span>
                        </a>

                        {/* Import Leads from Google Sheet Button */}
                        <button
                          type="button"
                          onClick={() => setIsImportModalOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md active:scale-95"
                          title="استيراد ولصق بيانات الطلاب من شيت جوجل وحفظهم في سوبابيز"
                        >
                          <span>📥 استيراد طلاب من Google Sheet</span>
                        </button>

                        {/* Google Sheets Sync & Settings Button */}
                        <button
                          type="button"
                          onClick={() => {
                            fetchGoogleSheetsConfig();
                            setShowGoogleSheetsModal(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-md active:scale-95"
                          title="إدارة شيت جوجل والمزامنة الفورية"
                        >
                          <span>📊 مزامنة وإدارة شيت جوجل</span>
                        </button>
                      </div>
                    </div>

                    {/* Bulk copy */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                      <div className="text-xs text-slate-600 font-sans">
                        <p className="font-extrabold text-slate-800 mb-0.5">📱 أداة الاتصال الهاتفي والنسخ المجمع لقائمة الطلاب المسجلين:</p>
                        <p>اضغط للنسخ للبدء فوراً بترحيل الهواتف والاتصال بنظارات التسجيل والمبيعات بالشركة الموزعة.</p>
                      </div>
                      <button
                        onClick={() => {
                          const phones = filteredLeadsList.map(l => l.phoneNumber).filter(Boolean);
                          if (phones.length === 0) {
                            alert("لا توجد أرقام هواتف لتصديرها!");
                            return;
                          }
                          navigator.clipboard.writeText(phones.join(", "));
                          setCopiedFeedback("bulk_leads");
                          setTimeout(() => setCopiedFeedback(null), 2500);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-3xs"
                      >
                        {copiedFeedback === "bulk_leads" ? "✓ تم نسخ الهواتف بنجاح!" : "📋 نسخ جميع هواتف هذه القائمة كأرقام مصفاة"}
                      </button>
                    </div>

                {filteredLeadsList.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-250 flex flex-col items-center justify-center">
                    <span className="text-3xl block mb-2">🔍</span>
                    <p className="text-xs text-slate-500 font-bold">لا توجد طلبات ترحيل تماثل هذه الفلاتر بانتظارك.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                    {filteredLeadsList.map((student) => {
                      const slaInfo = getStudentSlaInfo(student.status, student.timestamp, student.date);
                      const isDelayed = slaInfo.status === "red";
                      const isExpanded = !!expandedStudents[student.id];

                      return (
                        <div
                          key={student.id}
                          className={`block bg-white p-2.5 sm:p-4 rounded-xl mb-2 sm:mb-3 border md:mb-0 md:rounded-2xl transition-all ${
                            student.status === "completed"
                              ? "bg-slate-50 border-slate-200 opacity-80"
                              : slaInfo.status === "red"
                              ? "bg-red-50/50 border-red-300 ring-1 ring-red-500 shadow-3xs hover:border-red-400"
                              : slaInfo.status === "yellow"
                              ? "bg-amber-50/30 border-amber-300 hover:border-amber-400"
                              : "bg-emerald-50/20 border-emerald-300 hover:border-emerald-400 shadow-3xs"
                          } ${isExpanded ? "p-3 sm:p-5 space-y-2.5 sm:space-y-4" : "space-y-1.5 sm:space-y-2"} hover:shadow-xs`}
                        >
                          
                          {/* Item Card Banner Summary */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 sm:pb-2 flex-wrap gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button
                                onClick={() => toggleStudentExpand(student.id)}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] sm:text-xs font-bold transition select-none cursor-pointer"
                              >
                                {isExpanded ? "➖" : "➕"}
                              </button>
                              <span
                                className="font-extrabold text-xs sm:text-sm text-slate-900 cursor-pointer flex items-center gap-1 hover:text-amber-700 transition"
                                onClick={() => toggleStudentExpand(student.id)}
                              >
                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                                <span>{student.studentName}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* SLA Timer Indicator Badge */}
                              <span className={`text-[8.5px] sm:text-[10px] px-2 py-0.5 rounded-full ${slaInfo.badgeClass}`}>
                                {slaInfo.label}
                              </span>

                              <span className="font-mono text-[8px] sm:text-[9px] font-bold text-amber-850 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded border border-amber-250/20">
                                كود: #{student.reservationCode || "1000"}
                              </span>
                            </div>
                          </div>

                          {/* 1. Collapsed display view */}
                          {!isExpanded ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-right">
                              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px]">
                                <span className={`text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded ${
                                  student.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-250" :
                                  student.status === "no_reply" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                  isDelayed ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {student.status === "completed" ? "✓ تم التواصل والتعميد" :
                                   student.status === "no_reply" ? "📞 لم يرد تليفونياً" :
                                   isDelayed ? "🕒 معلق ومتاخر" : "⏳ انتظار تواصل"}
                                </span>

                                {student.agentName && student.agentName.trim() !== "" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReassignModal({
                                          isOpen: true,
                                          type: "lead",
                                          id: student.id || student.reservationCode,
                                          studentName: student.studentName,
                                          currentAgent: student.agentName || "",
                                          reservationCode: student.reservationCode,
                                          phone: student.phoneNumber
                                        });
                                        setReassignStep(1);
                                        setReassignSelectedAgent(student.agentName || "");
                                        setReassignCustomAgentInput("");
                                        setReassignPasswordInput("");
                                        setShowReassignPassword(false);
                                        setReassignError(null);
                                      }}
                                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 hover:border-indigo-300 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-black flex items-center gap-1 transition cursor-pointer shadow-3xs group"
                                      title="اضغط لتغيير أو تحويل مستشار المبيعات المسؤول (يتطلب رمز الحماية)"
                                    >
                                      <span>السيلز: {student.agentName}</span>
                                      <Edit3 className="w-2.5 h-2.5 text-indigo-600 group-hover:scale-110 transition" />
                                    </button>
                                    {student.reassignedDateStr && (
                                      <span 
                                        className="bg-purple-50 text-purple-900 border border-purple-200 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9.5px] font-black flex items-center gap-1 shadow-3xs"
                                        title={`وقت التحويل الفعلي للسيلز: ${student.reassignedDateStr}`}
                                      >
                                        <Clock className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                        <span>حُوّل: {student.reassignedDateStr}</span>
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReassignModal({
                                        isOpen: true,
                                        type: "lead",
                                        id: student.id || student.reservationCode,
                                        studentName: student.studentName,
                                        currentAgent: "",
                                        reservationCode: student.reservationCode,
                                        phone: student.phoneNumber
                                      });
                                      setReassignStep(1);
                                      setReassignSelectedAgent(activeSalesReps[0] || "");
                                      setReassignCustomAgentInput("");
                                      setReassignPasswordInput("");
                                      setShowReassignPassword(false);
                                      setReassignError(null);
                                    }}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 hover:border-amber-400 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-black flex items-center gap-1 transition cursor-pointer animate-pulse shadow-3xs"
                                    title="طالب من الموقع بدون سيلز - اضغط لتعيين مستشار مبيعات (يتطلب رمز الحماية)"
                                  >
                                    <UserPlus className="w-2.5 h-2.5 text-amber-700" />
                                    <span>⚠️ إضافة سيلز</span>
                                  </button>
                                )}

                                <span className="text-slate-550 text-[8.5px] sm:text-[10px] bg-slate-50 border border-slate-100 rounded px-1 sm:px-1.5 py-0.5 font-bold">
                                  📚 {student.basicCourse?.replace("دورة ", "") || "الشعبة الرئيسية"}
                                </span>

                                {student.academyName && (
                                  <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 rounded px-1 sm:px-1.5 py-0.5 font-black text-[8.5px] sm:text-[9.5px] flex items-center gap-0.5">
                                    🏢 {student.academyName}
                                  </span>
                                )}

                                {student.governorate && (
                                  <span className="text-slate-650 font-bold text-[8.5px] sm:text-[9.5px]">📍 {student.governorate}</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-1.5 sm:pt-0 shrink-0 border-t sm:border-t-0 border-slate-100">
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`tel:${student.phoneNumber}`}
                                    className="w-6.5 h-6.5 sm:w-7 sm:h-7 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition flex items-center justify-center shrink-0 border border-emerald-200"
                                    title="اتصال سريع"
                                  >
                                    <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </a>
                                  {student.whatsappNumber && (
                                    <a
                                      href={getWhatsAppLink(student.whatsappNumber, student.studentName)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-6.5 h-6.5 sm:w-7 sm:h-7 bg-emerald-55 text-emerald-600 rounded-lg hover:bg-emerald-110 border border-emerald-205 transition flex items-center justify-center shrink-0"
                                      title="واتساب"
                                    >
                                      <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMessaging(student)}
                                    className="px-2 py-0.5 sm:py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1 shrink-0 text-[9px] sm:text-[10px] font-black shadow-xs cursor-pointer"
                                    title="إرسال إشعار تذكيري آلي بنقرة واحدة (واتساب / SMS)"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                                    <span>إشعار ومتابعة ⚡</span>
                                  </button>
                                </div>
                                <button
                                  onClick={() => toggleStudentExpand(student.id)}
                                  className="text-[9.5px] sm:text-[10px] text-amber-955 bg-amber-50 border border-amber-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-black transition cursor-pointer"
                                >
                                  المزيد 📂
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* 2. Expanded detailed view */
                            <div className="space-y-4 animate-fade-in text-right">
                              
                              <div className="flex justify-between items-center text-xs flex-wrap gap-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  student.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                  student.status === 'no_reply' ? 'bg-amber-100 text-amber-800' : 'bg-[#FF7F50]/10 text-[#FF7F50]'
                                }`}>
                                  الحالة الحالية: {student.status === 'completed' ? 'تم الحجز والمكاملة بنجاح' :
                                                   student.status === 'no_reply' ? 'لم يتم الرد بعد (متابعة تلفونية)' : 'بانتظار مستشار للتأكيد'}
                                </span>
                                {student.date && (
                                  <span className="text-[9.5px] font-mono font-bold text-slate-450 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>تسجيل: {student.date}</span>
                                  </span>
                                )}
                              </div>

                              {student.reassignedDateStr && (
                                <div className="w-full bg-purple-50 border border-purple-200 text-purple-950 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold shadow-3xs">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-purple-700 shrink-0" />
                                    <span>🔄 تم تحويل هذا الطالب للسيلز ({student.agentName || "غير محدد"}) في:</span>
                                  </span>
                                  <strong className="font-mono text-purple-900 text-xs">{student.reassignedDateStr}</strong>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between font-mono">
                                  <span className="text-slate-400 font-sans">الهاتف للاتصال:</span>
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-slate-900">{student.phoneNumber}</strong>
                                    <a
                                      href={`tel:${student.phoneNumber}`}
                                      className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                                      style={{ minWidth: "26px", minHeight: "26px" }}
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                      onClick={() => handleCopySingleNumber(student.phoneNumber)}
                                      className="p-1 bg-slate-200 text-slate-650 rounded hover:bg-slate-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                                      style={{ minWidth: "26px", minHeight: "26px" }}
                                    >
                                      {copiedFeedback === student.phoneNumber ? "✓" : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {student.whatsappNumber && (
                                  <div className="bg-emerald-55/15 p-2 rounded-xl border border-emerald-100/50 flex items-center justify-between font-mono">
                                    <span className="text-slate-400 font-sans">رقم الواتساب:</span>
                                    <div className="flex items-center gap-1.5">
                                      <strong className="text-emerald-700">{student.whatsappNumber}</strong>
                                      <a
                                        href={getWhatsAppLink(student.whatsappNumber, student.studentName)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 bg-emerald-55 text-emerald-600 rounded hover:bg-emerald-100 transition flex items-center justify-center shrink-0"
                                        style={{ minWidth: "26px", minHeight: "26px" }}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        onClick={() => handleCopySingleNumber(student.whatsappNumber)}
                                        className="p-1 bg-slate-200 text-slate-650 rounded hover:bg-slate-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                                        style={{ minWidth: "26px", minHeight: "26px" }}
                                      >
                                        {copiedFeedback === student.whatsappNumber ? "✓" : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {student.governorate && (
                                  <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span>المحافظة الجغرافية: <strong>{student.governorate}</strong></span>
                                  </div>
                                )}
                                {student.graduationYear && (
                                  <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>سنة تخرّجه: <strong>{student.graduationYear}</strong></span>
                                  </div>
                                )}
                              </div>

                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1 text-xs">
                                <p><span className="font-semibold text-slate-400">المؤهل الدراسي المسبر به:</span> {student.educationLevel}</p>
                                <p className="flex items-center gap-1 text-emerald-800 font-extrabold text-[11px] mt-1">
                                  <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0 animate-pulse" />
                                  <span>الدورة الدراسية لحفظ الخصم الدراسي:</span>
                                  <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250/20 text-[10px]">{student.basicCourse || "دورة دفعة الخريف المعتمدة"}</span>
                                </p>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-bold block">الأقسام الطبية/التكنولوجية المطلوبة في التذكرة:</span>
                                <div className="flex flex-wrap gap-1">
                                  {student.selectedDepartments && student.selectedDepartments.length > 0 ? (
                                    student.selectedDepartments.map((dept, i) => (
                                      <span key={i} className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-sm">
                                        {dept}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">لم يختر شُعبة محددة على الكرت المبدئي</span>
                                  )}
                                </div>
                              </div>

                              {student.notes && (
                                <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-650 border border-slate-100 leading-relaxed font-sans">
                                  <strong className="text-[10px] text-slate-400 block mb-0.5 font-bold">ملاحظات الطالب وتفاصيل الحجز:</strong>
                                  "{student.notes}"
                                </div>
                              )}

                              {/* 1-Click WhatsApp/SMS Automated Follow-up and Reminder Module */}
                              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-800/60 text-white space-y-3 text-right shadow-md">
                                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-800/40 pb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                        <span>قوالب المتابعة والإشعارات التذكيرية السريعة</span>
                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/20 font-bold">
                                          بنقرة واحدة ⚡
                                        </span>
                                      </h4>
                                      <p className="text-[10px] text-slate-300 font-medium">إرسال رسائل تذكير تلقائية مخصصة بالاسم وكود الحجز عبر الواتساب / SMS</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMessaging(student)}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>فتح نافذة التخصيص الكاملة 💬</span>
                                  </button>
                                </div>

                                {/* Quick 1-Click Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const studentName = student.studentName || "عزيزنا الطالب";
                                      const specialty = student.selectedDepartments?.[0] || student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
                                      const code = student.reservationCode || "1024";
                                      const rawTargetPhone = student.whatsappNumber || student.phoneNumber;
                                      const cleanPhoneDigits = rawTargetPhone.replace(/\D/g, "");
                                      const formattedWa = cleanPhoneDigits.startsWith("20") ? cleanPhoneDigits : cleanPhoneDigits.startsWith("0") ? `20${cleanPhoneDigits.slice(1)}` : `20${cleanPhoneDigits}`;
                                      const msg = studentMessages.adminQuickVisitReminder({ studentName, specialty, reservationCode: code, discountCode: DEFAULT_DISCOUNT_CODE });
                                      window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                                      handleSaveInternalNote("lead", String(student.id), `[واتساب]: تم إرسال تذكير بموعد الزيارة بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
                                    }}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-right transition cursor-pointer flex items-center gap-2 group"
                                  >
                                    <span className="text-base">🏛️</span>
                                    <div className="truncate">
                                      <span className="block text-[11px] font-black text-amber-300 group-hover:text-amber-200">تذكير بموعد الزيارة</span>
                                      <span className="block text-[9.5px] text-slate-300">مراجعة الأوراق وكود الحجز</span>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const studentName = student.studentName || "عزيزنا الطالب";
                                      const specialty = student.selectedDepartments?.[0] || student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
                                      const code = student.reservationCode || "1024";
                                      const rawTargetPhone = student.whatsappNumber || student.phoneNumber;
                                      const cleanPhoneDigits = rawTargetPhone.replace(/\D/g, "");
                                      const formattedWa = cleanPhoneDigits.startsWith("20") ? cleanPhoneDigits : cleanPhoneDigits.startsWith("0") ? `20${cleanPhoneDigits.slice(1)}` : `20${cleanPhoneDigits}`;
                                      const msg = studentMessages.adminQuickDiscountAlert({ studentName, specialty, reservationCode: code, discountCode: DEFAULT_DISCOUNT_CODE });
                                      window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                                      handleSaveInternalNote("lead", String(student.id), `[واتساب]: تم إرسال تنبيه بقرب انتهاء الخصم (${DEFAULT_DISCOUNT_CODE}) بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
                                    }}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-right transition cursor-pointer flex items-center gap-2 group"
                                  >
                                    <span className="text-base">⏳</span>
                                    <div className="truncate">
                                      <span className="block text-[11px] font-black text-orange-300 group-hover:text-orange-200">تنبيه قرب انتهاء الخصم</span>
                                      <span className="block text-[9.5px] text-slate-300">حفظ الخصم قبل اكتمال المقاعد</span>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const studentName = student.studentName || "عزيزنا الطالب";
                                      const specialty = student.selectedDepartments?.[0] || student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
                                      const code = student.reservationCode || "1024";
                                      const rawTargetPhone = student.whatsappNumber || student.phoneNumber;
                                      const cleanPhoneDigits = rawTargetPhone.replace(/\D/g, "");
                                      const formattedWa = cleanPhoneDigits.startsWith("20") ? cleanPhoneDigits : cleanPhoneDigits.startsWith("0") ? `20${cleanPhoneDigits.slice(1)}` : `20${cleanPhoneDigits}`;
                                      const extractionLink = `${window.location.origin}/form-extraction?code=${code}&phone=${student.phoneNumber}`;
                                      const msg = studentMessages.adminQuickFormLink({ studentName, specialty, reservationCode: code, extractionLink });
                                      window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                                      handleSaveInternalNote("lead", String(student.id), `[واتساب]: تم إرسال رابط الاستمارة المباشر بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
                                    }}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-right transition cursor-pointer flex items-center gap-2 group"
                                  >
                                    <span className="text-base">📑</span>
                                    <div className="truncate">
                                      <span className="block text-[11px] font-black text-emerald-300 group-hover:text-emerald-200">إرسال رابط الاستمارة</span>
                                      <span className="block text-[9.5px] text-slate-300">رابط استعراض وطباعة الاستمارة</span>
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {/* Internal Note */}
                              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                                    🔐 تعليق داخلي للمبيعات والمشرفين (محمي)
                                  </span>
                                  {editingNoteId !== student.id ? (
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(student.id);
                                        setTempNoteText(student.internalNotes || "");
                                      }}
                                      className="text-[9.5px] font-black text-amber-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded cursor-pointer transition-all"
                                    >
                                      تعديل ✍️
                                    </button>
                                  ) : null}
                                </div>

                                {editingNoteId === student.id ? (
                                  <div className="space-y-1.5">
                                    <textarea
                                      value={tempNoteText}
                                      onChange={(e) => setTempNoteText(e.target.value)}
                                      className="w-full p-2 bg-slate-950 text-white border border-slate-800 rounded text-xs text-right focus:outline-none"
                                      rows={2}
                                      placeholder="اكتب ملاحظة لفريق العمل بخصوص المكالمة..."
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => handleSaveInternalNote("lead", student.id)}
                                        className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded"
                                      >
                                        تأكيد وحفظ ✓
                                      </button>
                                      <button onClick={() => setEditingNoteId(null)} className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] rounded">
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs font-semibold">{student.internalNotes ? `"${student.internalNotes}"` : "لا توجد ملاحظة سرية للمتابعين حالياً."}</p>
                                )}
                              </div>

                              {/* Assignment */}
                              <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] text-indigo-900 font-extrabold flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>👤 تعيين أو تحويل مستشار المبيعات للتواصل (بكلمة مرور الإدارة):</span>
                                  </span>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 w-full text-right animate-fade-in">
                                  {student.agentName && student.agentName.trim() !== "" ? (
                                    <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                                      <span className="text-xs font-black text-indigo-950 bg-white border border-indigo-150 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-3xs">
                                        <span>المستشار النشط للمكالمة هاتفياً:</span>
                                        <strong className="text-indigo-700 font-black">{student.agentName}</strong>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReassignModal({
                                            isOpen: true,
                                            type: "lead",
                                            id: student.id || student.reservationCode,
                                            studentName: student.studentName,
                                            currentAgent: student.agentName || "",
                                            reservationCode: student.reservationCode,
                                            phone: student.phoneNumber
                                          });
                                          setReassignStep(1);
                                          setReassignSelectedAgent(student.agentName || "");
                                          setReassignCustomAgentInput("");
                                          setReassignPasswordInput("");
                                          setShowReassignPassword(false);
                                          setReassignError(null);
                                        }}
                                        className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-800 hover:to-purple-800 text-white text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-3xs"
                                        title="تحويل الطالب لمستشار آخر (يتطلب رمز الحماية)"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>تحويل / تغيير السيلز 🔄</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassignModal({
                                          isOpen: true,
                                          type: "lead",
                                          id: student.id || student.reservationCode,
                                          studentName: student.studentName,
                                          currentAgent: "",
                                          reservationCode: student.reservationCode,
                                          phone: student.phoneNumber
                                        });
                                        setReassignStep(1);
                                        setReassignSelectedAgent(activeSalesReps[0] || "");
                                        setReassignCustomAgentInput("");
                                        setReassignPasswordInput("");
                                        setShowReassignPassword(false);
                                        setReassignError(null);
                                      }}
                                      className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                                    >
                                      <UserPlus className="w-4 h-4" />
                                      <span>تعيين مستشار مبيعات لهذا الطالب (مسجل عبر الموقع) 👤</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                          {/* Action footer triggers */}
                          <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center pt-2.5 border-t border-slate-100">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                              {student.status !== "completed" && (
                                <button
                                  onClick={() => handleUpdateStatus("lead", String(student.id), "no_reply")}
                                  className={`text-xs font-bold p-3 sm:px-4 sm:py-2 rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                                    student.status === "no_reply"
                                      ? "bg-amber-100 text-amber-500 border-amber-300"
                                      : "bg-amber-500 hover:bg-amber-600 text-white shadow-3xs"
                                  }`}
                                >
                                  {student.status === "no_reply" ? "تم تسجيل لم يرد تليفونياً (متابعة) 📞" : "تسجيل لم يرد 📞"}
                                </button>
                              )}

                              {student.status === "completed" ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-extrabold p-3 sm:px-4 sm:py-2 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-800 flex items-center justify-center gap-1.5 select-none w-full sm:w-auto text-center">
                                    تم المكالمة والمتابعة والترحيل بنجاح ✓
                                  </span>
                                  <button
                                    onClick={() => handleUpdateStatus("lead", String(student.id), "pending")}
                                    className="text-xs font-bold p-2 text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
                                    title="إعادة الطالب لقائمة قيد الانتظار للمتابعة مجدداً"
                                  >
                                    إعادة لقيد الانتظار 🔄
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus("lead", String(student.id), "completed")}
                                  className="text-xs font-bold p-3 sm:px-4 sm:py-2 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto shadow-3xs"
                                  title="تأكيد أنه تم الاتصال والمتابعة وتعميد حجز الطالب"
                                >
                                  تأكيد المكالمة والتعميد ✓
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                const listKey = 
                                  student.status === "completed" 
                                    ? "lead_completed" 
                                    : student.status === "no_reply" 
                                      ? "lead_no_reply" 
                                      : "lead_new";
                                triggerSecureDelete(listKey, student.id, student.studentName || "طالب", () => {
                                  handleDeleteItem("lead", student.id, {
                                    reservationCode: student.reservationCode,
                                    phone: student.phoneNumber,
                                    studentName: student.studentName
                                  });
                                });
                              }}
                              className="text-slate-400 hover:text-red-650 transition flex items-center justify-center gap-1 py-2 px-3 hover:bg-red-50 rounded-xl cursor-pointer w-full sm:w-auto mt-1 sm:mt-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                              <span className="text-xs text-red-655 font-bold">حذف الطالب</span>
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
                  </div>
                )}
                  </>
                )}

              </div>
            )}

          </div>

        </div>

      {/* Real-time Toast Alerts Overlay */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[120] flex flex-col gap-3 max-w-sm w-full p-4 pointer-events-none text-right" dir="rtl">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="p-4 rounded-2xl shadow-2xl border text-right pointer-events-auto animate-scale-up flex flex-col gap-1.5 bg-slate-900 text-white border-slate-800 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 animate-pulse" />
              <div className="flex items-start justify-between gap-3 font-sans pr-2">
                <div className="text-xs font-semibold space-y-1">
                  <p className="font-extrabold text-[12.5px] leading-relaxed text-slate-100">
                    {toast.message}
                  </p>
                  <span className="text-[9px] text-slate-400 font-mono inline-block">
                    تم الاستلام: {toast.time}
                  </span>
                </div>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-slate-400 hover:text-white shrink-0 p-1 bg-white/5 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔐 PASSWORD UNLOCK OVERLAY MODAL */}
      {pendingDeleteAction && (
        <div className="fixed inset-0 bg-[#0a2463]/30 backdrop-blur-md flex items-center justify-center p-4 z-[9999] text-right font-sans" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-105 overflow-hidden animate-scale-up">
            <div className="bg-slate-950 p-6 text-white text-center relative">
              <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
                <ShieldAlert className="w-7 h-7 text-rose-500 animate-pulse" />
              </div>
              <h3 className="text-base font-black">🔐 صلاحية حذف مقيدة ومحميّة</h3>
              <p className="text-[11px] text-slate-400 mt-1">يُرجى إدخال كلمة المرور إلغاء الحظر لهذه القائمة لتفعيل الحذف طوال الجلسة</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">كلمة المرور الإدارية للحذف:</label>
                <input
                  type="password"
                  value={deletePasswordInput}
                  onChange={(e) => {
                    setDeletePasswordInput(e.target.value);
                    if (deletePasswordError) setDeletePasswordError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (deletePasswordInput.trim() === "Mm151997") {
                        const updated = { ...unlockedDeleteTabs, [pendingDeleteAction.listKey]: true };
                        setUnlockedDeleteTabs(updated);
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("unlocked_delete_tabs", JSON.stringify(updated));
                        }
                        const onConfirmed = pendingDeleteAction.onConfirmed;
                        setPendingDeleteAction(null);
                        setDeleteConfirmationAction({
                          studentName: pendingDeleteAction.studentName,
                          onConfirmed
                        });
                      } else {
                        setDeletePasswordError("⚠️ كلمة المرور المدخلة غير صحيحة، يرجى المحاولة مجدداً!");
                      }
                    }
                  }}
                  placeholder="••••••••"
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500/15 focus:outline-none focus:border-slate-800 text-center font-bold tracking-widest text-lg text-slate-850"
                  autoFocus
                />
              </div>

              {deletePasswordError && (
                <p className="text-xs text-red-650 bg-red-50 p-3 rounded-lg border border-red-100 font-bold">
                  {deletePasswordError}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    if (deletePasswordInput.trim() === "Mm151997") {
                      const updated = { ...unlockedDeleteTabs, [pendingDeleteAction.listKey]: true };
                      setUnlockedDeleteTabs(updated);
                      if (typeof window !== "undefined") {
                        sessionStorage.setItem("unlocked_delete_tabs", JSON.stringify(updated));
                      }
                      const onConfirmed = pendingDeleteAction.onConfirmed;
                      setPendingDeleteAction(null);
                      setDeleteConfirmationAction({
                        studentName: pendingDeleteAction.studentName,
                        onConfirmed
                      });
                    } else {
                      setDeletePasswordError("⚠️ كلمة المرور المدخلة غير صحيحة، يرجى المحاولة مجدداً!");
                    }
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition shadow-md cursor-pointer"
                >
                  تأكيد وحفظ كلمة المرور 🔓
                </button>
                <button
                  onClick={() => {
                    setPendingDeleteAction(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ CONFIRMATION POP-UP MODAL */}
      {deleteConfirmationAction && (
        <div className="fixed inset-0 bg-[#0a2463]/30 backdrop-blur-md flex items-center justify-center p-4 z-[9999] text-right font-sans" dir="rtl">
          <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                <AlertTriangle className="w-6 h-6 text-amber-500 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">هل أنت متأكد من حذف هذا السجل وبشكل نهائي؟</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-bold">
                  ({deleteConfirmationAction.studentName}): سيتم مسح هذا الملف من كافة الأقسام والأرشيف نهائياً.
                </p>
              </div>
              <div className="flex gap-2.5 justify-center pt-2">
                <button
                  onClick={() => {
                    const cb = deleteConfirmationAction.onConfirmed;
                    const studentName = deleteConfirmationAction.studentName || "السجل";
                    setDeleteConfirmationAction(null);
                    cb();
                    toast(`✓ تم تأكيد الحظر وحذف سجل (${studentName}) نهائياً بنجاح!`, {
                      icon: "🗑️",
                      style: {
                        background: "#fef2f2",
                        color: "#991b1b",
                        border: "1px solid #fee2e2"
                      }
                    });
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-3xs"
                >
                  أويد بالكامل، احذف السجل 🗑️
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmationAction(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  تراجع وإلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Integration & Instant Sync Modal */}
      {showGoogleSheetsModal && (
        <div className="fixed inset-0 bg-[#0a2463]/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[9999] text-right font-sans overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up my-8 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 p-6 text-white relative shrink-0">
              <button
                onClick={() => setShowGoogleSheetsModal(false)}
                className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">📊</span>
                <h3 className="text-lg font-black text-white">إدارة ومزامنة جوجل شيت (Google Sheets Sync)</h3>
              </div>
              <p className="text-xs text-emerald-200/90 font-sans">
                ربط المنصة بشيت جوجل الخاص بك لترحيل الطلاب تلقائياً فور تسجيلهم أو ترحيل كافة السجلات المحفوظة دفعة واحدة.
              </p>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto font-sans">
              {/* Status Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-emerald-900 block mb-0.5">
                    ✓ حالة قاعدة البيانات المحلية والربط
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    عدد الطلاب الجاهزين للترحيل: <strong className="font-mono font-bold text-sm text-emerald-950">{adminLeads.length}</strong> طالب (محفوظين ومحميين 100%).
                  </p>
                </div>
                <div className="shrink-0">
                  <span className={`px-3 py-1 text-[11px] font-black rounded-full border ${
                    currentSheetConfig?.isCustom
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}>
                    {currentSheetConfig?.isCustom ? "✓ شيت مخصص مفعل" : "⚠️ الشيت الافتراضي للمنصة"}
                  </span>
                </div>
              </div>

              {/* Sync All Button */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300">⚡ ترحيل ومزامنة شاملة فورية</span>
                  <span className="text-[10px] text-slate-400">يرسل كافة الطلاب الـ {adminLeads.length} دفعة واحدة</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  اضغط الزر أدناه لإرسال وإدراج كافة الطلاب المسجلين بالمنصة إلى شيت جوجل المتصل الآن:
                </p>
                <button
                  type="button"
                  disabled={isSyncingAllSheets}
                  onClick={async () => {
                    setIsSyncingAllSheets(true);
                    setSheetSyncFeedback(null);
                    try {
                      const res = await fetch("/api/google-sheets/sync-all", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        setSheetSyncFeedback(`✓ ${data.message}`);
                        toast.success(data.message);
                      } else {
                        setSheetSyncFeedback(`خطأ: ${data.error || "تعذرت المزامنة"}`);
                        toast.error(data.error || "تعذرت المزامنة");
                      }
                    } catch (err: any) {
                      setSheetSyncFeedback(`عذراً، حدث خطأ: ${err.message}`);
                    } finally {
                      setIsSyncingAllSheets(false);
                    }
                  }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                    isSyncingAllSheets
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98"
                  }`}
                >
                  {isSyncingAllSheets ? (
                    <span>⏳ جاري مزامنة الـ {adminLeads.length} طالب إلى شيت جوجل...</span>
                  ) : (
                    <span>🚀 ترحيل ومزامنة كافة الطلاب ({adminLeads.length} طالب) لشيت جوجل الآن</span>
                  )}
                </button>

                {sheetSyncFeedback && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold text-center">
                    {sheetSyncFeedback}
                  </div>
                )}
              </div>

              {/* Set Custom Google Sheets Webhook URL */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-800">
                  🔗 رابط الويب هوك الخاص بشيت جوجل (Google Apps Script Webhook URL):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={customSheetUrl}
                    onChange={(e) => setCustomSheetUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    disabled={isSavingSheetUrl || !customSheetUrl.trim()}
                    onClick={async () => {
                      setIsSavingSheetUrl(true);
                      try {
                        const res = await fetch("/api/google-sheets/config", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: customSheetUrl.trim() })
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success("✓ تم حفظ واختبار رابط شيت جوجل بنجاح!");
                          fetchGoogleSheetsConfig();
                        } else {
                          toast.error(data.error || "تعذر حفظ الرابط");
                        }
                      } catch (err: any) {
                        toast.error(err.message);
                      } finally {
                        setIsSavingSheetUrl(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isSavingSheetUrl ? "جاري الحفظ..." : "حفظ وتفعيل الرابط ✓"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  إذا تركت الرابط كما هو أو كنت تستخدم شيت المنصة الافتراضي، يتم تسجيل الطلاب في السجل المعتمد.
                </p>
              </div>

              {/* Step-by-step Google Sheets Guide */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span>💡</span> كيف تنشئ شيت جوجل وتستخرج الرابط في دقيقتين؟
                </span>
                <ol className="text-[11px] text-amber-950 space-y-1.5 list-decimal list-inside pr-1 leading-relaxed">
                  <li>افتح <strong>Google Sheets</strong> وأنشئ ملف إكسل جديد في حسابك.</li>
                  <li>من القائمة العلوية اضغط على <strong>الإضافات (Extensions) &gt; Apps Script</strong>.</li>
                  <li>احذف أي كود موجود في المحرر، والصق الكود الجاهز أدناه.</li>
                  <li>اضغط <strong>نشر (Deploy) &gt; New deployment &gt; Select type: Web app</strong>.</li>
                  <li>اجعل خيار <strong>Who has access: Anyone</strong> (الجميع) ثم اضغط <strong>Deploy</strong> وانسخ الرابط والصقه في الحقل أعلاه!</li>
                </ol>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700">الكود الجاهز للنسخ (Google Apps Script):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const scriptCode = `function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    var headers = [
      "كود الحجز", "اسم الطالب", "رقم الهاتف", "رقم الواتساب",
      "المحافظة", "التخصص / الأقسام", "المؤهل الدراسي",
      "سنة التخرج", "مسؤول المبيعات", "الحالة", "تاريخ التسجيل", "الملاحظات"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    var list = data.students || (Array.isArray(data) ? data : [data]);
    var rows = [];

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.action === "ping") continue;
      
      var phone = item.phone || item.phoneNumber || "";
      if (phone && !phone.startsWith("'")) phone = "'" + phone;
      
      var wa = item.whatsapp || item.whatsappNumber || item.phone || "";
      if (wa && !wa.startsWith("'")) wa = "'" + wa;

      rows.push([
        item.bookingCode || item["رمز_الحجز"] || "",
        item.fullName || item.studentName || "",
        phone,
        wa,
        item.governorate || "",
        item.selectedDepartments || item.specialization || "",
        item.educationLevel || "",
        item.graduationYear || "",
        item.salesAgent || item.agentName || "",
        item.status || "جديد",
        item.createdAt || new Date().toLocaleString("ar-EG"),
        item.notes || ""
      ]);
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success", count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ result: "active", message: "Google Sheets Webhook is ready!" }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
                        navigator.clipboard.writeText(scriptCode);
                        toast.success("تم نسخ كود Apps Script المطور إلى الحافظة بنجاح!");
                      }}
                      className="text-[10px] text-indigo-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> نسخ الكود الجاهز
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-[10px] font-mono overflow-x-auto max-h-44" dir="ltr">
{`function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var headers = ["كود الحجز", "اسم الطالب", "رقم الهاتف", "رقم الواتساب", "المحافظة", "التخصص / الأقسام", "المؤهل الدراسي", "سنة التخرج", "مسؤول المبيعات", "الحالة", "تاريخ التسجيل", "الملاحظات"];
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);

    var list = data.students || (Array.isArray(data) ? data : [data]);
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.action === "ping") continue;
      var phone = item.phone || item.phoneNumber || "";
      if (phone && !phone.startsWith("'")) phone = "'" + phone;
      var wa = item.whatsapp || item.whatsappNumber || item.phone || "";
      if (wa && !wa.startsWith("'")) wa = "'" + wa;
      rows.push([
        item.bookingCode || item["رمز_الحجز"] || "",
        item.fullName || item.studentName || "",
        phone, wa, item.governorate || "",
        item.selectedDepartments || item.specialization || "",
        item.educationLevel || "", item.graduationYear || "",
        item.salesAgent || item.agentName || "",
        item.status || "جديد",
        item.createdAt || new Date().toLocaleString("ar-EG"),
        item.notes || ""
      ]);
    }
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
    }
    return ContentService.createTextOutput(JSON.stringify({ result: "success", count: rows.length })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ result: "active", message: "Google Sheets Webhook is ready!" })).setMimeType(ContentService.MimeType.JSON);
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <a
                href="/api/admin/export/students-excel"
                download={`students_backup_${new Date().toISOString().slice(0, 10)}.xlsx`}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>📥 تنزيل ملف Excel أصلي (.xlsx)</span>
              </a>
              <button
                type="button"
                onClick={() => setShowGoogleSheetsModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive PDF Report Password Protection Modal */}
      {showExecutiveReportPasswordModal && (
        <div className="fixed inset-0 bg-[#0a2463]/40 backdrop-blur-md flex items-center justify-center p-4 z-[9999] text-right font-sans" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-900 p-6 text-white text-center relative">
              <button
                onClick={() => setShowExecutiveReportPasswordModal(false)}
                className="absolute top-4 left-4 p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-400/30">
                <Lock className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-base font-black">🔐 صلاحية تصدير تقارير الإدارة PDF</h3>
              <p className="text-[11px] text-slate-300 mt-1">يُرجى إدخال كلمة المرور لتوليد وتصدير التقرير التنفيذي الشامل</p>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pdfReportPasswordInput.trim() === "eg123") {
                  setShowExecutiveReportPasswordModal(false);
                  setShowExecutiveReportModal(true);
                  setPdfReportPasswordError(false);
                } else {
                  setPdfReportPasswordError(true);
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">كلمة المرور الخاصة بالتقارير:</label>
                <input
                  type="password"
                  value={pdfReportPasswordInput}
                  onChange={(e) => {
                    setPdfReportPasswordInput(e.target.value);
                    if (pdfReportPasswordError) setPdfReportPasswordError(false);
                  }}
                  placeholder="••••••••"
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-600 text-center font-bold tracking-widest text-lg text-slate-900"
                  autoFocus
                />
              </div>

              {pdfReportPasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5 animate-bounce">
                  <span>⚠️ كلمة المرور المدخلة غير صحيحة! يرجى إدخال كلمة المرور المعتمدة (eg123).</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  تأكيد وفتح التقرير 📊
                </button>
                <button
                  type="button"
                  onClick={() => setShowExecutiveReportPasswordModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Executive Report PDF Viewer Modal */}
      <ExecutiveReportModal
        isOpen={showExecutiveReportModal}
        onClose={() => setShowExecutiveReportModal(false)}
        adminLeads={adminLeads}
        adminCallbacks={adminCallbacks}
        parentInquiries={parentInquiries}
        shadowTickets={shadowTickets}
      />

      {/* Student WhatsApp / SMS Notification Modal */}
      <StudentMessagingModal
        isOpen={isMessagingModalOpen}
        onClose={() => {
          setIsMessagingModalOpen(false);
          setMessagingStudent(null);
        }}
        student={messagingStudent}
        onLoggedAction={(studentId, actionSummary) => {
          handleSaveInternalNote("lead", String(studentId), `[إشعار آلي]: ${actionSummary} بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
        }}
      />

      {/* High Administration Sales Reassignment Modal (Password Protected - 2 Steps) */}
      {reassignModal && reassignModal.isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          dir="rtl"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
          onClick={() => {
            setReassignModal(null);
            setReassignStep(1);
            setReassignError(null);
            setReassignPasswordInput("");
            setShowReassignPassword(false);
          }}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up text-right font-sans my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white relative">
              <button
                type="button"
                onClick={() => {
                  setReassignModal(null);
                  setReassignStep(1);
                  setReassignError(null);
                  setReassignPasswordInput("");
                  setShowReassignPassword(false);
                }}
                className="absolute top-3.5 left-3.5 p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-400/30 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {reassignStep === 1
                      ? "رمز الحماية لتعديل السيلز 🔒"
                      : reassignModal.currentAgent
                      ? "تحويل العميل إلى مستشار آخر 🔄"
                      : "تعيين مستشار مبيعات للعميل 👤"}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {reassignStep === 1
                      ? (reassignModal.currentAgent ? "طلب تحويل العميل لمستشار مبيعات آخر" : "طلب تعيين سيلز لطالب مسجل بدون سيلز")
                      : `العميل: ${reassignModal.studentName || "غير محدد"}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              
              {/* STEP 1: PASSWORD AUTHENTICATION */}
              {reassignStep === 1 ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Lead information card */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">العميل:</span>
                      <span className="font-black text-slate-900">{reassignModal.studentName || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">المستشار الحالي:</span>
                      <span className={`font-black ${reassignModal.currentAgent ? 'text-indigo-800' : 'text-amber-700'}`}>
                        {reassignModal.currentAgent ? `المسؤول: ${reassignModal.currentAgent}` : "⚠️ مسجل من الموقع بدون سيلز"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-bold">الإجراء:</span>
                      <span className="font-black text-emerald-700">
                        {reassignModal.currentAgent ? "🔄 تحويل لمستشار آخر" : "👤 تعيين سيلز جديد"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-center">
                    <p className="text-xs font-bold text-amber-950 flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>صلاحيات الإدارة العليا محمية</span>
                    </p>
                    <p className="text-[10.5px] text-amber-900 leading-relaxed">
                      تغيير السيلز أو إضافة سيلز لطالب بدون سيلز يتطلب إدخال رمز الحماية لمنع أي تعديل غير مصرح به.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>أدخل رمز الحماية / كلمة مرور الإدارة:</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showReassignPassword ? "text" : "password"}
                        value={reassignPasswordInput}
                        onChange={(e) => {
                          setReassignPasswordInput(e.target.value);
                          setReassignError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVerifyReassignPassword();
                          }
                        }}
                        placeholder="••••••••"
                        className="w-full p-3 pl-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-950 text-center tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowReassignPassword(!showReassignPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                        title={showReassignPassword ? "إخفاء الرمز" : "إظهار الرمز"}
                      >
                        {showReassignPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {reassignError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{reassignError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyReassignPassword}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>تحقق وفتح قائمة السيلز ←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReassignModal(null);
                        setReassignStep(1);
                        setReassignError(null);
                        setReassignPasswordInput("");
                        setShowReassignPassword(false);
                      }}
                      className="px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: CHOOSE SALES AGENT (Only shown after valid password) */
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Current info card */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">العميل:</span>
                      <span className="font-black text-slate-900">{reassignModal.studentName || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">المستشار الحالي:</span>
                      <span className={`font-black ${reassignModal.currentAgent ? 'text-indigo-800' : 'text-amber-700'}`}>
                        {reassignModal.currentAgent || "⚠️ مسجل من الموقع بدون سيلز"}
                      </span>
                    </div>
                  </div>

                  {/* Select Target Agent */}
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-slate-800">
                        اختر مستشار المبيعات المراد التحويل إليه:
                      </label>
                      <span className="text-[11px] text-slate-500 font-bold">
                        ({activeSalesReps.length} مستشار مبيعات)
                      </span>
                    </div>

                    {/* Quick Search */}
                    {activeSalesReps.length > 4 && (
                      <div className="relative">
                        <input
                          type="text"
                          value={reassignRepSearch}
                          onChange={(e) => setReassignRepSearch(e.target.value)}
                          placeholder="🔍 بحث سريع بالاسم..."
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        {reassignRepSearch && (
                          <button
                            type="button"
                            onClick={() => setReassignRepSearch("")}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    <select
                      value={reassignSelectedAgent}
                      onChange={(e) => setReassignSelectedAgent(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- اختر من قائمة السيلز --</option>
                      {activeSalesReps
                        .filter((rep) => !reassignRepSearch.trim() || rep.toLowerCase().includes(reassignRepSearch.trim().toLowerCase()))
                        .map((rep) => {
                          const stats = salesRepsStatsMap[rep];
                          const count = stats?.count || 0;
                          const countLabel = count === 1 ? "طالب واحد" : count === 2 ? "طالبان" : (count >= 3 && count <= 10) ? `${count} طلاب` : `${count} طالب`;
                          const lastTime = stats?.lastDateFormatted || "لم يُسند له طلاب بعد";
                          const studentNote = stats?.lastStudentName ? ` (${stats.lastStudentName})` : "";
                          return (
                            <option key={rep} value={rep}>
                              {rep} — (👥 {countLabel}) — ⏱️ آخر طالب: {lastTime}{studentNote}
                            </option>
                          );
                        })}
                      <option value="__CUSTOM__">✍️ كتابة اسم سيلز جديد غير موجود بالقائمة...</option>
                    </select>
                  </div>

                  {/* Selected Agent Live Metrics Preview */}
                  {reassignSelectedAgent && reassignSelectedAgent !== "__CUSTOM__" && salesRepsStatsMap[reassignSelectedAgent] && (
                    <div className="p-3 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-200 rounded-xl space-y-2 text-xs text-right animate-fade-in shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>إجمالي الطلاب المسندين مع ({reassignSelectedAgent}):</span>
                        </span>
                        <span className="font-black text-indigo-900 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 font-mono shadow-3xs">
                          {salesRepsStatsMap[reassignSelectedAgent].count} طالب
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>توقيت وتاريخ آخر طالب محوّل له أو مسجل:</span>
                        </span>
                        <span className="font-bold text-purple-950 font-mono bg-white/80 px-2 py-0.5 rounded-md border border-purple-200 shadow-3xs">
                          {salesRepsStatsMap[reassignSelectedAgent].lastDateFormatted}
                        </span>
                      </div>
                      {salesRepsStatsMap[reassignSelectedAgent].lastStudentName && (
                        <div className="flex items-center justify-between pt-1 border-t border-indigo-100 text-[11px]">
                          <span className="text-slate-500 font-bold">اسم آخر طالب مسجل أو محول له:</span>
                          <span className="font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                            {salesRepsStatsMap[reassignSelectedAgent].lastStudentName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Agent Input */}
                  {reassignSelectedAgent === "__CUSTOM__" && (
                    <div className="space-y-1.5 text-right animate-fade-in">
                      <label className="block text-xs font-black text-indigo-950">
                        اكتب اسم مستشار المبيعات:
                      </label>
                      <input
                        type="text"
                        value={reassignCustomAgentInput}
                        onChange={(e) => setReassignCustomAgentInput(e.target.value)}
                        placeholder="مثال: Mariam Mahmoud أو أي اسم آخر"
                        className="w-full p-2.5 sm:p-3 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs font-extrabold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  )}

                  {reassignError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{reassignError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={reassignLoading}
                      onClick={handleExecuteReassign}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {reassignLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      )}
                      <span>حفظ وتأكيد التحويل ✓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReassignStep(1);
                        setReassignPasswordInput("");
                        setShowReassignPassword(false);
                        setReassignError(null);
                      }}
                      className="px-3.5 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      رجوع
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 2. BULK REASSIGNMENT MODAL (Password Protected 2-Step Bulk Transfer)     */}
      {/* ========================================================================= */}
      {bulkReassignModal && bulkReassignModal.isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          dir="rtl"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
          onClick={() => {
            if (!bulkReassignModal.loading) setBulkReassignModal(null);
          }}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up text-right font-sans my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 p-4 sm:p-5 text-white relative">
              {!bulkReassignModal.loading && (
                <button
                  type="button"
                  onClick={() => setBulkReassignModal(null)}
                  className="absolute top-3.5 left-3.5 p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-400/30 shrink-0">
                  <ArrowRightLeft className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {bulkReassignModal.step === 1
                      ? "رمز حماية الإدارة للتحويل الجماعي 🔒"
                      : "تحويل جميع الطلاب لسيلز آخر 🔄"}
                  </h3>
                  <p className="text-[11px] text-purple-200 mt-0.5">
                    تحويل دفعة كاملة من السيلز: <span className="font-bold underline text-amber-300">{bulkReassignModal.fromAgent}</span> ({bulkReassignModal.leadsCount} طالب)
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* STEP 1: PASSWORD AUTHENTICATION */}
              {bulkReassignModal.step === 1 ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-900 font-bold">المستشار الحالي:</span>
                      <span className="font-black text-purple-950 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {bulkReassignModal.fromAgent}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-purple-900 font-bold">إجمالي الطلاب المسجلين باسمه:</span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {bulkReassignModal.leadsCount} طالب
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 pt-1 border-t border-purple-200/60 leading-relaxed">
                      💡 هذا الإجراء سيقوم بتحويل جميع هؤلاء الطلاب تلقائياً إلى مستشار آخر وتحديثهم فوراً في قاعدة البيانات وسوبابيز.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>أدخل رمز حماية الإدارة للمتابعة:</span>
                    </label>
                    <input
                      type="password"
                      value={bulkReassignModal.password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkReassignModal(prev => prev ? { ...prev, password: val, error: null } : null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!isMasterAdminPasswordValid(bulkReassignModal.password)) {
                            setBulkReassignModal(prev => prev ? { ...prev, error: "رمز الحماية غير صحيح. يرجى مراجعة الإدارة العليا." } : null);
                            return;
                          }
                          setBulkReassignModal(prev => prev ? { ...prev, step: 2, error: null } : null);
                        }
                      }}
                      placeholder="••••••••"
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-950 text-center tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition"
                      autoFocus
                    />
                  </div>

                  {bulkReassignModal.error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{bulkReassignModal.error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isMasterAdminPasswordValid(bulkReassignModal.password)) {
                          setBulkReassignModal(prev => prev ? { ...prev, error: "رمز الحماية غير صحيح. يرجى مراجعة الإدارة العليا." } : null);
                          return;
                        }
                        setBulkReassignModal(prev => prev ? { ...prev, step: 2, error: null } : null);
                      }}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>تأكيد الرمز واختيار السيلز الجديد ←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkReassignModal(null)}
                      className="px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: SELECT NEW AGENT AND EXECUTE */
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5 text-right">
                    <label className="block text-xs font-black text-slate-800">
                      اختر مستشار المبيعات الجديد لتحويل جميع ({bulkReassignModal.leadsCount}) طالب إليه:
                    </label>
                    <select
                      value={bulkReassignModal.toAgent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkReassignModal(prev => prev ? { ...prev, toAgent: val, error: null } : null);
                      }}
                      className="w-full p-2.5 sm:p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="">-- اختر مستشار المبيعات الجديد --</option>
                      {activeSalesReps
                        .filter(r => r.trim() !== bulkReassignModal.fromAgent.trim())
                        .map(rep => {
                          const stats = salesRepsStatsMap[rep];
                          const count = stats?.count || 0;
                          const countLabel = count === 1 ? "طالب واحد" : count === 2 ? "طالبان" : (count >= 3 && count <= 10) ? `${count} طلاب` : `${count} طالب`;
                          const lastTime = stats?.lastDateFormatted || "لم يُسند له طلاب بعد";
                          const studentNote = stats?.lastStudentName ? ` (${stats.lastStudentName})` : "";
                          return (
                            <option key={rep} value={rep}>
                              📞 {rep} — (👥 {countLabel}) — ⏱️ آخر طالب: {lastTime}{studentNote}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* Selected Target Agent Live Metrics in Bulk Modal */}
                  {bulkReassignModal.toAgent && salesRepsStatsMap[bulkReassignModal.toAgent] && (
                    <div className="p-3 bg-gradient-to-r from-purple-50/90 to-indigo-50/90 border border-purple-200 rounded-xl space-y-1.5 text-xs text-right animate-fade-in shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          <span>الطلاب المسندين حالياً مع ({bulkReassignModal.toAgent}):</span>
                        </span>
                        <span className="font-black text-purple-900 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200 font-mono shadow-3xs">
                          {salesRepsStatsMap[bulkReassignModal.toAgent].count} طالب
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>توقيت وتاريخ آخر طالب لديه:</span>
                        </span>
                        <span className="font-bold text-indigo-950 font-mono bg-white/80 px-2 py-0.5 rounded-md border border-indigo-200 shadow-3xs">
                          {salesRepsStatsMap[bulkReassignModal.toAgent].lastDateFormatted}
                        </span>
                      </div>
                      {salesRepsStatsMap[bulkReassignModal.toAgent].lastStudentName && (
                        <div className="flex items-center justify-between pt-1 border-t border-purple-100 text-[11px]">
                          <span className="text-slate-500 font-bold">اسم آخر طالب لديه:</span>
                          <span className="font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                            {salesRepsStatsMap[bulkReassignModal.toAgent].lastStudentName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {bulkReassignModal.error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{bulkReassignModal.error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={bulkReassignModal.loading || !bulkReassignModal.toAgent}
                      onClick={handleBulkReassignExecute}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {bulkReassignModal.loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      )}
                      <span>
                        {bulkReassignModal.loading
                          ? "جارِ التحويل والمزامنة..."
                          : `تحويل (${bulkReassignModal.leadsCount}) طالب إلى (${bulkReassignModal.toAgent || "..."}) الآن ✓`}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={bulkReassignModal.loading}
                      onClick={() => setBulkReassignModal(prev => prev ? { ...prev, step: 1, error: null } : null)}
                      className="px-3.5 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      رجوع
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 3. FILTER & SALES REPS MANAGER MODAL                                     */}
      {/* ========================================================================= */}
      {showFilterManagerModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          dir="rtl"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
          onClick={() => setShowFilterManagerModal(false)}
        >
          <div
            className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-right font-sans my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 sm:p-5 text-white relative flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-400/30 shrink-0">
                  <Settings2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    تخصيص مستشاري المبيعات في الفلتر والتحويل الجماعي
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    إدارة ظهور أسماء السيلز في قائمة البحث وتحويل طلاب أي سيلز مغادر دفعة واحدة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterManagerModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable list of reps */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span>إجمالي المستشارين المسجلين: {allDataSalesReps.length}</span>
                {hiddenFilterReps.length > 0 && (
                  <button
                    type="button"
                    onClick={resetHiddenReps}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-black cursor-pointer"
                  >
                    إعادة إظهار المستشارين المخفيين ({hiddenFilterReps.length})
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                {allDataSalesReps.map((repName) => {
                  const isHidden = hiddenFilterReps.includes(repName);
                  const leadsCount = repLeadsCountMap[repName] || 0;
                  return (
                    <div
                      key={repName}
                      className={`p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 transition ${
                        isHidden ? "bg-slate-50/70 opacity-70" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          leadsCount > 0 ? "bg-indigo-100 text-indigo-800" : "bg-slate-150 text-slate-600"
                        }`}>
                          {leadsCount}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs sm:text-sm text-slate-900">{repName}</span>
                            {isHidden && (
                              <span className="text-[9.5px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                                مخفي من الفلتر
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-slate-500 font-bold block">
                            {leadsCount > 0 ? `${leadsCount} طالب مسجل ومربوط بهذا السيلز` : "لا يوجد طلاب حالياً"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Bulk Reassign Button */}
                        {leadsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowFilterManagerModal(false);
                              setBulkReassignModal({
                                isOpen: true,
                                fromAgent: repName,
                                toAgent: "",
                                leadsCount,
                                step: 1,
                                password: "",
                                error: null,
                                loading: false
                              });
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded-lg text-xs font-black flex items-center gap-1 transition cursor-pointer"
                            title="تحويل جميع طلاب هذا السيلز لسيلز آخر"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>تحويل الطلاب ({leadsCount})</span>
                          </button>
                        )}

                        {/* Hide / Show in filter toggle */}
                        <button
                          type="button"
                          onClick={() => toggleHideRepFromFilter(repName)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                            isHidden
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                          }`}
                          title={isHidden ? "إعادة إظهاره في الفلتر" : "حذفه/إخفاؤه من الفلتر"}
                        >
                          {isHidden ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>إظهار بالفلتر</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف من الفلتر</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowFilterManagerModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import From Google Sheets / Excel Modal */}
      <ImportFromGoogleSheetsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingLeads={adminLeads}
        onSuccess={(newlyImported) => {
          if (newlyImported && newlyImported.length > 0) {
            setAdminLeads(prev => {
              const updated = [...newlyImported, ...prev];
              const deduped = normalizeAndDeduplicateLeads(updated) as unknown as Lead[];
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("admin_leads_cache", JSON.stringify(deduped));
                } catch (e) {}
              }
              return deduped;
            });
            toast.success(`تم استيراد ${newlyImported.length} طالب بنجاح وإضافتهم لقاعدة البيانات وسوبابيز!`);
          }
        }}
      />

    </div>
  );
}
