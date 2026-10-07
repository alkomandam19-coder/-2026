import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { ACADEMY_DEPARTMENTS } from "../data";
import { 
  Check, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Ticket, 
  Calendar, 
  Phone, 
  GraduationCap, 
  FileCheck, 
  ArrowLeft, 
  User, 
  MessageCircle, 
  MapPin, 
  Tag, 
  ShieldCheck,
  X,
  Edit3,
  FileText
} from "lucide-react";
import { UNIFIED_EDUCATION_LEVELS } from "../constants/educationLevels";
import { combineNotesWithAdAttribution, getCapturedAgentName, getCapturedDiscountCode } from "../utils/adAttribution";
import { supabase, hasSupabase } from "../supabaseClient";

interface StudentBookingFormProps {
  preselectedDepts: string[];
}

export const EGYPT_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "الشرقية",
  "دمياط",
  "بني سويف",
  "بورسعيد",
  "جنوب سيناء",
  "قنا",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "أسوان",
  "أسيوط",
  "سوهاج",
  "شمال سيناء"
].sort();

// Orange Asterisk for mandatory fields
const RequiredStar = () => (
  <span className="text-[#FF7F50] text-sm font-black mr-1 inline-block select-none" title="مطلوب إجباري">*</span>
);

export function StudentBookingForm({ preselectedDepts }: StudentBookingFormProps) {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [seatsCount, setSeatsCount] = useState(() => Math.floor(Math.random() * 4) + 5);

  useEffect(() => {
    const minTime = 45000;
    const maxTime = 60000;
    const getRandomTime = () => Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

    let timerId: any;
    const runCountdown = () => {
      timerId = setTimeout(() => {
        setSeatsCount((prev) => (prev <= 3 ? 3 : prev - 1));
        runCountdown();
      }, getRandomTime());
    };

    runCountdown();
    return () => clearTimeout(timerId);
  }, []);

  const [studentName, setStudentName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_studentName") || "";
    }
    return "";
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_phoneNumber") || "";
    }
    return "";
  });
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_whatsappNumber") || "";
    }
    return "";
  });
  const [graduationYear, setGraduationYear] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_graduationYear") || "";
    }
    return "";
  });
  const [governorate, setGovernorate] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_governorate") || "";
    }
    return "";
  });
  const [educationLevel, setEducationLevel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_educationLevel") || "خريج ثانوي عام";
    }
    return "خريج ثانوي عام";
  });
  const [selectedDepts, setSelectedDepts] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("academy_draft_selectedDepts");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [notes, setNotes] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_notes") || "";
    }
    return "";
  });
  const [basicCourse, setBasicCourse] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_basicCourse") || "دورة أكتوبر 2026 (الرئيسية)";
    }
    return "دورة أكتوبر 2026 (الرئيسية)";
  });
  const [discountCode, setDiscountCode] = useState(() => {
    if (typeof window !== "undefined") {
      const capturedCode = getCapturedDiscountCode();
      if (capturedCode) return capturedCode;
      return localStorage.getItem("academy_draft_discountCode") || "AM2026";
    }
    return "AM2026";
  });
  const [wantsEquivalence, setWantsEquivalence] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("academy_draft_wantsEquivalence") === "1";
    }
    return false;
  });
  
  const [complianceChecked, setComplianceChecked] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Lock body scroll and scroll modal to top when opened
  useEffect(() => {
    if (isConfirming) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isConfirming]);

  // Auto-save form inputs live to localStorage as draft
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("academy_draft_studentName", studentName);
      localStorage.setItem("academy_draft_phoneNumber", phoneNumber);
      localStorage.setItem("academy_draft_whatsappNumber", whatsappNumber);
      localStorage.setItem("academy_draft_graduationYear", graduationYear);
      localStorage.setItem("academy_draft_governorate", governorate);
      localStorage.setItem("academy_draft_educationLevel", educationLevel);
      localStorage.setItem("academy_draft_selectedDepts", JSON.stringify(selectedDepts));
      localStorage.setItem("academy_draft_notes", notes);
      localStorage.setItem("academy_draft_basicCourse", basicCourse);
      localStorage.setItem("academy_draft_discountCode", discountCode);
      localStorage.setItem("academy_draft_wantsEquivalence", wantsEquivalence ? "1" : "0");
    }
  }, [
    studentName,
    phoneNumber,
    whatsappNumber,
    graduationYear,
    governorate,
    educationLevel,
    selectedDepts,
    notes,
    basicCourse,
    discountCode,
    wantsEquivalence,
  ]);

  // Sync selected departments when preselected
  useEffect(() => {
    if (preselectedDepts && preselectedDepts.length > 0) {
      setSelectedDepts(prev => {
        const union = new Set([...prev, ...preselectedDepts]);
        return Array.from(union);
      });
    }
  }, [preselectedDepts]);

  const handleToggleDept = (deptId: string) => {
    setSelectedDepts(prev => {
      if (prev.includes(deptId)) {
        return prev.filter(id => id !== deptId);
      } else {
        return [...prev, deptId];
      }
    });
  };

  const handleDeselectAll = () => {
    setSelectedDepts([]);
  };

  const isPhoneValid = (num: string) => {
    const clean = num.trim().replace(/\D/g, "");
    return clean.length === 11 && /^(010|011|012|015)/.test(clean);
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      setPhoneNumber(clean);
    }
  };

  const handleWhatsappChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      setWhatsappNumber(clean);
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById("booking-form-wrapper");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Step 1: Form Submission Validation & Open Confirmation Modal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 1. الاسم الرباعي بالكامل *
    const nameTrim = studentName.trim();
    if (!nameTrim) {
      setError("شرط إجباري *: يرجى إدخال الاسم الرباعي بالكامل كما هو ببطاقة الرقم القومي.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    const words = nameTrim.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      setError(`شرط إجباري *: يجب كتابة الاسم رباعياً كاملاً (كتبت ${words.length} من أصل 4 كلمات مطلوبة).`);
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 2. الهاتف *
    if (!phoneNumber.trim()) {
      setError("شرط إجباري *: يرجى إدخال رقم الهاتف للتواصل والمتابعة.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (!isPhoneValid(phoneNumber)) {
      setError("شرط إجباري *: يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 3. الواتساب *
    if (!whatsappNumber.trim()) {
      setError("شرط إجباري *: يرجى إدخال رقم الواتساب لتلقي تفاصيل القبول والأوراق المطلوبة.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (!isPhoneValid(whatsappNumber)) {
      setError("شرط إجباري *: يرجى إدخال رقم واتساب مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 4. المحافظة *
    if (!governorate.trim()) {
      setError("شرط إجباري *: يرجى اختيار المحافظة التابع لها الطالب.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 5. سنة التخرج *
    if (!graduationYear.trim()) {
      setError("شرط إجباري *: يرجى تحديد سنة التخرج (مثال: 2026 أو 2025).");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 6. المؤهل الدراسي *
    if (!educationLevel.trim()) {
      setError("شرط إجباري *: يرجى اختيار المؤهل الدراسي الحالي للطالب.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 7. الأقسام التي تود التسجيل بها *
    if (selectedDepts.length === 0) {
      setError("شرط إجباري *: يرجى اختيار قسم أو تخصص واحد على الأقل ترغب في التسجيل به.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // 8. إقرار الشروط
    if (!complianceChecked) {
      setError("يرجى الموافقة على إقرار شروط القبول والتسجيل للمتابعة.");
      setIsShaking(true);
      scrollToForm();
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // Open verification confirmation modal
    setIsConfirming(true);
  };

  // Step 2: Final Submission Handler
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setError(null);

    const readableDeptNames = selectedDepts.map(id => {
      return ACADEMY_DEPARTMENTS.find(d => d.id === id)?.name || id;
    });

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const cleanWa = whatsappNumber.replace(/\D/g, "");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: studentName.trim(),
          phoneNumber: cleanPhone,
          whatsappNumber: cleanWa,
          graduationYear: graduationYear.trim(),
          governorate: governorate.trim(),
          educationLevel,
          basicCourse,
          wantsEquivalence,
          discountCode: discountCode.trim() || "AM2026",
          selectedDepartments: readableDeptNames,
          agentName: getCapturedAgentName() || undefined,
          salesAgent: getCapturedAgentName() || undefined,
          notes: combineNotesWithAdAttribution(
            notes 
              ? `${notes} [كود الخصم: ${discountCode.trim() || "AM2026"}]`
              : `[كود الخصم: ${discountCode.trim() || "AM2026"}]`
          ),
          complianceLevelChecked: true,
          consentTimestamp: new Date().toISOString(),
        }),
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textError = await response.text();
        throw new Error(`استجابة غير متوقعة من الخادم (كود: ${response.status}): ${textError.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || "عذراً، فشل تسجيل وتأكيد الطلب.");
      }

      const reservation = data.reservation || { reservationCode: "REG-2026-MOCK" };

      // Ensure any past deletion tombstone in local browser storage is cleaned for this re-registering student
      try {
        const stored = JSON.parse(localStorage.getItem("academy_deleted_lead_identifiers") || "[]");
        if (Array.isArray(stored) && stored.length > 0) {
          const toRemove = new Set([
            cleanPhone,
            cleanWa,
            studentName.trim().toLowerCase(),
            String(reservation.reservationCode || "").trim().toLowerCase()
          ]);
          const updated = stored.filter((item: string) => !toRemove.has(String(item).trim().toLowerCase()));
          localStorage.setItem("academy_deleted_lead_identifiers", JSON.stringify(updated));
        }
      } catch (e) {}
      
      // Direct client-side write to Supabase for guaranteed multi-environment persistence
      if (hasSupabase) {
        try {
          const resCode = String(reservation.reservationCode || `REG-${Date.now()}`);
          const agent = getCapturedAgentName() || reservation.agentName || "";
          const notesWithAcademy = combineNotesWithAdAttribution(
            notes 
              ? `${notes} [كود الخصم: ${discountCode.trim() || "AM2026"}]` 
              : `[كود الخصم: ${discountCode.trim() || "AM2026"}]`
          );

          await supabase.from("students").upsert([{
            full_name: studentName.trim(),
            phone: cleanPhone,
            whatsapp_number: cleanWa,
            graduation_year: graduationYear.trim(),
            governorate: governorate.trim(),
            education_level: educationLevel || "غير محدد",
            basic_course: basicCourse || "",
            selected_departments: readableDeptNames,
            specialization: readableDeptNames[0] || "",
            agent_name: agent,
            reservation_code: resCode,
            notes: notesWithAcademy,
            status: "pending",
            created_at: new Date().toISOString()
          }], { onConflict: "reservation_code" });
          console.log(`[Supabase Client Direct Sync]: Student ${studentName} synced successfully.`);
        } catch (sbDirectErr) {
          console.warn("[Supabase Client Direct Sync Notice]:", sbDirectErr);
        }
      }

      // Dispatch real local event for live toast confirmation
      try {
        window.dispatchEvent(new CustomEvent("real_lead_registered", {
          detail: {
            name: studentName.trim(),
            governorate: governorate.trim() || "محافظة الطالب",
            specialization: readableDeptNames[0] || "تخصص معتمد",
            source: discountCode ? `استمارة التقديم (${discountCode})` : "استمارة القبول المركزي 🎫"
          }
        }));
      } catch (e) {}

      // Trigger notification non-blocking
      fetch("/api/simulate-gmail-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "admissions@am-group-academy.com",
          recipient: `${cleanPhone}@sms-or-mail.com`,
          subject: `تم تأكيد حجز مقعدك بنجاح لعام ٢٠٢٦ 🎓 | كود الحجز: ${reservation.reservationCode}`,
          bodyTemplate: `عزيزي الطالب ${studentName.trim()}، تم تأكيد حجز مقعدك بنجاح. كود الحجز: ${reservation.reservationCode}.`
        })
      }).catch(err => console.warn("Notification error", err));

      const finalReservation = {
        ...(data.reservation || {}),
        studentName: studentName.trim(),
        phoneNumber: cleanPhone,
        whatsappNumber: cleanWa,
        governorate: governorate.trim(),
        graduationYear: graduationYear.trim(),
        educationLevel,
        basicCourse,
        selectedDepartments: readableDeptNames,
        discountCode: discountCode.trim() || "AM2026",
        date: new Date().toLocaleDateString("ar-EG"),
        expiresAt: "ساري لمدة ٧ أيام",
        complianceLevelChecked: true,
        consentTimestamp: new Date().toISOString()
      };

      setSuccessResult(finalReservation);
      setIsConfirming(false);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("last_success_reservation", JSON.stringify(finalReservation));

        const studentHistory = JSON.parse(localStorage.getItem("academy_student_reservations") || "[]");
        studentHistory.push({
          id: "res-" + Date.now(),
          studentName: studentName.trim(),
          phoneNumber: cleanPhone,
          discountCode: discountCode.trim() || "AM2026",
          reservationCode: data.reservation?.reservationCode || "REG-2026",
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("academy_student_reservations", JSON.stringify(studentHistory));

        const directLeads = JSON.parse(localStorage.getItem("academy_direct_leads") || "[]");
        directLeads.unshift({
          studentName: studentName.trim(),
          governorate: governorate.trim() || "غير محدد",
          dept: readableDeptNames[0] || "شعبة معتمدة",
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("academy_direct_leads", JSON.stringify(directLeads.slice(0, 30)));
        window.dispatchEvent(new Event("academy_leads_updated"));

        // Clear drafts
        localStorage.removeItem("academy_draft_studentName");
        localStorage.removeItem("academy_draft_phoneNumber");
        localStorage.removeItem("academy_draft_whatsappNumber");
        localStorage.removeItem("academy_draft_graduationYear");
        localStorage.removeItem("academy_draft_governorate");
        localStorage.removeItem("academy_draft_notes");
        localStorage.removeItem("academy_draft_selectedDepts");
        localStorage.removeItem("academy_draft_selectedAcademy");
      }

      setStudentName("");
      setPhoneNumber("");
      setWhatsappNumber("");
      setGraduationYear("");
      setGovernorate("");
      setNotes("");
      setSelectedDepts([]);

      toast.success("✓ تم حجز مقعدك وتثبيت الخصم بنجاح!");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      navigate("/thank-you", { state: { reservation: finalReservation } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "عذراً، فشل حجز المقعد! يرجى التحقق والمحاولة ثانية.");
      setError(err.message || "عذراً، حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة ثانية.");
    } finally {
      setIsLoading(false);
    }
  };

  const nameWords = studentName.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs scroll-mt-20 relative" id="booking-form-wrapper" dir="rtl">
      {/* Top Banner Accent */}
      <div className="h-2 bg-gradient-to-r from-[#0A2463] via-[#FF7F50] to-emerald-500"></div>

      {!successResult ? (
        <>
          {/* COMPACT, SCROLL-FREE REGISTRATION FORM */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-7 space-y-4 text-right">
            
            {/* Header + Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200/60">
                  <Ticket className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="font-black text-base sm:text-lg text-[#0A2463] font-sans flex items-center gap-1.5">
                    <span>تفعيل حجز مقعد وحفظ الخصم الدراسي 🎟️</span>
                  </h1>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    سجل بياناتك لحجز مقعدك وتثبيت الخصم المتاح لدفعة 2026
                  </p>
                </div>
              </div>

              {/* Compact Notice Badge */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10.5px] font-black px-2.5 py-1 rounded-xl border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                  <span>كود الخصم AM2026 مفعّل ✓</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10.5px] font-black px-2.5 py-1 rounded-xl border border-red-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>متبقي {seatsCount} مقاعد فقط!</span>
                </span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border-r-4 border-red-500 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2" id="booking-form-error">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Compact Responsive Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
              
              {/* 1. Full Name (Span 2) */}
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="student-name-input" className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>الاسم الرباعي بالكامل:</span>
                    <RequiredStar />
                  </label>
                  {studentName.trim().length > 0 && nameWords.length < 4 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠️ كتبت {nameWords.length} من 4 كلمات مطلوبة
                    </span>
                  )}
                  {nameWords.length >= 4 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      <span>اسم رباعي مكتمل</span>
                    </span>
                  )}
                </div>
                <input
                  id="student-name-input"
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="اكتب اسمك الرباعي بالكامل كما هو ببطاقة الرقم القومي..."
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition"
                />
              </div>

              {/* 2. Phone */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="student-phone-input" className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الهاتف:</span>
                    <RequiredStar />
                  </label>
                  {isPhoneValid(phoneNumber) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      <span>صحيح</span>
                    </span>
                  )}
                </div>
                <input
                  id="student-phone-input"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition text-right"
                />
              </div>

              {/* 3. WhatsApp */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="student-wa-input" className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
                    <span>الواتساب:</span>
                    <RequiredStar />
                  </label>
                  {isPhoneValid(whatsappNumber) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      <span>صحيح</span>
                    </span>
                  )}
                </div>
                <input
                  id="student-wa-input"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  placeholder="011XXXXXXXX"
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition text-right"
                />
              </div>

              {/* 4. Governorate */}
              <div className="space-y-1">
                <label htmlFor="student-gov-select" className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>المحافظة:</span>
                  <RequiredStar />
                </label>
                <select
                  id="student-gov-select"
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition cursor-pointer"
                >
                  <option value="">-- اختر المحافظة ▾ --</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              {/* 5. Graduation Year */}
              <div className="space-y-1">
                <label htmlFor="student-grad-input" className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>سنة التخرج:</span>
                  <RequiredStar />
                </label>
                <input
                  id="student-grad-input"
                  type="text"
                  required
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="مثال: 2026 أو 2025"
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition"
                />
              </div>

              {/* 6. Education Level */}
              <div className="space-y-1">
                <label htmlFor="student-edu-select" className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  <span>المؤهل الدراسي:</span>
                  <RequiredStar />
                </label>
                <select
                  id="student-edu-select"
                  required
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition cursor-pointer"
                >
                  {UNIFIED_EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              {/* 7. Basic Course (Optional) */}
              <div className="space-y-1">
                <label htmlFor="student-course-select" className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>الدورة والدفعة الرئيسية:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">(اختياري)</span>
                </label>
                <select
                  id="student-course-select"
                  value={basicCourse}
                  onChange={(e) => setBasicCourse(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition cursor-pointer"
                >
                  <option value="دورة أكتوبر 2026 (الرئيسية)">أكتوبر 2026 (الدفعة الرئيسية)</option>
                  <option value="دورة يناير 2027">يناير 2027 (الدفعة الشتوية)</option>
                  <option value="دورة مارس 2027">مارس 2027 (الترم الثاني)</option>
                  <option value="دورة مايو 2027">مايو 2027 (صيفي مبكر)</option>
                </select>
              </div>

              {/* 8. Departments Multi-Select (Span 2) */}
              <div className="md:col-span-2 space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-[#0A2463]" />
                    <span>الأقسام التي تود التسجيل بها:</span>
                    <RequiredStar />
                    <span className="text-[10.5px] text-slate-500 font-normal mr-1">(اختر قسماً أو أكثر)</span>
                  </label>
                  {selectedDepts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                    >
                      إلغاء التحديد ({selectedDepts.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
                  {ACADEMY_DEPARTMENTS.filter(dept => !dept.isClosed && !dept.isFull && dept.id !== "construction").map((dept) => {
                    const isChecked = selectedDepts.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => handleToggleDept(dept.id)}
                        className={`px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-right border transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          isChecked
                            ? "bg-[#0A2463] text-white border-[#0A2463] shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        <span className="truncate">{dept.name}</span>
                        {isChecked ? (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px] shrink-0">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 9. Discount Code */}
              <div className="space-y-1">
                <label htmlFor="student-discount-input" className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>كود الخصم الدراسي:</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">مفعّل ✓</span>
                </label>
                <input
                  id="student-discount-input"
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="AM2026"
                  className="w-full px-3 py-2 bg-amber-50/60 border border-amber-300 rounded-xl text-xs sm:text-sm font-mono font-black text-amber-950 text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Notes (Optional) */}
              <div className="space-y-1">
                <label htmlFor="student-notes-input" className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span>ملاحظات خاصة:</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(اختياري)</span>
                </label>
                <input
                  id="student-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="استفسار عن المصاريف، المواعيد، الأوراق..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20"
                />
              </div>

              {/* Compliance Checkbox */}
              <div className="md:col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <label htmlFor="compliance-cb" className="flex items-start gap-2 cursor-pointer select-none text-right">
                  <input
                    id="compliance-cb"
                    type="checkbox"
                    checked={complianceChecked}
                    onChange={(e) => setComplianceChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0A2463] rounded cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-bold text-slate-700 leading-relaxed">
                    أقر بصحة البيانات المسجلة والموافقة على شروط القبول المبدئي والتواصل معي لشرح تفاصيل الدراسة والتسجيل.
                  </span>
                </label>
              </div>

            </div>

            {/* Review and Proceed Button */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-3.5 bg-[#FF7F50] hover:bg-[#FF7F50]/90 active:scale-98 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base ${
                  isShaking ? "animate-shake" : ""
                }`}
                style={{ minHeight: "48px" }}
                id="submit-booking-btn"
              >
                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                <span>تأكيد وتفعيل حجز مقعدك وحفظ الخصم الدراسي 🚀</span>
              </button>
            </div>

            {/* Security & Free Guarantee Notice */}
            <div className="flex items-center justify-center gap-3 text-[10.5px] text-slate-500 font-semibold text-center pt-1">
              <span className="flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تسجيل مجاني 100% بدون أي رسوم مسبقة</span>
              </span>
              <span>•</span>
              <span>بياناتك مؤمنة ومشفرة بالكامل 🔒</span>
            </div>

          </form>

          {/* Verification Modal Rendered via React Portal directly into body with Top Alignment */}
          {isConfirming && typeof document !== "undefined" && createPortal(
            <div 
              ref={modalRef}
              className="fixed inset-0 z-[99999999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex items-start justify-center p-3 sm:p-5 pt-12 sm:pt-14 pb-16" 
              dir="rtl"
            >
              <div 
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-2 border-amber-500 overflow-hidden text-right flex flex-col my-auto shrink-0 relative animate-scale-up"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#0A2463] to-slate-900 text-white px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <span id="confirm-modal-title" className="font-sans font-black text-xs sm:text-sm text-white">
                      مراجعة وتأكيد بيانات حجز المقعد 📑
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-[11px] sm:text-xs font-black text-amber-900 leading-relaxed">
                      ⚠️ يرجى التأكد من صحة رقم الهاتف والواتساب لتتمكن إدارة القبول من التواصل معكم وتثبيت كود الخصم
                    </p>
                  </div>

                  {/* Summary Table */}
                  <div className="border border-slate-200 rounded-2xl bg-slate-50 divide-y divide-slate-150 text-xs">
                    <div className="grid grid-cols-3 p-2.5 bg-white rounded-t-2xl">
                      <span className="text-slate-500 font-bold col-span-1">الاسم الرباعي:</span>
                      <strong className="text-slate-900 col-span-2 text-xs sm:text-sm truncate">{studentName}</strong>
                    </div>
                    <div className="grid grid-cols-3 p-2.5">
                      <span className="text-slate-500 font-bold col-span-1">رقم الهاتف:</span>
                      <strong className="text-slate-900 col-span-2 font-mono text-xs sm:text-sm">{phoneNumber}</strong>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 bg-white">
                      <span className="text-slate-500 font-bold col-span-1">رقم الواتساب:</span>
                      <strong className="text-slate-900 col-span-2 font-mono text-xs sm:text-sm">{whatsappNumber}</strong>
                    </div>
                    <div className="grid grid-cols-3 p-2.5">
                      <span className="text-slate-500 font-bold col-span-1">المحافظة / التخرج:</span>
                      <span className="text-slate-900 col-span-2 font-bold">{governorate} ({graduationYear})</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 bg-white">
                      <span className="text-slate-500 font-bold col-span-1">المؤهل الدراسي:</span>
                      <span className="text-slate-900 col-span-2 font-bold">{educationLevel}</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5">
                      <span className="text-slate-500 font-bold col-span-1">الدورة الأساسية:</span>
                      <span className="text-emerald-700 col-span-2 font-black">{basicCourse}</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 bg-white">
                      <span className="text-slate-500 font-bold col-span-1">الأقسام المختارة:</span>
                      <div className="col-span-2 flex flex-wrap gap-1">
                        {selectedDepts.map(id => {
                          const name = ACADEMY_DEPARTMENTS.find(d => d.id === id)?.name || id;
                          return (
                            <span key={id} className="text-[10px] font-bold text-[#0A2463] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {notes.trim() && (
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="text-slate-500 font-bold col-span-1">ملاحظات:</span>
                        <span className="text-slate-700 col-span-2 font-medium text-[11px]">{notes}</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold text-center">
                      ❌ {error}
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={isLoading}
                      className="flex-1 py-3 bg-[#FF7F50] hover:bg-[#FF7F50]/90 active:scale-98 text-white font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm disabled:opacity-60"
                      style={{ minHeight: "44px" }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري التأكيد النهائي وحفظ الخصم...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-200" />
                          <span>تأكيد نهائي وإرسال طلب الحجز الآن 🚀</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setIsConfirming(false)}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
                      style={{ minHeight: "44px" }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل البيانات</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      ) : (
        /* Success Receipt View */
        <div className="p-6 md:p-8 space-y-5 text-center animate-fade-in" id="success-receipt-card">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900 font-sans">
              تهانينا! تم تفعيل الحجز المبدئي بنجاح 🎉
            </h3>
            <p className="text-emerald-700 text-xs sm:text-sm font-semibold">
              تم تثبيت أحقيتك في الخصم المتاح وحفظ مقعدك لدفعة 2026
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-slate-50 p-4 sm:p-5 max-w-md mx-auto text-right space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 font-mono">
              <span className="text-slate-500 text-xs">كود الحجز:</span>
              <strong className="text-[#0A2463] text-base">{successResult.reservationCode}</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">اسم الطالب:</span>
              <strong className="text-slate-900">{successResult.studentName}</strong>
            </div>

            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-500 text-xs">الهاتف:</span>
              <strong className="text-slate-900">{successResult.phoneNumber}</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">المحافظة:</span>
              <span className="font-bold text-slate-800">{successResult.governorate}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">المؤهل الدراسي:</span>
              <span className="font-bold text-slate-800">{successResult.educationLevel}</span>
            </div>

            {successResult.selectedDepartments && successResult.selectedDepartments.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <span className="text-slate-500 text-xs block">الأقسام المختارة:</span>
                <div className="flex flex-wrap gap-1">
                  {successResult.selectedDepartments.map((dept: string, idx: number) => (
                    <span key={idx} className="text-[10.5px] font-bold text-[#0A2463] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2.5">
            <Link
              to={`/form-extraction?ref=${encodeURIComponent(successResult.reservationCode)}`}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#0A2463] to-indigo-900 hover:from-indigo-900 hover:to-[#0A2463] text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-xs sm:text-sm text-center"
              style={{ minHeight: "44px" }}
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>استخراج وصياغة استمارة التقديم الرسمية المعتمدة 📄</span>
            </Link>

            <button
              onClick={() => setSuccessResult(null)}
              className="w-full px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 mx-auto"
              style={{ minHeight: "44px" }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>تسجيل حجز جديد</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
