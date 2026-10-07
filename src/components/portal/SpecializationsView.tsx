import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  X, 
  FileSpreadsheet, 
  Briefcase, 
  Coins, 
  Clock, 
  Building,
  ChevronDown,
  ChevronUp,
  ListFilter,
  CheckCircle2,
  Maximize2,
  Sparkles,
  BookOpen,
  Ticket,
  MapPin
} from "lucide-react";
import { Specialization } from "../../data/academyPortalData";
import toast from "react-hot-toast";

interface SpecializationsViewProps {
  specializations: Specialization[];
  onSave?: (items: Specialization[]) => void;
  onRequestAuth: (action: "add" | "edit" | "delete", targetItem?: Specialization) => void;
  isAdminUnlocked?: boolean;
  showSalamDiscount?: boolean;
}

const CATEGORIES = ["الكل", "طبي وتمريض", "هندسي وفني", "تكنولوجي وحاسبات", "إداري ولغات", "أخرى"];

// Helper to parse text into clean structured lines / bullet items
function parseToLines(rawText?: string): string[] {
  if (!rawText || !rawText.trim()) return [];
  
  const normalized = rawText
    .replace(/[\r\n]+/g, "\n")
    .replace(/\s*[•●▪]\s*/g, "\n")
    .replace(/\s*-\/-------\/-\s*/g, "\n")
    .replace(/\s*\/\s*(?=[أ-يA-Za-z])/g, "\n");

  const lines = normalized
    .split("\n")
    .map((l) => l.trim().replace(/^[-•*–—]+\s*/, "").replace(/^\d+[\.\-\)]\s*/, ""))
    .filter((l) => l.length > 0);

  return lines.length > 0 ? lines : [rawText.trim()];
}

