import React, { useState } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { Send, Check, Loader2, MessageSquare, AlertTriangle, Sparkles, User, Phone, ShieldAlert } from "lucide-react";

export function ComplaintsForm() {
  const isOnline = useNetworkStatus();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [type, setType] = useState<"complaint" | "suggestion">("complaint");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [complianceChecked, setComplianceChecked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const isPhoneValid = (num: string) => {
    return num.length === 11 && /^(010|011|012|015)/.test(num);
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      setPhoneNumber(clean);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complianceChecked) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setError("يرجى التكرم بالموافقة على إقرار شروط القبول أولاً للمتابعة");
      return;
    }
    if (!text.trim()) {
      setError("الرجاء كتابة تفاصيل الشكوى أو المقترح أولاً.");
      return;
    }

    if (phoneNumber.trim() && !isPhoneValid(phoneNumber)) {
      setError("رقم الهاتف غير صحيح. يجب أن يتكون من 11 رقماً ويبدأ بأحد البوادئ المصرية الصحيحة (010, 011, 012, 015).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: name,
          phoneNumber,
          type,
          text,
          complianceLevelChecked: true,
          consentTimestamp: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "عذراً فشل إرسال طلبك.");
      }

      setSuccess(data.message || "تم تسليم طلبكم بنجاح ومباشرة للإدارة العليا.");
      setName("");
      setPhoneNumber("");
      setText("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشلت عملية الإرسال، نرجو التحقق من اتصالك بالإنترنت والمحاولة مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs text-right font-sans" dir="rtl" id="complaints-form-panel">
      {/* Top Graphic Banner */}
      <div className="h-2 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"></div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-slate-900 font-sans">صوتك مسموع 📢 الشكاوى والمقترحات السرية</h3>
            <p className="text-xs text-slate-500">منظومة إلكترونية متكاملة تصل مباشرة وبسرية تامة لمدير عام المعاهد والأكاديميات للبت الفوري بها.</p>
          </div>
        </div>

        {/* Informative Security Banner */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-650 space-y-1.5 leading-relaxed">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>تأكيد سرية البيانات والأمان المطلق:</span>
          </p>
          <p>تضمن إدارة الأكاديمية عدم الكشف عن هوية المرسل لأي معلم أو موظف استقبال، وتتم مراجعة كافة الشكاوى والمقترحات بواسطة مستشاري الإدارة العليا لتطوير مستمر وحماية مصالح طلابنا.</p>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 animate-fade-in" id="complaint-success">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-950 text-md">تم الاستلام بنجاح وبسرية تامة</h4>
            <p className="text-emerald-800 text-xs leading-relaxed max-w-sm mx-auto">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              تقديم شكوى أو مقترح إضافي
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Complaint / Suggestion Toggle options */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">نوع الطلب المرسل:</label>
              <div className="grid grid-cols-2 gap-3" id="complaint-type-toggles">
                <button
                  type="button"
                  onClick={() => setType("complaint")}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                    type === "complaint"
                      ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/10"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>تقديم شكوى فنية/إدارية ⚠️</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType("suggestion")}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                    type === "suggestion"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/10"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>اقتراح فكرة لتطوير الموقع 💡</span>
                </button>
              </div>
            </div>

            {/* Optional Personal Info Row */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1 flex items-center gap-1" htmlFor="comp-name">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>الاسم: <span className="text-slate-400 text-[10px] font-medium">(اختياري)</span></span>
                </label>
                <input
                  id="comp-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك (اختياري)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-navy/15 text-xs text-right font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1 flex items-center gap-1" htmlFor="comp-phone">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>الهاتف: <span className="text-slate-400 text-[10px] font-medium">(اختياري)</span></span>
                </label>
                <div className="relative">
                  <input
                    id="comp-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-navy/15 text-xs text-right font-semibold font-mono"
                  />
                  {isPhoneValid(phoneNumber) && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-emerald-600 bg-emerald-50 p-1 rounded-full border border-emerald-200 animate-scale-up" title="رقم صحيح">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Requirement Text */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5" htmlFor="comp-text">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span>تفاصيل الشكوى أو الاقتراح: <span className="text-rose-500 font-bold">*</span></span>
              </label>
              <textarea
                id="comp-text"
                value={text}
                required
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  type === "complaint"
                    ? "الرجاء شرح المشكلة أو العقبة الإدارية/الفنية بالتفصيل لكي نخدمك بأفضل وسيلة..."
                    : "اكتب فكرتك أو التعديل الذي تقترحه لتطوير المعاهد والأكاديميات لتسريع استفادة الطلاب..."
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/15 text-right resize-none h-32"
              />
            </div>

            {/* Legal Compliance Checkbox */}
            <div 
              className={`p-3.5 rounded-xl border text-right transition-all leading-normal ${
                !complianceChecked 
                  ? "bg-slate-50 border-r-4 border-r-rose-500 border-slate-200" 
                  : "bg-emerald-500/5 border-r-4 border-r-emerald-500 border-emerald-500/10"
              }`}
              id="complaint-compliance-checkbox-wrapper"
            >
              <label htmlFor="complaint-compliance-checkbox" className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="complaint-compliance-checkbox"
                  type="checkbox"
                  checked={complianceChecked}
                  onChange={(e) => {
                    setComplianceChecked(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  className="mt-0.5 w-4.5 h-4.5 accent-emerald-600 rounded-sm cursor-pointer shrink-0"
                />
                <span className="text-[11px] font-bold text-slate-800 leading-relaxed block">
                  ☑️ أقر أنا المتقدم (أو ولي الأمر) باطلاعي وموافقتي الكاملة على شروط وأحكام منصة القبول المباشر، وأعلم تمام العلم أن هذه المنصة هي بوابة تدريبية وتأهيلية مهنية خاصة غير خاضعة لنظام التنسيق الحكومي، وأن البرامج تهدف لتطوير المهارات العملية الفنية اللازمة والربط المباشر مع سوق العمل والشراكات المؤسسية.
                </span>
              </label>
            </div>

            {/* Light Network Status Indicator */}
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-xl py-2 px-3.5 select-none text-right">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-ping"}`} />
                <span className={isOnline ? "text-slate-500 font-semibold" : "text-rose-650"}>
                  {isOnline ? "حالة الاتصال المركزي: متصل وآمن للتقديم المباشر" : "انتبه: غير متصل بالإنترنت! يرجى فحص الشبكة لضمان الإرسال"}
                </span>
              </div>
              <span className="text-slate-400">بوابة الدعم v1.0</span>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-800 border-r-4 border-rose-500 rounded-xl text-xs font-bold leading-normal">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition select-none hover:shadow-md ${
                isShaking ? "animate-shake" : ""
              } ${
                isLoading 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : !complianceChecked
                  ? "bg-brand-navy/60 hover:bg-brand-navy/70"
                  : "bg-brand-navy hover:bg-slate-900 active:scale-98"
              }`}
              style={{ minHeight: "44px" }}
              id="submit-complaint-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسليم طلبك الآن للقسم الخاص...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال الطلب بشكل آمن وسري تماماً 🔒</span>
                </>
              )}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
