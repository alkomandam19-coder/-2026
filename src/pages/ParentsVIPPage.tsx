import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, PhoneCall, HeartHandshake, Sparkles, Building2, CheckCircle } from "lucide-react";
import { ParentsVIPAssurance } from "../components/InteractiveMarketingSuite";

export default function ParentsVIPPage() {
  React.useEffect(() => {
    document.title = "استشارة ولي الأمر ونظام التقسيط 2026 | بوابة المعاهد الخاصة";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link to="/" className="hover:text-[#0A2463] transition-colors">الرئيسية</Link>
          <span>/</span>
          <span className="text-slate-900 font-extrabold">رسالة واستشارة ولي الأمر ونظام التقسيط</span>
        </div>

        {/* Hero Banner Header */}
        <div className="bg-gradient-to-br from-[#0A2463] via-slate-900 to-[#102a6b] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-right relative overflow-hidden">
          <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
            <HeartHandshake className="w-64 h-64 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>رسالة إدارية رسمية لكافة أولياء الأمور 🏛️</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-sans leading-tight text-white">
            تقديم طلب استشارة ولي الأمر المباشرة ونظام التقسيط ☎️
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-3xl">
            نحرص بالبوابة على بناء جسور الثقة الكاملة مع ولي الأمر، وتقديم توضيح شامل وشفاف لجميع جوانب المصروفات الرسمية ونظام التقسيط المتاح، بالإضافة إلى تقديم خدمة الاستشارة الهاتفية المباشرة مع مستشار التنسيق لضمان مستقبل الطالب.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-amber-200">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>متابعة هاتفية مخصصة لولي الأمر</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>نظام تقسيط شهري أو ترمي مريح</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>توضيح كامل لكافة اعتمادات الأكاديمية</span>
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-right shadow-3xs">
            <span className="text-2xl">💰</span>
            <h3 className="font-extrabold text-sm text-[#0A2463]">1. مرونة كاملة في السداد</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              إمكانية تقسيط المصروفات الدراسية على فترات شهرية أو كل ترم دراسي لتخفيف الأعباء المالية على الأسرة.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-right shadow-3xs">
            <span className="text-2xl">🤝</span>
            <h3 className="font-extrabold text-sm text-[#0A2463]">2. جلسة استشارة هاتفية</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              اتصال هاتفي مخصص من المستشار المالي للتنسيق للإجابة عن كافة أسئلة ولي الأمر في الموعد المفضل له.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-right shadow-3xs">
            <span className="text-2xl">📜</span>
            <h3 className="font-extrabold text-sm text-[#0A2463]">3. الإفصاح عن الاعتمادات</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              توضيح قانوني شفاف ومباشر حول الاعتمادات المهنية والتطبيقيّة والفرق بينها وبين المسارات الأكاديمية.
            </p>
          </div>
        </div>

        {/* Main Embedded Interactive Suite */}
        <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#0A2463]">
              استمارة استدعاء مستشار القبول ونظام الأقساط 📝
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              يرجى ملء البيانات بالأسفل لتلقي الاتصال الهاتفي وتنسيق خيارات السداد والتقسيط
            </p>
          </div>

          <div className="pt-2">
            <ParentsVIPAssurance />
          </div>
        </div>

        {/* Additional FAQs for Parents */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-3xs space-y-4 text-right">
          <h3 className="font-black text-base text-[#0A2463] flex items-center gap-2">
            <span>❓ أسئلة شائعة تهم أولياء الأمور:</span>
          </h3>

          <div className="space-y-3 divide-y divide-slate-100">
            <div className="pt-2">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">هل المصروفات شاملة الكتب والنزول الميداني والمعامل؟</h4>
              <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                نعم، يتم توضيح كافة الرسوم بشفافية تامّة بدون أي مصاريف خفية أو مفاجآت خلال فترة الدراسة.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">كيف يتم الاتفاق على نظام أقساط المصروفات؟</h4>
              <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                بعد تسجيل استمارة ولي الأمر بالمنصة، يتواصل مع سيادتكم مستشار التنسيق المالي لتحديد جدول الأقساط المناسب (شهري أو ترمي) وتثبيته في استمارة القبول.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">هل يمكن لولي الأمر زيارة مقر الأكاديمية والمعامل مسبقاً؟</h4>
              <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                بالتأكيد! نرحب بكافة أولياء الأمور والطلاب لزيارة مقر الأكاديمية والاطلاع على المعامل والمختبرات قبل دفع أي رسوم إدارية.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