export const SpecializationsView: React.FC<SpecializationsViewProps> = ({
  specializations,
  onRequestAuth,
  isAdminUnlocked = false,
  showSalamDiscount = false
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItemForModal, setSelectedItemForModal] = useState<Specialization | null>(null);

  // Background scroll lock when details modal is open
  useEffect(() => {
    if (selectedItemForModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedItemForModal]);
  
  // Track which cards are expanded in-place
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  // Toggle single card
  const toggleExpand = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle expand/collapse all
  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedCardIds({});
      setIsAllExpanded(false);
    } else {
      const all: Record<string, boolean> = {};
      specializations.forEach((s) => {
        all[s.id] = true;
      });
      setExpandedCardIds(all);
      setIsAllExpanded(true);
    }
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return specializations.filter((item) => {
      if (selectedCategory !== "الكل" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchJob = item.jobTitle?.toLowerCase().includes(q) || false;
        const matchDesc = item.description?.toLowerCase().includes(q) || false;
        const matchReq = item.requirements?.toLowerCase().includes(q) || false;
        const matchWork = item.workplaces?.toLowerCase().includes(q) || false;
        if (!matchName && !matchJob && !matchDesc && !matchReq && !matchWork) {
          return false;
        }
      }
      return true;
    });
  }, [specializations, selectedCategory, searchQuery]);

  // Copy Full Specialization Info
  const handleCopyInfo = (spec: Specialization) => {
    const discountInfo = showSalamDiscount 
      ? `\n🎟️ خصم 25% من المصروفات الدراسية بكود (AM2026) دعماً من بوابة المعاهد ومكتب AM. GROUB (بلغ موظف التقديم بكود الخصم).\n` 
      : "";
    const branchInfo = spec.availableInBranch && spec.availableInBranch.trim()
      ? `📍 الفروع المتاحة: ${spec.availableInBranch}\n`
      : "";
    const text = `🎓 تخصص: ${spec.name}\n📌 القسم: ${spec.category}\n⏳ مدة الدراسة: ${spec.duration}\n${branchInfo}${discountInfo}${spec.jobTitle ? `👔 المسمى الوظيفي وكارنيه المزاولة: ${spec.jobTitle}\n` : ""}${spec.feesPerTerm ? `💰 المصروفات الدراسية: ${spec.feesPerTerm}\n` : ""}${spec.totalFees ? `💵 إجمالي المصروفات: ${spec.totalFees}\n` : ""}${spec.installmentDetails ? `💳 نظام الأقساط: ${spec.installmentDetails}\n` : ""}${spec.requirements ? `📋 شروط القبول والتنسيق:\n${parseToLines(spec.requirements).map(l => "• " + l).join("\n")}\n` : ""}${spec.workplaces ? `🏢 مجالات وأماكن العمل:\n${parseToLines(spec.workplaces).map(l => "• " + l).join("\n")}\n` : ""}${spec.description ? `📝 نبذة عن التخصص:\n${parseToLines(spec.description).map(l => "• " + l).join("\n")}\n` : ""}`;

    navigator.clipboard.writeText(text);
    setCopiedId(spec.id);
    toast.success(`تم نسخ تفاصيل تخصص (${spec.name}) بنجاح`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (specializations.length === 0) {
      toast.error("لا توجد بيانات تخصصات للتصدير بعد");
      return;
    }
    const headers = ["اسم التخصص", "التصنيف", "مدة الدراسة", "المسمى الوظيفي", "المصروفات للترم", "الإجمالي", "الأقساط", "شروط القبول", "مجالات العمل", "نبذة"];
    const rows = specializations.map((s) => [
      `"${s.name}"`,
      `"${s.category}"`,
      `"${s.duration}"`,
      `"${s.jobTitle || ""}"`,
      `"${s.feesPerTerm || ""}"`,
      `"${s.totalFees || ""}"`,
      `"${s.installmentDetails || ""}"`,
      `"${(s.requirements || "").replace(/"/g, '""')}"`,
      `"${(s.workplaces || "").replace(/"/g, '""')}"`,
      `"${(s.description || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `دليل_التخصصات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف إكسيل التخصصات بنجاح");
  };

  // Helper renderer for structured multi-line sections with in-place expand/collapse
  const renderStructuredSection = (
    title: string,
    rawText: string | undefined,
    icon: React.ReactNode,
    isExpanded: boolean,
    containerClass: string = "bg-slate-50 border-slate-200"
  ) => {
    if (!rawText || !rawText.trim()) return null;
    const lines = parseToLines(rawText);
    if (lines.length === 0) return null;

    const visibleLines = isExpanded ? lines : lines.slice(0, 2);
    const hasMore = lines.length > 2 && !isExpanded;

    return (
      <div className={`p-2 rounded-lg border ${containerClass} space-y-1`}>
        <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-800">
          <div className="flex items-center gap-1">
            {icon}
            <span>{title}:</span>
          </div>
          {lines.length > 2 && (
            <span className="text-[8.5px] text-slate-400 font-normal">
              {isExpanded ? `(${lines.length} أسطر)` : `(سطران من ${lines.length})`}
            </span>
          )}
        </div>

        <ul className="space-y-0.5 pt-0.5">
          {visibleLines.map((line, idx) => (
            <li 
              key={idx} 
              className="text-[9.5px] sm:text-[10px] font-medium text-slate-800 flex items-start gap-1 leading-snug"
            >
              <span className="text-emerald-600 font-black shrink-0 select-none mt-0.5">•</span>
              <span className="break-words">{line}</span>
            </li>
          ))}
        </ul>

        {hasMore && (
          <p className="text-[8.5px] text-emerald-700 font-bold pr-2 pt-0.5">
            + {lines.length - 2} أسطر إضافية (اضغط المزيد لعرضها)...
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3" dir="rtl">
      
      {/* 1. Salam Academy Discount Announcement Banner (Permanent & Prominent) */}
      {showSalamDiscount && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border-2 border-amber-400/80 rounded-2xl shadow-xs text-right space-y-2 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>خصم 25% من المصروفات الدراسية معتمد لجميع التخصصات</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                    لفترة محدودة 🎟️
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600 font-semibold">
                  دعماً من بوابة المعاهد والأكاديميات الخاصة ومكتب <strong className="text-slate-900 font-bold font-mono">AM. GROUB</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-[11px] text-slate-700 font-bold">كود الخصم:</span>
              <span className="text-xs sm:text-sm font-mono font-black bg-amber-500 text-slate-950 px-3 py-1 rounded-xl shadow-xs border border-amber-600">
                AM2026
              </span>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-200/70">
            قدم بكود الخصم الخاص ببوابة المعاهد والاكاديميات الخاصة للحصول علي خصم 25% من المصروفات ولفترة محدودة دعماً من البوابة ومكتب AM. GROUB تبقي ثابته في بيانات كل تخصص بيتم إضافة وفي بيانات التخصصات المضافه حاليا.
          </p>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-950 bg-amber-100/90 px-3 py-1 rounded-xl border border-amber-300">
            <span>📌 كود الخصم: <strong className="font-mono text-amber-950 font-black text-xs underline">AM2026</strong> ( بلغ موظف التقديم بكود الخصم للحصول علي الخصم )</span>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span>دليل التخصصات والأقسام والمصروفات الدراسية</span>
              <span className="bg-emerald-50 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded-full border border-emerald-200 font-mono font-bold">
                {specializations.length} تخصص
              </span>
            </h2>
            <p className="text-[9.5px] text-slate-500 mt-0.5">
              عرض مدمج بنظام البطاقات المنظمة لسهولة القراءة والبحث السريع.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-1">
            {/* Toggle Expand/Collapse All */}
            {specializations.length > 0 && (
              <button
                onClick={handleToggleExpandAll}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1"
                title={isAllExpanded ? "طي جميع البطاقات" : "توسيع جميع البطاقات"}
              >
                {isAllExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 text-slate-600" />
                    <span>طي الكل</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                    <span>توسيع الكل</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-300 shadow-xs transition flex items-center gap-1"
              title="تصدير إكسيل"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">تصدير إكسيل</span>
            </button>

            {/* Add Specialization - Only visible when admin mode is unlocked */}
            {isAdminUnlocked && (
              <button
                onClick={() => onRequestAuth("add")}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition flex items-center gap-1 shadow-2xs hover:shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة تخصص</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالتخصص، المسمى الوظيفي، مجالات العمل، شروط القبول..."
              className="w-full pl-7 pr-8 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-[11px] focus:outline-none focus:border-emerald-500 focus:bg-white transition text-right"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-2 py-0.5 rounded-md text-[9.5px] font-bold transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white font-black shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Specializations Grid - Clean multi-card side by side layout */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">
              {specializations.length === 0 ? "لم يتم إضافة تخصصات بعد" : "لا توجد تخصصات مطابقة للبحث"}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
              {specializations.length === 0
                ? "يمكن للإدارة إضافة الأقسام والمصروفات والأقساط بسهولة من لوحة التحكم."
                : "جرب تغيير كلمات البحث أو اختيار تصنيف آخر."}
            </p>
          </div>

          {isAdminUnlocked && (
            <button
              onClick={() => onRequestAuth("add")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة تخصص جديد الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((spec) => {
            const isExpanded = !!expandedCardIds[spec.id];

            return (
              <div
                key={spec.id}
                id={`spec-card-${spec.id}`}
                className="bg-white border border-slate-200 hover:border-emerald-500/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden text-right"
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

                <div className="space-y-2.5 pt-0.5">
                  
                  {/* Category & Duration Pill Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 inline-flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{spec.category}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                      <span>{spec.duration}</span>
                    </span>
                  </div>

                  {/* Specialization Name */}
                  <h3 className="text-xs sm:text-[13px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                    {spec.name}
                  </h3>

                  {/* Branch Availability for Apex College */}
                  {spec.availableInBranch && spec.availableInBranch.trim() && (
                    <div className="text-[10px] font-bold text-indigo-900 bg-indigo-50/90 border border-indigo-200/90 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                      <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>متاح في فرع: <strong className="text-indigo-950 font-black">{spec.availableInBranch}</strong></span>
                    </div>
                  )}

                  {/* Salam Academy 25% Discount Box on each card if enabled */}
                  {showSalamDiscount && (
                    <div className="p-2 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 rounded-lg text-right space-y-0.5">
                      <div className="flex items-center justify-between text-[9.5px] font-black text-amber-900">
                        <span className="flex items-center gap-1">
                          <Ticket className="w-3 h-3 text-amber-600" />
                          <span>خصم 25% من المصروفات</span>
                        </span>
                        <span className="font-mono bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black text-[9px]">
                          AM2026
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-700 font-bold leading-tight">
                        قدم بكود الخصم الخاص بالبوابة ومكتب AM. GROUB للحصول على الخصم (بلغ موظف التقديم بكود الخصم: <strong className="font-mono text-amber-950 font-black">AM2026</strong>).
                      </p>
                    </div>
                  )}

                  {/* Job Title / Mzawala (Pill format) - Only show if not empty */}
                  {spec.jobTitle && spec.jobTitle.trim() && (
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9.5px] font-bold text-emerald-900 block mb-0.5">
                          المسمى الوظيفي وكارنيه المزاولة:
                        </span>
                        <p className="text-[11px] font-bold text-slate-900 leading-tight">
                          {spec.jobTitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fees & Installment Box - Only show if at least one fee field exists */}
                  {(Boolean(spec.feesPerTerm && spec.feesPerTerm.trim()) || 
                    Boolean(spec.totalFees && spec.totalFees.trim()) || 
                    Boolean(spec.installmentDetails && spec.installmentDetails.trim())) && (
                    <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200/80 space-y-1">
                      <div className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-600" />
                        <span>المصروفات ونظام السداد:</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-900">
                        {spec.feesPerTerm && spec.feesPerTerm.trim() && (
                          <div className="bg-white/90 p-1 rounded border border-amber-200/50">
                            <span className="text-[9px] font-medium text-slate-500 block">المصروفات:</span>
                            <span className="text-[11px] text-slate-900">{spec.feesPerTerm}</span>
                          </div>
                        )}
                        {spec.totalFees && spec.totalFees.trim() && (
                          <div className="bg-white/90 p-1 rounded border border-amber-200/50">
                            <span className="text-[9px] font-medium text-slate-500 block">الإجمالي:</span>
                            <span className="text-[11px] text-slate-900">{spec.totalFees}</span>
                          </div>
                        )}
                      </div>

                      {spec.installmentDetails && spec.installmentDetails.trim() && (
                        <p className="text-[10.5px] text-amber-950 font-bold pt-1 border-t border-amber-200/60 leading-tight">
                          💳 نظام الأقساط: {spec.installmentDetails}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Structured Sections (Description, Workplaces, Requirements) - strictly only rendered if populated */}
                  <div className="space-y-1.5 pt-0.5">
                    {/* Description Section */}
                    {spec.description && spec.description.trim() && renderStructuredSection(
                      "نبذة عن التخصص",
                      spec.description,
                      <BookOpen className="w-3 h-3 text-slate-500" />,
                      isExpanded,
                      "bg-slate-50/80 border-slate-200/70"
                    )}

                    {/* Workplaces Section */}
                    {spec.workplaces && spec.workplaces.trim() && renderStructuredSection(
                      "مجالات وأماكن العمل",
                      spec.workplaces,
                      <Building className="w-3 h-3 text-slate-500" />,
                      isExpanded,
                      "bg-slate-50/80 border-slate-200/70"
                    )}

                    {/* Requirements Section */}
                    {spec.requirements && spec.requirements.trim() && renderStructuredSection(
                      "شروط القبول",
                      spec.requirements,
                      <CheckCircle2 className="w-3 h-3 text-slate-500" />,
                      isExpanded,
                      "bg-slate-50/80 border-slate-200/70"
                    )}
                  </div>

                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                  
                  {/* Expand in-place button */}
                  {(Boolean(spec.description && spec.description.trim()) || 
                    Boolean(spec.workplaces && spec.workplaces.trim()) || 
                    Boolean(spec.requirements && spec.requirements.trim())) ? (
                    <button
                      onClick={() => toggleExpand(spec.id)}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3 text-slate-600" />
                          <span>عرض أقل</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 text-slate-600" />
                          <span>المزيد</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  {/* Actions (Copy / Full View / Admin Edit-Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyInfo(spec)}
                      className="px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition flex items-center gap-1"
                      title="نسخ بيانات التخصص"
                    >
                      {copiedId === spec.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>{copiedId === spec.id ? "تم النسخ" : "نسخ التفاصيل"}</span>
                    </button>

                    <button
                      onClick={() => setSelectedItemForModal(spec)}
                      className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200 transition flex items-center gap-0.5"
                      title="عرض كامل في نافذة منبثقة"
                    >
                      <Maximize2 className="w-2.5 h-2.5" />
                      <span>عرض كامل</span>
                    </button>

                    {/* Admin Live Actions (Edit / Delete) - Only visible if admin unlocked */}
                    {isAdminUnlocked && (
                      <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-0.5">
                        <button
                          onClick={() => onRequestAuth("edit", spec)}
                          className="p-1 rounded-md text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          title="تعديل التخصص"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => onRequestAuth("delete", spec)}
                          className="p-1 rounded-md text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="حذف التخصص"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal strictly centered in middle of viewport using Portal */}
      {selectedItemForModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="fixed inset-0" onClick={() => setSelectedItemForModal(null)} />
          <div className="relative bg-white border border-slate-200 rounded-xl sm:rounded-2xl max-w-sm sm:max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="p-3 border-b border-slate-100 flex items-start justify-between gap-1.5 shrink-0 bg-slate-50">
              <div>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1">
                  {selectedItemForModal.category}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  {selectedItemForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-2 text-[10px] sm:text-[11px] scrollbar-thin">
              
              {/* Branch Availability for Apex in Modal */}
              {selectedItemForModal.availableInBranch && selectedItemForModal.availableInBranch.trim() && (
                <div className="p-2.5 bg-indigo-50/90 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>📍 متاح في فرع: <strong className="font-black text-indigo-900">{selectedItemForModal.availableInBranch}</strong></span>
                </div>
              )}

              {/* Salam Academy Discount in Modal if enabled */}
              {showSalamDiscount && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-amber-950">
                    <span>خصم 25% معتمد من المصروفات 🎟️</span>
                    <span className="font-mono bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[10.5px]">
                      AM2026
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-700 font-bold leading-relaxed">
                    قدم بكود الخصم الخاص ببوابة المعاهد والاكاديميات الخاصة للحصول علي خصم 25% من المصروفات ولفترة محدودة دعماً من البوابة ومكتب AM. GROUB (بلغ موظف التقديم بكود الخصم: <strong className="font-mono text-amber-950">AM2026</strong>).
                  </p>
                </div>
              )}

              {/* Duration & Job Title */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 font-bold block">مدة الدراسة:</span>
                  <span className="text-[11px] font-bold text-slate-900">{selectedItemForModal.duration}</span>
                </div>
                {selectedItemForModal.jobTitle && selectedItemForModal.jobTitle.trim() && (
                  <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-[9px] text-emerald-900 font-bold block">المسمى الوظيفي:</span>
                    <span className="text-[11px] font-bold text-slate-900">{selectedItemForModal.jobTitle}</span>
                  </div>
                )}
              </div>

              {/* Financial Box - only show if populated */}
              {(Boolean(selectedItemForModal.feesPerTerm && selectedItemForModal.feesPerTerm.trim()) || 
                Boolean(selectedItemForModal.totalFees && selectedItemForModal.totalFees.trim()) || 
                Boolean(selectedItemForModal.installmentDetails && selectedItemForModal.installmentDetails.trim())) && (
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                  <h4 className="text-[10px] font-black text-amber-900 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-600" />
                    <span>المصروفات والأقساط:</span>
                  </h4>
                  <div className="space-y-1 text-[10.5px] font-bold text-slate-900">
                    {selectedItemForModal.feesPerTerm && selectedItemForModal.feesPerTerm.trim() && (
                      <div>• المصروفات: {selectedItemForModal.feesPerTerm}</div>
                    )}
                    {selectedItemForModal.totalFees && selectedItemForModal.totalFees.trim() && (
                      <div>• إجمالي المصروفات: {selectedItemForModal.totalFees}</div>
                    )}
                    {selectedItemForModal.installmentDetails && selectedItemForModal.installmentDetails.trim() && (
                      <div className="text-amber-900 font-bold pt-1 border-t border-amber-200/70 text-[10px]">
                        💳 الأقساط: {selectedItemForModal.installmentDetails}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description - Structured Lines */}
              {selectedItemForModal.description && selectedItemForModal.description.trim() && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-slate-500" />
                    <span>نبذة وتفاصيل الدراسة:</span>
                  </h4>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    {parseToLines(selectedItemForModal.description).map((l, i) => (
                      <p key={i} className="text-[10.5px] text-slate-800 font-medium leading-relaxed flex items-start gap-1">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{l}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Workplaces - Structured Lines */}
              {selectedItemForModal.workplaces && selectedItemForModal.workplaces.trim() && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-500" />
                    <span>مجالات وأماكن العمل المتاحة:</span>
                  </h4>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    {parseToLines(selectedItemForModal.workplaces).map((l, i) => (
                      <p key={i} className="text-[10.5px] text-slate-800 font-medium leading-relaxed flex items-start gap-1">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{l}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements - Structured Lines */}
              {selectedItemForModal.requirements && selectedItemForModal.requirements.trim() && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-slate-500" />
                    <span>شروط القبول</span>
                  </h4>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    {parseToLines(selectedItemForModal.requirements).map((l, i) => (
                      <p key={i} className="text-[10.5px] text-slate-800 font-medium leading-relaxed flex items-start gap-1">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{l}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="p-2.5 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50">
              <button
                onClick={() => handleCopyInfo(selectedItemForModal)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[10.5px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Copy className="w-3 h-3 text-emerald-600" />
                <span>نسخ التفاصيل</span>
              </button>

              <button
                onClick={() => setSelectedItemForModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-bold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
