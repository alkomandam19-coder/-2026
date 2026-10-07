import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { 
  Download, 
  MessageCircle, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  GraduationCap,
  Tag,
  Ticket
} from "lucide-react";
import toast from "react-hot-toast";
import { shareMessages, toastMessages, DEFAULT_DISCOUNT_CODE } from "../utils/messages";

interface ShareableRegistrationCardProps {
  studentName: string;
  departmentName?: string;
  reservationCode: string;
  governorate?: string;
  date?: string;
  discountCode?: string;
}

// Ultra-reliable Canvas 2D fallback generator
function generateCanvasCardFallback(
  studentName: string,
  departmentName: string,
  reservationCode: string,
  governorate: string,
  date: string,
  discountCode: string,
  qrCodeDataUrl?: string
): Promise<string> {
  return new Promise((resolve) => {
    const width = 1000;
    const height = 650;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve("");
      return;
    }

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0A2463");
    gradient.addColorStop(0.5, "#0D2E7D");
    gradient.addColorStop(1, "#051336");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Gold Outer Border
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    // 3. Watermark
    ctx.font = "900 120px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.textAlign = "center";
    ctx.fillText("2026", width / 2, height / 2 + 40);

    // 4. Header Bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(40, 40, width - 80, 80);

    // Header Title
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.textAlign = "right";
    ctx.fillText("بوابة المعاهد والأكاديميات المعتمدة - جمهورية مصر العربية", width - 60, 72);

    ctx.font = "900 24px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("بطاقة إثبات حجز مقعد دراسي وتثبيت الخصم الرسمي", width - 60, 105);

    // Verified badge
    ctx.fillStyle = "#10B981";
    ctx.fillRect(60, 60, 160, 40);
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("✓ مقبول مبدئياً", 140, 85);

    // 5. Student Name Section
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(40, 140, width - 80, 100);

    ctx.textAlign = "right";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#FDE68A";
    ctx.fillText("اسم الطالب المرشح بالكامل:", width - 60, 170);

    ctx.font = "900 28px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(studentName, width - 60, 210);

    if (governorate) {
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#93C5FD";
      ctx.textAlign = "left";
      ctx.fillText(`📍 ${governorate} - دفعة عام 2026`, 60, 195);
    }

    // 6. Two Info Boxes
    const boxW = (width - 100) / 2;
    // Dept box
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(width / 2 + 10, 260, boxW - 20, 80);
    ctx.textAlign = "right";
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText("التخصص / الشعبة المحجوزة:", width - 60, 290);
    ctx.font = "900 18px sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.fillText(departmentName, width - 60, 322);

    // Date box
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(60, 260, boxW - 20, 80);
    ctx.textAlign = "right";
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText("تاريخ إصدار وتأكيد الحجز:", width / 2 - 30, 290);
    ctx.font = "900 18px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(date, width / 2 - 30, 322);

    // 7. Discount Code & Reservation Code Highlight Section
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(40, 360, width - 80, 180);

    // Left: Discount Code Card
    ctx.fillStyle = "#FEF3C7";
    ctx.fillRect(60, 380, (width - 140) / 2 - 10, 140);
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 380, (width - 140) / 2 - 10, 140);

    ctx.textAlign = "right";
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#92400E";
    ctx.fillText("🏷️ كود الخصم المعتمد بالأكاديمية:", (width - 140) / 2 + 30, 415);

    ctx.font = "900 32px monospace";
    ctx.fillStyle = "#B45309";
    ctx.fillText(discountCode || "AM2026", (width - 140) / 2 + 30, 460);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#059669";
    ctx.fillText("✓ يُبرز عند الحضور للاستفادة من الخصم الفوري", (width - 140) / 2 + 30, 495);

    // Right: Reservation Code Card
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect((width - 140) / 2 + 80, 380, (width - 140) / 2 - 10, 140);
    ctx.strokeStyle = "#0A2463";
    ctx.lineWidth = 2;
    ctx.strokeRect((width - 140) / 2 + 80, 380, (width - 140) / 2 - 10, 140);

    ctx.textAlign = "right";
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#1E293B";
    ctx.fillText("🎫 كود تفعيل القبول المركزي:", width - 80, 415);

    ctx.font = "900 32px monospace";
    ctx.fillStyle = "#0A2463";
    ctx.fillText(reservationCode, width - 80, 460);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#0284C7";
    ctx.fillText("مقعد محجوز رسمياً بقاعدة البيانات المركزية", width - 80, 495);

    // 8. Footer Bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(40, 560, width - 80, 50);

    ctx.textAlign = "center";
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText("تأهيل ميداني معتمد 100% | بوابة المعاهد التخصصية والتدريبية الرسمية لعام 2026", width / 2, 592);

    // Draw QR code if available
    if (qrCodeDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 70, 395, 110, 110);
        resolve(canvas.toDataURL("image/png"));
      };
      qrImg.onerror = () => {
        resolve(canvas.toDataURL("image/png"));
      };
      qrImg.src = qrCodeDataUrl;
    } else {
      resolve(canvas.toDataURL("image/png"));
    }
  });
}

