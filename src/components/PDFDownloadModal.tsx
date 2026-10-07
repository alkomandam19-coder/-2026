import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, User, Phone, CheckCircle, AlertCircle, Loader2, Download, MessageSquare, GraduationCap } from "lucide-react";
import { ACADEMY_DEPARTMENTS } from "../data";
import jsPDF from "jspdf";
import { UNIFIED_EDUCATION_LEVELS } from "../constants/educationLevels";

// --- CLIENT-SIDE DYNAMIC ARABIC PDF GENERATOR (BUILDS A HIGH-QUALITY OFFICIAL BOOKLET WITH REAL LIVE DATA) ---
export const generateDynamicGuidePDF = (specialization: string, studentName: string, studentPhone: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1700;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Decorative Border
  ctx.strokeStyle = "#0A2463";
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.strokeStyle = "#D97706"; // Amber border
  ctx.lineWidth = 4;
  ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

  // Header Background Block (Dark Blue/Teal)
  ctx.fillStyle = "#0A2463";
  ctx.fillRect(50, 50, canvas.width - 100, 240);

  // Gold accent line under header
  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(50, 290, canvas.width - 100, 10);

  // Header Text
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("بوابة القبول والتسجيل الإلكترونية الموحدة", canvas.width / 2, 115);

  ctx.fillStyle = "#FBBF24"; // Light amber
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("الدليل الرسمي الشامل للمصروفات والشعب لعام 2026", canvas.width / 2, 175);

  ctx.fillStyle = "#E2E8F0";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("نسخة رسمية معتمدة بصيغة PDF قابلة للطباعة", canvas.width / 2, 225);

  // Decorative Eagle/Logo watermark in the center
  ctx.strokeStyle = "rgba(16, 185, 129, 0.06)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2 + 100, 280, 0, Math.PI * 2);
  ctx.stroke();

  // Seal / Stamp Box (Top Right inside body)
  ctx.save();
  ctx.translate(1000, 400);
  ctx.rotate((12 * Math.PI) / 180); // Rotate slightly
  ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
  ctx.fillRect(-125, -45, 250, 90);
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 4;
  ctx.strokeRect(-125, -45, 250, 90);
  ctx.textAlign = "center";
  ctx.fillStyle = "#10B981";
  ctx.font = "bold 21px sans-serif";
  ctx.fillText("مستند رسمي معتمد", 0, -5);
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("بوابة القبول الموحد 2026", 0, 25);
  ctx.restore();

  // Document Info Block (Right-aligned)
  ctx.textAlign = "right";
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("بيانات الاستخراج والتحميل للمستند :", 1100, 360);

  const drawInfoRow = (label: string, value: string, y: number) => {
    ctx.textAlign = "right";
    ctx.fillStyle = "#475569";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(label, 1100, y);

    ctx.textAlign = "left";
    ctx.fillStyle = "#0A2463";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(value, 100, y);

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, y + 15);
    ctx.lineTo(1100, y + 15);
    ctx.stroke();
  };

  drawInfoRow("اسم الطالب المستعلم :", studentName || "الزائر الكريم", 410);
  drawInfoRow("رقم الهاتف المقترن :", studentPhone || "غير مسجل", 460);
  drawInfoRow("تاريخ ووقت التحميل :", new Date().toLocaleString("ar-EG"), 510);
  drawInfoRow("نوع الملف الوصفي :", specialization || "الدليل الشامل العام 2026", 560);

  // Section: Departments & Fees
  ctx.textAlign = "right";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("أولاً: قائمة الشعب والتخصصات المعتمدة لعام 2026 :", 1100, 650);

  let deptY = 700;
  ACADEMY_DEPARTMENTS.forEach((dept, index) => {
    if (deptY > 1280) return; // Keep inside bounds of 1 page

    // Draw dept index circle
    ctx.fillStyle = "#0A2463";
    ctx.beginPath();
    ctx.arc(1070, deptY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), 1070, deptY + 6);

    // Draw dept name
    ctx.textAlign = "right";
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(dept.name, 1040, deptY + 7);

    // Draw description below dept name
    ctx.fillStyle = "#475569";
    ctx.font = "normal 15.5px sans-serif";
    
    // Simple line wrap for description
    const desc = dept.description || "";
    let firstLine = desc;
    let secondLine = "";
    if (desc.length > 95) {
      firstLine = desc.substring(0, 95);
      secondLine = desc.substring(95);
    }
    ctx.fillText(firstLine, 1040, deptY + 35);
    if (secondLine) {
      ctx.fillText(secondLine, 1040, deptY + 58);
    }

    // Draw skills tags below description
    ctx.fillStyle = "#115E59"; // Teal
    ctx.font = "bold 13.5px sans-serif";
    const skillsText = "أهم المهارات: " + (dept.skills || []).join(" • ");
    ctx.fillText(skillsText, 1040, secondLine ? deptY + 85 : deptY + 60);

    deptY += secondLine ? 115 : 90;
  });

  // Section: General Rules & Requirements
  ctx.textAlign = "right";
  ctx.fillStyle = "#0A2463";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("ثانياً: المستندات والشروط العامة للقبول :", 1100, 1370);

  const rules = [
    "• تقبل بوابة التسجيل الطلاب الحاصلين على الثانوية العامة، الأزهرية، الفنية والدبلومات بأنواعها.",
    "• الالتزام الكامل بالحضور ومتابعة التدريب العملي الميداني والتطبيقي بالشعب المتاحة.",
    "• يتم تأجيل التجنيد العسكري قانونياً للطلاب المقبولين والمستوفين للشروط العمرية.",
    "• المستندات المطلوبة: شهادة المؤهل الأصلي، شهادة الميلاد الكمبيوتر، و6 صور شخصية حديثة."
  ];

  let ruleY = 1415;
  rules.forEach((rule) => {
    ctx.fillStyle = "#334155";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(rule, 1100, ruleY);
    ruleY += 38;
  });

  // Footer Branding info
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(50, 1575, canvas.width - 100, 65);
  ctx.strokeStyle = "#E2E8F0";
  ctx.strokeRect(50, 1575, canvas.width - 100, 65);

  ctx.textAlign = "center";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("بوابة التسجيل والقبول الإلكتروني المعتمدة • جميع الحقوق محفوظة لعام 2026 ©", canvas.width / 2, 1612);

  // Save Canvas to PDF
  try {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = 297;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "NONE");
    pdf.save(`دليل_${specialization.replace(/\s+/g, "_")}_2026.pdf`);
  } catch (err) {
    console.error("PDF fall-back generation failed:", err);
  }
};

