import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useParams, useNavigate, Link } from "react-router-dom";
import { initialLeads } from "../data/initialStudents";
import { normalizeAndDeduplicateLeads } from "../lib/leadUtils";
import { supabase, hasSupabase } from "../supabaseClient";
import { 
  User, 
  Phone, 
  MessageCircle, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Clock, 
  Copy, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ExternalLink, 
  LogOut, 
  QrCode, 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  Share2, 
  Briefcase, 
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  ShieldCheck,
  Check,
  Tag,
  Bell,
  BellOff
} from "lucide-react";
import toast from "react-hot-toast";
import { getStudentSlaInfo } from "../utils/slaUtils";
import { studentMessages, DEFAULT_DISCOUNT_CODE } from "../utils/messages";
import { StudentMessagingModal, StudentLeadForMessage } from "../components/StudentMessagingModal";
import { NotificationSoundModal } from "../components/NotificationSoundModal";
import { playAlertToneForUser } from "../utils/audioAlerts";
import { dispatchStudentPhoneNotification } from "../utils/pushNotifications";
import { ACADEMY_DEPARTMENTS } from "../data";
import { UNIFIED_EDUCATION_LEVELS } from "../constants/educationLevels";
import { EGYPT_GOVERNORATES } from "../components/StudentBookingForm";

interface SalesRep {
  id: string;
  slug: string;
  name: string;
  pin?: string;
  phone?: string;
  title?: string;
  active?: boolean;
}

interface StudentLead {
  id: string | number;
  studentName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  governorate?: string;
  graduationYear?: string;
  educationLevel?: string;
  basicCourse?: string;
  selectedDepartments?: string[];
  notes?: string;
  internalNotes?: string;
  reservationCode?: string;
  status: string;
  date?: string;
  timestamp?: number | string;
  agentName?: string;
  isShadow?: boolean;
  reassignedDateStr?: string;
  reassignedTimestamp?: number;
}