export function ShareableRegistrationCard({
  studentName,
  departmentName = "التخصص المختار",
  reservationCode,
  governorate = "محافظة الطالب",
  date = new Date().toLocaleDateString("ar-EG"),
  discountCode = "AM2026"
}: ShareableRegistrationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR code data URL for verification
    const textToEncode = `STUDENT:${studentName}|CODE:${reservationCode}|DISCOUNT:${discountCode}|ACADEMY:2026`;
    QRCode.toDataURL(textToEncode, {
      width: 160,
      margin: 1,
      color: {
        dark: "#0A2463",
        light: "#FFFFFF"
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error("QR Code error:", err));
  }, [studentName, reservationCode, discountCode]);

  // Safe file downloader helper
  const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 150);
  };

  // Download card as high-res PNG with multi-stage fallback
  const handleDownloadImage = async () => {
    setIsGeneratingImg(true);
    const toastId = toast.loading("جاري تجهيز وتوليد بطاقة الحجز الرسمية عالية الدقة...");

    const fileName = `بطاقة_حجز_${studentName.replace(/\s+/g, "_")}_${discountCode}.png`;

    try {
      let dataUrl = "";

      // Stage 1: Attempt html2canvas with sanitized rendering options
      if (cardRef.current) {
        try {
          const canvas = await html2canvas(cardRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#0A2463",
            logging: false,
            imageTimeout: 5000
          });
          dataUrl = canvas.toDataURL("image/png");
        } catch (domErr) {
          console.warn("html2canvas DOM capture failed, falling back to Native 2D Canvas engine:", domErr);
        }
      }

      // Stage 2: If html2canvas failed or returned empty, use ultra-reliable 2D Canvas Fallback
      if (!dataUrl || dataUrl.length < 100) {
        dataUrl = await generateCanvasCardFallback(
          studentName,
          departmentName,
          reservationCode,
          governorate,
          date,
          discountCode,
          qrCodeDataUrl
        );
      }

      if (!dataUrl) {
        throw new Error("فشل توليد محتوى الصورة");
      }

      // Trigger safe download
      triggerDownload(dataUrl, fileName);
      toast.success("تم تحميل بطاقة الحجز بنجاح! جاهزة للمشاركة على السوشيال ميديا 🎓🎉", { id: toastId });
    } catch (error) {
      console.error("Error generating card image:", error);
      // Emergency stage: fallback canvas call
      try {
        const emergencyDataUrl = await generateCanvasCardFallback(
          studentName,
          departmentName,
          reservationCode,
          governorate,
          date,
          discountCode,
          qrCodeDataUrl
        );
        if (emergencyDataUrl) {
          triggerDownload(emergencyDataUrl, fileName);
          toast.success("تم تحميل البطاقة بنجاح! 🎓", { id: toastId });
          return;
        }
      } catch (e2) {
        console.error("Emergency fallback also failed:", e2);
      }
      toast.error("عذراً، حدث خطأ أثناء تحميل الصورة. يمكنك أخذ لقطة شاشة للشاشة بدلاً من ذلك.", { id: toastId });
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const shareMessage = shareMessages.registrationCard({
    studentName,
    departmentName: departmentName || "التخصص المعتمد",
    reservationCode,
    discountCode: discountCode || DEFAULT_DISCOUNT_CODE,
  });

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  // Copy Share Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopiedText(true);
    toast.success(toastMessages.copyCardTextSuccess);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Copy Discount Code
  const handleCopyDiscountCode = () => {
    navigator.clipboard.writeText(discountCode);
    setCopiedCode(true);
    toast.success(toastMessages.copyDiscountSuccess(discountCode));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto font-sans" dir="rtl" id="shareable-card-component">
      
      {/* Card Header Label */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 text-xs font-black">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>شارة القبول وتثبيت الخصم القابلة للتحميل والمشاركة 🎓</span>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          حمل بطاقتك الرسمية كصورة عالية الجودة أو شاركها فوراً على الواتساب وفيسبوك استوري!
        </p>
      </div>

      {/* Capture Area: High-Res Social Badge Card */}
      <div 
        ref={cardRef} 
        className="relative bg-[#0A2463] text-white p-6 sm:p-8 rounded-3xl border-2 border-amber-400 shadow-2xl overflow-hidden font-sans space-y-5"
        style={{
          background: "linear-gradient(135deg, #0A2463 0%, #0D2E7D 50%, #051336 100%)"
        }}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/20 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                بوابة المعاهد والأكاديميات المعتمدة
              </span>
              <h3 className="text-sm font-black text-white">
                بطاقة إثبات حجز مقعد دراسي وتثبيت الخصم
              </h3>
            </div>
          </div>

          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>مقبول مبدئياً</span>
          </div>
        </div>

        {/* Card Main Content */}
        <div className="space-y-3.5 relative z-10 text-right">
          
          {/* Student Name */}
          <div className="bg-white/10 border border-white/15 p-4 rounded-2xl space-y-1.5">
            <div className="text-[11px] text-amber-300 font-bold">اسم الطالب المتقدم:</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {studentName}
            </div>
            {governorate && (
              <div className="text-xs text-slate-300 font-medium">
                📍 {governorate} - دفعة عام ٢٠٢٦
              </div>
            )}
          </div>

          {/* Dept and Date Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-300 font-bold block">التخصص / الشعبة المحجوزة:</span>
              <strong className="text-xs font-black text-amber-300 block leading-snug">
                {departmentName}
              </strong>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-300 font-bold block">تاريخ إصدار وتأكيد الحجز:</span>
              <strong className="text-xs font-bold text-white block">
                {date}
              </strong>
            </div>
          </div>

          {/* Discount Code & Reservation Code Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* Discount Code Card */}
            <div className="bg-amber-400/15 border-2 border-amber-400/50 p-3 rounded-2xl text-right space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-300 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>كود الخصم المعتمد:</span>
                </span>
                <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded">
                  خصم خاص
                </span>
              </div>
              <div className="font-mono text-lg font-black text-amber-300 tracking-widest">
                {discountCode}
              </div>
              <p className="text-[9px] font-bold text-amber-200/90 leading-tight">
                يُبرز عند التقديم بالأكاديمية للاستفادة من الخصم المالي
              </p>
            </div>

            {/* Central Reservation Code Card */}
            <div className="bg-white/10 border border-white/20 p-3 rounded-2xl text-right space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-300 flex items-center gap-1">
                  <Ticket className="w-3 h-3" />
                  <span>كود تفعيل القبول المركزي:</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-400">
                  مؤكد ✓
                </span>
              </div>
              <div className="font-mono text-lg font-black text-white tracking-widest">
                {reservationCode}
              </div>
              <p className="text-[9px] font-bold text-emerald-400 leading-tight">
                مقعد محجوز ومحفوظ بالنظام المركزي
              </p>
            </div>

          </div>

          {/* QR Verification section */}
          <div className="bg-white text-slate-950 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5 text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase block">
                التحقق الفوري والباركود الأكاديمي:
              </span>
              <p className="text-xs font-black text-[#0A2463]">
                كود تفعيل القبول: <span className="font-mono font-black">{reservationCode}</span> | كود الخصم: <span className="font-mono font-black text-amber-700">{discountCode}</span>
              </p>
              <p className="text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>تم تثبيت خصم المصروفات لدفعة عام 2026 بنجاح</span>
              </p>
            </div>

            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                className="w-14 h-14 rounded-lg border border-slate-200 shrink-0" 
              />
            ) : (
              <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <Award className="w-7 h-7 text-[#0A2463]" />
              </div>
            )}
          </div>

        </div>

        {/* Footer Ribbon */}
        <div className="pt-2 border-t border-white/15 text-center relative z-10">
          <p className="text-[10px] text-slate-300 font-medium">
            تأهيل ميداني معتمد 100% | بوابة المعاهد التخصصية والتدريبية الرسمية لعام 2026
          </p>
        </div>

      </div>

      {/* Sharing Action Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
        
        {/* Download Button */}
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isGeneratingImg}
          className="py-3 px-4 bg-[#0A2463] hover:bg-[#071946] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
          id="download-card-image-btn"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>{isGeneratingImg ? "جاري التوليد والتحميل..." : "تحميل البطاقة صورة PNG"}</span>
        </button>

        {/* WhatsApp Share Button */}
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          id="whatsapp-share-card-btn"
        >
          <MessageCircle className="w-4 h-4" />
          <span>مشاركة الواتساب</span>
        </button>

        {/* Copy Discount Code / Text Button */}
        <button
          type="button"
          onClick={handleCopyDiscountCode}
          className="py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          id="copy-discount-code-btn"
        >
          {copiedCode ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>تم نسخ كود {discountCode}! ✓</span>
            </>
          ) : (
            <>
              <Tag className="w-4 h-4 text-amber-300" />
              <span>نسخ كود الخصم ({discountCode})</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
}