interface PDFDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSpecialization?: string;
}

export function PDFDownloadModal({ isOpen, onClose, defaultSpecialization }: PDFDownloadModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [educationLevel, setEducationLevel] = useState(UNIFIED_EDUCATION_LEVELS[0]);
  const [specialization, setSpecialization] = useState(defaultSpecialization || "الدليل الرسمي الشامل 2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pdfLibraryList, setPdfLibraryList] = useState<any[]>([]);

  const loadFilesList = async () => {
    try {
      const res = await fetch("/api/pdf-library");
      const data = await res.json();
      if (data && data.success && Array.isArray(data.list)) {
        setPdfLibraryList(data.list);
      } else {
        setPdfLibraryList([]);
      }
    } catch (err) {
      setPdfLibraryList([]);
    }
  };

  useEffect(() => {
    loadFilesList();
    window.addEventListener("pdf_library_updated", loadFilesList);
    return () => {
      window.removeEventListener("pdf_library_updated", loadFilesList);
    };
  }, []);

  // Sync choice if defaults change
  useEffect(() => {
    if (defaultSpecialization) {
      setSpecialization(defaultSpecialization);
    } else if (pdfLibraryList.length > 0) {
      // Find matching default specialization or fallback to first file
      const foundMatch = pdfLibraryList.some(f => f.specialization === defaultSpecialization);
      if (!foundMatch && pdfLibraryList[0]) {
        setSpecialization(pdfLibraryList[0].specialization);
      }
    }
  }, [defaultSpecialization, pdfLibraryList]);

  // Lock background scrolling when modal is open so it stays in place
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve target download link dynamically
  const activeFileItem = pdfLibraryList.find(f => f.specialization === specialization) || pdfLibraryList[0];
  const currentDownloadUrl = activeFileItem ? activeFileItem.url : "";

  const isPhoneValid = (num: string) => {
    const cleanNum = num.trim().replace(/[\s\-\(\)]/g, "");
    const regex = /^(010|011|012|015)[0-9]{8}$/;
    return regex.test(cleanNum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameTrim = name.trim();
    if (!nameTrim) {
      setError("الرجاء إدخال الاسم بالكامل لإتمام التحقق.");
      return;
    }

    const words = nameTrim.split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      setError("يرجى كتابة الاسم ثلاثياً أو رباعياً على الأقل لتسجيل طلب التحميل.");
      return;
    }

    if (!isPhoneValid(phone)) {
      setError("الرجاء إدخال رقم هاتف مصري صحيح مكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.");
      return;
    }

    const cleanWa = whatsapp.trim() || phone.trim();
    if (!isPhoneValid(cleanWa)) {
      setError("الرجاء إدخال رقم واتساب مصري صحيح مكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.");
      return;
    }

    if (!educationLevel) {
      setError("الرجاء اختيار المؤهل الدراسي الحالي.");
      return;
    }

    setLoading(true);
    try {
      // Send download lead request to the server with complete data
      const response = await fetch("/api/pdf-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrim,
          phone: phone.trim(),
          whatsapp: cleanWa,
          educationLevel: educationLevel,
          specialization: specialization
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "فشل تسجيل طلب التحميل.");
      }

      // Live registration synchronizer event dispatch for ticker and general layout
      const directLeads = JSON.parse(localStorage.getItem("academy_direct_leads") || "[]");
      directLeads.unshift({
        studentName: nameTrim,
        governorate: "تحميل الملف الوصفي PDF",
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("academy_direct_leads", JSON.stringify(directLeads.slice(0, 30)));
      window.dispatchEvent(new Event("academy_leads_updated"));

      setSuccess(true);

      // Trigger automatic file download
      setTimeout(() => {
        const isValidUrl = currentDownloadUrl && (
          currentDownloadUrl.startsWith("http://") || 
          currentDownloadUrl.startsWith("https://") || 
          currentDownloadUrl.startsWith("/") || 
          currentDownloadUrl.startsWith("./") || 
          currentDownloadUrl.startsWith("uploads/")
        );

        if (isValidUrl) {
          const link = document.createElement("a");
          link.href = currentDownloadUrl;
          link.target = "_blank";
          link.download = `دليل_${specialization.replace(/\s+/g, "_")}_2026.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // If URL is missing, invalid or local (which could be deleted from ephemeral filesystem), generate beautifully on client!
          generateDynamicGuidePDF(specialization, nameTrim, phone.trim());
        }
      }, 500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ ما بالاتصال في الشبكة، برجاء المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 top-0 left-0 w-screen h-screen bg-slate-950/85 backdrop-blur-sm z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain font-sans" 
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto relative animate-scale-up text-right transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Decor */}
        <div className="bg-gradient-to-r from-teal-850 to-emerald-900 bg-[#115e59] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 shrink-0 text-amber-300 animate-pulse" />
            <span className="font-sans font-black text-xs sm:text-sm tracking-wide text-white">نموذج تحميل الملف التعريفي والدليل PDF 📑</span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-white hover:text-amber-100 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {pdfLibraryList.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">لا توجد ملفات متاحة للتحميل حالياً.</p>
              <p className="text-xs text-slate-500">برجاء مراجعة الإدارة لاحقاً أو التواصل معنا مباشرة عبر الواتساب.</p>
            </div>
          ) : !success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 bg-teal-500/5 border border-teal-500/20 rounded-xl text-xs text-slate-700 font-bold leading-relaxed text-center">
                📢 يرجى ملء البيانات لفتح رابط التحميل المباشر للدليل التفصيلي والكتيب للعام الجديد فوراً.
              </div>

              {/* Name and Phone grouped pair */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-650">الاسم ثلاثي بالكامل:</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اكتب اسمك الثلاثي أو الرباعي..."
                    className="w-full pl-2.5 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-[#115e59] focus:outline-none transition leading-normal font-bold"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Phone and Whatsapp grouped pair */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-650">رقم الهاتف:</label>
                  <div className="relative font-mono">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full pl-2.5 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-[#115e59] focus:outline-none transition leading-normal text-right font-bold"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-650">رقم الواتساب:</label>
                  <div className="relative font-mono">
                    <input
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full pl-2.5 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-[#115e59] focus:outline-none transition leading-normal text-right font-bold"
                    />
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Education Level Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-650">المؤهل الدراسي الحالي (خريج إيه):</label>
                <div className="relative">
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-[#115e59] focus:outline-none transition cursor-pointer"
                  >
                    {UNIFIED_EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        🎓 {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specialization Selection field */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-650">الملف أو الدليل المراد تحميله:</label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-[#115e59] focus:outline-none transition cursor-pointer"
                >
                  {pdfLibraryList.map((file) => (
                    <option key={file.id} value={file.specialization}>
                      📙 {file.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-250 rounded-lg text-rose-700 text-[11px] font-bold flex items-center gap-1.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit / Download Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                style={{ minHeight: "44px" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>جاري تسجيل الطلب وتجهيز ملف التحميل...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-100 animate-bounce" />
                    <span>حفظ البيانات والتحميل الفوري للملف PDF 💾</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 animate-scale-up py-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-emerald-600 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">تم تفعيل كود التحميل وبدأ التنزيل تلقائياً! 🎉</h4>
                <p className="text-[11px] text-slate-500 font-bold leading-normal">
                  نشكرك على اهتمامك بـ ({specialization}). تم تسجيل بياناتك وحفظ طلبك في المنظومة المركزية لمتابعتك.
                </p>
              </div>

              <hr className="border-slate-100 my-2" />

              <a
                href={currentDownloadUrl && (
                  currentDownloadUrl.startsWith("http://") || 
                  currentDownloadUrl.startsWith("https://") || 
                  currentDownloadUrl.startsWith("/") || 
                  currentDownloadUrl.startsWith("./") || 
                  currentDownloadUrl.startsWith("uploads/")
                ) ? currentDownloadUrl : "#"}
                onClick={(e) => {
                  const isValidUrl = currentDownloadUrl && (
                    currentDownloadUrl.startsWith("http://") || 
                    currentDownloadUrl.startsWith("https://") || 
                    currentDownloadUrl.startsWith("/") || 
                    currentDownloadUrl.startsWith("./") || 
                    currentDownloadUrl.startsWith("uploads/")
                  );
                  if (!isValidUrl) {
                    e.preventDefault();
                    generateDynamicGuidePDF(specialization, name, phone);
                  }
                }}
                download={`دليل_${specialization.replace(/\s+/g, "_")}_2026.pdf`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md animate-pulse"
                style={{ minHeight: "44px" }}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل بديل يدوي مباشر للدليل (إذا لم يبدأ تلقائياً) ⬇️</span>
              </a>

              <p className="text-[9.5px] text-slate-400">إذا لم يبدأ التحميل تلقائياً خلال ثوانٍ، اضغط على الزر أعلاه للتحميل الفوري.</p>
            </div>
          )}
        </div>

        {/* Footer lock state */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-sans">
          <span>حماية وسرية تامة ومصداقية كاملة</span>
          <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
            <CheckCircle className="w-3.5 h-3.5 inline text-emerald-600" /> اتصال مشفر وآمن
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
