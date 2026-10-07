import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Check, 
  Loader2, 
  Sparkles, 
  Ticket, 
  Phone, 
  GraduationCap, 
  FileCheck, 
  User, 
  MessageCircle, 
  MapPin, 
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { EGYPT_GOVERNORATES } from "../StudentBookingForm";
import { UNIFIED_EDUCATION_LEVELS } from "../../constants/educationLevels";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { supabase, hasSupabase } from "../../supabaseClient";

interface AcademyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyName: string;
  availableSpecializations?: { id: string; name: string }[];
  defaultSpecialization?: string;
  defaultDiscountCode?: string;
}

export const AcademyRegistrationModal: React.FC<AcademyRegistrationModalProps> = ({
  isOpen,
  onClose,
  academyName,
  availableSpecializations = [],
  defaultSpecialization = "",
  defaultDiscountCode = "AM2026"
}) => {
  const isSalam = Boolean(academyName && academyName.includes("السلام"));
  const [studentName, setStudentName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [educationLevel, setEducationLevel] = useState("خريج ثانوي عام");
  const [selectedDept, setSelectedDept] = useState(defaultSpecialization);
  const [customDept, setCustomDept] = useState("");
  const [discountCode] = useState("AM2026");
  const [complianceChecked, setComplianceChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReservation, setSuccessReservation] = useState<any | null>(null);

  // Sync default specialization when changed
  useEffect(() => {
    if (defaultSpecialization) {
      setSelectedDept(defaultSpecialization);
    } else if (availableSpecializations.length > 0 && !selectedDept) {
      setSelectedDept(availableSpecializations[0].name);
    }
  }, [defaultSpecialization, availableSpecializations]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setError(null);
      setSuccessReservation(null);
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const isPhoneValid = (num: string) => {
    const clean = num.replace(/\D/g, "");
    return clean.length === 11 && (clean.startsWith("010") || clean.startsWith("011") || clean.startsWith("012") || clean.startsWith("015"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!studentName.trim()) {
      setError("يرجى إدخال اسم الطالب ثلاثي أو رباعي.");
      return;
    }
    if (studentName.trim().split(" ").length < 2) {
      setError("يرجى إدخال اسم الطالب ثنائياً أو ثلاثياً على الأقل.");
      return;
    }
    if (!phoneNumber.trim() || !isPhoneValid(phoneNumber)) {
      setError("يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015.");
      return;
    }
    if (!whatsappNumber.trim() || !isPhoneValid(whatsappNumber)) {
      setError("يرجى إدخال رقم واتساب صحيح لتلقي إشعار القبول والأوراق المطلوبة.");
      return;
    }
    if (!governorate.trim()) {
      setError("يرجى اختيار المحافظة.");
      return;
    }
    if (!graduationYear.trim()) {
      setError("يرجى تحديد سنة التخرج.");
      return;
    }
    if (!educationLevel.trim()) {
      setError("يرجى اختيار المؤهل الدراسي.");
      return;
    }

    const finalSpecialization = customDept.trim() || selectedDept.trim() || "تخصص عام معتمد";
    if (!finalSpecialization) {
      setError("يرجى اختيار أو كتابة التخصص المراد التسجيل به.");
      return;
    }

    if (!complianceChecked) {
      setError("يرجى الإقرار بصحة البيانات والموافقة أولاً لتأكيد الحجز.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const cleanWa = whatsappNumber.replace(/\D/g, "");

      const payload = {
        studentName: studentName.trim(),
        phoneNumber: cleanPhone,
        whatsappNumber: cleanWa,
        graduationYear: graduationYear.trim(),
        governorate: governorate.trim(),
        educationLevel,
        selectedDepartments: [finalSpecialization],
        specialization: finalSpecialization,
        academyName: academyName.trim(),
        discountCode: discountCode.trim() || "AM2026",
        notes: `[تسجيل مباشر من بوابة: ${academyName}] [كود الخصم: ${discountCode.trim() || "AM2026"}]`,
        complianceLevelChecked: true,
        source: `بوابة ${academyName}`
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "عذراً، فشل تسجيل وتأكيد الطلب.");
      }

      const reservation = data.reservation || {
        reservationCode: "REG-" + Math.floor(100000 + Math.random() * 900000),
        studentName: studentName.trim(),
        academyName: academyName.trim(),
        specialization: finalSpecialization
      };

      // Direct client-side write to Supabase
      if (hasSupabase) {
        try {
          const resCode = String(reservation.reservationCode || `REG-${Date.now()}`);
          await supabase.from("students").upsert([{
            full_name: studentName.trim(),
            phone: cleanPhone,
            whatsapp_number: cleanWa,
            graduation_year: graduationYear.trim(),
            governorate: governorate.trim(),
            education_level: educationLevel || "غير محدد",
            basic_course: "دورة أكتوبر 2026 (الرئيسية)",
            selected_departments: [finalSpecialization],
            specialization: finalSpecialization,
            agent_name: reservation.agentName || "",
            reservation_code: resCode,
            notes: `[تسجيل مباشر من بوابة: ${academyName}] [كود الخصم: ${discountCode.trim() || "AM2026"}]`,
            status: "pending",
            created_at: new Date().toISOString()
          }], { onConflict: "reservation_code" });
        } catch (e) {
          console.warn("[Client Supabase Sync Warn]:", e);
        }
      }

      // Save to local storage for form extraction
      try {
        const leadRecord = {
          ...reservation,
          studentName: studentName.trim(),
          phoneNumber: cleanPhone,
          whatsappNumber: cleanWa,
          governorate: governorate.trim(),
          educationLevel,
          graduationYear: graduationYear.trim(),
          selectedDepartments: [finalSpecialization],
          specialization: finalSpecialization,
          academyName: academyName.trim(),
          discountCode: discountCode.trim() || "AM2026",
          date: new Date().toLocaleDateString("ar-EG")
        };
        localStorage.setItem("last_success_reservation", JSON.stringify(leadRecord));
        
        const historyRaw = localStorage.getItem("academy_student_reservations");
        let history = historyRaw ? JSON.parse(historyRaw) : [];
        if (Array.isArray(history)) {
          history.unshift(leadRecord);
          localStorage.setItem("academy_student_reservations", JSON.stringify(history.slice(0, 50)));
        }
      } catch (e) {
        console.warn("Storage error:", e);
      }

      // Dispatch event
      try {
        window.dispatchEvent(new CustomEvent("real_lead_registered", {
          detail: {
            name: studentName.trim(),
            governorate: governorate.trim(),
            specialization: finalSpecialization,
            source: `بوابة ${academyName}`
          }
        }));
      } catch (e) {}

      toast.success("🎉 تم تسجيل طلبك وحفظ المقعد والخصم بنجاح!");
      setSuccessReservation(reservation);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء إرسال البيانات، يرجى المحاولة مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
      id="academy-registration-modal-overlay"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div 
        className="relative bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 text-right z-10 my-auto mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        id="academy-registration-modal-card"
      >
        {/* Success View */}
        {successReservation ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                تم تثبيت الحجز وتوجيه القبول رسمياً 🎓
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                مبروك يا {studentName.split(" ")[0]}! تم تسجيل طلبك بنجاح
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                تم تسجيل بياناتك وتوجيه طلبك لـ <strong className="text-emerald-700 font-black">({academyName})</strong>، وسيتواصل معك مستشار القبول والتسجيل هاتفياً وعبر الواتساب.
              </p>
            </div>

            {/* Booking Code Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-w-sm mx-auto text-center">
              <span className="text-xs text-slate-500 font-bold block">رقم كود الحجز المعتمد:</span>
              <div className="text-2xl font-mono font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 inline-block tracking-wider">
                {successReservation.reservationCode || "REG-2026-CONFIRMED"}
              </div>
              <p className="text-[11px] text-slate-500">
                الأكاديمية المسجلة: <strong className="text-slate-800">{academyName}</strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Link
                to={`/form-extraction?ref=${encodeURIComponent(successReservation.reservationCode || "")}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition hover:scale-[1.01]"
              >
                <FileCheck className="w-5 h-5" />
                <span>استخراج وطباعة استمارة القبول الرسمية فوراً</span>
              </Link>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                إغلاق والعودة للبوابة
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>{isSalam ? "تسجيل مقعد وحفظ الخصم الدراسي" : "تسجيل وتأكيد كود القبول الفوري"}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold border border-amber-200">
                      دفعة 2026
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>التقديم المباشر لـ: <strong className="text-slate-800 font-bold">{academyName}</strong></span>
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

            {/* Academy Destined Badge */}
            <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>الجهة المستلمة للاستمارة: <strong className="text-emerald-800 font-black">{academyName}</strong></span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                موثقة ومضمونة
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3 max-h-[68vh] overflow-y-auto px-1 pr-2 scrollbar-thin">
              
              {/* 1. Student Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>اسم الطالب ثلاثي أو رباعي <span className="text-rose-500">*</span>:</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي حسن"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                />
              </div>

              {/* 2. Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>رقم الهاتف <span className="text-rose-500">*</span>:</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (!whatsappNumber) setWhatsappNumber(e.target.value);
                    }}
                    placeholder="010xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>رقم الواتساب <span className="text-rose-500">*</span>:</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* 3. Governorate & Graduation Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>المحافظة <span className="text-rose-500">*</span>:</span>
                  </label>
                  <select
                    required
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                  >
                    <option value="">اختر المحافظة...</option>
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>سنة التخرج <span className="text-rose-500">*</span>:</span>
                  </label>
                  <select
                    required
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                  >
                    <option value="2026">2026 (دفعة العام الحالي)</option>
                    <option value="2025">2025 (دفعة العام السابق)</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022 وما قبلها</option>
                  </select>
                </div>
              </div>

              {/* 4. Education Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span>المؤهل الدراسي الحالي <span className="text-rose-500">*</span>:</span>
                </label>
                <select
                  required
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                >
                  {UNIFIED_EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              {/* 5. Specialization Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>التخصص المراد التسجيل به بـ ({academyName}) <span className="text-rose-500">*</span>:</span>
                </label>

                {availableSpecializations.length > 0 ? (
                  <select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      if (e.target.value !== "other") setCustomDept("");
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                  >
                    {availableSpecializations.map((spec) => (
                      <option key={spec.id} value={spec.name}>{spec.name}</option>
                    ))}
                    <option value="other">تخصص آخر (كتابة يدوية)...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder="اكتب اسم التخصص المرغوب..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                  />
                )}

                {selectedDept === "other" && availableSpecializations.length > 0 && (
                  <input
                    type="text"
                    required
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder="اكتب اسم التخصص المطلوب بالتفصيل..."
                    className="w-full px-3.5 py-2 mt-1.5 rounded-xl bg-slate-50 border border-amber-300 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:bg-white focus:border-amber-500 transition text-right"
                  />
                )}
              </div>

              {/* 6. Discount / Acceptance Code */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {isSalam ? "كود الخصم المعتمد (25% دعم المصروفات):" : "كود القبول المعتمد والفوري المميز:"}
                    </span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold font-mono">AM. GROUP</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value="AM2026"
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50/70 border-2 border-amber-300 text-slate-900 text-sm font-mono font-black select-none cursor-default transition text-left"
                    dir="ltr"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs">
                    {isSalam ? "خصم 25% مفعل 🎟️" : "قبول فوري ⭐"}
                  </span>
                </div>
              </div>

              {/* 7. Terms compliance checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={complianceChecked}
                    onChange={(e) => {
                      setComplianceChecked(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    className="w-5 h-5 rounded-md border-2 border-slate-400 text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-[12.5px] font-bold text-slate-900 leading-relaxed">
                    {isSalam
                      ? `أقر بصحة البيانات وأرغب في حجز المقعد وتثبيت الخصم لدى ${academyName} والتواصل معي من مستشار التقديم.`
                      : `أقر بصحة البيانات وأرغب في حجز المقعد وتثبيت كود القبول المعتمد والفوري لدى ${academyName} والتواصل معي من مستشار التقديم.`
                    }
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs sm:text-sm font-black transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تسجيل وحفظ المقعد...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{isSalam ? "تأكيد الحجز وتثبيت الخصم الآن" : "تأكيد الحجز والقبول الفوري الآن"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
