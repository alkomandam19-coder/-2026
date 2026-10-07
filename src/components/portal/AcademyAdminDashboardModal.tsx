import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  ShieldCheck, 
  Building2, 
  GraduationCap, 
  Award, 
  BookOpen, 
  Plus, 
  Lock, 
  Eye, 
  EyeOff, 
  Settings2,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface AcademyAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyName: string;
  onAddBranch?: () => void;
  onAddSpecialization?: () => void;
  onAddAccreditation?: () => void;
  onAddStudySystem?: () => void;
  onLockAdmin: () => void;
  isLiveAdminMode: boolean;
  onToggleLiveAdminMode: () => void;
}

export const AcademyAdminDashboardModal: React.FC<AcademyAdminDashboardModalProps> = ({
  isOpen,
  onClose,
  academyName,
  onAddBranch,
  onAddSpecialization,
  onAddAccreditation,
  onAddStudySystem,
  onLockAdmin,
  isLiveAdminMode,
  onToggleLiveAdminMode
}) => {
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
      id="admin-dashboard-modal-overlay"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div 
        className="relative bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 text-right z-10 my-auto mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        id="admin-dashboard-modal-card"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>لوحة التحكم الإدارية</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  صلاحية كاملة 👑
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة محتوى: <strong className="text-slate-800 font-bold">{academyName}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-3">
          
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-amber-600" />
              <span>إجراءات الإضافة السريعة:</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              يمكنك إضافة أي عنصر جديد من هذه الأزرار ليتم حفظه تلقائياً وعرضه للزوار:
            </p>
          </div>

          {/* Quick Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* 1. Add Branch */}
            {onAddBranch && (
              <button
                onClick={() => {
                  onClose();
                  onAddBranch();
                }}
                className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-right transition flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black">إضافة فرع جديد</span>
                    <span className="block text-[10px] text-amber-700">مقر، مواعيد، أرقام تواصل</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* 2. Add Specialization */}
            {onAddSpecialization && (
              <button
                onClick={() => {
                  onClose();
                  onAddSpecialization();
                }}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-right transition flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white font-black">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black">إضافة تخصص ومصروفات</span>
                    <span className="block text-[10px] text-emerald-700">قسم، شروط، أقساط، مجالات عمل</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* 3. Add Accreditation */}
            {onAddAccreditation && (
              <button
                onClick={() => {
                  onClose();
                  onAddAccreditation();
                }}
                className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 text-right transition flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600 text-white font-black">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black">إضافة اعتماد وتوثيق</span>
                    <span className="block text-[10px] text-blue-700">شهادة، أختام، جهة مانحة</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* 4. Add Study System Item */}
            {onAddStudySystem && (
              <button
                onClick={() => {
                  onClose();
                  onAddStudySystem();
                }}
                className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-900 text-right transition flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-600 text-white font-black">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black">إضافة بند / ميزة دراسية</span>
                    <span className="block text-[10px] text-purple-700">نظام حضور، تدريب، شروط</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
              </button>
            )}

          </div>

          {/* Live On-Page Edit Toggle */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
            <div>
              <span className="block text-xs font-black text-slate-800">
                وضع الإدارة والتعديل المباشر على الصفحة
              </span>
              <span className="block text-[10.5px] text-slate-500">
                إظهار أزرار (تعديل ✏️ / حذف 🗑️) على كروت الفروع والتخصصات مباشرة
              </span>
            </div>

            <button
              onClick={onToggleLiveAdminMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                isLiveAdminMode
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              {isLiveAdminMode ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>مفعل 🟢</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>معطل ⚪</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onLockAdmin();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل لوحة التحكم والخروج</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            إغلاق والعودة للبوابة
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
