import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Award, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  X, 
  FileSpreadsheet, 
  ShieldCheck, 
  Stamp, 
  FileText, 
  Globe, 
  CheckCircle2,
  Sparkles,
  Info
} from "lucide-react";
import { 
  AccreditationItem 
} from "../../data/academyPortalData";
import toast from "react-hot-toast";

interface AccreditationsViewProps {
  accreditations: AccreditationItem[];
  onSave?: (items: AccreditationItem[]) => void;
  onRequestAuth: (action: "add" | "edit" | "delete", targetItem?: AccreditationItem) => void;
  isAdminUnlocked?: boolean;
}

export const AccreditationsView: React.FC<AccreditationsViewProps> = ({
  accreditations,
  onRequestAuth,
  isAdminUnlocked = false
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItemForModal, setSelectedItemForModal] = useState<AccreditationItem | null>(null);

  // Filtered List
  const filteredItems = useMemo(() => {
    return accreditations.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchBody = item.grantingBody.toLowerCase().includes(q);
        const matchType = item.certificateType.toLowerCase().includes(q);
        const matchAuth = item.authenticationDetails.toLowerCase().includes(q);
        const matchBenefits = item.benefits.some((b) => b.toLowerCase().includes(q));
        if (!matchTitle && !matchBody && !matchType && !matchAuth && !matchBenefits) {
          return false;
        }
      }
      return true;
    });
  }, [accreditations, searchQuery]);

  // Copy Info
  const handleCopyInfo = (item: AccreditationItem) => {
    const text = `📜 ${item.title}\n🏛️ الجهة المانحة: ${item.grantingBody}\n📄 نوع الشهادة: ${item.certificateType}\n🔏 تفاصيل التوثيق والأختام: ${item.authenticationDetails}\n✨ المميزات المعتمدة:\n${item.benefits.map((b) => `• ${b}`).join("\n")}${item.notes ? `\n💡 ملاحظات: ${item.notes}` : ""}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast.success(`تم نسخ تفاصيل (${item.title}) بنجاح`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (accreditations.length === 0) {
      toast.error("لا توجد بيانات اعتمادات للتصدير بعد");
      return;
    }
    const headers = ["الاعتماد والشهادة", "الجهة المانحة", "نوع الشهادة", "تفاصيل التوثيق والأختام", "المميزات", "ملاحظات"];
    const rows = accreditations.map((a) => [
      `"${a.title}"`,
      `"${a.grantingBody}"`,
      `"${a.certificateType}"`,
      `"${a.authenticationDetails}"`,
      `"${a.benefits.join(" | ")}"`,
      `"${a.notes || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `اعتمادات_وشهادات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير ملف إكسيل الاعتمادات بنجاح");
  };

  return (
    <div className="space-y-4" dir="rtl">
      
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>دليل الاعتمادات والشهادات والتوثيقات الرسمية</span>
              <span className="bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded-full border border-blue-200 font-mono font-bold">
                {accreditations.length} اعتماد
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              عرض مدمج للجهات المانحة، وتوثيق الخارجية، وكارنيهات مزاولة المهنة.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 border border-slate-300 shadow-xs transition flex items-center gap-1"
              title="تصدير إكسيل"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">تصدير إكسيل</span>
            </button>

            {isAdminUnlocked && (
              <button
                onClick={() => onRequestAuth("add")}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black transition flex items-center gap-1 shadow-2xs hover:shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة اعتماد</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative pt-2 border-t border-slate-100">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الاعتماد، الجهة المانحة، الأختام والتوثيق، المميزات..."
            className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition text-right"
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
      </div>

      {/* Accreditations List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
            <Award className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">
              {accreditations.length === 0 ? "لم يتم إضافة اعتمادات بعد" : "لا توجد اعتمادات مطابقة للبحث"}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
              {accreditations.length === 0
                ? "يمكن للإدارة إضافة بنود الاعتماد والأختام الرسمية من لوحة التحكم."
                : "جرب تغيير كلمات البحث لعرض كافة بنود الاعتماد."}
            </p>
          </div>

          {isAdminUnlocked && (
            <button
              onClick={() => onRequestAuth("add")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة اعتماد جديد الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden text-right"
            >
              {/* Top Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />

              <div className="space-y-2 pt-0.5">
                {/* Granting Body badge */}
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 inline-block">
                    🏛️ {item.grantingBody}
                  </span>
                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                    {item.certificateType}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xs sm:text-[12.5px] font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                  {item.title}
                </h3>

                {/* Authentication & Seals */}
                {item.authenticationDetails && item.authenticationDetails.trim() && (
                  <div className="p-1.5 bg-blue-50/40 rounded-lg border border-blue-200/70 space-y-0.5">
                    <span className="text-[8.5px] font-bold text-blue-900 block flex items-center gap-1">
                      <Stamp className="w-2.5 h-2.5 text-blue-600" />
                      <span>التوثيق والأختام الرسمية:</span>
                    </span>
                    <p className="text-[9.5px] text-slate-900 font-bold leading-relaxed">
                      {item.authenticationDetails}
                    </p>
                  </div>
                )}

                {/* Benefits */}
                {item.benefits && item.benefits.length > 0 && (
                  <div className="space-y-0.5">
                    <span className="text-[8.5px] font-bold text-slate-500 block">المميزات المعتمدة:</span>
                    <div className="space-y-0.5">
                      {item.benefits.slice(0, 3).map((b, idx) => (
                        <p key={idx} className="text-[9px] font-bold text-slate-800 flex items-start gap-1 leading-snug">
                          <CheckCircle2 className="w-2.5 h-2.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="truncate">{b}</span>
                        </p>
                      ))}
                      {item.benefits.length > 3 && (
                        <span className="text-[8px] text-blue-700 font-bold block pt-0.2 pr-3.5">
                          + {item.benefits.length - 3} مميزات إضافية (اضغط عرض كامل)...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                <button
                  onClick={() => handleCopyInfo(item)}
                  className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[9.5px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1"
                  title="نسخ تفاصيل الاعتماد"
                >
                  {copiedId === item.id ? (
                    <Check className="w-2.5 h-2.5 text-blue-600" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-blue-600" />
                  )}
                  <span>{copiedId === item.id ? "تم النسخ" : "نسخ"}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedItemForModal(item)}
                    className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[9.5px] font-black transition shadow-2xs"
                  >
                    عرض كامل
                  </button>

                  {isAdminUnlocked && (
                    <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-0.5">
                      <button
                        onClick={() => onRequestAuth("edit", item)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-700 hover:bg-slate-100 transition"
                        title="تعديل الاعتماد"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>

                      <button
                        onClick={() => onRequestAuth("delete", item)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                        title="حذف الاعتماد"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
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
                <span className="text-[8.5px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 inline-block mb-0.5">
                  🏛️ {selectedItemForModal.grantingBody}
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
              <div className="p-1.5 bg-blue-50/50 rounded-lg border border-blue-200 space-y-0.5">
                <span className="text-[8px] font-bold text-blue-900 block">نوع الاعتماد / الشهادة:</span>
                <span className="text-[9.5px] font-bold text-slate-900">{selectedItemForModal.certificateType}</span>
              </div>

              {selectedItemForModal.authenticationDetails && selectedItemForModal.authenticationDetails.trim() && (
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[8.5px] font-bold text-slate-700 block flex items-center gap-1">
                    <Stamp className="w-2.5 h-2.5 text-blue-600" />
                    <span>التوثيق والأختام الرسمية:</span>
                  </span>
                  <p className="text-[9.5px] text-slate-900 font-bold leading-relaxed">
                    {selectedItemForModal.authenticationDetails}
                  </p>
                </div>
              )}

              {selectedItemForModal.benefits && selectedItemForModal.benefits.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[8.5px] font-bold text-slate-700 block">المميزات المكتسبة من الاعتماد:</span>
                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    {selectedItemForModal.benefits.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1 text-[9px] font-bold text-slate-900 leading-snug">
                        <CheckCircle2 className="w-2.5 h-2.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItemForModal.notes && selectedItemForModal.notes.trim() && (
                <div className="p-1.5 bg-amber-50/70 rounded-lg border border-amber-200 text-[8.5px] text-amber-900 font-medium">
                  💡 {selectedItemForModal.notes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-1.5 sm:p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
              <button
                onClick={() => handleCopyInfo(selectedItemForModal)}
                className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[9.5px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1"
              >
                <Copy className="w-2.5 h-2.5 text-blue-600" />
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
