import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  BookOpen, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  X, 
  FileSpreadsheet, 
  Calendar, 
  CheckCircle2, 
  Hospital, 
  Laptop, 
  FileCheck, 
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { 
  StudySystemItem 
} from "../../data/academyPortalData";
import toast from "react-hot-toast";

interface StudySystemViewProps {
  studySystemItems: StudySystemItem[];
  onSave?: (items: StudySystemItem[]) => void;
  onRequestAuth: (action: "add" | "edit" | "delete", targetItem?: StudySystemItem) => void;
  isAdminUnlocked?: boolean;
}

const TYPE_CONFIG = {
  attendance: { label: "الحضور والمحاضرات", color: "bg-blue-50 text-blue-800 border-blue-200", icon: Calendar },
  practical: { label: "التدريب العملي والمستشفيات", color: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: Hospital },
  exams: { label: "الامتحانات والتقييم", color: "bg-amber-50 text-amber-800 border-amber-200", icon: FileCheck },
  online: { label: "التعليم عن بعد (أونلاين)", color: "bg-purple-50 text-purple-800 border-purple-200", icon: Laptop },
  general: { label: "اللوائح العامة ونظام الدراسة", color: "bg-slate-100 text-slate-800 border-slate-200", icon: Layers }
};

export const StudySystemView: React.FC<StudySystemViewProps> = ({
  studySystemItems,
  onRequestAuth,
  isAdminUnlocked = false
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("الكل");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItemForModal, setSelectedItemForModal] = useState<StudySystemItem | null>(null);

  // Filtered List
  const filteredItems = useMemo(() => {
    return studySystemItems.filter((item) => {
      if (selectedType !== "الكل" && item.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchDetails = item.details.some((d) => d.toLowerCase().includes(q));
        const matchSchedule = item.scheduleNotes?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc && !matchDetails && !matchSchedule) {
          return false;
        }
      }
      return true;
    });
  }, [studySystemItems, selectedType, searchQuery]);

  // Copy Info
  const handleCopyInfo = (item: StudySystemItem) => {
    const text = `📚 ${item.title}\n📌 التصنيف: ${TYPE_CONFIG[item.type]?.label || "نظام الدراسة"}\n📝 الشرح: ${item.description}\n📋 التفاصيل والبنود:\n${item.details.map((d) => `• ${d}`).join("\n")}${item.scheduleNotes ? `\n⏰ المواعيد والجدول: ${item.scheduleNotes}` : ""}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast.success(`تم نسخ تفاصيل (${item.title}) بنجاح`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (studySystemItems.length === 0) {
      toast.error("لا توجد بنود لنظام الدراسة للتصدير بعد");
      return;
    }
    const headers = ["البند / العنوان", "النوع والتصنيف", "الشرح العام", "التفاصيل والنقاط", "ملاحظات المواعيد والجدول"];
    const rows = studySystemItems.map((s) => [
      `"${s.title}"`,
      `"${TYPE_CONFIG[s.type]?.label || s.type}"`,
      `"${s.description}"`,
      `"${s.details.join(" | ")}"`,
      `"${s.scheduleNotes || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `نظام_الدراسة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف إكسيل نظام الدراسة بنجاح");
  };

  return (
    <div className="space-y-4" dir="rtl">
      
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>دليل نظام الدراسة والتدريب العملي واللوائح</span>
              <span className="bg-purple-50 text-purple-800 text-[10px] px-2 py-0.5 rounded-full border border-purple-200 font-mono font-bold">
                {studySystemItems.length} بنود
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              عرض مدمج لضوابط الحضور، التدريب العملي بالمستشفيات، والامتحانات.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 border border-slate-300 shadow-xs transition flex items-center gap-1"
              title="تصدير إكسيل"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">تصدير إكسيل</span>
            </button>

            {isAdminUnlocked && (
              <button
                onClick={() => onRequestAuth("add")}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black transition flex items-center gap-1 shadow-2xs hover:shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Category tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان، نظام الحضور، المستشفيات، الامتحانات..."
              className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-purple-500 focus:bg-white transition text-right"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
            <button
              onClick={() => setSelectedType("الكل")}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ${
                selectedType === "الكل"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              الكل
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ${
                  selectedType === key
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center mx-auto text-purple-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">
              {studySystemItems.length === 0 ? "لم يتم إضافة بنود لنظام الدراسة بعد" : "لا توجد بنود مطابقة للبحث"}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
              {studySystemItems.length === 0
                ? "يمكن للإدارة إضافة ضوابط الدراسة، التدريب بالمستشفيات، والامتحانات من لوحة التحكم."
                : "جرب تغيير كلمات البحث أو اختيار تبويب آخر."}
            </p>
          </div>

          {isAdminUnlocked && (
            <button
              onClick={() => onRequestAuth("add")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة بند جديد الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredItems.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.general;
            const Icon = cfg.icon;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 hover:border-purple-500 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden text-right"
              >
                {/* Top Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600" />

                <div className="space-y-2 pt-0.5">
                  {/* Category Pill Header */}
                  <div className="flex items-start justify-between gap-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border inline-flex items-center gap-1 ${cfg.color}`}>
                      <Icon className="w-2.5 h-2.5" />
                      <span>{cfg.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs sm:text-[12.5px] font-black text-slate-900 group-hover:text-purple-700 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  {/* Description - only show if populated */}
                  {item.description && item.description.trim() && (
                    <p className="text-[10px] text-slate-600 leading-snug">
                      {item.description}
                    </p>
                  )}

                  {/* Details Bullet List - only show if populated */}
                  {item.details && item.details.length > 0 && (
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                      {item.details.slice(0, 3).map((d, idx) => (
                        <div key={idx} className="flex items-start gap-1 text-[9px] font-bold text-slate-800 leading-snug">
                          <CheckCircle2 className="w-2.5 h-2.5 text-purple-600 shrink-0 mt-0.5" />
                          <span className="truncate">{d}</span>
                        </div>
                      ))}
                      {item.details.length > 3 && (
                        <span className="text-[8px] text-purple-700 font-bold block pt-0.2 pr-3.5">
                          + {item.details.length - 3} نقاط إضافية (اضغط عرض كامل)...
                        </span>
                      )}
                    </div>
                  )}

                  {/* Schedule Notes */}
                  {item.scheduleNotes && item.scheduleNotes.trim() && (
                    <div className="p-1.5 bg-purple-50/60 rounded-lg border border-purple-200/70 text-[9px] font-bold text-purple-900 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span>المواعيد: {item.scheduleNotes}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => handleCopyInfo(item)}
                    className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[9.5px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1"
                    title="نسخ تفاصيل البند"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-2.5 h-2.5 text-purple-600" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-purple-600" />
                    )}
                    <span>{copiedId === item.id ? "تم النسخ" : "نسخ"}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedItemForModal(item)}
                      className="px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[9.5px] font-black transition shadow-2xs"
                    >
                      عرض كامل
                    </button>

                    {isAdminUnlocked && (
                      <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-0.5">
                        <button
                          onClick={() => onRequestAuth("edit", item)}
                          className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-slate-100 transition"
                          title="تعديل البند"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                        </button>

                        <button
                          onClick={() => onRequestAuth("delete", item)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                          title="حذف البند"
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

      {/* Details Modal */}
      {selectedItemForModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="fixed inset-0" onClick={() => setSelectedItemForModal(null)} />
          <div className="relative bg-white border border-slate-200 rounded-xl sm:rounded-2xl max-w-xs sm:max-w-sm w-full max-h-[82vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 p-2 sm:p-2.5 shrink-0 bg-slate-50">
              <div>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border inline-block mb-0.5 ${TYPE_CONFIG[selectedItemForModal.type]?.color || ""}`}>
                  {TYPE_CONFIG[selectedItemForModal.type]?.label || "نظام الدراسة"}
                </span>
                <h3 className="text-xs sm:text-[12.5px] font-black text-slate-900 leading-snug">
                  {selectedItemForModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-2 sm:p-2.5 space-y-1.5 overflow-y-auto flex-1 text-[9.5px] sm:text-[10px]">
              {selectedItemForModal.description && selectedItemForModal.description.trim() && (
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[8.5px] font-bold text-slate-700 block">الشرح العام للبند:</span>
                  <p className="text-[9.5px] text-slate-900 font-bold leading-relaxed">
                    {selectedItemForModal.description}
                  </p>
                </div>
              )}

              {selectedItemForModal.details && selectedItemForModal.details.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[8.5px] font-bold text-slate-700 block">النقاط والتفاصيل الإجرائية:</span>
                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    {selectedItemForModal.details.map((d, idx) => (
                      <div key={idx} className="flex items-start gap-1 text-[9px] font-bold text-slate-900 leading-snug">
                        <CheckCircle2 className="w-2.5 h-2.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItemForModal.scheduleNotes && selectedItemForModal.scheduleNotes.trim() && (
                <div className="p-1.5 bg-purple-50/70 rounded-lg border border-purple-200 text-[8.5px] text-purple-900 font-medium">
                  ⏰ {selectedItemForModal.scheduleNotes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-1.5 sm:p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
              <button
                onClick={() => handleCopyInfo(selectedItemForModal)}
                className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[9.5px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1"
              >
                <Copy className="w-2.5 h-2.5 text-purple-600" />
                <span>نسخ التفاصيل</span>
              </button>

              <button
                onClick={() => setSelectedItemForModal(null)}
                className="px-3 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[9.5px] font-bold transition"
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
