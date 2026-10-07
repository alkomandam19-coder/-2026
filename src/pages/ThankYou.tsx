import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Check, 
  FileCheck, 
  ShieldCheck,
  Award,
  Copy,
  Tag,
  Ticket,
  Sparkles
} from "lucide-react";
import { ShareableRegistrationCard } from "../components/ShareableRegistrationCard";
import toast from "react-hot-toast";

export default function ThankYou() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDiscount, setCopiedDiscount] = useState(false);

  useEffect(() => {
    // Attempt to get booking info from state or localStorage as fallback
    if (location.state?.reservation) {
      setReservation(location.state.reservation);
      localStorage.setItem("last_success_reservation", JSON.stringify(location.state.reservation));
    } else {
      const saved = localStorage.getItem("last_success_reservation");
      if (saved) {
        try {
          setReservation(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved reservation", e);
        }
      }
    }
  }, [location]);

  const studentName = reservation?.studentName || "الطالب العزيز";
  const studentPhone = reservation?.phoneNumber || "رقمك المسجل";
  const resCode = reservation?.reservationCode || "REG-2026-PENDING";
  const discountCode = reservation?.discountCode || "AM2026";
  const deptName = Array.isArray(reservation?.selectedDepartments) && reservation.selectedDepartments.length > 0 
    ? reservation.selectedDepartments.join(" - ") 
    : (reservation?.departmentName || "التخصص المختار");
  const studentGov = reservation?.governorate || "";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans animate-fade-in" dir="rtl" id="thankyou-root">
      
      {/* Decorative vector badges for authenticity */}
      <div className="absolute top-20 left-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />

      <div className="w-full max-w-3xl space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl relative z-10">
        
        {/* Top Celebration Accent Circle */}
        <div className="w-20 h-20 bg-emerald-100 text-emerald-650 rounded-full flex items-center justify-center mx-auto shadow-sm animate-scale-up">
          <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
        </div>

        {/* Dynamic Verified Badge Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100 text-[11px] font-black uppercase tracking-wider animate-pulse">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>تم التحقق من حجز المقعد وتثبيت الخصم الرسمي بنجاح</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0A2463] font-sans">
            تهانينا تم قبولكم المبدئي بالأكاديمية! 🎉
          </h1>
          
          {/* Main Verbatim Statement */}
          <div className="p-5 sm:p-6 bg-emerald-600/5 border border-emerald-500/20 rounded-2xl text-slate-800 text-sm sm:text-base font-bold leading-relaxed max-w-2xl mx-auto text-center" id="verbatim-success-statement">
            مبروك يا {studentName}، تم حجز مقعدك المبدئي لعام 2026 بنجاح! جهز المستندات الستة المطلوبة فوراً، حيث سيقوم مستشارك الأكاديمي بالتواصل معك هاتفياً خلال ساعات على الرقم: {studentPhone}.
          </div>
        </div>

        {/* Shareable Badge Section */}
        <div className="pt-2 border-t border-b border-slate-100 py-6">
          <ShareableRegistrationCard
            studentName={studentName}
            departmentName={deptName}
            reservationCode={resCode}
            governorate={studentGov}
            discountCode={discountCode}
            date={reservation?.date || new Date().toLocaleDateString("ar-EG")}
          />
        </div>

        {/* Visual receipt layout inside thank you page */}
        <div className="border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50/30 p-5 sm:p-7 text-right relative overflow-hidden space-y-5" id="receipt-details">
          <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-white border border-slate-200 rounded-full -translate-y-1/2"></div>
          <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-white border border-slate-200 rounded-full -translate-y-1/2"></div>
          
          {/* Header of Receipt: Central Admission Ticket + Discount Code */}
          <div className="border-b border-dashed border-amber-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#0A2463]" />
              <span className="text-xs sm:text-sm font-black text-[#0A2463] uppercase">
                كود تفعيل القبول المركزي 🎫
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resCode);
                  setCopiedCode(true);
                  toast.success(`تم نسخ كود القبول (${resCode})`);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedCode 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode ? "تم النسخ! ✓" : "نسخ كود القبول"}</span>
              </button>
              <strong className="font-mono text-[#0A2463] tracking-wider text-base sm:text-xl font-black bg-white px-3 py-1 rounded-lg border border-slate-200">
                {resCode}
              </strong>
            </div>
          </div>

          {/* Golden Highlight: Academy Discount Code (AM2026) */}
          <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-2 border-amber-400 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1 text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Tag className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black text-amber-900">
                  كود الخصم المعتمد بالأكاديمية (Academic Discount Code):
                </span>
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                  مفعّل ✓
                </span>
              </div>
              <p className="text-[11px] text-amber-800 font-bold">
                احتفظ بهذا الكود وقدمه لشؤون الطلاب بالأكاديمية للحصول على الخصم المالي المعتمد فوراً عند سداد المصروفات.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(discountCode);
                  setCopiedDiscount(true);
                  toast.success(`تم نسخ كود الخصم (${discountCode}) بنجاح!`);
                  setTimeout(() => setCopiedDiscount(false), 2000);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  copiedDiscount 
                    ? "bg-emerald-600 text-white" 
                    : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedDiscount ? "تم النسخ! ✓" : "نسخ كود الخصم"}</span>
              </button>
              <div className="font-mono text-xl sm:text-2xl font-black text-amber-950 bg-white px-4 py-1.5 rounded-xl border-2 border-amber-300 tracking-widest">
                {discountCode}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center">
              <span className="text-slate-500 font-bold">تاريخ الحجز المبدئي:</span>
              <span className="font-bold text-slate-800">{reservation?.date || new Date().toLocaleDateString("ar-EG")}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center">
              <span className="text-slate-500 font-bold">انتهاء تفعيل الخصم وبدء الفحص:</span>
              <span className="font-bold text-red-650">{reservation?.expiresAt || "خلال 7 أيام من اليوم"}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center sm:col-span-2">
              <span className="text-slate-500 font-bold">الدورة التدريبية المحجوزة:</span>
              <strong className="text-emerald-700 font-extrabold">{reservation?.basicCourse || "دورة أكتوبر 2026 (الرئيسية)"}</strong>
            </div>
          </div>
        </div>

        {/* 6 Required Documents Checklist grid layout */}
        <div className="border border-slate-200 rounded-2xl p-5 sm:p-7 bg-slate-50/55 space-y-5" id="documents-checklist-card">
          <div className="flex items-center gap-2.5 border-b border-slate-200/70 pb-3 justify-start">
            <FileCheck className="w-5.5 h-5.5 text-[#0A2463]" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
              📋 كشف المستندات الستة الهامة (برجاء تجهيز الأوراق فوراً لتثبيت القبول):
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Doc 1 */}
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-150 transition-all hover:border-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">1</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#0A2463]">صورة شهادة المؤهل الدراسي</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">صورة من  شهادة المؤهل الدراسي (الثانوية أو الدبلوم) أو بيان النجاح الرسمي.</p>
              </div>
            </div>

            {/* Doc 2 */}
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-150 transition-all hover:border-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">2</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#0A2463]">شهادة الميلاد الكمبيوتر الحديثة</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">أصل شهادة الميلاد الكمبيوتر الثلاثية الحديثة وعليها الرقم التأميني.</p>
              </div>
            </div>

            {/* Doc 3 */}
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-150 transition-all hover:border-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">3</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#0A2463]">عدد 6 صور شخصية حديثة</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">عدد 6 صور شخصية حديثة للطالب مقاس 4*6 على خلفية بيضاء نقية.</p>
              </div>
            </div>

            {/* Doc 4 */}
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-150 transition-all hover:border-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">4</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#0A2463]">صورة بطاقة الطالب الشخصية</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">صورة ضوئية لبطاقة الرقم القومي الحالية للطالب (الوجهين معاً).</p>
              </div>
            </div>

            {/* Doc 5 */}
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-150 transition-all hover:border-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">5</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#0A2463]">صورة بطاقة ولي الأمر</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">صورة بطاقة الرقم القومي لولي الأمر (للأب أو الأم أو الوصي القانوني).</p>
              </div>
            </div>

            {/* Doc 6 */}
            <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-150 transition-all hover:border-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">6</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#0A2463]">دوسيه ابيض شفاف</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">دوسيه ابيض شفاف لحفظ أوراق التقديم بداخله.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Action Bottom Nav Buttons */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to={resCode && resCode !== "REG-2026-PENDING" ? `/form-extraction?ref=${encodeURIComponent(resCode)}` : "/form-extraction"}
              className="flex-1 px-6 py-4 bg-[#FF7F50] hover:bg-orange-600 text-white text-xs sm:text-sm font-black rounded-xl text-center shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
              style={{ minHeight: "44px" }}
            >
              <FileCheck className="w-4 h-4 text-white" />
              <span>📄 استخراج وطباعة استمارتك الرسمية فوراً</span>
            </Link>

            <Link 
              to="/form-extraction-guide"
              className="px-5 py-4 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-black rounded-xl text-center transition flex items-center justify-center gap-2"
              style={{ minHeight: "44px" }}
            >
              <span>📖 شرح خطوات الاستخراج والطباعة</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/" 
              className="px-6 py-3.5 bg-[#0A2463] text-white text-xs font-bold rounded-xl text-center shadow-sm transition hover:bg-[#12317c]"
              style={{ minHeight: "44px" }}
            >
              🏠 العودة للصفحة الرئيسية
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("last_success_reservation");
                navigate("/");
              }}
              className="px-6 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl text-center cursor-pointer"
              style={{ minHeight: "44px" }}
            >
              ✍️ حجز مقعد دراسي إضافي أو تعديل الطلب
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
