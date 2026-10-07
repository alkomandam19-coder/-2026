import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  FileSpreadsheet, 
  Layers, 
  Grid, 
  Table as TableIcon, 
  Map as MapIcon, 
  X, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  Navigation, 
  CheckCircle2, 
  PhoneCall,
  MessageCircle,
  AlertTriangle
} from "lucide-react";
import { 
  Branch, 
  ContactPerson, 
  REGION_CATEGORIES, 
  DAYS_OF_WEEK 
} from "../../data/branchesData";
import toast from "react-hot-toast";

function getTodayArabic(): string {
  const dayIndex = new Date().getDay();
  const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return arabicDays[dayIndex];
}

interface BranchesListViewProps {
  branches: Branch[];
  onSaveBranch?: (branch: Branch) => void;
  onRequestAuth: (action: "add" | "edit" | "delete", branch?: Branch) => void;
  isAdminUnlocked?: boolean;
}

export const BranchesListView: React.FC<BranchesListViewProps> = ({
  branches,
  onRequestAuth,
  isAdminUnlocked = false
}) => {
  const todayArabic = useMemo(() => getTodayArabic(), []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("الكل");
  const [selectedCity, setSelectedCity] = useState<string>("الكل");
  const [selectedDay, setSelectedDay] = useState<string>("الكل");
  const [openTodayOnly, setOpenTodayOnly] = useState(false);
  const [hasMapOnly, setHasMapOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table" | "matrix" | "mapList">("cards");

  // Detail Modal
  const [selectedBranchForDetails, setSelectedBranchForDetails] = useState<Branch | null>(null);
  const [copiedBranchId, setCopiedBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBranchForDetails) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [selectedBranchForDetails]);

  // List of all unique cities
  const allCities = useMemo(() => {
    const citiesSet = new Set<string>();
    branches.forEach((b) => {
      if (b.city) citiesSet.add(b.city);
    });
    return ["الكل", ...Array.from(citiesSet)];
  }, [branches]);

  // Filtered branches list
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCity = b.city.toLowerCase().includes(q);
        const matchAddress = b.address.toLowerCase().includes(q);
        const matchDirections = b.directions?.toLowerCase().includes(q) || false;
        const matchContacts = b.contacts?.some(
          (c) => c && (c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.whatsapp && c.whatsapp.includes(q)))
        ) || false;
        const matchDays = b.days?.some((d) => d.toLowerCase().includes(q)) || false;
        if (!matchName && !matchCity && !matchAddress && !matchDirections && !matchContacts && !matchDays) {
          return false;
        }
      }

      if (selectedRegion !== "الكل" && b.regionCategory !== selectedRegion) {
        return false;
      }

      if (selectedCity !== "الكل" && b.city !== selectedCity) {
        return false;
      }

      if (selectedDay !== "الكل" && !b.days.includes(selectedDay)) {
        return false;
      }

      if (openTodayOnly && !b.days.includes(todayArabic)) {
        return false;
      }

      if (hasMapOnly && !b.mapUrl) {
        return false;
      }

      return true;
    });
  }, [branches, searchQuery, selectedRegion, selectedCity, selectedDay, openTodayOnly, hasMapOnly, todayArabic]);

  // Quick Stats
  const stats = useMemo(() => {
    const total = branches.length;
    const openToday = branches.filter((b) => b.days.includes(todayArabic)).length;
    const withMap = branches.filter((b) => Boolean(b.mapUrl)).length;
    const citiesCount = new Set(branches.map((b) => b.city)).size;
    return { total, openToday, withMap, citiesCount };
  }, [branches, todayArabic]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedRegion !== "الكل") count++;
    if (selectedCity !== "الكل") count++;
    if (selectedDay !== "الكل") count++;
    if (openTodayOnly) count++;
    if (hasMapOnly) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedRegion, selectedCity, selectedDay, openTodayOnly, hasMapOnly, searchQuery]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedRegion("الكل");
    setSelectedCity("الكل");
    setSelectedDay("الكل");
    setOpenTodayOnly(false);
    setHasMapOnly(false);
    toast.success("تمت استعادة كل الفلاتر");
  };

  // Copy Branch Info
  const handleCopyBranchInfo = (branch: Branch) => {
    const validContacts = (branch.contacts || []).filter(c => c && (c.phone || c.name));
    const contactsText = validContacts.length > 0
      ? `\n📞 مسؤولو التواصل:\n${validContacts.map(c => `• ${c.name}${c.role ? ` (${c.role})` : ""}: ${c.phone}`).join("\n")}`
      : "";

    const text = `🏢 ${branch.name} (${branch.regionCategory} - محافظة ${branch.city})\n📍 العنوان: ${branch.address}${branch.directions ? `\n🧭 علامة مميزة: ${branch.directions}` : ""}${branch.floor ? `\n🏢 المقر: ${branch.floor}` : ""}\n🗓️ أيام العمل: ${branch.days.join(" - ")}\n⏰ المواعيد: ${branch.workingHours}${contactsText}${branch.mapUrl ? `\n🗺️ رابط الخريطة: ${branch.mapUrl}` : ""}${branch.notes ? `\n💡 ملاحظات: ${branch.notes}` : ""}`;

    navigator.clipboard.writeText(text);
    setCopiedBranchId(branch.id);
    toast.success(`تم نسخ بيانات فرع (${branch.name}) بنجاح`);
    setTimeout(() => setCopiedBranchId(null), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (branches.length === 0) {
      toast.error("لا توجد فروع للتصدير بعد");
      return;
    }
    const headers = ["اسم الفرع", "المنطقة", "المحافظة", "العنوان التفصيلي", "علامة مميزة", "المقر والدور", "أيام العمل", "مواعيد العمل", "أرقام التواصل", "رابط الخريطة", "ملاحظات"];
    const rows = branches.map((b) => [
      `"${b.name}"`,
      `"${b.regionCategory}"`,
      `"${b.city}"`,
      `"${b.address}"`,
      `"${b.directions || ""}"`,
      `"${b.floor || ""}"`,
      `"${b.days.join(" - ")}"`,
      `"${b.workingHours}"`,
      `"${(b.contacts || []).map((c) => `${c.name}: ${c.phone}`).join(" | ")}"`,
      `"${b.mapUrl || ""}"`,
      `"${b.notes || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `دليل_الفروع_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف إكسيل الفروع بنجاح");
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* 1. Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-amber-400 transition">
          <div className="text-slate-500 text-xs font-bold mb-1 flex items-center justify-between">
            <span>إجمالي الفروع</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.total}</div>
          <span className="text-[11px] text-slate-500 font-medium">مقراً رسمياً معتمداً</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition">
          <div className="text-slate-500 text-xs font-bold mb-1 flex items-center justify-between">
            <span>مفتوح اليوم ({todayArabic})</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{stats.openToday}</div>
          <span className="text-[11px] text-slate-500 font-medium">فرع يستقبل التقديمات اليوم</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-blue-400 transition">
          <div className="text-slate-500 text-xs font-bold mb-1 flex items-center justify-between">
            <span>المحافظات المغطاة</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">{stats.citiesCount}</div>
          <span className="text-[11px] text-slate-500 font-medium">محافظة بمصر</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-rose-400 transition">
          <div className="text-slate-500 text-xs font-bold mb-1 flex items-center justify-between">
            <span>فروع بها لوكيشن خريطة</span>
            <MapPin className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">{stats.withMap}</div>
          <span className="text-[11px] text-slate-500 font-medium">موقع GPS دقيق للوصول</span>
        </div>
      </div>

      {/* 2. Main Controls / Search & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Top Row: Search Input & Action buttons & View Switchers */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، المحافظة، العنوان، اسم المسؤول، أو رقم الهاتف..."
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition text-right"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-300 shadow-xs transition flex items-center gap-1.5"
              title="تصدير إكسيل"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">تصدير إكسيل</span>
            </button>

            {/* Add Branch - Only visible if admin unlocked */}
            {isAdminUnlocked && (
              <button
                onClick={() => onRequestAuth("add")}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فرع</span>
              </button>
            )}

            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "cards" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>كروت</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "table" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول</span>
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "matrix" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>مصفوفة الأيام</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Rows */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Region Filter */}
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="appearance-none pl-7 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="الكل">كل المناطق الإقليمية</option>
                {REGION_CATEGORIES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* City Filter */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none pl-7 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="الكل">كل المحافظات</option>
                {allCities.filter((c) => c !== "الكل").map((city) => (
                  <option key={city} value={city}>محافظة {city}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Day Filter */}
            <div className="relative">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="appearance-none pl-7 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="الكل">كل أيام الأسبوع</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>يوم {d}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Quick Toggle: Open Today */}
            <button
              onClick={() => setOpenTodayOnly(!openTodayOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                openTodayOnly
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-black shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${openTodayOnly ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span>مفتوح اليوم ({todayArabic})</span>
            </button>

            {/* Quick Toggle: Has Map */}
            <button
              onClick={() => setHasMapOnly(!hasMapOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                hasMapOnly
                  ? "bg-rose-50 text-rose-800 border-rose-300 font-black shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>به خريطة موقع</span>
            </button>
          </div>

          {/* Filter status & Reset */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">
              عرض <strong className="text-amber-600 font-bold font-mono">{filteredBranches.length}</strong> من أصل{" "}
              <span className="font-mono font-semibold">{branches.length}</span> فرع
            </span>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-amber-700 hover:text-amber-800 underline font-bold transition ml-2"
              >
                إلغاء الفلاتر ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. Branch Content Views */}
      {filteredBranches.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">لا توجد فروع مطابقة لمعايير البحث</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            جرب تغيير الكلمات المفتاحية للبحث، أو إزالة بعض الفلاتر لعرض كافة فروع الأكاديمية.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-xs"
          >
            عرض جميع الفروع
          </button>
        </div>
      ) : (
        <>
          {/* VIEW A: CARDS */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredBranches.map((branch) => {
                const isOpenToday = branch.days?.includes(todayArabic);
                const validContacts = (branch.contacts || []).filter(c => c && (c.phone || c.name));

                return (
                  <div
                    key={branch.id}
                    className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden text-right"
                  >
                    {/* Top Accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 opacity-90 group-hover:opacity-100 transition-opacity" />

                    <div className="space-y-2 pt-0.5">
                      {/* Branch Title and City Pill */}
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded border border-amber-200/80 inline-block mb-0.5">
                            {branch.regionCategory}
                          </span>
                          <h3 className="text-xs sm:text-[12.5px] font-black text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                            {branch.name}
                          </h3>
                          <p className="text-[10px] text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-rose-500" />
                            <span>محافظة {branch.city}</span>
                          </p>
                        </div>

                        {/* Open Today Badge */}
                        <div
                          className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 flex items-center gap-1 ${
                            isOpenToday
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpenToday ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
                          <span>{isOpenToday ? "مفتوح اليوم" : "مغلق"}</span>
                        </div>
                      </div>

                      {/* Detailed Address and Directions - only show if populated */}
                      <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-0.5 text-right">
                        <div className="text-[9.5px] font-bold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-rose-500" />
                          <span>العنوان التفصيلي:</span>
                        </div>
                        <p className="text-[10px] sm:text-[10.5px] font-bold text-slate-900 leading-snug">
                          {branch.address}
                        </p>
                        {branch.directions && branch.directions.trim() && (
                          <p className="text-[9.5px] text-slate-600 font-medium border-t border-slate-200/60 pt-0.5 leading-snug">
                            🧭 علامة مميزة: {branch.directions}
                          </p>
                        )}
                        {branch.floor && branch.floor.trim() && (
                          <p className="text-[9.5px] text-slate-600 font-medium">
                            🏢 المقر: {branch.floor}
                          </p>
                        )}
                      </div>

                      {/* Working Days & Hours */}
                      <div className="space-y-0.5 text-[10px]">
                        {branch.days && branch.days.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-bold flex items-center gap-1 text-[9.5px]">
                              <Calendar className="w-2.5 h-2.5 text-amber-600" />
                              <span>أيام العمل:</span>
                            </span>
                            <span className="text-slate-900 font-bold">
                              {branch.days.join(" - ")}
                            </span>
                          </div>
                        )}

                        {branch.workingHours && branch.workingHours.trim() && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-bold flex items-center gap-1 text-[9.5px]">
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>المواعيد:</span>
                            </span>
                            <span className="text-slate-900 font-bold">
                              {branch.workingHours}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Contacts Box - Only show if contacts exist and have content */}
                      {validContacts.length > 0 && (
                        <div className="p-1.5 bg-amber-50/40 rounded-lg border border-amber-200/70 space-y-0.5">
                          <div className="text-[9px] font-bold text-amber-900 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-amber-600" />
                              <span>مسؤولو التواصل والحجز:</span>
                            </span>
                            <span className="text-[8.5px] text-amber-700 font-normal">متاح اتصال وواتساب</span>
                          </div>

                          <div className="space-y-0.5 text-[10px]">
                            {validContacts.map((contact, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-1 text-slate-900">
                                <span className="font-semibold truncate text-[9.5px]">
                                  • {contact.name || "مسؤول الفرع"} {contact.role && `(${contact.role})`}:
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {contact.phone && (
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="px-1.5 py-0.2 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9.5px] font-mono font-bold transition flex items-center gap-0.5"
                                      title="اتصال هاتفي مباشر"
                                    >
                                      <PhoneCall className="w-2 h-2" />
                                      <span>{contact.phone}</span>
                                    </a>
                                  )}
                                  {(contact.whatsapp || contact.phone) && (
                                    <a
                                      href={`https://wa.me/2${(contact.whatsapp || contact.phone).replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                                      title="مراسلة واتساب"
                                    >
                                      <MessageCircle className="w-2 h-2" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyBranchInfo(branch)}
                          className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9.5px] font-bold transition flex items-center gap-1"
                          title="نسخ تفاصيل الفرع"
                        >
                          {copiedBranchId === branch.id ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-600" />
                          )}
                          <span>{copiedBranchId === branch.id ? "تم النسخ" : "نسخ"}</span>
                        </button>

                        {branch.mapUrl && branch.mapUrl.trim() && (
                          <a
                            href={branch.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9.5px] font-bold transition flex items-center gap-0.5"
                          >
                            <Navigation className="w-2.5 h-2.5 text-rose-600" />
                            <span>الخريطة</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedBranchForDetails(branch)}
                          className="px-1.5 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9.5px] font-black transition shadow-2xs"
                        >
                          التفاصيل
                        </button>

                        {/* Admin Edit/Delete buttons - Only visible if admin unlocked */}
                        {isAdminUnlocked && (
                          <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-0.5">
                            <button
                              onClick={() => onRequestAuth("edit", branch)}
                              className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition"
                              title="تعديل بيانات الفرع"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>

                            <button
                              onClick={() => onRequestAuth("delete", branch)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                              title="حذف الفرع"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
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

          {/* VIEW B: TABLE */}
          {viewMode === "table" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs font-bold">
                      <th className="p-3.5">الفرع والمحافظة</th>
                      <th className="p-3.5">العنوان والموقع</th>
                      <th className="p-3.5">أيام ومواعيد العمل</th>
                      <th className="p-3.5">مسؤولو التواصل</th>
                      <th className="p-3.5 text-center">الخريطة</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                    {filteredBranches.map((b) => {
                      const validContacts = (b.contacts || []).filter(c => c && (c.phone || c.name));
                      return (
                        <tr key={b.id} className="hover:bg-amber-50/30 transition">
                          <td className="p-3.5 align-top">
                            <strong className="text-slate-900 text-xs sm:text-sm block">{b.name}</strong>
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                              {b.city} ({b.regionCategory})
                            </span>
                          </td>
                          <td className="p-3.5 align-top max-w-xs font-bold text-slate-800 leading-snug">
                            {b.address}
                            {b.directions && b.directions.trim() && (
                              <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                                🧭 {b.directions}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 align-top font-bold text-slate-900">
                            <div>🗓️ {b.days.join(" - ")}</div>
                            {b.workingHours && b.workingHours.trim() && (
                              <div className="text-[11px] text-slate-600 font-normal mt-0.5">⏰ {b.workingHours}</div>
                            )}
                          </td>
                          <td className="p-3.5 align-top">
                            {validContacts.length > 0 ? (
                              <div className="space-y-1">
                                {validContacts.map((c, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <span>{c.name || "مسؤول"}:</span>
                                    {c.phone && (
                                      <a href={`tel:${c.phone}`} className="text-emerald-700 hover:underline font-mono text-xs">
                                        {c.phone}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">متاح عبر الاستمارة</span>
                            )}
                          </td>
                          <td className="p-3.5 align-top text-center">
                            {b.mapUrl && b.mapUrl.trim() ? (
                              <a
                                href={b.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200"
                              >
                                <MapPin className="w-3 h-3 text-rose-600" />
                                <span>الموقع</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3.5 align-top text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedBranchForDetails(b)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                              >
                                عرض
                              </button>
                              {isAdminUnlocked && (
                                <>
                                  <button
                                    onClick={() => onRequestAuth("edit", b)}
                                    className="p-1 text-slate-400 hover:text-amber-600"
                                    title="تعديل"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onRequestAuth("delete", b)}
                                    className="p-1 text-slate-400 hover:text-rose-600"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW C: MATRIX */}
          {viewMode === "matrix" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                      <th className="p-3 font-bold">اسم الفرع</th>
                      <th className="p-3 font-bold">المحافظة</th>
                      {DAYS_OF_WEEK.map((d) => (
                        <th key={d} className={`p-3 text-center font-bold ${d === todayArabic ? "bg-amber-100 text-amber-900" : ""}`}>
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBranches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{b.name}</td>
                        <td className="p-3 text-slate-600">{b.city}</td>
                        {DAYS_OF_WEEK.map((day) => {
                          const isOpen = b.days?.includes(day);
                          return (
                            <td key={day} className={`p-3 text-center ${day === todayArabic ? "bg-amber-50/40" : ""}`}>
                              {isOpen ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedBranchForDetails && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="fixed inset-0" onClick={() => setSelectedBranchForDetails(null)} />
          <div className="relative bg-white border border-slate-200 rounded-xl sm:rounded-2xl max-w-sm sm:max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 p-3 shrink-0 bg-slate-50">
              <div>
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">
                  {selectedBranchForDetails.regionCategory} • محافظة {selectedBranchForDetails.city}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  {selectedBranchForDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBranchForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-3 sm:p-4 space-y-2 overflow-y-auto flex-1 text-[10px] sm:text-[11px] scrollbar-thin">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold text-slate-700 block">العنوان ومقر الفرع:</span>
                <p className="text-[11px] text-slate-900 font-bold leading-relaxed">
                  {selectedBranchForDetails.address}
                </p>
                {selectedBranchForDetails.directions && selectedBranchForDetails.directions.trim() && (
                  <p className="text-[10px] text-slate-600 font-medium pt-1 border-t border-slate-200">
                    🧭 علامة مميزة: {selectedBranchForDetails.directions}
                  </p>
                )}
                {selectedBranchForDetails.floor && selectedBranchForDetails.floor.trim() && (
                  <p className="text-[10px] text-slate-600 font-medium">
                    🏢 المقر: {selectedBranchForDetails.floor}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedBranchForDetails.days && selectedBranchForDetails.days.length > 0 && (
                  <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold text-amber-900 block mb-0.5">أيام العمل:</span>
                    <p className="text-[10px] font-bold text-slate-900">
                      {selectedBranchForDetails.days.join(" - ")}
                    </p>
                  </div>
                )}

                {selectedBranchForDetails.workingHours && selectedBranchForDetails.workingHours.trim() && (
                  <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold text-amber-900 block mb-0.5">المواعيد الرسمية:</span>
                    <p className="text-[10px] font-bold text-slate-900">
                      {selectedBranchForDetails.workingHours}
                    </p>
                  </div>
                )}
              </div>

              {/* Contacts in Modal - only show if populated */}
              {((selectedBranchForDetails.contacts || []).filter(c => c && (c.phone || c.name)).length > 0) && (
                <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200 space-y-1">
                  <span className="text-[9.5px] font-bold text-amber-900 block">أرقام ومسؤولو التواصل:</span>
                  <div className="space-y-1">
                    {selectedBranchForDetails.contacts.filter(c => c && (c.phone || c.name)).map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-amber-100">
                        <span className="font-bold text-slate-900 text-[10px]">
                          {c.name || "مسؤول"} {c.role && `(${c.role})`}
                        </span>
                        <div className="flex items-center gap-1">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold text-[10px]">
                              {c.phone}
                            </a>
                          )}
                          {(c.whatsapp || c.phone) && (
                            <a
                              href={`https://wa.me/2${(c.whatsapp || c.phone).replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9.5px]"
                            >
                              واتساب
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBranchForDetails.notes && selectedBranchForDetails.notes.trim() && (
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[9.5px] text-slate-700 font-medium">
                  💡 {selectedBranchForDetails.notes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => handleCopyBranchInfo(selectedBranchForDetails)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[10.5px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Copy className="w-3 h-3 text-amber-600" />
                <span>نسخ التفاصيل</span>
              </button>

              <button
                onClick={() => setSelectedBranchForDetails(null)}
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