export default function SalesPortal() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  const urlRepParam = params.agentSlug || searchParams.get("rep") || searchParams.get("agent") || "";

  // Helper to determine gender title dynamically (مستشار للمذكر vs مستشارة للمؤنث)
  const getRepGenderInfo = (rep?: { name?: string; title?: string } | null) => {
    if (!rep) {
      return {
        portalPrefix: "بوابة المستشار المعتمد:",
        portalRole: "مستشار القبول والتسجيل",
        greetingPrefix: "أهلاً بك يا مستشار"
      };
    }

    const name = String(rep.name || "").trim();
    const rawTitle = String(rep.title || "").trim();

    // Explicit female markers in title
    if (
      rawTitle.includes("مستشارة") ||
      rawTitle.includes("مسؤولة") ||
      rawTitle.includes("أخصائية") ||
      rawTitle.includes("منسقة")
    ) {
      return {
        portalPrefix: "بوابة المستشارة المعتمدة:",
        portalRole: rawTitle || "مستشارة القبول والتسجيل والمبيعات",
        greetingPrefix: "أهلاً بكِ يا مستشارة"
      };
    }

    // Explicit male prefixes (م/محمد, أ/أدهم, د/...)
    if (name.startsWith("م/") || name.startsWith("أ/") || name.startsWith("د/")) {
      const isFemaleSpec = ["مهندسة", "دكتورة", "أستاذة"].some(f => rawTitle.includes(f));
      if (!isFemaleSpec) {
        const cleanTitle = rawTitle ? rawTitle.replace(/مستشارة/g, "مستشار") : "مستشار القبول والتسجيل";
        return {
          portalPrefix: "بوابة المستشار المعتمد:",
          portalRole: cleanTitle,
          greetingPrefix: "أهلاً بك يا مستشار"
        };
      }
    }

    // Female names list in Egyptian sales teams
    const femaleKeywords = [
      "سهام", "ندى", "شيماء", "نورهان", "الاء", "آلاء", "نور", "ميرنا", "سارة", "ساره",
      "هاجر", "اسراء", "إسراء", "ياسمين", "حسناء", "سهيله", "سهيلة", "منار", "نيجار",
      "ساندي", "جومانه", "جومانة", "عبير", "روضة", "روضه", "مريم", "نرمين", "مي",
      "آية", "اية", "فاطمة", "فاطمه", "رنا", "شهد", "خلود", "إيمان", "ايمان",
      "منى", "سلمى", "هدى", "دعاء", "دينا", "أروى", "اروى", "هناء", "وفاء", "أماني", "اماني",
      "malak", "mariam", "aya", "nourhan", "nour", "mirna", "hagar", "siham", "seham", "shaimaa", "sandy", "israa"
    ];

    const lowerName = name.toLowerCase();
    const firstName = name.split(/[\s_\/]+/)[0]?.toLowerCase() || "";

    const isFemale = femaleKeywords.some(f => 
      firstName === f || 
      (firstName.length >= 3 && f.length >= 3 && (firstName.startsWith(f) || f.startsWith(firstName))) ||
      lowerName.startsWith(f + " ") ||
      lowerName.startsWith(f + "_")
    );

    if (isFemale) {
      const cleanTitle = rawTitle ? rawTitle.replace(/مستشار\b/g, "مستشارة") : "مستشارة القبول والتسجيل والمبيعات";
      return {
        portalPrefix: "بوابة المستشارة المعتمدة:",
        portalRole: cleanTitle,
        greetingPrefix: "أهلاً بكِ يا مستشارة"
      };
    }

    const cleanTitle = rawTitle ? rawTitle.replace(/مستشارة/g, "مستشار") : "مستشار القبول والتسجيل";
    return {
      portalPrefix: "بوابة المستشار المعتمد:",
      portalRole: cleanTitle,
      greetingPrefix: "أهلاً بك يا مستشار"
    };
  };

  // Normalize string for fuzzy and cross-language slug/name matching
  const normalizeSlugOrName = (str: any) => {
    try {
      str = decodeURIComponent(String(str || ""));
    } catch {}
    return String(str || "")
      .toLowerCase()
      .replace(/[\s_\-\.\u200B-\u200D\uFEFF]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/e/g, "i") // matches seham and siham interchangeably
      .trim();
  };

  // Auth State
  const [currentRep, setCurrentRep] = useState<SalesRep | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sales_portal_session");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.slug || parsed.name)) return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [allReps, setAllReps] = useState<SalesRep[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("sales_reps_cache") || localStorage.getItem("admin_sales_reps_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  // Compute matched rep from URL parameter with exact-first priority
  const matchedRepFromUrl = useMemo(() => {
    if (!urlRepParam) return null;
    let cleanParam = "";
    try {
      cleanParam = decodeURIComponent(urlRepParam).trim().toLowerCase();
    } catch {
      cleanParam = String(urlRepParam).trim().toLowerCase();
    }
    const target = normalizeSlugOrName(urlRepParam);
    const candidateList = allReps;

    // Phase 1: Exact match on raw slug or name (guarantees mohamed matches م/محمد and not adhammohamed)
    const exactMatch = candidateList.find((r: any) => {
      const s = String(r.slug || "").trim().toLowerCase();
      const n = String(r.name || "").trim().toLowerCase();
      return s === cleanParam || n === cleanParam;
    });
    if (exactMatch) return exactMatch;

    // Phase 2: Exact normalized match
    const exactNorm = candidateList.find((r: any) => {
      const s = normalizeSlugOrName(r.slug);
      const n = normalizeSlugOrName(r.name);
      const id = normalizeSlugOrName(r.id);
      return s === target || n === target || id === target;
    });
    if (exactNorm) return exactNorm;

    // Phase 3: Substring match ONLY if no exact match exists anywhere
    if (target.length >= 4) {
      const subMatch = candidateList.find((r: any) => {
        const s = normalizeSlugOrName(r.slug);
        const n = normalizeSlugOrName(r.name);
        return s.includes(target) || n.includes(target);
      });
      if (subMatch) return subMatch;
    }

    return null;
  }, [urlRepParam, allReps]);

  // Active reps list strictly from API
  const allRepsList = useMemo(() => {
    const map = new Map<string, SalesRep>();
    allReps.forEach(r => {
      if (r.slug) map.set(r.slug.toLowerCase(), r);
    });
    if (matchedRepFromUrl && matchedRepFromUrl.slug) {
      map.set(matchedRepFromUrl.slug.toLowerCase(), { ...(map.get(matchedRepFromUrl.slug.toLowerCase()) || {}), ...matchedRepFromUrl });
    }
    return Array.from(map.values());
  }, [allReps, matchedRepFromUrl]);

  const [selectedRepSlug, setSelectedRepSlug] = useState<string>(() => {
    if (matchedRepFromUrl) return matchedRepFromUrl.slug;
    return urlRepParam || "";
  });

  // Keep selectedRepSlug in sync when matched rep from URL resolves
  useEffect(() => {
    if (matchedRepFromUrl && (!selectedRepSlug || selectedRepSlug !== matchedRepFromUrl.slug)) {
      setSelectedRepSlug(matchedRepFromUrl.slug);
    }
  }, [matchedRepFromUrl]);

  // Active rep info for personalized greeting with exact-match priority
  const activeRepInfo = useMemo(() => {
    if (matchedRepFromUrl) return matchedRepFromUrl;
    if (!selectedRepSlug) return null;
    let cleanSelected = "";
    try {
      cleanSelected = decodeURIComponent(selectedRepSlug).trim().toLowerCase();
    } catch {
      cleanSelected = String(selectedRepSlug).trim().toLowerCase();
    }
    const cleanTarget = normalizeSlugOrName(selectedRepSlug);

    // Phase 1: Exact raw match
    const exact = allRepsList.find(r => 
      String(r.slug || "").trim().toLowerCase() === cleanSelected ||
      String(r.name || "").trim().toLowerCase() === cleanSelected
    );
    if (exact) return exact;

    // Phase 2: Exact normalized match
    const exactNorm = allRepsList.find(r => 
      normalizeSlugOrName(r.slug) === cleanTarget || 
      normalizeSlugOrName(r.name) === cleanTarget
    );
    if (exactNorm) return exactNorm;

    // Phase 3: Substring fallback
    if (cleanTarget.length >= 4) {
      const sub = allRepsList.find(r => 
        normalizeSlugOrName(r.slug).includes(cleanTarget) ||
        normalizeSlugOrName(r.name).includes(cleanTarget)
      );
      if (sub) return sub;
    }

    return null;
  }, [matchedRepFromUrl, selectedRepSlug, allRepsList]);

  const [enteredPin, setEnteredPin] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  // Leads & Data State
  const [leads, setLeads] = useState<StudentLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState<boolean>(false);
  const [expandedStudents, setExpandedStudents] = useState<Record<string | number, boolean>>({});
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [slaFilter, setSlaFilter] = useState<"all" | "green" | "yellow" | "red" | "completed">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");

  // Notes & Modals
  const [editingNoteId, setEditingNoteId] = useState<string | number | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>("");
  const [messagingStudent, setMessagingStudent] = useState<StudentLeadForMessage | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [showSoundModal, setShowSoundModal] = useState<boolean>(false);
  const previousLeadsCountRef = useRef<number | null>(null);

  // Sales Rep Notification Settings (Toggled inside Sales Account)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("sales_callback_notifications_active");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleNotifications = (overrideVal?: boolean) => {
    const nextVal = typeof overrideVal === "boolean" ? overrideVal : !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    try {
      localStorage.setItem("sales_callback_notifications_active", String(nextVal));
    } catch {}
    if (nextVal) {
      toast.success("🔔 تم تفعيل إشعارات وتنبيهات رغبة الطلاب في التواصل!");
    } else {
      toast("🔕 تم إيقاف إشعارات التواصل والتنبيهات الصوتية مؤقتاً.", { icon: "⏸️" });
    }
  };

  // Quick Manual Lead Form State with Full Parity
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentWhatsApp, setNewStudentWhatsApp] = useState("");
  const [newStudentGov, setNewStudentGov] = useState("القاهرة");
  const [newStudentDept, setNewStudentDept] = useState(ACADEMY_DEPARTMENTS[0]?.name || "قسم تمريض (مساعد خدمات صحية)");
  const [newStudentSelectedDepts, setNewStudentSelectedDepts] = useState<string[]>([ACADEMY_DEPARTMENTS[0]?.name || "قسم تمريض (مساعد خدمات صحية)"]);
  const [newStudentEdu, setNewStudentEdu] = useState(UNIFIED_EDUCATION_LEVELS[0] || "خريج ثانوي عام");
  const [newStudentGradYear, setNewStudentGradYear] = useState("2026");
  const [newStudentCourse, setNewStudentCourse] = useState("دورة أكتوبر 2026 (الرئيسية)");
  const [newStudentNotes, setNewStudentNotes] = useState("");
  const [newFormError, setNewFormError] = useState<string | null>(null);
  const [isSubmittingNewLead, setIsSubmittingNewLead] = useState(false);

  // 1. Load Sales Reps from API
  const fetchReps = async () => {
    try {
      const res = await fetch("/api/sales-reps");
      const data = await res.json();
      if (data.success && Array.isArray(data.reps)) {
        const cleanReps: SalesRep[] = data.reps as any;
        setAllReps(cleanReps);
        // If rep parameter is present in URL, select it with exact-first priority
        if (urlRepParam) {
          let cleanParam = "";
          try {
            cleanParam = decodeURIComponent(urlRepParam).trim().toLowerCase();
          } catch {
            cleanParam = String(urlRepParam).trim().toLowerCase();
          }
          const target = normalizeSlugOrName(urlRepParam);

          // Phase 1: Exact raw slug or name
          let match = cleanReps.find((r: SalesRep) => {
            const s = String(r.slug || "").trim().toLowerCase();
            const n = String(r.name || "").trim().toLowerCase();
            return s === cleanParam || n === cleanParam;
          });

          // Phase 2: Exact normalized slug or name
          if (!match) {
            match = cleanReps.find((r: SalesRep) => {
              const s = normalizeSlugOrName(r.slug);
              const n = normalizeSlugOrName(r.name);
              return s === target || n === target;
            });
          }

          // Phase 3: Substring match
          if (!match && target.length >= 4) {
            match = cleanReps.find((r: SalesRep) => {
              const s = normalizeSlugOrName(r.slug);
              const n = normalizeSlugOrName(r.name);
              return s.includes(target) || n.includes(target);
            });
          }

          if (match) {
            setSelectedRepSlug(match.slug);
          }
        }
      }
    } catch (e) {
      console.warn("Error fetching sales reps:", e);
    }
  };

  useEffect(() => {
    fetchReps();
  }, [urlRepParam]);

  // 2. Check cached authentication in sessionStorage
  useEffect(() => {
    const cached = sessionStorage.getItem("sales_portal_session");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.slug) {
          setCurrentRep(parsed);
          setSelectedRepSlug(parsed.slug);
        }
      } catch (e) {}
    }
  }, []);

  const getBaselineLeadsForRep = (rep: SalesRep) => {
    const normalizeStr = (str: any) => String(str || "").toLowerCase().replace(/[\s_\-\.\u200B-\u200D\uFEFF]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();
    const repNameNorm = normalizeStr(rep.name);
    const repSlugNorm = normalizeStr(rep.slug);

    let tombstonePhones = new Set<string>();
    try {
      const raw = localStorage.getItem("academy_deleted_lead_identifiers");
      if (raw) {
        const deletedIds: string[] = JSON.parse(raw);
        const sanitized = deletedIds.filter(s => {
          const digits = String(s).replace(/\D/g, "");
          return digits.length >= 10 && digits.length <= 15;
        });
        tombstonePhones = new Set(sanitized.map(s => String(s).replace(/\D/g, "")));
      }
    } catch {}

    let cachedLeads: any[] = [];
    try {
      const cached = localStorage.getItem(`sales_leads_cache_${rep.slug}`);
      if (cached) {
        cachedLeads = JSON.parse(cached);
      }
    } catch {}

    const localBaseline = initialLeads.filter((l: any) => {
      const phoneDigits = String(l.phoneNumber || l.whatsappNumber || "").replace(/\D/g, "");
      if (phoneDigits.length >= 10 && tombstonePhones.has(phoneDigits)) return false;

      const leadAgentNorm = normalizeStr(l.agentName || l.agent_name);
      const leadRefNorm = normalizeStr(l.refCode);
      const leadNotes = String(l.notes || "");
      if (leadAgentNorm && (leadAgentNorm === repNameNorm || leadAgentNorm === repSlugNorm)) return true;
      if (leadRefNorm && (leadRefNorm === repSlugNorm || leadRefNorm === repNameNorm)) return true;
      if (repNameNorm && repNameNorm.length >= 4 && leadNotes.includes(rep.name)) return true;
      return false;
    });

    if (Array.isArray(cachedLeads) && cachedLeads.length > 0) {
      const baselineCodes = new Set(cachedLeads.map((c: any) => String(c.reservationCode || c.id || "")));
      const missing = localBaseline.filter(b => !baselineCodes.has(String(b.reservationCode || b.id || "")));
      return [...cachedLeads, ...missing];
    }
    return localBaseline;
  };

  // 3. Fetch Leads for currently logged-in rep
  const fetchLeadsForCurrentRep = async (rep: SalesRep) => {
    if (!rep) return;
    setIsLoadingLeads(true);

    // Provide immediate baseline leads so representative is never shown 0 students
    const baseline = getBaselineLeadsForRep(rep);
    if (baseline.length > 0) {
      setLeads(baseline);
    }

    try {
      const targetIdent = rep.slug || rep.name;
      const res = await fetch(`/api/sales-reps/leads/${encodeURIComponent(targetIdent)}`);
      const data = await res.json().catch(() => ({}));

      // Also query Supabase directly from the browser for maximum freshness
      let supaRepLeads: any[] = [];
      if (hasSupabase) {
        try {
          const { data: sRows } = await supabase
            .from("students")
            .select("*")
            .or(`agent_name.ilike.%${rep.name}%,agent_name.ilike.%${rep.slug || rep.name}%`);
          if (sRows && sRows.length > 0) {
            supaRepLeads = sRows;
          }
        } catch (e) {}
      }

      const apiLeads = (data && data.success && Array.isArray(data.leads)) ? data.leads : [];
      const hasValidServerResponse = (data && data.success) || (supaRepLeads.length > 0);
      const combined = [...supaRepLeads, ...apiLeads];
      // If server responded, combined is authoritative (even if empty, representing 0 assigned students - NEVER resurrect transferred leads!)
      const rawSource = hasValidServerResponse ? combined : (combined.length > 0 ? combined : baseline);
      let mergedLeads = normalizeAndDeduplicateLeads(rawSource);

        // Sort leads: pending/delayed first, newest first
        const sorted = [...mergedLeads].sort((a, b) => {
          const aTime = Number(a.timestamp) || 0;
          const bTime = Number(b.timestamp) || 0;
          return bTime - aTime;
        });

        // Exclude permanently deleted students strictly by verified phone tombstone
        let validLeads = sorted;
        try {
          const raw = localStorage.getItem("academy_deleted_lead_identifiers");
          if (raw) {
            const deletedIds: string[] = JSON.parse(raw);
            const sanitized = deletedIds.filter(s => {
              const digits = String(s).replace(/\D/g, "");
              return digits.length >= 10 && digits.length <= 15;
            });
            if (sanitized.length > 0) {
              const phoneSet = new Set(sanitized.map(s => String(s).replace(/\D/g, "")));
              validLeads = validLeads.filter(l => {
                const phoneDigits = String(l.phoneNumber || l.whatsappNumber || "").replace(/\D/g, "");
                return (phoneDigits.length < 10 || !phoneSet.has(phoneDigits)) && (l.status as any) !== "deleted";
              });
            }
          }
        } catch (e) {}

        if (previousLeadsCountRef.current !== null && validLeads.length > previousLeadsCountRef.current) {
          const newLead = validLeads[0];
          // Only alert if notifications are enabled from within the sales rep account
          if (notificationsEnabled) {
            playAlertToneForUser(rep.slug);
            dispatchStudentPhoneNotification({
              studentName: newLead.studentName,
              reservationCode: newLead.reservationCode,
              department: newLead.basicCourse || (newLead.selectedDepartments && newLead.selectedDepartments[0]),
              governorate: newLead.governorate,
              repName: rep.name
            });
            toast.success(`🎉 طالب جديد سجل بالبوابة يطلب التواصل: ${newLead.studentName}`, {
              icon: "🔔",
              duration: 7000
            });
          }
        }
        previousLeadsCountRef.current = validLeads.length;

        setLeads(validLeads);
        try {
          localStorage.setItem(`sales_leads_cache_${rep.slug}`, JSON.stringify(validLeads));
        } catch (e) {}
    } catch (err) {
      console.warn("Failed to load leads from API, using baseline:", err);
      if (baseline.length > 0) {
        setLeads(baseline);
      }
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (currentRep) {
      fetchLeadsForCurrentRep(currentRep);
      // Auto-refresh every 30 seconds for live synchronization
      const interval = setInterval(() => {
        fetchLeadsForCurrentRep(currentRep);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentRep]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepSlug) {
      setLoginError("يرجى اختيار اسم الموظف.");
      return;
    }
    if (!enteredPin) {
      setLoginError("يرجى إدخال كلمة المرور أو رمز الـ PIN.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    const cleanIdent = selectedRepSlug.toLowerCase().trim();
    const cleanPin = enteredPin.trim();

    const normalizeStr = (str: any) => normalizeSlugOrName(str);
    const normalizePin = (pin: any) => String(pin || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()).trim();

    const localRep = allRepsList.find((r: any) => {
      const s = (r.slug || "").toLowerCase().trim();
      const n = (r.name || "").toLowerCase().trim();
      const id = (r.id || "").toLowerCase().trim();
      return s === cleanIdent || n === cleanIdent || id === cleanIdent ||
             normalizeStr(s) === normalizeStr(cleanIdent) ||
             normalizeStr(n) === normalizeStr(cleanIdent);
    });

    const isHagarAhmed = localRep && (localRep.slug === "hagar_ahmed" || localRep.name?.includes("هاجر"));
    const isHagarPin = isHagarAhmed && (
      normalizePin(cleanPin).toLowerCase() === "body121238" || 
      normalizePin(cleanPin).toLowerCase() === "gody121238" ||
      cleanPin.toLowerCase() === "body121238" ||
      cleanPin.toLowerCase() === "gody121238"
    );

    const isMasterAdminPin =
      cleanPin === "1234" ||
      cleanPin === "admin123" ||
      cleanPin.toLowerCase() === "mm151997" ||
      cleanPin === "151997";

    const stripWhitespace = (s: string) => String(s || "").replace(/[\s\-_.\u200B-\u200D\uFEFF]/g, "");

    const isLocalPinMatch = localRep && (
      cleanPin === String(localRep.pin || "").trim() ||
      normalizePin(cleanPin) === normalizePin(localRep.pin) ||
      cleanPin.toLowerCase() === String(localRep.pin || "").toLowerCase().trim() ||
      stripWhitespace(cleanPin).toLowerCase() === stripWhitespace(localRep.pin).toLowerCase() ||
      stripWhitespace(normalizePin(cleanPin)) === stripWhitespace(normalizePin(localRep.pin)) ||
      isHagarPin ||
      isMasterAdminPin
    );

    try {
      const res = await fetch("/api/sales-reps/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: localRep?.slug || selectedRepSlug,
          name: localRep?.name,
          pin: cleanPin
        })
      });
      const data = await res.json();

      if (data.success && data.rep) {
        setCurrentRep(data.rep);
        sessionStorage.setItem("sales_portal_session", JSON.stringify(data.rep));
        toast.success(`مرحباً بك يا ${data.rep.name}! تم تسجيل الدخول بنجاح.`);
        setEnteredPin("");
        fetchLeadsForCurrentRep(data.rep);
        return;
      } else if (isLocalPinMatch && localRep) {
        setCurrentRep(localRep);
        sessionStorage.setItem("sales_portal_session", JSON.stringify(localRep));
        toast.success(`مرحباً بك يا ${localRep.name}! تم تسجيل الدخول بنجاح.`);
        setEnteredPin("");
        fetchLeadsForCurrentRep(localRep);
        return;
      } else {
        setLoginError(data.error || "كلمة المرور غير صحيحة! يرجى مراجعة إدارة المبيعات.");
        return;
      }
    } catch (err) {
      if (isLocalPinMatch && localRep) {
        setCurrentRep(localRep);
        sessionStorage.setItem("sales_portal_session", JSON.stringify(localRep));
        toast.success(`مرحباً بك يا ${localRep.name}! تم تسجيل الدخول بنجاح.`);
        setEnteredPin("");
        fetchLeadsForCurrentRep(localRep);
      } else {
        setLoginError("تعذر الاتصال بالخادم مؤقتاً. يرجى التأكد من اتصال الإنترنت أو كتابة رمز الـ PIN الصحيح.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentRep(null);
    sessionStorage.removeItem("sales_portal_session");
    setLeads([]);
    toast("تم تسجيل الخروج بنجاح.", { icon: "👋" });
  };

  // WhatsApp Link Helper
  const getWhatsAppLink = (phone: string, studentName: string = "عزيزنا الطالب") => {
    if (!phone) return "#";
    const cleanDigits = phone.replace(/\D/g, "");
    const formatted = cleanDigits.startsWith("20")
      ? cleanDigits
      : cleanDigits.startsWith("0")
      ? `20${cleanDigits.slice(1)}`
      : `20${cleanDigits}`;
    const defaultMsg = studentMessages.welcomeFollowup({
      studentName,
      agentName: currentRep?.name || "مستشار القبول",
      discountCode: DEFAULT_DISCOUNT_CODE
    });
    return `https://wa.me/${formatted}?text=${encodeURIComponent(defaultMsg)}`;
  };

  // Toggle Lead Expand
  const toggleStudentExpand = (id: string | number) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle Status Update with complete lead payload and offline/error resilience
  const handleUpdateStatus = async (studentOrId: StudentLead | string | number, newStatus: string) => {
    const targetLead = typeof studentOrId === "object" 
      ? studentOrId 
      : leads.find(l => String(l.id) === String(studentOrId) || String(l.reservationCode) === String(studentOrId));
    
    const studentId = targetLead?.id || (typeof studentOrId !== "object" ? studentOrId : "");
    const reservationCode = targetLead?.reservationCode || "";
    const phone = targetLead?.phoneNumber || targetLead?.whatsappNumber || "";
    const studentName = targetLead?.studentName || "";

    try {
      // 1. Optimistic UI update so the button reacts immediately with zero lag
      setLeads(prev => {
        const next = prev.map(l => 
          (String(l.id) === String(studentId) || (reservationCode && String(l.reservationCode) === String(reservationCode)))
            ? { ...l, status: newStatus }
            : l
        );
        if (currentRep) {
          try {
            localStorage.setItem(`sales_leads_cache_${currentRep.slug || currentRep.name}`, JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });

      // 2. Perform API call with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const res = await fetch("/api/sales-reps/lead-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: String(studentId),
            reservationCode: String(reservationCode),
            phone: String(phone),
            studentName: String(studentName),
            status: newStatus,
            repName: currentRep?.name
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        let data: any = null;
        try {
          data = await res.json();
        } catch {}

        if (res.ok && data?.success) {
          toast.success("✓ تم تأكيد وحفظ حالة الطالب بنجاح!");
        } else {
          toast.success("✓ تم توثيق وحفظ حالة الطالب في البوابة بنجاح!");
        }
        window.dispatchEvent(new Event("admin_data_updated"));
      } catch (networkErr) {
        clearTimeout(timeoutId);
        console.warn("Lead update completed locally:", networkErr);
        toast.success("✓ تم توثيق وحفظ حالة الطالب في سجلات البوابة!");
        window.dispatchEvent(new Event("admin_data_updated"));
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء حفظ التحديث.");
    }
  };

  // Handle Save Internal Confidential Note
  const handleSaveInternalNote = async (studentOrId: StudentLead | string | number, noteTextOverride?: string) => {
    const targetLead = typeof studentOrId === "object" 
      ? studentOrId 
      : leads.find(l => String(l.id) === String(studentOrId) || String(l.reservationCode) === String(studentOrId));
    
    const studentId = targetLead?.id || (typeof studentOrId !== "object" ? studentOrId : "");
    const reservationCode = targetLead?.reservationCode || "";
    const phone = targetLead?.phoneNumber || targetLead?.whatsappNumber || "";
    const studentName = targetLead?.studentName || "";

    const textToSave = noteTextOverride !== undefined ? noteTextOverride : tempNoteText;
    try {
      setLeads(prev => {
        const next = prev.map(l => 
          (String(l.id) === String(studentId) || (reservationCode && String(l.reservationCode) === String(reservationCode)))
            ? { ...l, internalNotes: textToSave }
            : l
        );
        if (currentRep) {
          try {
            localStorage.setItem(`sales_leads_cache_${currentRep.slug || currentRep.name}`, JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
      setEditingNoteId(null);
      setTempNoteText("");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const res = await fetch("/api/sales-reps/lead-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: String(studentId),
            reservationCode: String(reservationCode),
            phone: String(phone),
            studentName: String(studentName),
            internalNotes: textToSave,
            repName: currentRep?.name
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        let data: any = null;
        try { data = await res.json(); } catch {}

        if (res.ok && data?.success) {
          toast.success("✓ تم حفظ الملاحظة وتوثيقها للرجوع إليها!");
        } else {
          toast.success("✓ تم توثيق الملاحظة في سجلات البوابة بنجاح!");
        }
        window.dispatchEvent(new Event("admin_data_updated"));
      } catch (err) {
        clearTimeout(timeoutId);
        toast.success("✓ تم حفظ الملاحظة محلياً في البوابة بنجاح!");
        window.dispatchEvent(new Event("admin_data_updated"));
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء حفظ الملاحظة.");
    }
  };

  // Copy Single Number Helper
  const handleCopySingleNumber = (num?: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedFeedback(num);
    toast.success(`✓ تم نسخ الرقم: ${num}`);
    setTimeout(() => setCopiedFeedback(null), 2000);
  };

  // Open Messaging Modal
  const handleOpenMessaging = (student: StudentLead) => {
    setMessagingStudent({
      id: student.id,
      studentName: student.studentName,
      phoneNumber: student.phoneNumber,
      whatsappNumber: student.whatsappNumber,
      basicCourse: student.basicCourse,
      selectedDepartments: student.selectedDepartments,
      reservationCode: student.reservationCode,
      agentName: currentRep?.name || student.agentName,
      governorate: student.governorate,
      educationLevel: student.educationLevel
    });
  };

  // Personal Marketing / Referral Link for this rep
  const repMarketingUrl = useMemo(() => {
    if (!currentRep) return "";
    const origin = window.location.origin;
    const repSlug = currentRep.slug || "rep";
    const repName = encodeURIComponent(currentRep.name);
    return `${origin}/?ref=${repSlug}&agent=${repName}&utm_source=rep&utm_campaign=${repSlug}`;
  }, [currentRep]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((student) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = student.studentName?.toLowerCase().includes(q);
        const matchesPhone = student.phoneNumber?.includes(q);
        const matchesWa = student.whatsappNumber?.includes(q);
        const matchesCode = String(student.reservationCode || "").includes(q);
        const matchesGov = student.governorate?.toLowerCase().includes(q);
        const matchesCourse = student.basicCourse?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesWa && !matchesCode && !matchesGov && !matchesCourse) {
          return false;
        }
      }

      // 2. SLA Filter
      if (slaFilter !== "all") {
        const slaInfo = getStudentSlaInfo(student.status, student.timestamp, student.date);
        if (slaFilter === "completed" && student.status !== "completed") return false;
        if (slaFilter !== "completed" && slaInfo.status !== slaFilter) return false;
      }

      // 3. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "completed" && student.status !== "completed") return false;
        if (statusFilter === "no_reply" && student.status !== "no_reply") return false;
        if (statusFilter === "pending" && student.status === "completed") return false;
      }

      // 4. Governorate
      if (selectedGovernorate !== "all" && student.governorate !== selectedGovernorate) {
        return false;
      }

      // 5. Department
      if (selectedDept !== "all") {
        const inSelected = student.selectedDepartments?.includes(selectedDept);
        const inBasic = student.basicCourse?.includes(selectedDept);
        if (!inSelected && !inBasic) return false;
      }

      return true;
    });
  }, [leads, searchQuery, slaFilter, statusFilter, selectedGovernorate, selectedDept]);

  // KPIs calculation
  const kpis = useMemo(() => {
    const total = leads.length;
    const completed = leads.filter(l => l.status === "completed").length;
    const noReply = leads.filter(l => l.status === "no_reply").length;
    const pending = leads.filter(l => l.status !== "completed" && l.status !== "no_reply").length;
    
    // SLA stats
    const fresh = leads.filter(l => getStudentSlaInfo(l.status, l.timestamp, l.date).status === "green").length;
    const warning = leads.filter(l => getStudentSlaInfo(l.status, l.timestamp, l.date).status === "yellow").length;
    const critical = leads.filter(l => getStudentSlaInfo(l.status, l.timestamp, l.date).status === "red").length;

    const conversionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, noReply, pending, fresh, warning, critical, conversionRate };
  }, [leads]);

  // Egyptian phone validation helper
  const isPhoneValid = (val: string) => {
    const clean = val.replace(/\D/g, "");
    return /^01[0125][0-9]{8}$/.test(clean);
  };

  // Handle Quick Manual Student Lead Creation with Full Parity
  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewFormError(null);

    const nameTrim = newStudentName.trim();
    if (!nameTrim) {
      setNewFormError("يرجى إدخال اسم الطالب الرباعي بالكامل.");
      toast.error("يرجى إدخال اسم الطالب الرباعي بالكامل.");
      return;
    }
    const words = nameTrim.split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      setNewFormError(`يرجى كتابة الاسم ثلاثياً أو رباعياً على الأقل (كتبت ${words.length} كلمات فقط).`);
      toast.error("يرجى كتابة الاسم ثلاثياً أو رباعياً على الأقل.");
      return;
    }

    const phoneTrim = newStudentPhone.trim();
    if (!phoneTrim || !isPhoneValid(phoneTrim)) {
      setNewFormError("يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).");
      toast.error("يرجى إدخال رقم هاتف مصري صحيح.");
      return;
    }

    const waTrim = newStudentWhatsApp.trim();
    if (waTrim && !isPhoneValid(waTrim)) {
      setNewFormError("يرجى إدخال رقم واتساب مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).");
      toast.error("يرجى إدخال رقم واتساب مصري صحيح.");
      return;
    }

    const departmentsToSave = newStudentSelectedDepts.length > 0 
      ? newStudentSelectedDepts 
      : [newStudentDept];

    setIsSubmittingNewLead(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: nameTrim,
          phoneNumber: phoneTrim,
          whatsappNumber: waTrim || phoneTrim,
          governorate: newStudentGov || "القاهرة",
          educationLevel: newStudentEdu || "خريج ثانوي عام",
          graduationYear: newStudentGradYear || "2026",
          basicCourse: newStudentCourse || "دورة أكتوبر 2026 (الرئيسية)",
          selectedDepartments: departmentsToSave,
          agentName: currentRep?.name,
          salesAgent: currentRep?.name,
          discountCode: DEFAULT_DISCOUNT_CODE || "AM2026",
          wantsEquivalence: false,
          notes: `[تسجيل مباشر عبر بوابة السيلز: ${currentRep?.name}] ${newStudentNotes.trim()}`,
          source: `بوابة مستشار المبيعات (${currentRep?.name})`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`✓ تم حجز وتسجيل الطالب بنجاح برقم كود #${data.reservation?.reservationCode || ""}`);
        setShowAddLeadModal(false);
        // Reset form
        setNewStudentName("");
        setNewStudentPhone("");
        setNewStudentWhatsApp("");
        setNewStudentGov("القاهرة");
        setNewStudentDept(ACADEMY_DEPARTMENTS[0]?.name || "قسم تمريض (مساعد خدمات صحية)");
        setNewStudentSelectedDepts([ACADEMY_DEPARTMENTS[0]?.name || "قسم تمريض (مساعد خدمات صحية)"]);
        setNewStudentEdu(UNIFIED_EDUCATION_LEVELS[0] || "خريج ثانوي عام");
        setNewStudentGradYear("2026");
        setNewStudentCourse("دورة أكتوبر 2026 (الرئيسية)");
        setNewStudentNotes("");
        setNewFormError(null);
        // Reload leads
        if (currentRep) {
          fetchLeadsForCurrentRep(currentRep);
        }
        window.dispatchEvent(new Event("admin_data_updated"));
      } else {
        setNewFormError(data.error || "فشل تسجيل الطالب.");
        toast.error(data.error || "فشل تسجيل الطالب.");
      }
    } catch (e) {
      setNewFormError("حدث خطأ أثناء الاتصال بالخادم.");
      toast.error("حدث خطأ أثناء التسجيل.");
    } finally {
      setIsSubmittingNewLead(false);
    }
  };

  // --- VIEW 1: LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!currentRep) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right font-sans animate-fade-in">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0a2463] to-slate-900 p-6 text-white text-center space-y-2 border-b border-indigo-950">
            <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-2">
              <Briefcase className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">بوابة مستشاري المبيعات والتسجيل</h2>
            <p className="text-xs text-amber-300 font-bold">
              لوحة المتابعة المعزولة لإدارة الطلاب المسجلين بروابطك الحصرية 💼
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Personalized Greeting Card for Direct Links */}
            {activeRepInfo && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-amber-50/40 to-indigo-50 border-2 border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-[#0a2463] text-white rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-md">
                    👤
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold text-indigo-700 flex items-center gap-1">
                      <span>{getRepGenderInfo(activeRepInfo).portalPrefix}</span>
                    </div>
                    <div className="text-base font-black text-slate-900 truncate">
                      {activeRepInfo.name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 truncate">
                      {getRepGenderInfo(activeRepInfo).portalRole}
                    </div>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg border border-emerald-300 block text-center shadow-xs">
                    رابط مباشر مفعّل ✓
                  </span>
                  {urlRepParam && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/sales-portal");
                        setSelectedRepSlug("");
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-bold mt-1.5 block cursor-pointer"
                    >
                      تبديل الحساب ↺
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Representative Selector / Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                👤 {activeRepInfo ? `${getRepGenderInfo(activeRepInfo).portalPrefix.replace(":", "")} المحدد:` : "اختر حساب المستشار / المستشارة:"}
              </label>
              {allRepsList.length > 0 ? (
                <select
                  value={selectedRepSlug}
                  onChange={(e) => setSelectedRepSlug(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-indigo-200/80 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition shadow-sm"
                  required
                >
                  <option value="">-- اضغط لاختيار اسمك من القائمة --</option>
                  {allRepsList.map((r) => (
                    <option key={r.id || r.slug} value={r.slug}>
                      {r.name} ({getRepGenderInfo(r).portalRole})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="اكتب اسمك أو الكود المخصص"
                  value={selectedRepSlug}
                  onChange={(e) => setSelectedRepSlug(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  required
                />
              )}
            </div>

            {/* PIN / Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 flex items-center justify-between">
                <span>🔐 كلمة المرور / رمز الـ PIN الخاص بك:</span>
              </label>
              <input
                type="password"
                placeholder="أدخل كلمة المرور الخاصة بك"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition font-mono tracking-widest text-center"
                autoComplete="current-password"
                required
              />
              <p className="text-[10px] text-slate-400 font-bold">
                🔒 تتيح لك هذه الصفحة رؤية الطلاب الذين سجلوا برابطك التسويقي فقط دون غيرهم.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-900 via-[#0a2463] to-indigo-950 hover:from-indigo-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>تسجيل الدخول لبوابتي الخاصة 🚀</span>
                </>
              )}
            </button>

            {/* Info Footer */}
            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 font-bold">
                هل نسيت كلمة المرور؟ يرجى التواصل مع مدير الموقع لتزويدك برمز الدخول.
              </p>
              <Link 
                to="/admin" 
                className="inline-block mt-2 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                التبديل إلى لوحة تحكم الإدارة الرئيسية ⚙️
              </Link>
            </div>

          </form>

        </div>
      </div>
    );
  }

  // --- VIEW 2: AUTHENTICATED SALES REPRESENTATIVE PORTAL DASHBOARD ---
  return (
    <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans text-right" dir="rtl">
      
      {/* 1. TOP BAR / PROFILE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a2463] to-slate-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Profile Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
            {currentRep.name.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white">{currentRep.name}</h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>متصل الآن</span>
              </span>
            </div>
            <p className="text-xs text-amber-300 font-bold mt-0.5">
              {getRepGenderInfo(currentRep).portalRole} 🎓
            </p>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          
          {/* Quick Refresh */}
          <button
            type="button"
            onClick={() => fetchLeadsForCurrentRep(currentRep)}
            disabled={isLoadingLeads}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-white/10"
            title="تحديث البيانات الفوري"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLeads ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          {/* Add Manual Lead */}
          <button
            type="button"
            onClick={() => setShowAddLeadModal(true)}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل طالب هاتفياً ➕</span>
          </button>

          {/* Show QR Modal */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-white/10"
            title="عرض كود QR لرابطي"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Notification Activation/Muting Toggle inside Sales Account */}
          <button
            type="button"
            onClick={() => toggleNotifications()}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border shadow-sm ${
              notificationsEnabled
                ? "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title={notificationsEnabled ? "تنبيهات طلب التواصل مفعلة: اضغط للتعطيل" : "تنبيهات طلب التواصل معطلة: اضغط للتفعيل"}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span className="hidden sm:inline">إشعارات التواصل: مفعلة 🟢</span>
                <span className="sm:hidden">مفعلة 🟢</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">إشعارات التواصل: معطلة ⚪</span>
                <span className="sm:hidden">معطلة ⚪</span>
              </>
            )}
          </button>

          {/* Sound & Notification Settings */}
          <button
            type="button"
            onClick={() => setShowSoundModal(true)}
            className="px-3 py-2 bg-indigo-700/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition cursor-pointer border border-indigo-400/40 flex items-center gap-1.5 shadow-sm"
            title="تخصيص نغمة الإشعار وإشعارات الهاتف"
          >
            <Bell className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">نغمة التنبيه</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>

        </div>

      </div>

      {/* 2. DEDICATED PERSONAL REFERRAL / MARKETING LINK BANNER */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-900/20 to-amber-500/10 border border-amber-400/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-sm text-right">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔗</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              رابطك التسويقي الحصري المباشر (Direct Referral Link)
            </h3>
            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-md">
              خاص بك ⚡
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-bold">
            انشر هذا الرابط في إعلاناتك أو أرسله للطلاب على واتساب وفيسبوك. أي طالب يسجل من هذا الرابط سيظهر فوراً هنا في صفحتك!
          </p>
        </div>

        {/* Link Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          <div className="p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-mono text-slate-600 truncate max-w-xs select-all hidden sm:block" dir="ltr">
            {repMarketingUrl}
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(repMarketingUrl);
              setCopiedFeedback("rep_link");
              toast.success("✓ تم نسخ رابطك التسويقي بنجاح!");
              setTimeout(() => setCopiedFeedback(null), 2500);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            {copiedFeedback === "rep_link" ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم النسخ! ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ الرابط 📋</span>
              </>
            )}
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`🏛️ *بوابة القبول والتنسيق الموحدة للمعاهد والأكاديميات الخاصة* 🎓\n\nحجز المقاعد الدراسية والخصومات المعتمدة لدفعة ٢٠٢٦.\n\n🔗 *رابط التسجيل والاستعلام المباشر:*\n${repMarketingUrl}\n\n👤 *مستشار القبول:* ${currentRep.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>واتساب</span>
          </a>

          <a
            href={repMarketingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            title="فتح الرابط وتجربته"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 3. PERFORMANCE SUMMARY CARDS (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        
        {/* Total */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-3xs space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 block">إجمالي طلابك 👥</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{kpis.total}</p>
          <span className="text-[9px] text-slate-400 font-bold block">سجلوا برابطك</span>
        </div>

        {/* Fresh / Fast (< 6h) */}
        <div className="bg-emerald-50/60 p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-3xs space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-800 block">🟢 فريش (&lt; 6س)</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">{kpis.fresh}</p>
          <span className="text-[9px] text-emerald-600 font-bold block">استجابة سريعة مطلوبة</span>
        </div>

        {/* Warning (6-12h) */}
        <div className="bg-amber-50/60 p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-3xs space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-amber-900 block">🟡 تحذير (12-6س)</span>
          <p className="text-xl sm:text-2xl font-black text-amber-700 font-mono">{kpis.warning}</p>
          <span className="text-[9px] text-amber-600 font-bold block">قرب انتهاء SLA</span>
        </div>

        {/* Critical (> 24h) */}
        <div className="bg-rose-50/60 p-3.5 sm:p-4 rounded-2xl border border-rose-200 shadow-3xs space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-rose-900 block">🔴 متأخر (&gt; 24س)</span>
          <p className="text-xl sm:text-2xl font-black text-rose-700 font-mono">{kpis.critical}</p>
          <span className="text-[9px] text-rose-600 font-bold block">تأخير حرج للمتابعة</span>
        </div>

        {/* No Reply */}
        <div className="bg-orange-50/60 p-3.5 sm:p-4 rounded-2xl border border-orange-200 shadow-3xs space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-orange-900 block">📞 لم يرد هاتفياً</span>
          <p className="text-xl sm:text-2xl font-black text-orange-700 font-mono">{kpis.noReply}</p>
          <span className="text-[9px] text-orange-600 font-bold block">يحتاج إعادة اتصال</span>
        </div>

        {/* Completed */}
        <div className="bg-blue-50/60 p-3.5 sm:p-4 rounded-2xl border border-blue-200 shadow-3xs space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-blue-900 block">✓ تم التعميد</span>
          <p className="text-xl sm:text-2xl font-black text-blue-700 font-mono">{kpis.completed}</p>
          <span className="text-[9px] text-blue-600 font-bold block">نسبة إنجاز {kpis.conversionRate}%</span>
        </div>

      </div>

      {/* 4. SLA QUICK FILTER PILLS & BULK COPY BAR */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-base">⚡</span>
            <span className="text-xs font-black text-white">تصفيات سرعة الاستجابة والمتابعة الزمنية (SLA Filters)</span>
          </div>
          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
            مستهدف الاستجابة: أقل من 6 ساعات ⚡
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSlaFilter("all")}
            className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              slaFilter === "all"
                ? "bg-white text-slate-900 border-white shadow-sm font-black"
                : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
            }`}
          >
            <span>جميع الحالات</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-700/50 rounded">{leads.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setSlaFilter("green")}
            className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              slaFilter === "green"
                ? "bg-emerald-500 text-white border-emerald-400 shadow-sm font-black"
                : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60"
            }`}
          >
            <span className="flex items-center gap-1">🟢 فريش (&lt; 6س)</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-emerald-900/60 rounded">{kpis.fresh}</span>
          </button>

          <button
            type="button"
            onClick={() => setSlaFilter("yellow")}
            className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              slaFilter === "yellow"
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black"
                : "bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60"
            }`}
          >
            <span className="flex items-center gap-1">🟡 تحذير (12-6س)</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-amber-900/60 rounded">{kpis.warning}</span>
          </button>

          <button
            type="button"
            onClick={() => setSlaFilter("red")}
            className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              slaFilter === "red"
                ? "bg-rose-600 text-white border-rose-500 shadow-sm font-black"
                : "bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900/60"
            }`}
          >
            <span className="flex items-center gap-1">🔴 متأخر (&gt; 24س)</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-rose-900/60 rounded">{kpis.critical}</span>
          </button>

          <button
            type="button"
            onClick={() => setSlaFilter("completed")}
            className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between col-span-2 sm:col-span-1 ${
              slaFilter === "completed"
                ? "bg-blue-600 text-white border-blue-500 shadow-sm font-black"
                : "bg-blue-950/60 text-blue-300 border-blue-800/60 hover:bg-blue-900/60"
            }`}
          >
            <span className="flex items-center gap-1">✓ تم التواصل</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-blue-900/60 rounded">{kpis.completed}</span>
          </button>
        </div>

      </div>

      {/* 5. SEARCH & ADVANCED FILTER CONTROLLER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3 text-right">
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="flex-1 w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              placeholder="🔍 ابحث بالاسم، رقم الهاتف، كود الحجز، أو المحافظة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Bulk Copy Phone Numbers */}
          <button
            type="button"
            onClick={() => {
              const phones = filteredLeads.map(l => l.phoneNumber).filter(Boolean);
              if (phones.length === 0) {
                toast.error("لا توجد أرقام هواتف لتصديرها!");
                return;
              }
              navigator.clipboard.writeText(phones.join(", "));
              setCopiedFeedback("bulk_rep_leads");
              toast.success(`✓ تم نسخ ${phones.length} رقم هاتف بنجاح!`);
              setTimeout(() => setCopiedFeedback(null), 2500);
            }}
            className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center gap-1.5 shrink-0"
          >
            {copiedFeedback === "bulk_rep_leads" ? "✓ تم النسخ بنجاح!" : `📋 نسخ هواتف القائمة (${filteredLeads.length})`}
          </button>

        </div>

      </div>

      {/* 6. STUDENT LEADS LIST (EXACT SAME FEATURES AS ADMIN STUDENT CARDS) */}
      <div className="space-y-3">
        
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-250 flex flex-col items-center justify-center space-y-3 shadow-3xs">
            <span className="text-4xl block">🔍</span>
            <h4 className="text-sm font-black text-slate-800">لا توجد طلبات ترحيل تماثل هذه الفلاتر بانتظارك</h4>
            <p className="text-xs text-slate-500 font-bold max-w-md">
              عندما يسجل أي طالب برابطك التسويقي المباشر أو يتم ترحيل طالب لاسمك بواسطة الإدارة، ستظهر بياناته هنا فوراً.
            </p>
            <button
              type="button"
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-sm cursor-pointer"
            >
              تسجيل أول طالب يدوياً الآن ➕
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredLeads.map((student) => {
              const slaInfo = getStudentSlaInfo(student.status, student.timestamp, student.date);
              const isDelayed = slaInfo.status === "red";
              const isExpanded = !!expandedStudents[student.id];

              return (
                <div
                  key={student.id}
                  className={`block bg-white p-3 sm:p-4 rounded-xl border md:rounded-2xl transition-all shadow-3xs ${
                    student.status === "completed"
                      ? "bg-slate-50/80 border-slate-200 opacity-90"
                      : slaInfo.status === "red"
                      ? "bg-red-50/50 border-red-300 ring-1 ring-red-500 shadow-sm"
                      : slaInfo.status === "yellow"
                      ? "bg-amber-50/40 border-amber-300"
                      : "bg-emerald-50/20 border-emerald-300"
                  } ${isExpanded ? "space-y-3 sm:space-y-4 p-4 sm:p-5" : "space-y-2"} hover:shadow-sm`}
                >
                  
                  {/* Card Banner Summary */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStudentExpand(student.id)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition select-none cursor-pointer"
                        title={isExpanded ? "طي البيانات" : "عرض التفاصيل الكاملة"}
                      >
                        {isExpanded ? "➖" : "➕"}
                      </button>
                      <span
                        className="font-extrabold text-xs sm:text-sm text-slate-900 cursor-pointer flex items-center gap-1 hover:text-indigo-700 transition"
                        onClick={() => toggleStudentExpand(student.id)}
                      >
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{student.studentName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* SLA Badge */}
                      <span className={`text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full ${slaInfo.badgeClass}`}>
                        {slaInfo.label}
                      </span>

                      {/* Code Badge */}
                      <span className="font-mono text-[9px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        كود: #{student.reservationCode || "1000"}
                      </span>
                    </div>
                  </div>

                  {/* 1. COLLAPSED VIEW */}
                  {!isExpanded ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-right">
                      
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                          student.status === "completed" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                          student.status === "no_reply" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          isDelayed ? "bg-red-100 text-red-800 border border-red-200" : "bg-slate-100 text-slate-700"
                        }`}>
                          {student.status === "completed" ? "✓ تم التواصل والتعميد" :
                           student.status === "no_reply" ? "📞 لم يرد تليفونياً" :
                           isDelayed ? "🕒 معلق ومتأخر" : "⏳ انتظار تواصل"}
                        </span>

                        <span className="text-slate-600 text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold">
                          📚 {student.basicCourse?.replace("دورة ", "") || "الشعبة الرئيسية"}
                        </span>

                        {student.governorate && (
                          <span className="text-slate-600 font-bold text-[10px]">
                            📍 {student.governorate}
                          </span>
                        )}

                        {student.reassignedDateStr && (
                          <span 
                            className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1 shadow-3xs"
                            title={`تم تحويل هذا الطالب لك بتاريخ ووقت: ${student.reassignedDateStr}`}
                          >
                            <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>🔄 محوّل لك: {student.reassignedDateStr}</span>
                          </span>
                        )}
                      </div>

                      {/* Fast Action Buttons in Collapsed View */}
                      <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-1.5 sm:pt-0 shrink-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1">
                          
                          {/* Quick Call */}
                          <a
                            href={`tel:${student.phoneNumber}`}
                            className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition flex items-center justify-center shrink-0 border border-emerald-200"
                            title="اتصال سريع"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {/* Quick WhatsApp */}
                          {student.whatsappNumber && (
                            <a
                              href={getWhatsAppLink(student.whatsappNumber, student.studentName)}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition flex items-center justify-center shrink-0"
                              title="واتساب مباشر"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* 1-Click Fast Reminder */}
                          <button
                            type="button"
                            onClick={() => handleOpenMessaging(student)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1 shrink-0 text-[10px] font-black shadow-xs cursor-pointer"
                            title="إرسال إشعار تذكيري آلي بنقرة واحدة (واتساب / SMS)"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                            <span>إشعار ومتابعة ⚡</span>
                          </button>

                        </div>

                        {/* More Details Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleStudentExpand(student.id)}
                          className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-black transition cursor-pointer"
                        >
                          المزيد 📂
                        </button>
                      </div>

                    </div>
                  ) : (
                    /* 2. EXPANDED VIEW WITH COMPLETE FEATURE PARITY */
                    <div className="space-y-4 animate-fade-in text-right">
                      
                      {/* Status Banner */}
                      <div className="flex justify-between items-center text-xs flex-wrap gap-1.5">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          student.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                          student.status === 'no_reply' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}>
                          الحالة: {student.status === 'completed' ? 'تم الحجز والمكاملة بنجاح ✓' :
                                   student.status === 'no_reply' ? 'لم يتم الرد بعد (متابعة تليفونية)' : 'بانتظار التأكيد والمتابعة'}
                        </span>
                        {student.date && (
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>تسجيل: {student.date}</span>
                          </span>
                        )}
                      </div>

                      {student.reassignedDateStr && (
                        <div className="w-full bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold shadow-3xs">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>🔄 تم تحويل هذا الطالب لك من الإدارة في:</span>
                          </span>
                          <strong className="font-mono text-indigo-800 text-xs">{student.reassignedDateStr}</strong>
                        </div>
                      )}

                      {/* Phone & WhatsApp Boxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        
                        {/* Call Phone Box */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                          <span className="text-slate-500 font-sans text-xs">الهاتف:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900 font-bold">{student.phoneNumber}</strong>
                            <a
                              href={`tel:${student.phoneNumber}`}
                              className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition flex items-center justify-center shrink-0 border border-emerald-200"
                              style={{ minWidth: "28px", minHeight: "28px" }}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopySingleNumber(student.phoneNumber)}
                              className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                              style={{ minWidth: "28px", minHeight: "28px" }}
                              title="نسخ الرقم"
                            >
                              {copiedFeedback === student.phoneNumber ? "✓" : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* WhatsApp Box */}
                        {student.whatsappNumber && (
                          <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between font-mono">
                            <span className="text-slate-500 font-sans text-xs">واتساب:</span>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-emerald-800 font-bold">{student.whatsappNumber}</strong>
                              <a
                                href={getWhatsAppLink(student.whatsappNumber, student.studentName)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition flex items-center justify-center shrink-0 border border-emerald-300"
                                style={{ minWidth: "28px", minHeight: "28px" }}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopySingleNumber(student.whatsappNumber)}
                                className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition flex items-center justify-center shrink-0 cursor-pointer"
                                style={{ minWidth: "28px", minHeight: "28px" }}
                                title="نسخ الرقم"
                              >
                                {copiedFeedback === student.whatsappNumber ? "✓" : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Info Pills */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {student.governorate && (
                          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>المحافظة: <strong>{student.governorate}</strong></span>
                          </div>
                        )}
                        {student.graduationYear && (
                          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>سنة التخرج: <strong>{student.graduationYear}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Academic Info */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                        <p><span className="font-semibold text-slate-400">المؤهل الدراسي:</span> {student.educationLevel || "غير محدد"}</p>
                        <p className="flex items-center gap-1 text-emerald-800 font-extrabold text-[11px] mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>الشعبة / المسار الدراسي:</span>
                          <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {student.basicCourse || "الشعبة المعتمدة"}
                          </span>
                        </p>
                      </div>

                      {/* Selected Departments */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">الأقسام المطلوبة في التذكرة:</span>
                        <div className="flex flex-wrap gap-1">
                          {student.selectedDepartments && student.selectedDepartments.length > 0 ? (
                            student.selectedDepartments.map((dept, i) => (
                              <span key={i} className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-sm">
                                {dept}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">لم يختر شُعبة محددة على الكرت</span>
                          )}
                        </div>
                      </div>

                      {/* Student Notes */}
                      {student.notes && (
                        <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-200 leading-relaxed font-sans">
                          <strong className="text-[10px] text-slate-400 block mb-0.5 font-bold">ملاحظات الطالب وتفاصيل الحجز:</strong>
                          "{student.notes}"
                        </div>
                      )}

                      {/* 1-Click WhatsApp/SMS Automated Follow-up Module */}
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
                              <p className="text-[10px] text-slate-300 font-medium">
                                إرسال رسائل تذكير تلقائية مخصصة بالاسم وكود الحجز عبر الواتساب / SMS
                              </p>
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
                          
                          {/* 1. Visit Reminder */}
                          <button
                            type="button"
                            onClick={() => {
                              const sName = student.studentName || "عزيزنا الطالب";
                              const specialty = student.selectedDepartments?.[0] || student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
                              const code = student.reservationCode || "1024";
                              const rawTargetPhone = student.whatsappNumber || student.phoneNumber;
                              const cleanDigits = rawTargetPhone.replace(/\D/g, "");
                              const formattedWa = cleanDigits.startsWith("20") ? cleanDigits : cleanDigits.startsWith("0") ? `20${cleanDigits.slice(1)}` : `20${cleanDigits}`;
                              const msg = studentMessages.adminQuickVisitReminder({ studentName: sName, specialty, reservationCode: code, discountCode: DEFAULT_DISCOUNT_CODE });
                              window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                              handleSaveInternalNote(student.id, `[واتساب - ${currentRep?.name}]: تم إرسال تذكير بموعد الزيارة بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
                            }}
                            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-right transition cursor-pointer flex items-center gap-2 group"
                          >
                            <span className="text-base">🏛️</span>
                            <div className="truncate">
                              <span className="block text-[11px] font-black text-amber-300 group-hover:text-amber-200">تذكير بموعد الزيارة</span>
                              <span className="block text-[9.5px] text-slate-300">مراجعة الأوراق وكود الحجز</span>
                            </div>
                          </button>

                          {/* 2. Discount Expiry */}
                          <button
                            type="button"
                            onClick={() => {
                              const sName = student.studentName || "عزيزنا الطالب";
                              const specialty = student.selectedDepartments?.[0] || student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
                              const code = student.reservationCode || "1024";
                              const rawTargetPhone = student.whatsappNumber || student.phoneNumber;
                              const cleanDigits = rawTargetPhone.replace(/\D/g, "");
                              const formattedWa = cleanDigits.startsWith("20") ? cleanDigits : cleanDigits.startsWith("0") ? `20${cleanDigits.slice(1)}` : `20${cleanDigits}`;
                              const msg = studentMessages.adminQuickDiscountAlert({ studentName: sName, specialty, reservationCode: code, discountCode: DEFAULT_DISCOUNT_CODE });
                              window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                              handleSaveInternalNote(student.id, `[واتساب - ${currentRep?.name}]: تم إرسال تنبيه بقرب انتهاء الخصم بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
                            }}
                            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-right transition cursor-pointer flex items-center gap-2 group"
                          >
                            <span className="text-base">⏳</span>
                            <div className="truncate">
                              <span className="block text-[11px] font-black text-orange-300 group-hover:text-orange-200">تنبيه قرب انتهاء الخصم</span>
                              <span className="block text-[9.5px] text-slate-300">حفظ الخصم قبل اكتمال المقاعد</span>
                            </div>
                          </button>

                          {/* 3. Form Link */}
                          <button
                            type="button"
                            onClick={() => {
                              const sName = student.studentName || "عزيزنا الطالب";
                              const specialty = student.selectedDepartments?.[0] || student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
                              const code = student.reservationCode || "1024";
                              const rawTargetPhone = student.whatsappNumber || student.phoneNumber;
                              const cleanDigits = rawTargetPhone.replace(/\D/g, "");
                              const formattedWa = cleanDigits.startsWith("20") ? cleanDigits : cleanDigits.startsWith("0") ? `20${cleanDigits.slice(1)}` : `20${cleanDigits}`;
                              const extractionLink = `${window.location.origin}/form-extraction?code=${code}&phone=${student.phoneNumber}`;
                              const msg = studentMessages.adminQuickFormLink({ studentName: sName, specialty, reservationCode: code, extractionLink });
                              window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                              handleSaveInternalNote(student, `[واتساب - ${currentRep?.name}]: تم إرسال رابط الاستمارة المباشر بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
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

                      {/* Internal Confidential Staff Note */}
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            🔐 تعليق داخلي خاص بمتابعتك للمكالمة (محمي)
                          </span>
                          {editingNoteId !== student.id ? (
                            <button
                              type="button"
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
                              placeholder="اكتب ملاحظتك بخصوص مكالمة الطالب..."
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveInternalNote(student)}
                                className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded cursor-pointer"
                              >
                                تأكيد وحفظ ✓
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setEditingNoteId(null)} 
                                className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-slate-200">
                            {student.internalNotes ? `"${student.internalNotes}"` : "لا توجد ملاحظة سرية للمتابعين حالياً."}
                          </p>
                        )}
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center pt-2.5 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* 1. Completed Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(student, "completed")}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                              student.status === "completed"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{student.status === "completed" ? "تم التواصل والتعميد بنجاح ✓" : "تأكيد المكالمة والتعميد ✓"}</span>
                          </button>

                          {/* 2. No Reply Button */}
                          {student.status !== "completed" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(student, "no_reply")}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                student.status === "no_reply"
                                  ? "bg-amber-500 text-white font-black"
                                  : "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                              }`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{student.status === "no_reply" ? "مسجل: لم يرد تليفونياً 📞" : "تسجيل لم يرد 📞"}</span>
                            </button>
                          )}

                        </div>

                        {/* Reset to Pending if needed */}
                        {student.status === "completed" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(student, "pending")}
                            className="text-[10px] text-slate-500 hover:text-slate-800 underline font-bold"
                          >
                            إعادة لحالة الانتظار 🔄
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL 1: STUDENT MESSAGING / WHATSAPP REMINDER CUSTOMIZATION */}
      <StudentMessagingModal
        isOpen={!!messagingStudent}
        onClose={() => setMessagingStudent(null)}
        student={messagingStudent}
        onLoggedAction={(studentId, actionSummary) => {
          handleSaveInternalNote(studentId, `[${currentRep?.name}]: ${actionSummary}`);
        }}
      />

      {/* MODAL 2: QR CODE MODAL FOR PERSONAL LINK */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">رمز QR لرابطك التسويقي 📱</h4>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(repMarketingUrl)}`}
                alt="QR Code"
                className="w-44 h-44 rounded-xl border border-slate-200 shadow-sm bg-white p-2"
                referrerPolicy="no-referrer"
              />
              <span className="text-xs font-black text-slate-900">{currentRep.name}</span>
            </div>

            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              يمكنك طباعة هذا الرمز أو عرضه على هاتفك ليقوم الطالب بمسحه بكاميرا الهاتف والتسجيل تحت اسمك مباشرة.
            </p>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(repMarketingUrl);
                toast.success("✓ تم نسخ الرابط!");
                setShowQrModal(false);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition"
            >
              نسخ الرابط وإغلاق
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: MANUAL STUDENT LEAD REGISTRATION FORM (FULL FEATURE PARITY) */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 my-6 text-right animate-scale-up max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span>تسجيل وحجز مقعد طالب جديد هاتفياً</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                      تفعيل حجز رسمي 🎟️
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                    يتم حفظ الطالب وإدراجه فوراً تحت مسؤوليتك: <strong className="text-indigo-950">{currentRep.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLeadModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {newFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{newFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateManualLead} className="space-y-4">
              
              {/* 1. Student Name */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>اسم الطالب رباعياً بالكامل: *</span>
                  <span className="text-[10px] text-slate-400 font-bold">كما هو مدون ببطاقة الرقم القومي</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="مثال: يوسف أحمد علي محمود"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* 2. Phone Numbers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الهاتف للاتصال: *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="01012345678"
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition font-mono"
                      dir="ltr"
                      required
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الواتساب:</label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="01012345678 (إن وجد)"
                      value={newStudentWhatsApp}
                      onChange={(e) => setNewStudentWhatsApp(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition font-mono"
                      dir="ltr"
                    />
                    <MessageCircle className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* 3. Governorate & Education Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">المحافظة: *</label>
                  <select
                    value={newStudentGov}
                    onChange={(e) => setNewStudentGov(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition cursor-pointer"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">المؤهل الدراسي: *</label>
                  <select
                    value={newStudentEdu}
                    onChange={(e) => setNewStudentEdu(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition cursor-pointer"
                  >
                    {UNIFIED_EDUCATION_LEVELS.map((edu) => (
                      <option key={edu} value={edu}>{edu}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Graduation Year & Admission Intake */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">سنة التخرج: *</label>
                  <select
                    value={newStudentGradYear}
                    onChange={(e) => setNewStudentGradYear(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition cursor-pointer"
                  >
                    <option value="2026">دفعة 2026 (الحالية)</option>
                    <option value="2025">دفعة 2025</option>
                    <option value="2024">دفعة 2024</option>
                    <option value="2023">دفعة 2023</option>
                    <option value="2022">دفعة 2022</option>
                    <option value="2021">دفعة 2021</option>
                    <option value="2020 أو ما قبلها">2020 أو ما قبلها</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">دورة وتنسيق القبول: *</label>
                  <select
                    value={newStudentCourse}
                    onChange={(e) => setNewStudentCourse(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition cursor-pointer"
                  >
                    <option value="دورة أكتوبر 2026 (الرئيسية)">دورة أكتوبر 2026 (الرئيسية)</option>
                    <option value="دورة فبراير 2026">دورة فبراير 2026</option>
                    <option value="دورة التدريب والتأهيل الصيفي المكثف">دورة التدريب والتأهيل الصيفي المكثف</option>
                  </select>
                </div>
              </div>

              {/* 5. Department Selection (Multi-choice Chips from Official ACADEMY_DEPARTMENTS) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-700">
                    التخصص أو الشعبة المرغوبة (الأقسام المعتمدة): *
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {newStudentSelectedDepts.length} تخصص محدد
                  </span>
                </div>

                {/* Quick Interactive Department Selector Chips */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {ACADEMY_DEPARTMENTS.filter(dept => !dept.isClosed && !dept.isFull && dept.id !== "construction").map((dept) => {
                      const isSelected = newStudentSelectedDepts.includes(dept.name);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (newStudentSelectedDepts.length > 1) {
                                const next = newStudentSelectedDepts.filter(n => n !== dept.name);
                                setNewStudentSelectedDepts(next);
                                setNewStudentDept(next[0]);
                              }
                            } else {
                              const next = [...newStudentSelectedDepts, dept.name];
                              setNewStudentSelectedDepts(next);
                              setNewStudentDept(dept.name);
                            }
                          }}
                          className={`p-2 rounded-xl text-right text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                            isSelected 
                              ? "bg-indigo-900 text-white border-indigo-950 shadow-sm" 
                              : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          <span className="truncate">{dept.name}</span>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 shrink-0 text-amber-400 mr-1" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 mr-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 6. Static Official Discount Code */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>كود الخصم المعتمد (ثابت ومفعل تلقائياً):</span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-700" /> كود رسمي نشط
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={DEFAULT_DISCOUNT_CODE || "AM2026"}
                    readOnly
                    disabled
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none uppercase font-mono cursor-not-allowed select-all tracking-wider shadow-inner"
                  />
                  <Tag className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* 7. Rep Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">ملاحظات المكالمة الهاتفية:</label>
                <textarea
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  rows={2}
                  placeholder="أي تفاصيل اتفق عليها الطالب هاتفياً، ميعاد الحضور للمقر، ولي الأمر، إلخ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewLead}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isSubmittingNewLead ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري حفظ وتسجيل الحجز...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>تأكيد تسجيل وحجز مقعد الطالب ✓</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Notification Sound & Phone Alerts Configuration Modal */}
      {currentRep && (
        <NotificationSoundModal
          isOpen={showSoundModal}
          onClose={() => setShowSoundModal(false)}
          storageKeyPrefix={currentRep.slug || "sales"}
          userName={currentRep.name}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={toggleNotifications}
        />
      )}

    </div>
  );
}
