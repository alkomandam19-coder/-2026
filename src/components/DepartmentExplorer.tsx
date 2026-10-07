import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { ACADEMY_DEPARTMENTS, Department } from "../data";
import * as Icons from "lucide-react";
import { PDFDownloadModal } from "./PDFDownloadModal";
import { supabase, hasSupabase } from "../supabaseClient";
import { LOCAL_IMAGES, DEPARTMENT_DEFAULT_IMAGES } from "../assets/images";
import { shareMessages } from "../utils/messages";

interface DepartmentExplorerProps {
  onSelectDepartment: (dept: Department) => void;
}

export function DepartmentExplorer({ onSelectDepartment }: DepartmentExplorerProps) {
  const navigate = useNavigate();
  const [academyDepartmentsList, setAcademyDepartmentsList] = useState<Department[]>([]);
  const [pdfLibraryList, setPdfLibraryList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [downloadDept, setDownloadDept] = useState<string | null>(null);
  const [adminLeads, setAdminLeads] = useState<any[]>([]);
  const [deptStats, setDeptStats] = useState<Record<string, number>>({});

  React.useEffect(() => {
    const fetchSeatStats = async () => {
      try {
        const res = await fetch("/api/departments/seat-stats");
        const data = await res.json();
        if (data.success && data.stats) {
          setDeptStats(data.stats);
        }
      } catch (err) {
        console.warn("Could not retrieve seat stats in DepartmentExplorer", err);
      }
    };

    fetchSeatStats();
    window.addEventListener("real_lead_registered" as any, fetchSeatStats);
    window.addEventListener("academy_leads_updated" as any, fetchSeatStats);
    window.addEventListener("admin_data_updated" as any, fetchSeatStats);

    return () => {
      window.removeEventListener("real_lead_registered" as any, fetchSeatStats);
      window.removeEventListener("academy_leads_updated" as any, fetchSeatStats);
      window.removeEventListener("admin_data_updated" as any, fetchSeatStats);
    };
  }, []);

  React.useEffect(() => {
    const listLoader = () => {
      // 1. Departments List Loader
      const saved = localStorage.getItem("custom_academy_departments_v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAcademyDepartmentsList(parsed);
          } else {
            setAcademyDepartmentsList(ACADEMY_DEPARTMENTS);
          }
        } catch (e) {
          console.error("Error parsing custom_academy_departments_v1", e);
          setAcademyDepartmentsList(ACADEMY_DEPARTMENTS);
        }
      } else {
        setAcademyDepartmentsList(ACADEMY_DEPARTMENTS);
      }

      // 2. Dynamic PDF Library Loader
      fetch("/api/pdf-library")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.list)) {
            setPdfLibraryList(data.list);
          } else {
            setPdfLibraryList([]);
          }
        })
        .catch(() => setPdfLibraryList([]));
    };

    listLoader();
    window.addEventListener("departments_updated", listLoader);
    window.addEventListener("pdf_library_updated", listLoader);
    return () => {
      window.removeEventListener("departments_updated", listLoader);
      window.removeEventListener("pdf_library_updated", listLoader);
    };
  }, []);

  React.useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/admin/data");
        const data = await res.json();
        if (data.success && Array.isArray(data.leads)) {
          setAdminLeads(data.leads);
        }
      } catch (err) {
        console.warn("Could not retrieve leads in DepartmentExplorer", err);
      }
    };

    fetchLeads();

    const handleUpdate = () => {
      fetchLeads();
    };
    window.addEventListener("admin_data_updated", handleUpdate);
    window.addEventListener("academy_leads_updated", handleUpdate);

    let channel: any = null;
    if (hasSupabase) {
      channel = supabase
        .channel("explorer-student-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
          },
          () => {
            fetchLeads();
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
  }, []);

  // Group departments logically for high-level filtering
  const getCategory = (id: string) => {
    if (id.includes("health") || id === "dental_dental" || id === "special_education" || id === "clinical_nutrition") return "medical";
    if (id === "programming" || id === "wireless_telecom" || id === "petroleum" || id === "surveying" || id === "construction" || id.includes("comput") || id.includes("acad")) return "technical";
    if (id === "aviation" || id === "tourism" || id === "systems_admin") return "hospitality_admin";
    if (id === "digital_marketing" || id === "journalism_media" || id === "fine_arts" || id === "languages") return "comms_creative";
    return "technical"; // Fallback for custom added branches
  };

  const getCategoryLabel = (id: string) => {
    const cat = getCategory(id);
    switch (cat) {
      case "medical": return "الخدمات الصحية والتربية ⚕️";
      case "technical": return "تقني وهندسي ⚙️";
      case "hospitality_admin": return "الضيافة والإدارة 🏢";
      case "comms_creative": return "الإعلام واللغات والإبداع 🎨";
      default: return "تخصص معتمد 🎓";
    }
  };

  const getDepartmentBgImage = (id: string) => {
    // 1. Check if the department object inside our loaded list has a custom image
    const dept = academyDepartmentsList.find((d) => d.id === id);
    if (dept && (dept as any).imageUrl) {
      return (dept as any).imageUrl;
    }
    // 2. Otherwise fall back to centralized defaults
    return DEPARTMENT_DEFAULT_IMAGES[id] || LOCAL_IMAGES.logoAcademicWhite;
  };

  const filteredDepts = academyDepartmentsList.filter((dept) => {
    const matchesSearch =
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(dept.skills) && dept.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (Array.isArray(dept.careers) && dept.careers.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())));

    const category = getCategory(dept.id);
    const matchesCategory = selectedCategory === "all" || category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getIcon = (name: string) => {
    const IconComponent = (Icons as any)[name];
    return IconComponent ? <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" /> : <Icons.BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />;
  };

  return (
    <div className="space-y-4 sm:space-y-6" id="dept-explorer-container">
      {/* Dynamic Filter Panel */}
      <div className="p-3.5 sm:p-5 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between" id="dept-filters">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            id="dept-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن تخصص، مهارة، أو فرصة عمل..."
            className="w-full pl-4 pr-10 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition text-right"
            dir="rtl"
          />
          <Icons.Search className="absolute right-3 top-3 sm:top-3.5 text-slate-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-3 sm:top-3.5 text-slate-400 hover:text-slate-600 transition"
              id="clear-search-btn"
            >
              <Icons.X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* Tab filters */}
        <div className="flex flex-wrap gap-1.5 justify-start md:justify-end w-full md:w-auto" id="category-tabs" dir="rtl">
          {[
            { id: "all", label: "الكل" },
            { id: "technical", label: "تقني وهندسي" },
            { id: "medical", label: "الخدمات الصحية" },
            { id: "hospitality_admin", label: "الضيافة والإدارة" },
            { id: "comms_creative", label: "الإعلام واللغات" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg sm:rounded-xl font-medium transition cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-brand-navy text-white shadow-xs font-bold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count & Warning Tip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-right px-1" dir="rtl">
        <p className="text-sm text-slate-500 font-medium font-sans">
          تم العثور على <span className="font-bold text-brand-navy">{filteredDepts.length}</span> تخصص دراسي معتمد
        </p>
        <div className="flex items-center gap-1.5 text-xs text-brand-coral bg-brand-coral/5 px-3 py-1.5 rounded-lg border border-brand-coral/10 w-fit">
          <Icons.Info className="w-4 h-4 shrink-0" />
          <span>تنبيه: جميع تخصصاتنا مصممة لتأهيلك العملي لسوق العمل دون وعود تعيين مبالغ فيها.</span>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="depts-grid" dir="rtl">
        {filteredDepts.length > 0 ? (
          filteredDepts.map((dept) => {
            const isExpanded = selectedDeptId === dept.id;
            
            const isExplicitlyClosed = Boolean(dept.isFull || dept.isClosed || dept.id === "construction");
            const maxCap = dept.maxCapacity !== undefined ? dept.maxCapacity : (isExplicitlyClosed ? 0 : 120);
            
            // Prioritize real-time aggregated stats from all registrations
            let count = 0;
            if (isExplicitlyClosed) {
              count = 120;
            } else if (deptStats[dept.id] !== undefined) {
              count = deptStats[dept.id];
            } else if (deptStats[dept.name] !== undefined) {
              count = deptStats[dept.name];
            } else {
              count = adminLeads.filter(lead => {
                const depts = Array.isArray(lead.selectedDepartments) ? lead.selectedDepartments : [lead.selectedDepartments];
                const spec = lead.specialization || "";
                const allTexts = [...depts, spec].filter(Boolean).join(" ").toLowerCase();
                const cleanName = dept.name.replace(/^قسم\s+/, "").toLowerCase();
                return allTexts.includes(cleanName) || allTexts.includes(dept.name.toLowerCase());
              }).length;
            }

            const remaining = isExplicitlyClosed ? 0 : Math.max(0, maxCap - count);
            const percentage = isExplicitlyClosed ? 100 : Math.max(0, Math.min(100, (count / maxCap) * 100));

            // Status metrics based on 3-tier
            let statusBadgeBg = "";
            let statusBadgeText = "";
            let progressBarColor = "";
            let warningNotice = null;
            let isFull = isExplicitlyClosed || remaining <= 0;

            if (isExplicitlyClosed) {
              statusBadgeBg = "bg-rose-700 text-white border-rose-800";
              statusBadgeText = "ممتلئ - تم غلق التقديم 🚫";
              progressBarColor = "bg-rose-600";
              warningNotice = (
                <div className="text-[11px] font-black text-rose-700 flex items-center gap-1 bg-rose-50 border border-rose-200 p-2 rounded-lg justify-center w-full">
                  🚫 تم اكتمال الطاقة الاستيعابية وغلق باب التقديم والحجز لهذا القسم نهائياً.
                </div>
              );
            } else if (remaining > (2 / 3) * maxCap) {
              statusBadgeBg = "bg-emerald-600/90 border-emerald-580/10";
              statusBadgeText = "متاح للحجز ✓";
              progressBarColor = "bg-emerald-500 animate-pulse";
            } else if (remaining > (1 / 3) * maxCap) {
              statusBadgeBg = "bg-amber-500/95 text-slate-900 border-amber-400/10";
              statusBadgeText = "مقاعد محدودة ⚠️";
              progressBarColor = "bg-amber-500 animate-pulse";
            } else if (remaining > 0) {
              statusBadgeBg = "bg-rose-600/95 text-white border-rose-500/10";
              statusBadgeText = "أوشكت المقاعد على النفاد! 🚨";
              progressBarColor = "bg-rose-600 animate-pulse";
              warningNotice = (
                <div className="text-[11px] font-black text-rose-600 animate-pulse flex items-center gap-1 bg-rose-50 border border-rose-100 p-2 rounded-lg justify-center w-full">
                  ⚠️ ينتهي التسجيل قريباً: متبقي {remaining} مقاعد فقط!
                </div>
              );
            } else {
              statusBadgeBg = "bg-slate-700/95 text-white border-slate-650/10";
              statusBadgeText = "مكتمل - انضم للانتظار ❌";
              progressBarColor = "bg-slate-400";
              isFull = true;
            }

            return (
              <div
                key={dept.id}
                id={`dept-card-${dept.id}`}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col element-reveal ${
                  isExpanded
                    ? "border-brand-navy ring-4 ring-brand-navy/5 shadow-md scale-102"
                    : "border-slate-200 specialty-card-hover"
                }`}
              >
                {/* Visual Specialty Background Banner */}
                <div
                  onClick={() => navigate(`/specialties/${dept.id}`)}
                  className="h-28 sm:h-36 w-full relative overflow-hidden bg-slate-900 shrink-0 cursor-pointer group"
                >
                  <LazyLoadImage
                    src={getDepartmentBgImage(dept.id)}
                    alt={dept.name}
                    className="w-full h-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = LOCAL_IMAGES.logoAcademicWhite;
                    }}
                    effect="opacity"
                    wrapperClassName="w-full h-full block"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
                  
                  {/* Floating category badge */}
                  <span className="absolute top-2.5 right-2.5 bg-brand-navy/90 text-white text-[9.5px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-white/5">
                    {getCategoryLabel(dept.id)}
                  </span>

                  {/* Floating mini status badge */}
                  <span className={`absolute top-2.5 left-2.5 text-white text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded border shadow-xs ${statusBadgeBg}`}>
                    {statusBadgeText}
                  </span>
                </div>

                <div className="p-3.5 sm:p-5 flex-1 flex flex-col relative">
                  {/* Title & Floating Icon Header - overlapping the image bottom line */}
                  <div className="flex items-start justify-between gap-2.5 mb-3 -mt-8 sm:-mt-10 relative z-10">
                    <div 
                      onClick={() => navigate(`/specialties/${dept.id}`)}
                      className="flex items-end gap-2.5 cursor-pointer group/title"
                    >
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-brand-navy flex items-center justify-center shrink-0 shadow-md border border-slate-100 group-hover/title:scale-105 transition">
                        {getIcon(dept.iconName)}
                      </div>
                      <div className="pb-0.5 sm:pb-1 bg-white/95 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl shadow-xs border border-slate-50 group-hover/title:bg-brand-navy group-hover/title:text-white transition">
                        <h3 className="font-extrabold text-xs sm:text-sm md:text-[15px] text-slate-900 group-hover/title:text-white font-sans tracking-tight">
                          {dept.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Core Description - Strictly honest facts */}
                  <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4 flex-1">
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      {dept.description}
                    </p>

                    {/* Dynamic Capacity Meter 2.0 */}
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-right w-full" dir="rtl">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">مؤشر المقاعد المتاحة بالقسم:</span>
                        <span className={isFull ? "text-rose-600 font-extrabold" : remaining <= 12 ? "text-rose-600 font-extrabold" : "text-emerald-700"}>
                          {isFull ? "مكتمل العضوية ❌" : `متبقي ${remaining} مقعد محجوز`}
                        </span>
                      </div>
                      
                      {/* Progress Bar Container */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${progressBarColor}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      
                      {/* Percentage and indicator status text */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>إشغال الحجز ({Math.round(percentage)}%)</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isFull ? "bg-slate-400" : remaining <= (1/3)*maxCap ? "bg-rose-500 animate-ping" : remaining <= (2/3)*maxCap ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`}></span>
                          <span>{isFull ? "مغلق مؤقتاً" : remaining <= (1/3)*maxCap ? "أحمر (أمضي قدماً)" : remaining <= (2/3)*maxCap ? "أصفر (تنبيه)" : "أخضر (آمن)"}</span>
                        </span>
                      </div>

                      {/* Warning text alert for red range */}
                      {warningNotice}
                    </div>
                  </div>

                  {/* Skills Mini-List */}
                  <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Icons.BookOpen className="w-3.5 h-3.5 text-brand-navy" />
                      المهارات التي ستكتسبها:
                    </h4>
                    <ul className="space-y-1.5">
                      {dept.skills.map((skill, index) => (
                        <li key={index} className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Icons.Check className="w-3.5 h-3.5 text-brand-turquoise shrink-0" />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Collapsible Career Opportunities & Direct Actions */}
                  {isExpanded && (
                    <div className="space-y-3 mb-4">
                      <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/60 animate-fade-in">
                        <h4 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                          <Icons.Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                          فرص ومواقع العمل المتوقعة:
                        </h4>
                        <ul className="space-y-1.5">
                          {dept.careers.map((career, index) => (
                            <li key={index} className="text-xs text-slate-700 flex items-baseline gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                              <span>{career}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* PDF Lead Magnet block (dynamic display based on existence in library) */}
                      {(() => {
                        const hasFile = pdfLibraryList.some(f => f.specialization === dept.name);
                        if (!hasFile) return null;
                        return (
                          <div className="bg-teal-500/5 p-4 rounded-xl border border-teal-500/10 animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <span>📄 كتيب التخصص التفصيلي 2026 (PDF)</span>
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-1">
                                يحتوي على الخطة الدراسية والمصروفات وخيارات التقسيط المتاحة لـ {dept.name}.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDownloadDept(dept.name)}
                              className="px-3 py-1.5 bg-[#115e59] hover:bg-emerald-800 text-white text-[11px] font-black rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap"
                              style={{ minHeight: "36px" }}
                            >
                              <Icons.Download className="w-3.5 h-3.5 text-teal-100 animate-bounce" />
                              <span>تحميل الكتيب</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
                    {/* Share Specialty Row */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>هل أعجبك هذا التخصص؟ شاركه مع زملائك:</span>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl px-1.5 py-1">
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessages.departmentShare(dept.name, window.location.origin))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="مشاركة عبر واتساب"
                          className="w-7 h-7 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition border border-emerald-200/40"
                        >
                          <Icons.MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareMessages.departmentShare(dept.name, window.location.origin))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="مشاركة عبر تيليجرام"
                          className="w-7 h-7 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg flex items-center justify-center transition border border-sky-200/40"
                        >
                          <Icons.Send className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/specialties/${dept.id}`)}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 border-brand-navy shadow-xs"
                        style={{ minHeight: "44px" }}
                        id={`more-details-btn-${dept.id}`}
                      >
                        <span>تعرف علي المزيد</span>
                        <Icons.ArrowLeft className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => !isFull && onSelectDepartment(dept)}
                        disabled={isFull}
                        style={{ minHeight: "44px" }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
                          isFull 
                            ? "bg-slate-300 text-slate-600 cursor-not-allowed border border-slate-400/20"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xs cursor-pointer"
                        }`}
                        title={isExplicitlyClosed ? "تم غلق باب التقديم والحجز لهذا القسم لاكتمال المقاعد" : isFull ? "نعتذر، المقاعد مكتملة" : "احجز مقعدك بالقسم الآن للاستفادة من الخصومات"}
                        id={`reserve-btn-${dept.id}`}
                      >
                        <span>{isExplicitlyClosed ? "ممتلئ - تم غلق التقديم" : isFull ? "مكتمل - انضم لقائمة الانتظار" : "احجز الآن"}</span>
                        <Icons.ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center p-6 space-y-3" id="no-depts-found">
            <Icons.FolderOpen className="w-12 h-12 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-lg">لم نعثر على نتائج مطابقة</h3>
            <p className="text-slate-500 text-sm max-w-md">
              جرب تغيير الكلمات المفتاحية في شريط البحث أو اختر تصنيفاً آخر لمشاهدة التخصصات المعتمدة.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy rounded-xl cursor-pointer"
            >
              إعادة تهيئة التصفية
            </button>
          </div>
        )}
      </div>

      <PDFDownloadModal
        isOpen={!!downloadDept}
        onClose={() => setDownloadDept(null)}
        defaultSpecialization={downloadDept || undefined}
      />
    </div>
  );
}
