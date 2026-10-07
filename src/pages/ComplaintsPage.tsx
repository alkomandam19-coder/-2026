import React, { useEffect } from "react";
import { ComplaintsForm } from "../components/ComplaintsForm";
import { ShieldAlert, Mail } from "lucide-react";

export default function ComplaintsPage() {
  useEffect(() => {
    document.title = "مكتب الشكاوى والمقترحات للعملاء | بوابة المعاهد الخاصة";
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Intro */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-right space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">
                مكتب خدمة العملاء والشكاوى والمقترحات
              </h1>
              <p className="text-xs text-slate-500 font-bold">
                نسعد باستلام مقترحاتكم وسماع شكواكم لمعالجتها بمنتهى الدقة والاهتمام الفوري بالبوابة.
              </p>
            </div>
          </div>
          
          <p className="text-xs text-slate-650 leading-relaxed font-sans max-w-3xl">
            إذا قمت بالتسجيل وواجهت أي مغالطات أو سلوكيات غير مهنية من مندوبي القبول بالمعاهد والأكاديميات الخاصة، أو واجهت مشكلة تقنية بالبوابة، يرجى كتابة التفاصيل مباشرة وسيتولى فريق المراقبة مراجعة السجل وحظر الكيان المخالف فوراً.
          </p>
        </div>

        {/* Complaints form */}
        <div className="text-right">
          <ComplaintsForm />
        </div>

      </div>
    </div>
  );
}
