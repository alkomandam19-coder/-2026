import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileSearch, ShieldCheck, CheckCircle2, Clock, PhoneCall, HelpCircle } from "lucide-react";
import { LiveApplicationTrackAndTrace } from "../components/InteractiveMarketingSuite";

export default function ApplicationTrackerPage() {
  React.useEffect(() => {
    document.title = "تتبع حالة الملف التقديمي الفوري | بوابة المعاهد والأكاديميات الخاصّة";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link to="/" className="hover:text-[#0A2463] transition-colors">الرئيسية</Link>
          <span>/</span>
          <span className="text-slate-900 font-extrabold">تتبع حالة ملف التقديم الحية</span>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#0A2463] via-slate-900 to-[#102a6b] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-right relative overflow-hidden">
          <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
            <FileSearch className="w-64 h-64 text-cyan-400" />
          </div>

          <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 px-3 py-1 rounded-full text-xs font-black">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>نظام التدقيق والمتابعة اللحظية 2026 🔍</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-sans leading-tight text-white">
            تتبع وتفقد حالة ملفك التقديمي الفوري (Live Application Tracker) 🔍
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-3xl">
            أدخل رقم هاتفك أو كود الحجز المركزي للتعرف المباشر على موقف ملفك الدراسي، حالة مراجعة المستندات، تأكيد تخصيص المقعد بالقسم، وجاهزية طباعة استمارة القبول الموحدة.
          </p>
        </div>

        {/* Live Application Tracker Tool */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <LiveApplicationTrackAndTrace />
        </div>

        {/* Status Stages Guide */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 text-right">
          <h2 className="text-lg font-black text-[#0A2463] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>مراحل فحص وتدقيق الملفات في البوابة المركزيّة:</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-right space-y-1">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-extrabold text-xs text-slate-900">استلام طلب الحجز</h3>
              <p className="text-[11px] text-slate-500 font-semibold">تسجيل البيانات وتحديد الشعبة المرغوبة إلكترونياً.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-right space-y-1">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-extrabold text-xs text-slate-900">فحص وتدقيق المؤهل</h3>
              <p className="text-[11px] text-slate-500 font-semibold">مراجعة نوع المؤهل والتأكد من استيفاء الشروط المبدئية.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-right space-y-1">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">3</span>
              <h3 className="font-extrabold text-xs text-slate-900">تأكيد حجز المقعد</h3>
              <p className="text-[11px] text-slate-500 font-semibold">تثبيت الخصم المالي المتاح وتجهيز ملف الطالب بالأكاديمية.</p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-right space-y-1">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">4</span>
              <h3 className="font-extrabold text-xs text-emerald-900">طباعة الاستمارة</h3>
              <p className="text-[11px] text-emerald-700 font-semibold">استخراج وتنزيل كارت التسجيل الموحد الجاهز للتسليم.</p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-[#0A2463] text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <h3 className="text-base sm:text-lg font-black text-white">لم تجد بيانات ملفك أو تحتاج مساعدة فورية؟</h3>
            <p className="text-xs text-slate-300 font-medium">تواصل مع قسم المراجعة والتحقق لمساعدتك في استخراج بيانات حجزك.</p>
          </div>
          <Link
            to="/complaints"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 rounded-2xl text-xs font-black transition whitespace-nowrap shadow-md inline-flex items-center gap-2"
          >
            <span>تقديم استفسار أو بلاغ متابعة 📞</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
