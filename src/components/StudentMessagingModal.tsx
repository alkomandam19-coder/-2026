import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  MessageSquare, 
  Phone, 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  UserCheck, 
  ExternalLink,
  MessageCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { studentMessages, DEFAULT_DISCOUNT_CODE } from "../utils/messages";

export interface StudentLeadForMessage {
  id: string | number;
  studentName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  basicCourse?: string;
  selectedDepartments?: string[];
  reservationCode?: string;
  agentName?: string;
  governorate?: string;
  educationLevel?: string;
}

interface StudentMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentLeadForMessage | null;
  onLoggedAction?: (studentId: string | number, actionSummary: string) => void;
}

type TemplateKey = "visit_reminder" | "discount_expiry" | "form_link" | "welcome_followup" | "custom";

export function StudentMessagingModal({
  isOpen,
  onClose,
  student,
  onLoggedAction,
}: StudentMessagingModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("visit_reminder");
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);
  const [targetChannel, setTargetChannel] = useState<"whatsapp" | "sms">("whatsapp");

  // Prevent background scroll when modal is open
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

  if (!isOpen || !student) return null;

  const studentName = student.studentName || "عزيزنا الطالب";
  const specialty = 
    student.selectedDepartments && student.selectedDepartments.length > 0 
      ? student.selectedDepartments[0] 
      : student.basicCourse?.replace("دورة ", "") || "التخصص المعتمد";
  const reservationCode = student.reservationCode || "1024";
  const agentName = student.agentName?.trim() || "مستشار القبول والتسجيل";
  
  // Format target phones for Egyptian numbers
  const rawTargetPhone = (targetChannel === "whatsapp" && student.whatsappNumber) 
    ? student.whatsappNumber 
    : student.phoneNumber;
  
  const cleanPhoneDigits = rawTargetPhone.replace(/\D/g, "");
  const formattedEgyptianWa = cleanPhoneDigits.startsWith("20")
    ? cleanPhoneDigits
    : cleanPhoneDigits.startsWith("0")
    ? `20${cleanPhoneDigits.slice(1)}`
    : `20${cleanPhoneDigits}`;

  const extractionLink = typeof window !== "undefined" 
    ? `${window.location.origin}/form-extraction?code=${reservationCode}&phone=${student.phoneNumber}`
    : `https://eg-academies.com/form-extraction?code=${reservationCode}`;

  // Pre-configured dynamic Arabic message templates from central messages utility
  const TEMPLATES: Record<TemplateKey, { title: string; icon: any; color: string; generate: () => string }> = {
    visit_reminder: {
      title: "تذكير بموعد زيارة الأكاديمية 🏛️",
      icon: Calendar,
      color: "from-blue-600 to-indigo-700",
      generate: () => studentMessages.visitReminder({ studentName, specialty, reservationCode, discountCode: DEFAULT_DISCOUNT_CODE })
    },
    discount_expiry: {
      title: "تنبيه بقرب انتهاء مدة كود الخصم ⏳",
      icon: AlertTriangle,
      color: "from-amber-600 to-orange-700",
      generate: () => studentMessages.discountExpiry({ studentName, specialty, reservationCode, discountCode: DEFAULT_DISCOUNT_CODE })
    },
    form_link: {
      title: "إرسال رابط الاستمارة المباشر 📑",
      icon: FileText,
      color: "from-emerald-600 to-teal-700",
      generate: () => studentMessages.formLink({ studentName, specialty, reservationCode, discountCode: DEFAULT_DISCOUNT_CODE, extractionLink })
    },
    welcome_followup: {
      title: "متابعة ترحيبية وتأكيد الحجز 🌟",
      icon: UserCheck,
      color: "from-purple-600 to-indigo-700",
      generate: () => studentMessages.welcomeFollowup({ studentName, specialty, reservationCode, discountCode: DEFAULT_DISCOUNT_CODE, agentName })
    },
    custom: {
      title: "رسالة مخصصة (كتابة حرة) ✍️",
      icon: Sparkles,
      color: "from-slate-700 to-slate-900",
      generate: () => customText
    }
  };

  const activeMessageText = selectedTemplate === "custom" 
    ? customText 
    : TEMPLATES[selectedTemplate].generate();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessageText).then(() => {
      setCopied(true);
      toast.success("تم نسخ نص الرسالة للحافظة بنجاح!");
      setTimeout(() => setCopied(false), 2500);
      if (onLoggedAction) {
        onLoggedAction(student.id, `نسخ رسالة (${TEMPLATES[selectedTemplate].title})`);
      }
    });
  };

  const handleSendWhatsApp = () => {
    if (!activeMessageText.trim()) {
      toast.error("الرسالة فارغة، يرجى كتابة نص الرسالة أولاً.");
      return;
    }
    const encoded = encodeURIComponent(activeMessageText);
    const waUrl = `https://wa.me/${formattedEgyptianWa}?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast.success("تم فتح محادثة الواتساب وتجهيز الرسالة التلقائية بنجاح! 🚀");
    if (onLoggedAction) {
      onLoggedAction(student.id, `إرسال واتساب: ${TEMPLATES[selectedTemplate].title}`);
    }
    onClose();
  };

  const handleSendSMS = () => {
    if (!activeMessageText.trim()) {
      toast.error("الرسالة فارغة.");
      return;
    }
    const encoded = encodeURIComponent(activeMessageText);
    const smsUrl = `sms:${rawTargetPhone}?body=${encoded}`;
    window.location.href = smsUrl;
    toast.success("جاري فتح تطبيق الرسائل القصيرة SMS...");
    if (onLoggedAction) {
      onLoggedAction(student.id, `إرسال SMS: ${TEMPLATES[selectedTemplate].title}`);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 top-0 left-0 w-screen h-screen bg-slate-950/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain font-sans" 
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto relative animate-scale-up text-right transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>إرسال إشعار ومتابعة فورية للطالب</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  بنقرة واحدة ⚡
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                الطالب: <strong className="text-amber-300 font-bold">{studentName}</strong> | كود: <strong className="font-mono text-emerald-300">#{reservationCode}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 bg-white/5 hover:bg-white/15 rounded-xl cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          
          {/* Student Info Bar */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">الهاتف المستهدف:</span>
              <strong className="font-mono text-slate-900 text-sm font-black">{rawTargetPhone}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTargetChannel("whatsapp")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  targetChannel === "whatsapp" 
                    ? "bg-emerald-600 text-white shadow-xs" 
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب {student.whatsappNumber ? "(الرقم المخصص)" : ""}</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetChannel("sms")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  targetChannel === "sms" 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>رسائل SMS</span>
              </button>
            </div>
          </div>

          {/* Quick Template Selector Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700">
              اختر قالب المتابعة الجاهز (سيتم تخصيص البيانات تلقائياً):
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => {
                const item = TEMPLATES[key];
                const IconComp = item.icon;
                const isSelected = selectedTemplate === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(key);
                      if (key === "custom" && !customText) {
                        setCustomText(TEMPLATES.visit_reminder.generate());
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-400"
                        : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-600"
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-extrabold truncate">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Preview & Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700 flex items-center gap-1.5">
                <span>معاينة وتعديل نص الرسالة:</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">({activeMessageText.length} حرف)</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ ✓" : "نسخ النص"}</span>
              </button>
            </div>

            {selectedTemplate === "custom" ? (
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={5}
                placeholder="اكتب رسالتك المخصصة هنا..."
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed text-right"
              />
            ) : (
              <div 
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line text-right select-text cursor-text"
              >
                {activeMessageText}
              </div>
            )}
          </div>

          {/* Direct CTA Send Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              style={{ minHeight: "46px" }}
            >
              <MessageCircle className="w-4 h-4 text-emerald-100" />
              <span>إرسال مباشر عبر الواتساب (WhatsApp Web/App) 🚀</span>
            </button>

            <button
              type="button"
              onClick={handleSendSMS}
              className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              style={{ minHeight: "46px" }}
              title="إرسال رسالة نصية قصيرة عادية"
            >
              <Phone className="w-3.5 h-3.5 text-slate-300" />
              <span>إرسال SMS 📱</span>
            </button>
          </div>

          {/* Quick Tip Footer */}
          <p className="text-[10.5px] text-slate-400 text-center font-medium leading-normal pt-1">
            💡 بالضغط على إرسال، سيتم فتح محادثة الواتساب الخاصة بالطالب وتعبئة النص مباشرة للإرسال الفوري.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
