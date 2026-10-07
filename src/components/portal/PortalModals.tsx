import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Lock, Trash2, Plus, Building2, Phone, MapPin, Calendar, Clock } from "lucide-react";
import { 
  Specialization, 
  AccreditationItem, 
  StudySystemItem 
} from "../../data/academyPortalData";
import { 
  Branch, 
  ContactPerson, 
  DAYS_OF_WEEK, 
  REGION_CATEGORIES, 
  checkAdminPasscode 
} from "../../data/branchesData";
import toast from "react-hot-toast";

// ==========================================
// 1. Passcode Auth Modal
// ==========================================
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  academyScope?: "apex" | "trust" | "salam" | "refaq" | "general";
  academyName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = "التحقق من صلاحية الإدارة",
  academyScope,
  academyName
}) => {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasscode("");
      setError(false);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAdminPasscode(passcode, academyScope)) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      toast.error("رمز المرور غير صحيح");
    }
  };

  const getPlaceholder = () => {
    if (academyScope === "apex") return "مثال: ابيكس 2026";
    if (academyScope === "salam") return "مثال: السلام 2026";
    if (academyScope === "trust") return "مثال: تراست 2026";
    if (academyScope === "refaq") return "مثال: الرفاق 2026";
    return "أدخل رمز المرور الإداري...";
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 max-w-xs sm:max-w-sm w-full shadow-2xl space-y-2.5 text-right z-10 overflow-hidden my-auto mx-auto" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Lock className="w-3 h-3" />
            </div>
            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900">{actionTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10.5px] text-slate-600 leading-relaxed">
          هذا الإجراء محمي بصلاحية الإدارة {academyName ? `لـ (${academyName})` : ""}، يرجى إدخال رمز المرور الإداري:
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              placeholder="أدخل رمز المرور الإداري..."
              autoFocus
              className={`w-full px-3 py-1.5 rounded-xl bg-slate-50 border text-center text-xs font-bold text-slate-900 focus:outline-none focus:bg-white transition ${
                error ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 focus:border-amber-500"
              }`}
            />
            {error && (
              <p className="text-[9.5px] text-rose-600 font-bold mt-1 text-center">
                رمز المرور غير صحيح، يرجى المحاولة مجدداً.
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-black transition shadow-xs"
            >
              تأكيد الصلاحية
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ==========================================
// 2. Branch Form Modal (Add / Edit)
// ==========================================
interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (branch: Branch) => void;
  branchToEdit?: Branch | null;
}

export const BranchFormModal: React.FC<BranchFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  branchToEdit
}) => {
  const [formData, setFormData] = useState<Branch>({
    id: "",
    name: "",
    city: "القاهرة",
    regionCategory: "القاهرة الكبرى",
    address: "",
    directions: "",
    floor: "",
    mapUrl: "",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "من 9:00 صباحاً حتى 5:00 مساءً",
    contacts: [],
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (branchToEdit) {
        setFormData({
          ...branchToEdit,
          contacts: branchToEdit.contacts || []
        });
      } else {
        setFormData({
          id: "branch_" + Date.now(),
          name: "",
          city: "القاهرة",
          regionCategory: "القاهرة الكبرى",
          address: "",
          directions: "",
          floor: "",
          mapUrl: "",
          days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
          workingHours: "من 9:00 صباحاً حتى 5:00 مساءً",
          contacts: [{ id: "c1", name: "", phone: "", whatsapp: "", role: "مسؤول الاستقبال والتسجيل" }],
          notes: ""
        });
      }
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [branchToEdit, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleToggleDay = (day: string) => {
    const nextDays = formData.days.includes(day)
      ? formData.days.filter((d) => d !== day)
      : [...formData.days, day];
    setFormData({ ...formData, days: nextDays });
  };

  const handleContactChange = (index: number, field: keyof ContactPerson, val: string) => {
    const nextContacts = [...formData.contacts];
    nextContacts[index] = { ...nextContacts[index], [field]: val };
    setFormData({ ...formData, contacts: nextContacts });
  };

  const handleAddContact = () => {
    setFormData({
      ...formData,
      contacts: [
        ...formData.contacts,
        { id: "c_" + Date.now(), name: "", phone: "", whatsapp: "", role: "مسؤول التواصل" }
      ]
    });
  };

  const handleRemoveContact = (index: number) => {
    setFormData({
      ...formData,
      contacts: formData.contacts.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يرجى كتابة اسم الفرع");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("يرجى كتابة عنوان الفرع");
      return;
    }
    // Clean up empty contacts
    const cleanedContacts = formData.contacts.filter(c => c.name.trim() || c.phone.trim());
    onSave({
      ...formData,
      contacts: cleanedContacts,
      id: formData.id || "branch_" + Date.now()
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm sm:max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto" dir="rtl">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-[13px] font-black text-slate-900">
              {branchToEdit ? "تعديل بيانات الفرع" : "إضافة فرع جديد للأكاديمية"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form id="branch-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2.5 text-[10px] sm:text-[11px] scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">اسم الفرع *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: فرع مدينة نصر / القاهرة"
                required
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 transition"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">المحافظة *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="مثال: القاهرة"
                required
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">المنطقة الإقليمية *</label>
            <select
              value={formData.regionCategory}
              onChange={(e) => setFormData({ ...formData, regionCategory: e.target.value as any })}
              className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 transition cursor-pointer"
            >
              {REGION_CATEGORIES.filter(r => r !== "الكل").map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">العنوان التفصيلي *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="اكتب العنوان بالتفصيل..."
              required
              className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">علامة مميزة (اختياري)</label>
              <input
                type="text"
                value={formData.directions || ""}
                onChange={(e) => setFormData({ ...formData, directions: e.target.value })}
                placeholder="مثال: بجوار محطة المترو"
                className="w-full px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 transition"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">مواعيد العمل *</label>
              <input
                type="text"
                value={formData.workingHours}
                onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                placeholder="مثال: من 9:00 ص حتى 5:00 م"
                required
                className="w-full px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-1">أيام العمل الأسبوعية:</label>
            <div className="flex flex-wrap gap-1">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => handleToggleDay(d)}
                  className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border transition ${
                    formData.days.includes(d)
                      ? "bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black text-slate-800">أرقام ومسؤولو التواصل بالفرع:</span>
              <button
                type="button"
                onClick={handleAddContact}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[9px] font-bold transition flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>إضافة رقم / مسؤول</span>
              </button>
            </div>

            {formData.contacts.map((c, idx) => (
              <div key={idx} className="p-1.5 bg-white rounded-lg border border-slate-200 space-y-1 relative">
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => handleContactChange(idx, "name", e.target.value)}
                    placeholder="اسم المسؤول / الصفة"
                    className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-900"
                  />
                  <input
                    type="text"
                    value={c.phone}
                    onChange={(e) => handleContactChange(idx, "phone", e.target.value)}
                    placeholder="رقم الهاتف"
                    className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={c.whatsapp || ""}
                    onChange={(e) => handleContactChange(idx, "whatsapp", e.target.value)}
                    placeholder="رقم الواتساب (اختياري)"
                    className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-900"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={c.role || ""}
                      onChange={(e) => handleContactChange(idx, "role", e.target.value)}
                      placeholder="المسمى الوظيفي"
                      className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-900 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(idx)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50"
                      title="حذف هذا المسؤول"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">ملاحظات إضافية (اختياري)</label>
            <textarea
              rows={2}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="اكتب أي تعليمات أو تفاصيل أخرى..."
              className="w-full px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 transition"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-2 sm:p-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 shrink-0 bg-slate-50/90">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="branch-form"
            className="px-4 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-black transition shadow-xs"
          >
            حفظ الفرع
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==========================================
// 3. Specialization Form Modal
// ==========================================
interface SpecializationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spec: Specialization) => void;
  initialData?: Specialization | null;
  isApex?: boolean;
}

export const SpecializationFormModal: React.FC<SpecializationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isApex = false
}) => {
  const [formData, setFormData] = useState<Specialization>({
    id: "",
    name: "",
    category: "طبي وتمريض",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    feesPerTerm: "",
    totalFees: "",
    installmentDetails: "",
    jobTitle: "",
    requirements: " الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50% ",
    description: "",
    workplaces: "",
    availableInBranch: isApex ? "جميع الفروع (القاهرة والاسكندرية)" : ""
  });

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          id: "spec_" + Date.now(),
          name: "",
          category: "طبي وتمريض",
          duration: "سنتين مكثفين  من 12 الي 14 شهر (4 فصول)",
          feesPerTerm: "",
          totalFees: "",
          installmentDetails: "",
          jobTitle: "",
          requirements: " الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50% ",
          description: "",
          workplaces: "",
          availableInBranch: isApex ? "جميع الفروع (القاهرة والاسكندرية)" : ""
        });
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [initialData, isOpen, isApex]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يرجى كتابة اسم التخصص");
      return;
    }
    onSave({
      ...formData,
      id: formData.id || "spec_" + Date.now()
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="fixed inset-0" onClick={onClose} />
      <div 
        className="relative bg-white border border-slate-200 rounded-2xl max-w-sm sm:max-w-md w-full max-h-[82vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto" 
        dir="rtl"
      >
        {/* Fixed Header */}
        <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-xs sm:text-[13px] font-black text-slate-900">
            {initialData ? "تعديل بيانات التخصص" : "إضافة تخصص جديد"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="spec-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 space-y-2 text-[10px] sm:text-[10.5px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">اسم التخصص *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: فني تمريض ورعاية صحية"
                required
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">القسم والتصنيف *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="طبي وتمريض">طبي وتمريض</option>
                <option value="هندسي وفني">هندسي وفني</option>
                <option value="تكنولوجي وحاسبات">تكنولوجي وحاسبات</option>
                <option value="إداري ولغات">إداري ولغات</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
          </div>

          {/* Branch Availability for Apex College */}
          {isApex && (
            <div className="p-2 bg-indigo-50/90 rounded-xl border border-indigo-200/90 space-y-1">
              <label className="text-[9.5px] font-black text-indigo-950 block">
                📍 متاح في فرع (خاص بأكاديمية أبيكس كولج):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <select
                  value={
                    ["جميع الفروع (القاهرة والاسكندرية)", "فرع الاسكندرية (الاسكندرية) فقط", "فرع القاهرة / الجيزة (القاهرة) فقط"].includes(formData.availableInBranch || "")
                      ? formData.availableInBranch
                      : "custom"
                  }
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setFormData({ ...formData, availableInBranch: e.target.value });
                    }
                  }}
                  className="w-full px-2.5 py-1 rounded-lg bg-white border border-indigo-300 text-xs font-bold text-indigo-950 focus:border-indigo-600 transition cursor-pointer"
                >
                  <option value="جميع الفروع (القاهرة والاسكندرية)">جميع الفروع (القاهرة والاسكندرية)</option>
                  <option value="فرع الاسكندرية (الاسكندرية) فقط">فرع الاسكندرية (الاسكندرية) فقط</option>
                  <option value="فرع القاهرة / الجيزة (القاهرة) فقط">فرع القاهرة / الجيزة (القاهرة) فقط</option>
                  <option value="custom">فرع آخر / كتابة يدوية...</option>
                </select>

                <input
                  type="text"
                  value={formData.availableInBranch || ""}
                  onChange={(e) => setFormData({ ...formData, availableInBranch: e.target.value })}
                  placeholder="اسم الفرع (مثال: فرع القاهرة فقط)"
                  className="w-full px-2.5 py-1 rounded-lg bg-white border border-indigo-300 text-xs font-bold text-indigo-950 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">مدة الدراسة *</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="مثال: سنتين مكثفين  من 12 الي 14 شهر (4 فصول)"
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">المسمى الوظيفي وكارنيه المزاولة</label>
              <input
                type="text"
                value={formData.jobTitle || ""}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="مثال: أخصائي تمريض مساعد / فني تحاليل"
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Fees Box */}
          <div className="p-2 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
            <h4 className="text-[9.5px] font-black text-amber-900">المصروفات المالية ونظام الأقساط:</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div>
                <label className="text-[8.5px] font-bold text-slate-700 block mb-0.5">مصروفات الترم / السنة</label>
                <input
                  type="text"
                  value={formData.feesPerTerm || ""}
                  onChange={(e) => setFormData({ ...formData, feesPerTerm: e.target.value })}
                  placeholder="مثال: 4,500 ج للترم الأول"
                  className="w-full px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-[8.5px] font-bold text-slate-700 block mb-0.5">إجمالي المصروفات</label>
                <input
                  type="text"
                  value={formData.totalFees || ""}
                  onChange={(e) => setFormData({ ...formData, totalFees: e.target.value })}
                  placeholder="مثال: 9,000 ج للسنة الدراسية"
                  className="w-full px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[8.5px] font-bold text-slate-700 block mb-0.5">تفاصيل ونظام الأقساط</label>
              <input
                type="text"
                value={formData.installmentDetails || ""}
                onChange={(e) => setFormData({ ...formData, installmentDetails: e.target.value })}
                placeholder="مثال: مقدم 1500 ج والباقي أقساط شهرية مريحة"
                className="w-full px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">نبذة عن التخصص وما يتعلمه الطالب</label>
            <textarea
              rows={2}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="اكتب شرحاً وافياً عن التخصص..."
              className="w-full px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 transition"
            />
          </div>

          {/* Workplaces */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">مجالات وأماكن العمل بعد التخرج</label>
            <textarea
              rows={2}
              value={formData.workplaces || ""}
              onChange={(e) => setFormData({ ...formData, workplaces: e.target.value })}
              placeholder="مثال: المستشفيات، المراكز الطبية، معامل التحاليل..."
              className="w-full px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 transition"
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">شروط القبول والتنسيق</label>
            <textarea
              rows={2}
              value={formData.requirements || ""}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="مثال: حاصل علي الثانوية العامة او الازهرية او الدبلومات الفنية بمجموع 50%..."
              className="w-full px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 transition"
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="p-2 sm:p-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 shrink-0 bg-slate-50/90">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="spec-form"
            className="px-3.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-black transition shadow-xs"
          >
            حفظ بيانات التخصص
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==========================================
// 4. Accreditation Form Modal
// ==========================================
interface AccreditationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: AccreditationItem) => void;
  initialData?: AccreditationItem | null;
}

export const AccreditationFormModal: React.FC<AccreditationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<AccreditationItem>({
    id: "",
    title: "",
    grantingBody: "وزارة الخارجية المصرية",
    certificateType: "شهادة دبلومة تدريبية معتمدة",
    authenticationDetails: "",
    benefits: [""],
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          id: "acc_" + Date.now(),
          title: "",
          grantingBody: "وزارة الخارجية المصرية",
          certificateType: "شهادة دبلومة تدريبية معتمدة",
          authenticationDetails: "",
          benefits: ["إمكانية تغيير المسمى الوظيفي في بطاقة الرقم القومي", "توثيق الشهادة للسفر والعمل بالخارج"],
          notes: ""
        });
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [initialData, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleBenefitChange = (index: number, val: string) => {
    const next = [...formData.benefits];
    next[index] = val;
    setFormData({ ...formData, benefits: next });
  };

  const handleAddBenefit = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, ""] });
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("يرجى كتابة اسم الاعتماد أو الشهادة");
      return;
    }
    const cleanBenefits = formData.benefits.filter((b) => b && b.trim());
    onSave({
      ...formData,
      benefits: cleanBenefits,
      id: formData.id || "acc_" + Date.now()
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm sm:max-w-md w-full max-h-[82vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto" dir="rtl">
        {/* Fixed Header */}
        <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-xs sm:text-[13px] font-black text-slate-900">
            {initialData ? "تعديل بيانات الاعتماد" : "إضافة اعتماد أو توثيق رسمي"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="acc-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 space-y-2 text-[10px] sm:text-[10.5px]">
          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">اسم الاعتماد أو الشهادة *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="مثال: شهادة دبلومة التمريض المعتمدة مع توثيق الخارجية"
              required
              className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">الجهة المانحة / الشريك *</label>
              <input
                type="text"
                value={formData.grantingBody}
                onChange={(e) => setFormData({ ...formData, grantingBody: e.target.value })}
                placeholder="مثال: جامعة القاهرة / المركز القومي"
                required
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">نوع الشهادة *</label>
              <input
                type="text"
                value={formData.certificateType}
                onChange={(e) => setFormData({ ...formData, certificateType: e.target.value })}
                placeholder="مثال: شهادة مهنية معتمدة"
                required
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">تفاصيل الأختام والتوثيق الحكومي</label>
            <textarea
              rows={2}
              value={formData.authenticationDetails}
              onChange={(e) => setFormData({ ...formData, authenticationDetails: e.target.value })}
              placeholder="اكتب تفاصيل الأختام وتوثيق الخارجية أو المزاولة..."
              className="w-full px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          {/* Benefits */}
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-slate-700">المميزات المكتسبة من الاعتماد:</span>
              <button
                type="button"
                onClick={handleAddBenefit}
                className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[9px] font-bold transition flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>إضافة ميزة</span>
              </button>
            </div>

            {formData.benefits.map((b, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input
                  type="text"
                  value={b}
                  onChange={(e) => handleBenefitChange(idx, e.target.value)}
                  placeholder={`ميزة رقم ${idx + 1}...`}
                  className="flex-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-blue-500 transition"
                />
                {formData.benefits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">ملاحظات إضافية (اختياري)</label>
            <input
              type="text"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="مثال: رسوم التوثيق مشمولة في المصروفات"
              className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="p-2 sm:p-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 shrink-0 bg-slate-50/90">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="acc-form"
            className="px-3.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10.5px] font-black transition shadow-xs"
          >
            حفظ الاعتماد
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==========================================
// 5. Study System Form Modal
// ==========================================
interface StudySystemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: StudySystemItem) => void;
  initialData?: StudySystemItem | null;
}

export const StudySystemFormModal: React.FC<StudySystemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<StudySystemItem>({
    id: "",
    title: "",
    type: "practical",
    description: "",
    details: [""],
    scheduleNotes: ""
  });

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          id: "study_" + Date.now(),
          title: "",
          type: "practical",
          description: "",
          details: ["تدريب عملي بالمستشفيات العامة والخاصة", "إشراف نخبة من الأطباء والاستشاريين"],
          scheduleNotes: ""
        });
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [initialData, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleDetailChange = (index: number, val: string) => {
    const next = [...formData.details];
    next[index] = val;
    setFormData({ ...formData, details: next });
  };

  const handleAddDetail = () => {
    setFormData({ ...formData, details: [...formData.details, ""] });
  };

  const handleRemoveDetail = (index: number) => {
    setFormData({
      ...formData,
      details: formData.details.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("يرجى كتابة عنوان البند");
      return;
    }
    const cleanDetails = formData.details.filter((d) => d && d.trim());
    onSave({
      ...formData,
      details: cleanDetails,
      id: formData.id || "study_" + Date.now()
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl max-w-sm sm:max-w-md w-full max-h-[82vh] flex flex-col shadow-2xl z-10 text-right overflow-hidden my-auto mx-auto" dir="rtl">
        {/* Fixed Header */}
        <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-xs sm:text-[13px] font-black text-slate-900">
            {initialData ? "تعديل بند نظام الدراسة" : "إضافة بند جديد لنظام الدراسة"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="study-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 space-y-2 text-[10px] sm:text-[10.5px]">
          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">عنوان البند *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="مثال: التدريب العملي بالمستشفيات والمعامل"
              required
              className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">التصنيف والنوع *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 transition cursor-pointer"
              >
                <option value="attendance">الحضور والمحاضرات</option>
                <option value="practical">التدريب العملي والمستشفيات</option>
                <option value="exams">الامتحانات والتقييم</option>
                <option value="online">التعليم عن بعد (أونلاين)</option>
                <option value="general">اللوائح العامة ونظام الدراسة</option>
              </select>
            </div>

            <div>
              <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">ملاحظات المواعيد والجدول</label>
              <input
                type="text"
                value={formData.scheduleNotes || ""}
                onChange={(e) => setFormData({ ...formData, scheduleNotes: e.target.value })}
                placeholder="مثال: الجمعة والسبت فقط للموظفين"
                className="w-full px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[9.5px] font-bold text-slate-700 block mb-0.5">الشرح العام للبند</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="اكتب شرحاً وافياً عن نظام التدريب أو الحضور..."
              className="w-full px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-purple-500 transition"
            />
          </div>

          {/* Details Points */}
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-slate-700">النقاط والتفاصيل الإجرائية:</span>
              <button
                type="button"
                onClick={handleAddDetail}
                className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 text-[9px] font-bold transition flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>إضافة نقطة</span>
              </button>
            </div>

            {formData.details.map((d, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input
                  type="text"
                  value={d}
                  onChange={(e) => handleDetailChange(idx, e.target.value)}
                  placeholder={`نقطة تفصيلية رقم ${idx + 1}...`}
                  className="flex-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-purple-500 transition"
                />
                {formData.details.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDetail(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="p-2 sm:p-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 shrink-0 bg-slate-50/90">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="study-form"
            className="px-3.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10.5px] font-black transition shadow-xs"
          >
            حفظ البند
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==========================================
// 6. Delete Confirm Modal
// ==========================================
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemTypeLabel?: string;
  itemType?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemTypeLabel,
  itemType
}) => {
  const displayType = itemType || itemTypeLabel || "العنصر";

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 max-w-xs sm:max-w-sm w-full shadow-2xl space-y-2.5 text-center z-10 overflow-hidden my-auto mx-auto" dir="rtl">
        <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <Trash2 className="w-3.5 h-3.5" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xs sm:text-[13px] font-black text-slate-900">تأكيد حذف {displayType}</h3>
          <p className="text-[10.5px] text-slate-600 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف <strong className="text-rose-700">({itemName})</strong> نهائياً؟
          </p>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            onClick={onClose}
            className="flex-1 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10.5px] font-bold text-slate-700 transition"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-black transition shadow-xs"
          >
            نعم، احذف
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
