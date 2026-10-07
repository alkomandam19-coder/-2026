import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useParams, useLocation, Link } from "react-router-dom";
import { 
  Building2, 
  Phone, 
  MessageCircle, 
  Search, 
  RefreshCw, 
  FileSpreadsheet, 
  Clock, 
  MapPin, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  ShieldCheck, 
  Filter, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles,
  Users,
  BookOpen,
  Calendar,
  UserCheck,
  UserX,
  FileText,
  Lock,
  Edit3,
  Save,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export interface AcademyStudent {
  id: string | number;
  reservationCode?: string;
  studentName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  graduationYear?: string;
  governorate?: string;
  educationLevel?: string;
  basicCourse?: string;
  selectedDepartments?: string[];
  specialization?: string;
  notes?: string;
  academyNotes?: string;
  internalNotes?: string;
  date?: string;
  timestamp?: number | string;
  status: "pending" | "completed" | "no_reply" | string;
  agentName?: string;
  academyName?: string;
  branch?: string;
  submissionDate?: string;
  appliedStatus?: "applied" | "withdrawn" | "pending";
}

const OFFICIAL_ACADEMIES = [
  { name: "أكاديمية السلام للتدريب", desc: "فروع الإسكندرية، الدقي، وطنطا", path: "/salam" },
  { name: "أكاديمية تراست للعلوم الطبية", desc: "المقر الرئيسي - القاهرة", path: "/trust" },
  { name: "أكاديمية أبيكس", desc: "فرع الجيزة وفرع الإسكندرية", path: "/apex" },
  { name: "أكاديمية الرفاق للتدريب", desc: "فرع بني سويف ومقرات الصعيد", path: "/refaq" }
];

export default function AcademyPortal() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const location = useLocation();

  // Determine if Master Mode (Aggregated staff view for all 4 academies) or Isolated View
  const rawTarget = params.academySlug || searchParams.get("academy") || searchParams.get("name") || "";
  const isMasterMode = searchParams.get("master") === "true" || 
                       rawTarget === "all" || 
                       rawTarget === "master" || 
                       rawTarget === "all-academies" ||
                       location.pathname.includes("academies-master") ||
                       location.pathname === "/academies";

  const targetAcademyParam = isMasterMode ? "all" : rawTarget;

  const [academyName, setAcademyName] = useState<string>(targetAcademyParam);
  const [masterAcademyFilter, setMasterAcademyFilter] = useState<string>("all");
  const [leads, setLeads] = useState<AcademyStudent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allAvailableAcademies, setAllAvailableAcademies] = useState<{ name: string; studentCount: number }[]>([]);

  const prevLeadsCountRef = useRef<number | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [governorateFilter, setGovernorateFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  // Interaction States
  const [expandedStudents, setExpandedStudents] = useState<Record<string | number, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | number | null>(null);

  // Note Modal State for Academy Staff
  const [notesModalStudent, setNotesModalStudent] = useState<AcademyStudent | null>(null);
  const [modalNoteText, setModalNoteText] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Sync state when param changes
  useEffect(() => {
    const nextTarget = isMasterMode ? "all" : rawTarget;
    setAcademyName(nextTarget);
  }, [rawTarget, isMasterMode]);

  // Fetch Available Academies List (strictly limited to 4 official partners)
  useEffect(() => {
    async function fetchAcademiesList() {
      try {
        const res = await fetch("/api/academy-portal/list");
        const data = await res.json();
        if (data.success && Array.isArray(data.academies) && data.academies.length > 0) {
          setAllAvailableAcademies(data.academies);
        } else {
          setAllAvailableAcademies(OFFICIAL_ACADEMIES.map(a => ({ name: a.name, studentCount: 0 })));
        }
      } catch (err) {
        console.warn("Could not fetch academies list, using fallback:", err);
        setAllAvailableAcademies(OFFICIAL_ACADEMIES.map(a => ({ name: a.name, studentCount: 0 })));
      }
    }
    fetchAcademiesList();
  }, []);

  // Fetch Leads for the targeted Academy with silent real-time polling
  const fetchAcademyLeads = async (targetName: string, isSilent = false) => {
    if (!targetName) {
      if (!isSilent) setIsLoading(false);
      return;
    }

    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch(`/api/academy-portal/leads/${encodeURIComponent(targetName)}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.leads)) {
        let validLeads = data.leads;
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
              validLeads = validLeads.filter((l: any) => {
                const phoneDigits = String(l.phoneNumber || l.whatsappNumber || "").replace(/\D/g, "");
                return phoneDigits.length < 10 || !phoneSet.has(phoneDigits);
              });
            }
          }
        } catch (e) {}

        prevLeadsCountRef.current = validLeads.length;
        setLeads(validLeads);
      } else if (!isSilent) {
        toast.error(data.error || "تعذر تحميل بيانات الطلاب");
      }
    } catch (err) {
      console.error("Fetch academy leads error:", err);
      if (!isSilent) toast.error("حدث خطأ في الاتصال بالخادم.");
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (academyName) {
      fetchAcademyLeads(academyName, false);
      document.title = isMasterMode
        ? "بوابات الأكاديميات الشريكة | الكشف الموحّد"
        : `بوابة الطلاب | ${academyName}`;

      // Real-time synchronization polling every 5 seconds
      const intervalId = setInterval(() => {
        fetchAcademyLeads(academyName, true);
      }, 5000);

      const handleFocus = () => fetchAcademyLeads(academyName, true);
      window.addEventListener("focus", handleFocus);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [academyName, isMasterMode]);

  // Handle Mark Applied (تم التقديم) - Non-revertible, preserves existing status
  const handleMarkApplied = async (lead: AcademyStudent) => {
    const studentIdentifier = lead.reservationCode || lead.id;
    if (lead.appliedStatus === "applied") {
      toast("تم تثبيت تقديم هذا الطالب مسبقاً ولا يمكن إلغاؤه.", { icon: "🔒" });
      return;
    }

    setIsUpdatingStatus(studentIdentifier);
    const toastId = toast.loading("جاري تسجيل وتأكيد التقديم في النظام...");

    try {
      const res = await fetch("/api/academy-portal/lead-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentIdentifier,
          appliedStatus: "applied"
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`تم تأكيد تقديم وحضور الطالب (${lead.studentName || "المحدد"}) بنجاح! 🎓✨`, { id: toastId });
        setLeads(prev =>
          prev.map(l =>
            l.id === lead.id || (lead.reservationCode && l.reservationCode === lead.reservationCode)
              ? { ...l, appliedStatus: "applied" }
              : l
          )
        );
      } else {
        toast.error(data.error || "فشل تسجيل التقديم", { id: toastId });
      }
    } catch (err) {
      console.error("Apply status update error:", err);
      toast.error("فشل الاتصال بالخادم", { id: toastId });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle Mark Withdrawn (سحب) - Non-revertible once confirmed, preserves status
  const handleMarkWithdrawn = async (lead: AcademyStudent) => {
    const studentIdentifier = lead.reservationCode || lead.id;
    if (lead.appliedStatus === "withdrawn") {
      toast("تم تسجيل سحب هذا الطالب مسبقاً.", { icon: "🔒" });
      return;
    }

    const confirmWithdraw = window.confirm(
      `هل أنت متأكد من تسجيل سحب ملف الطالب (${lead.studentName || "المحدد"})؟ لن يمكن التراجع عن هذه العملية بعد التأكيد.`
    );
    if (!confirmWithdraw) return;

    setIsUpdatingStatus(studentIdentifier);
    const toastId = toast.loading("جاري تسجيل سحب الملف...");

    try {
      const res = await fetch("/api/academy-portal/lead-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentIdentifier,
          appliedStatus: "withdrawn"
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`تم تسجيل سحب ملف الطالب (${lead.studentName || "المحدد"}).`, { id: toastId });
        setLeads(prev =>
          prev.map(l =>
            l.id === lead.id || (lead.reservationCode && l.reservationCode === lead.reservationCode)
              ? { ...l, appliedStatus: "withdrawn" }
              : l
          )
        );
      } else {
        toast.error(data.error || "فشل تسجيل السحب", { id: toastId });
      }
    } catch (err) {
      console.error("Withdraw status update error:", err);
      toast.error("فشل الاتصال بالخادم", { id: toastId });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Open Notes Editor Modal for Academy Staff
  const openNotesEditor = (student: AcademyStudent) => {
    setNotesModalStudent(student);
    setModalNoteText(student.academyNotes || "");
  };

  // Save Notes Written by Academy Team
  const handleSaveAcademyNotes = async () => {
    if (!notesModalStudent) return;
    const studentIdentifier = notesModalStudent.reservationCode || notesModalStudent.id;
    setIsSavingNote(true);
    const toastId = toast.loading("جاري حفظ ملاحظات الأكاديمية...");

    try {
      const res = await fetch("/api/academy-portal/lead-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentIdentifier,
          academyNotes: modalNoteText.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ وتحديث ملاحظات الأكاديمية بنجاح! 📝", { id: toastId });
        setLeads(prev =>
          prev.map(l =>
            l.id === notesModalStudent.id || (notesModalStudent.reservationCode && l.reservationCode === notesModalStudent.reservationCode)
              ? { ...l, academyNotes: modalNoteText.trim() }
              : l
          )
        );
        setNotesModalStudent(null);
      } else {
        toast.error(data.error || "فشل حفظ الملاحظة", { id: toastId });
      }
    } catch (err) {
      console.error("Save note error:", err);
      toast.error("فشل الاتصال بالخادم", { id: toastId });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Toggle card expansion
  const toggleExpand = (id: string | number) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy code helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success("تم نسخ الكود بنجاح!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Unique lists for filters
  const uniqueBranches = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.branch && l.branch.trim()) set.add(l.branch.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  const uniqueGovernorates = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.governorate && l.governorate.trim()) set.add(l.governorate.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (Array.isArray(l.selectedDepartments)) {
        l.selectedDepartments.forEach(d => d && set.add(d.trim()));
      } else if (l.specialization) {
        set.add(l.specialization.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Master Mode Academy Tab Filter
      if (isMasterMode && masterAcademyFilter !== "all") {
        const filterNorm = masterAcademyFilter.trim().toLowerCase();
        const leadAc = (lead.academyName || "").trim().toLowerCase();
        const leadNotes = (lead.notes || "").trim().toLowerCase();
        if (!leadAc.includes(filterNorm) && !filterNorm.includes(leadAc) && !leadNotes.includes(filterNorm)) {
          return false;
        }
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (lead.studentName || "").toLowerCase().includes(q);
        const phoneMatch = (lead.phoneNumber || "").includes(q) || (lead.whatsappNumber || "").includes(q);
        const codeMatch = (lead.reservationCode || "").toLowerCase().includes(q);
        const branchMatch = (lead.branch || "").toLowerCase().includes(q);
        const subDateMatch = (lead.submissionDate || "").toLowerCase().includes(q);
        const govMatch = (lead.governorate || "").toLowerCase().includes(q);
        const notesMatch = (lead.academyNotes || "").toLowerCase().includes(q) || (lead.notes || "").toLowerCase().includes(q);
        const deptMatch = Array.isArray(lead.selectedDepartments) 
          ? lead.selectedDepartments.some(d => d.toLowerCase().includes(q))
          : (lead.specialization || "").toLowerCase().includes(q);

        if (!nameMatch && !phoneMatch && !codeMatch && !branchMatch && !subDateMatch && !govMatch && !deptMatch && !notesMatch) {
          return false;
        }
      }

      // Applied / Submission Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "applied" && lead.appliedStatus !== "applied") return false;
        if (statusFilter === "withdrawn" && lead.appliedStatus !== "withdrawn") return false;
        if (statusFilter === "pending" && (lead.appliedStatus === "applied" || lead.appliedStatus === "withdrawn")) return false;
      }

      // Branch filter
      if (branchFilter !== "all" && lead.branch !== branchFilter) {
        return false;
      }

      // Governorate filter
      if (governorateFilter !== "all" && lead.governorate !== governorateFilter) {
        return false;
      }

      // Dept filter
      if (deptFilter !== "all") {
        const hasDept = Array.isArray(lead.selectedDepartments)
          ? lead.selectedDepartments.includes(deptFilter)
          : lead.specialization === deptFilter;
        if (!hasDept) return false;
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, branchFilter, governorateFilter, deptFilter, masterAcademyFilter, isMasterMode]);

  // Derived Stats
  const computedStats = useMemo(() => {
    const total = leads.length;
    const applied = leads.filter(l => l.appliedStatus === "applied").length;
    const withdrawn = leads.filter(l => l.appliedStatus === "withdrawn").length;
    const pending = leads.filter(l => !l.appliedStatus || l.appliedStatus === "pending").length;
    return { total, applied, withdrawn, pending };
  }, [leads]);

  // Export to CSV (Clean with academy notes and no internal marketing tags)
  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.error("لا توجد بيانات لتصديرها.");
      return;
    }

    const headers = [
      "رقم الاستمارة",
      "اسم الطالب",
      "رقم الهاتف",
      "رقم الواتساب",
      "التخصص المطلوب",
      "الفرع المعتمد",
      "تاريخ التقديم في المقر",
      "تاريخ التسجيل",
      "حالة التقديم",
      "المحافظة",
      "المؤهل الدراسي",
      "الأكاديمية",
      "ملاحظات الأكاديمية",
      "رغبة الطالب"
    ];

    const rows = filteredLeads.map(lead => [
      lead.reservationCode || `ID-${lead.id}`,
      `"${lead.studentName || ''}"`,
      `"${lead.phoneNumber || ''}"`,
      `"${lead.whatsappNumber || lead.phoneNumber || ''}"`,
      `"${(lead.selectedDepartments && lead.selectedDepartments.length > 0 ? lead.selectedDepartments.join(' - ') : lead.specialization) || 'غير محدد'}"`,
      `"${lead.branch || 'الفرع الرئيسي'}"`,
      `"${lead.submissionDate || 'غير محدد'}"`,
      `"${lead.date || ''}"`,
      `"${lead.appliedStatus === 'applied' ? 'تم التقديم' : lead.appliedStatus === 'withdrawn' ? 'تم السحب' : 'قيد الانتظار'}"`,
      `"${lead.governorate || 'غير محدد'}"`,
      `"${lead.educationLevel || 'غير محدد'}"`,
      `"${lead.academyName || academyName}"`,
      `"${(lead.academyNotes || '').replace(/"/g, '""')}"`,
      `"${(lead.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `طلاب_${academyName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير كشف الطلاب بنجاح! 📊");
  };

  // WhatsApp Message Generator
  const getWhatsAppLink = (lead: AcademyStudent) => {
    let phone = (lead.whatsappNumber || lead.phoneNumber || "").replace(/[^0-9]/g, "");
    if (phone.startsWith("0")) {
      phone = "2" + phone;
    } else if (!phone.startsWith("20") && phone.length === 10) {
      phone = "20" + phone;
    }

    const dept = (lead.selectedDepartments && lead.selectedDepartments.length > 0)
      ? lead.selectedDepartments[0]
      : lead.specialization || "التخصص المطلوب";

    const branchText = lead.branch ? ` (فرع ${lead.branch})` : "";
    const msg = `أهلاً بك يا ${lead.studentName || "طالبنا العزيز"} 🌹\nنتواصل معك من إدارة شؤون الطلاب والقبول بـ [${academyName}${branchText}] بخصوص استمارة التقديم والتسجيل رقم (#${lead.reservationCode || lead.id}) لشعبة [${dept}].\n\nنود إفادتك بأن مقعدك واستمارة حجزك معتمدة لدينا، ويسعدنا الإجابة عن أي استفسار وتأكيد موعد حضورك للأكاديمية لاستكمال الإجراءات.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 pt-6" dir="rtl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-6">

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg border border-indigo-400/30 shrink-0">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isMasterMode ? (
                    <span className="bg-amber-400/20 text-amber-300 text-[11px] font-black px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      لوحة الإدارة والموظفين المركزية المجمّعة 👑
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      بوابة الأكاديمية الرسمية المعتمدة 🔒
                    </span>
                  )}
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    دفعة 2026
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1">
                  {isMasterMode 
                    ? "بوابات الأكاديميات الشريكة (الكشف المركزي الموحّد)"
                    : academyName ? `كشف طلاب: ${academyName}` : "بوابة الأكاديميات والمعاهد الشريكة"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  {isMasterMode
                    ? "لوحة متابعة موحدة خاصة بإدارة المنصة والموظفين لمتابعة استمارات الأكاديميات الـ 4 والتنقل السريع بينها بسهولة تامة."
                    : "متابعة الطلاب المتقدمين، تحديد الفروع وتدوين ملاحظات القبول وتأكيد حضور الطلاب بشكل فوري ومعتمد."}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
              {/* Real-time Synchronization Status and Action */}
              <button
                type="button"
                onClick={() => fetchAcademyLeads(academyName, false)}
                disabled={isLoading || !academyName}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-400/40 shadow-sm"
                title="مزامنة فورية حية للكشف"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-300' : ''}`} />
                <span>مزامنة فورية حية ⚡</span>
              </button>

              {academyName && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير Excel / CSV</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Master Mode Navigation Tabs for Staff & Admin */}
        {isMasterMode && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-700 px-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>تصفية الأكاديميات:</span>
            </span>
            <button
              type="button"
              onClick={() => setMasterAcademyFilter("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                masterAcademyFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>🌟 كافة الأكاديميات (الكل)</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                masterAcademyFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {leads.length}
              </span>
            </button>
            {OFFICIAL_ACADEMIES.map(ac => {
              const normName = ac.name.trim().toLowerCase();
              const count = leads.filter(l => {
                const lAc = (l.academyName || "").trim().toLowerCase();
                const lNotes = (l.notes || "").trim().toLowerCase();
                return lAc.includes(normName) || normName.includes(lAc) || lNotes.includes(normName);
              }).length;
              return (
                <button
                  key={ac.name}
                  type="button"
                  onClick={() => setMasterAcademyFilter(ac.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    masterAcademyFilter === ac.name
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{ac.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    masterAcademyFilter === ac.name ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* If no academy selected in URL, allow quick selection from official 4 academies */}
        {!academyName && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
            <Building2 className="w-12 h-12 text-indigo-600 mx-auto" />
            <h2 className="text-lg font-black text-slate-900">اختر الأكاديمية الرسمية لعرض كشف طلابها</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              اضغط على اسم الأكاديمية التابعة لكم لفتح كشف الطلاب والتقديمات الموجهة إليها فوراً:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
              {OFFICIAL_ACADEMIES.map(ac => {
                const countObj = allAvailableAcademies.find(a => a.name === ac.name);
                const count = countObj ? countObj.studentCount : 0;
                return (
                  <button
                    key={ac.name}
                    type="button"
                    onClick={() => setAcademyName(ac.name)}
                    className="p-5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-2xl text-right transition flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-950">{ac.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{ac.desc}</p>
                      <span className="inline-block mt-2 text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-lg">
                        {count} استمارة موجهة
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition shrink-0 mr-3" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* When academy is selected */}
        {academyName && (
          <>
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500">إجمالي الاستمارات</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{computedStats.total}</h3>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800">تم التقديم والحضور</p>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-600">{computedStats.applied}</h3>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-rose-800">تم سحب الملف</p>
                  <h3 className="text-xl sm:text-2xl font-black text-rose-600">{computedStats.withdrawn}</h3>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-amber-700">قيد الانتظار والمتابعة</p>
                  <h3 className="text-xl sm:text-2xl font-black text-amber-600">{computedStats.pending}</h3>
                </div>
              </div>

            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                
                {/* Search Box */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الهاتف، كود الاستمارة، الفرع، المحافظة أو ملاحظاتكم..."
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  
                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shrink-0"
                  >
                    <option value="all">كل حالات التقديم ({leads.length})</option>
                    <option value="applied">✓ تم التقديم ({computedStats.applied})</option>
                    <option value="withdrawn">✕ تم السحب ({computedStats.withdrawn})</option>
                    <option value="pending">⏳ قيد الانتظار ({computedStats.pending})</option>
                  </select>

                  {/* Branch filter */}
                  {uniqueBranches.length > 0 && (
                    <select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shrink-0"
                    >
                      <option value="all">كل الفروع ({uniqueBranches.length})</option>
                      {uniqueBranches.map(br => (
                        <option key={br} value={br}>فرع {br}</option>
                      ))}
                    </select>
                  )}

                  {/* Governorate filter */}
                  {uniqueGovernorates.length > 0 && (
                    <select
                      value={governorateFilter}
                      onChange={(e) => setGovernorateFilter(e.target.value)}
                      className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shrink-0"
                    >
                      <option value="all">كل المحافظات ({uniqueGovernorates.length})</option>
                      {uniqueGovernorates.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  )}

                  {/* Specialization filter */}
                  {uniqueDepartments.length > 0 && (
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shrink-0 max-w-[180px]"
                    >
                      <option value="all">كل التخصصات</option>
                      {uniqueDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  )}

                </div>

              </div>

              {/* Active Filter Chips */}
              {(statusFilter !== "all" || branchFilter !== "all" || governorateFilter !== "all" || deptFilter !== "all" || searchQuery) && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    الفلاتر النشطة:
                  </span>
                  {statusFilter !== "all" && (
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      حالة التقديم: {statusFilter === "applied" ? "تم التقديم" : statusFilter === "withdrawn" ? "تم السحب" : "قيد الانتظار"}
                      <button type="button" onClick={() => setStatusFilter("all")} className="hover:text-indigo-900 font-black cursor-pointer">×</button>
                    </span>
                  )}
                  {branchFilter !== "all" && (
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      الفرع: {branchFilter}
                      <button type="button" onClick={() => setBranchFilter("all")} className="hover:text-indigo-900 font-black cursor-pointer">×</button>
                    </span>
                  )}
                  {governorateFilter !== "all" && (
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      المحافظة: {governorateFilter}
                      <button type="button" onClick={() => setGovernorateFilter("all")} className="hover:text-indigo-900 font-black cursor-pointer">×</button>
                    </span>
                  )}
                  {deptFilter !== "all" && (
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      التخصص: {deptFilter}
                      <button type="button" onClick={() => setDeptFilter("all")} className="hover:text-indigo-900 font-black cursor-pointer">×</button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      البحث: "{searchQuery}"
                      <button type="button" onClick={() => setSearchQuery("")} className="hover:text-indigo-900 font-black cursor-pointer">×</button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setBranchFilter("all");
                      setGovernorateFilter("all");
                      setDeptFilter("all");
                      setSearchQuery("");
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold underline mr-auto cursor-pointer"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              )}
            </div>

            {/* Students List / Structured Portal Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    كشف استمارات التقديم المعتمدة ({filteredLeads.length} من {leads.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    الطلاب الذين قاموا بصياغة واستخراج استمارة التقديم الرسمية المعتمدة للأكاديمية
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-500">جاري استدعاء كشف استمارات الأكاديمية...</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">لا توجد استمارات تقديم معتمدة حالياً</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery || statusFilter !== "all" || branchFilter !== "all" || governorateFilter !== "all" || deptFilter !== "all"
                      ? "جرب تغيير خيارات البحث أو إعادة ضبط الفلاتر."
                      : `لم يتم استخراج أي استمارة تقديم حتى الآن باسم (${academyName}). تظهر هنا حصرياً بيانات الطلاب الذين قاموا باستخراج استمارة التقديم الرسمية المعتمدة.`}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 text-xs font-black border-b border-slate-200 select-none">
                          <th className="py-3.5 px-4 text-center">م</th>
                          {isMasterMode && <th className="py-3.5 px-4 text-center">الأكاديمية</th>}
                          <th className="py-3.5 px-4">اسم الطالب</th>
                          <th className="py-3.5 px-4">رقم التواصل</th>
                          <th className="py-3.5 px-4">التخصص</th>
                          <th className="py-3.5 px-4">الفرع</th>
                          <th className="py-3.5 px-4">تاريخ التقديم في المقر</th>
                          <th className="py-3.5 px-4 text-center">تم التقديم</th>
                          <th className="py-3.5 px-4 text-center">سحب</th>
                          <th className="py-3.5 px-4 text-center">ملاحظات الأكاديمية</th>
                          <th className="py-3.5 px-4 text-center">تفاصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredLeads.map((lead, idx) => {
                          const leadId = lead.id || idx;
                          const code = lead.reservationCode || `REG-${lead.id}`;
                          const waLink = getWhatsAppLink(lead);
                          const isApplied = lead.appliedStatus === "applied";
                          const isWithdrawn = lead.appliedStatus === "withdrawn";
                          const isBusy = isUpdatingStatus === (lead.reservationCode || lead.id);

                          return (
                            <React.Fragment key={leadId}>
                              <tr className={`hover:bg-slate-50/80 transition ${isApplied ? 'bg-emerald-50/30' : isWithdrawn ? 'bg-rose-50/20' : ''}`}>
                                
                                {/* Index */}
                                <td className="py-4 px-4 font-black text-slate-400 text-center">
                                  {idx + 1}
                                </td>

                                {/* Academy Badge in Master Mode */}
                                {isMasterMode && (
                                  <td className="py-4 px-4 text-center whitespace-nowrap">
                                    <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg font-bold text-[11px] inline-flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                      {lead.academyName || "عام"}
                                    </span>
                                  </td>
                                )}

                                {/* Student Name & Code */}
                                <td className="py-4 px-4">
                                  <div className="space-y-0.5">
                                    <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                      <span>{lead.studentName || "طالب بدون اسم"}</span>
                                      <Link
                                        to={`/form-extraction?ref=${encodeURIComponent(lead.reservationCode || String(lead.id))}`}
                                        target="_blank"
                                        title="معاينة الاستمارة الرسمية للطالب"
                                        className="text-indigo-600 hover:text-indigo-800"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </Link>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                                      <span>#{code}</span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(code, String(leadId))}
                                        title="نسخ الكود"
                                        className="hover:text-indigo-600 cursor-pointer"
                                      >
                                        {copiedCode === String(leadId) ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Phone & WhatsApp */}
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={waLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="مراسلة واتساب فورية"
                                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </a>
                                    <a
                                      href={`tel:${lead.phoneNumber}`}
                                      className="font-mono font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1"
                                    >
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{lead.phoneNumber}</span>
                                    </a>
                                  </div>
                                </td>

                                {/* Specialization */}
                                <td className="py-4 px-4">
                                  <span className="inline-flex items-center gap-1 font-bold text-[#0A2463] bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100">
                                    <BookOpen className="w-3 h-3 text-indigo-500" />
                                    <span>
                                      {lead.selectedDepartments && lead.selectedDepartments.length > 0
                                        ? lead.selectedDepartments.join(" - ")
                                        : lead.specialization || "تخصص عام"}
                                    </span>
                                  </span>
                                </td>

                                {/* Branch */}
                                <td className="py-4 px-4">
                                  {lead.branch ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                      <MapPin className="w-3 h-3 text-blue-600" />
                                      <span>فرع {lead.branch}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] font-bold">المقر الرئيسي</span>
                                  )}
                                </td>

                                {/* Submission Date */}
                                <td className="py-4 px-4 whitespace-nowrap">
                                  {lead.submissionDate ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-[11px]">
                                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{lead.submissionDate}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">غير محدد</span>
                                  )}
                                </td>

                                {/* Button 1: تم التقديم (Submitted) */}
                                <td className="py-4 px-4 text-center">
                                  {isApplied ? (
                                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-black text-[11px] shadow-sm select-none">
                                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>تم التقديم ✓</span>
                                    </span>
                                  ) : isWithdrawn ? (
                                    <span className="text-slate-400 text-[10px] font-bold">ملف مسحوب</span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleMarkApplied(lead)}
                                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-xl font-black text-[11px] transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                                      title="اضغط لتأكيد حضور وتقديم الطالب (يتحول للأخضر وثابت)"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>تم التقديم</span>
                                    </button>
                                  )}
                                </td>

                                {/* Button 2: سحب (Withdraw) */}
                                <td className="py-4 px-4 text-center">
                                  {isWithdrawn ? (
                                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl font-black text-[11px] shadow-sm select-none">
                                      <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>تم السحب ✕</span>
                                    </span>
                                  ) : isApplied ? (
                                    <span className="text-emerald-700/60 text-[10px] font-bold">معتمد ومسجل</span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleMarkWithdrawn(lead)}
                                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-xl font-black text-[11px] transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                                      title="اضغط لتسجيل سحب الطالب"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>سحب</span>
                                    </button>
                                  )}
                                </td>

                                {/* Interactive Notes Column for Academy */}
                                <td className="py-4 px-4 text-center max-w-[200px]">
                                  {lead.academyNotes ? (
                                    <button
                                      type="button"
                                      onClick={() => openNotesEditor(lead)}
                                      className="w-full text-right p-2 bg-amber-50/80 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-950 text-[11px] font-bold transition flex items-center justify-between gap-1.5 group cursor-pointer"
                                      title="اضغط لتعديل ملاحظاتكم"
                                    >
                                      <span className="truncate flex-1">{lead.academyNotes}</span>
                                      <Edit3 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openNotesEditor(lead)}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                      title="تدوين ملاحظة خاصة بالأكاديمية"
                                    >
                                      <Edit3 className="w-3 h-3 text-slate-400" />
                                      <span>+ تدوين ملاحظة</span>
                                    </button>
                                  )}
                                </td>

                                {/* Toggle Expand Details */}
                                <td className="py-4 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(leadId)}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    {expandedStudents[leadId] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </td>

                              </tr>

                              {/* Expanded Row */}
                              {expandedStudents[leadId] && (
                                <tr className="bg-slate-50/90 border-b border-slate-200">
                                  <td colSpan={10} className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 bg-white p-4 rounded-2xl border border-slate-200">
                                      <div>
                                        <span className="font-bold text-slate-400 block mb-0.5">المحافظة الجغرافية:</span>
                                        <strong className="text-slate-900">{lead.governorate || "غير محدد"}</strong>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block mb-0.5">المؤهل وسنة التخرج:</span>
                                        <strong className="text-slate-900">{lead.educationLevel || "ثانوية عامة"} {lead.graduationYear ? `(${lead.graduationYear})` : ""}</strong>
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-400 block mb-0.5">تاريخ التسجيل بالبوابة:</span>
                                        <strong className="text-slate-900">{lead.date || "اليوم"}</strong>
                                      </div>
                                      
                                      {/* Clean Student Desires / Notes (No campaign names or sales info) */}
                                      {lead.notes && (
                                        <div className="sm:col-span-3 pt-2 border-t border-slate-100">
                                          <span className="font-bold text-slate-500 block mb-1">رغبة وملاحظة الطالب المسجلة:</span>
                                          <p className="text-slate-800 font-medium bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                                            {lead.notes}
                                          </p>
                                        </div>
                                      )}

                                      {/* Academy Private Notes */}
                                      <div className="sm:col-span-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <div>
                                          <span className="font-bold text-amber-800 block mb-0.5">ملاحظات الأكاديمية (خاصة بإدارتكم):</span>
                                          <p className="text-slate-900 font-bold">
                                            {lead.academyNotes || "لا توجد ملاحظات مدونة بعد من طرفكم."}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => openNotesEditor(lead)}
                                          className="px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          <span>تعديل الملاحظات</span>
                                        </button>
                                      </div>

                                    </div>
                                  </td>
                                </tr>
                              )}

                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="lg:hidden divide-y divide-slate-100">
                    {filteredLeads.map((lead, idx) => {
                      const leadId = lead.id || idx;
                      const code = lead.reservationCode || `REG-${lead.id}`;
                      const waLink = getWhatsAppLink(lead);
                      const isApplied = lead.appliedStatus === "applied";
                      const isWithdrawn = lead.appliedStatus === "withdrawn";
                      const isBusy = isUpdatingStatus === (lead.reservationCode || lead.id);

                      return (
                        <div key={leadId} className={`p-4 sm:p-5 space-y-4 hover:bg-slate-50/70 transition ${isApplied ? 'bg-emerald-50/20' : isWithdrawn ? 'bg-rose-50/20' : ''}`}>
                          
                          {/* Student Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 shrink-0 text-xs">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                  <span>{lead.studentName || "طالب بدون اسم"}</span>
                                  <Link
                                    to={`/form-extraction?ref=${encodeURIComponent(lead.reservationCode || String(lead.id))}`}
                                    target="_blank"
                                    className="text-indigo-600 hover:text-indigo-800"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5 flex-wrap">
                                  <span>#{code}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(code, String(leadId))}
                                    className="hover:text-indigo-600 cursor-pointer"
                                  >
                                    {copiedCode === String(leadId) ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  {isMasterMode && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md font-bold text-[10px] mr-1">
                                      <Building2 className="w-3 h-3 text-indigo-600" />
                                      {lead.academyName || "عام"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Contact Badges */}
                            <div className="flex items-center gap-1.5">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition"
                                title="واتساب"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                              <a
                                href={`tel:${lead.phoneNumber}`}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition"
                                title="اتصال"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block">التخصص:</span>
                              <strong className="text-[#0A2463] truncate block">
                                {lead.selectedDepartments && lead.selectedDepartments.length > 0
                                  ? lead.selectedDepartments.join(" - ")
                                  : lead.specialization || "تخصص عام"}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block">الفرع:</span>
                              <strong className="text-blue-800 block">
                                {lead.branch ? `فرع ${lead.branch}` : "المقر الرئيسي"}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block">تاريخ التقديم في المقر:</span>
                              <span className="text-emerald-800 font-bold block">{lead.submissionDate || "غير محدد"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block">المحافظة:</span>
                              <span className="text-slate-700 font-bold block">{lead.governorate || "غير محدد"}</span>
                            </div>
                          </div>

                          {/* Academy Notes on Mobile */}
                          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs flex items-center justify-between gap-2">
                            <div className="flex-1 truncate">
                              <span className="text-[10px] font-bold text-amber-800 block">ملاحظاتكم:</span>
                              <p className="text-slate-900 font-bold truncate">
                                {lead.academyNotes || "لا توجد ملاحظات مدونة"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openNotesEditor(lead)}
                              className="px-2.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-xl font-bold text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>
                          </div>

                          {/* Action Buttons for Mobile */}
                          <div className="flex items-center gap-2 pt-1">
                            {/* تم التقديم */}
                            <div className="flex-1">
                              {isApplied ? (
                                <div className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                  <span>تم التقديم ✓</span>
                                </div>
                              ) : isWithdrawn ? (
                                <div className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl font-black text-xs text-center">
                                  ملف مسحوب
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleMarkApplied(lead)}
                                  className="w-full py-2.5 bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-800 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>تسجيل تم التقديم</span>
                                </button>
                              )}
                            </div>

                            {/* سحب */}
                            <div className="w-28">
                              {isWithdrawn ? (
                                <div className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                  <XCircle className="w-4 h-4 stroke-[2.5]" />
                                  <span>مسحوب ✕</span>
                                </div>
                              ) : isApplied ? (
                                <div className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl font-black text-xs text-center">
                                  معتمد
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleMarkWithdrawn(lead)}
                                  className="w-full py-2.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                                >
                                  <UserX className="w-4 h-4" />
                                  <span>سحب</span>
                                </button>
                              )}
                            </div>

                            {/* Expand Notes */}
                            <button
                              type="button"
                              onClick={() => toggleExpand(leadId)}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                              title="عرض التفاصيل"
                            >
                              {expandedStudents[leadId] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Expanded Notes Card for Mobile */}
                          {expandedStudents[leadId] && (
                            <div className="p-3 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs space-y-2 animate-fadeIn">
                              <div>
                                <span className="font-bold text-slate-500">المؤهل: </span>
                                <span className="text-slate-900 font-bold">{lead.educationLevel || "ثانوية عامة"} {lead.graduationYear ? `(${lead.graduationYear})` : ""}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500">تاريخ التسجيل: </span>
                                <span className="text-slate-900 font-bold">{lead.date || "اليوم"}</span>
                              </div>
                              {lead.notes && (
                                <div className="pt-1 border-t border-slate-200">
                                  <span className="font-bold text-slate-500 block mb-0.5">رغبة الطالب:</span>
                                  <p className="bg-white p-2 rounded-xl border border-slate-200 text-slate-800 font-medium">
                                    {lead.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </>
              )}

            </div>
          </>
        )}

        {/* Modal: Interactive Note Editor for Academy Staff */}
        {notesModalStudent && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">تدوين ملاحظات الأكاديمية</h3>
                    <p className="text-xs text-slate-500">للطالب: {notesModalStudent.studentName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotesModalStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-right">
                <label className="block text-xs font-bold text-slate-700">
                  اكتب ملاحظاتكم الخاصة بهذا الطالب (خاصة بموظفي الأكاديمية):
                </label>
                <textarea
                  rows={4}
                  value={modalNoteText}
                  onChange={(e) => setModalNoteText(e.target.value)}
                  placeholder="مثال: تم التواصل وتحديد موعد المقابلة يوم الأحد، واستلام أصل شهادة الثانوية..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                <p className="text-[10px] text-slate-400">
                  هذه الملاحظات سرية وخاصة بإدارة الأكاديمية لمتابعة حالة الطالب والوثائق المستلمة.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNotesModalStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isSavingNote}
                  onClick={handleSaveAcademyNotes}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingNote ? "جاري الحفظ..." : "حفظ الملاحظة"}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
