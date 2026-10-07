import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Calendar, ShieldCheck, Microscope, Users, Sparkles, Clock, CheckCircle } from "lucide-react";
import { FreeShadowingTicketBooking } from "../components/InteractiveMarketingSuite";

export default function LabExperiencePage() {
  React.useEffect(() => {
    document.title = "يوم المعايشة التجريبي للمعامل 2026 | بوابة المعاهد والأكاديميات الخاصّة";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link to="/" className="hover:text-[#0A2463] transition-colors">الرئيسية</Link>
          <span>/</span>
          <span className="text-slate-900 font-extrabold">يوم المعايشة والنزول الميداني للمعامل</span>
        </div>

        {/* Hero Banner Header */}
        <div className="bg-gradient-to-br from-[#0A2463] via-slate-900 to-[#102a6b] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-right relative overflow-hidden">
          <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
            <Microscope className="w-64 h-64 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مفاجأة دفعة 2026 الحصرية للزيارات والمقاعد 🔬</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-sans leading-tight text-white">
            يوم المعايشة التجريبي المجاني والنزول الفعلي للمعامل 🏫
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-3xl">
            افتح أبواب التجربة الواقعية! تتيح لك الأكاديميات فرصة الاستضافة الحرة ليوم كامل داخل المعامل المركزية، حضور ورش تطبيقية تفاعلية، ومعاينة المعدات والأجهزة مع طلبة الدفعة قبل سداد أي مصروفات إدارية.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-amber-200">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>مدة الزيارة: 3 ساعات تفاعلية</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>رسوم التصريح: مجاني 100%</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>يشمل استشارة مع مشرف المعمل</span>
            </span>
          </div>
        </div>

        {/* Free Ticket Booking Widget Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#0A2463]">
              تأكيد واستخراج تذكرة يوم المعايشة الميدانية 🎫
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              اختر الشعبة والفرع والتاريخ المناسب لك للحصول على تصريح الدخول الفوري للمعامل
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <FreeShadowingTicketBooking />
          </div>
        </div>

        {/* What Happens in Lab Shadowing Day */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-right shadow-3xs">
            <span className="text-2xl">🧪</span>
            <h3 className="font-extrabold text-sm text-[#0A2463]">1. المعاينة المباشرة للمعدات</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              تجربة الأجهزة الطبية والمخبرية أو أجهزة الحاسب الآلي ومعدات المساحة بنفسك تحت إشراف المحاضرين.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-right shadow-3xs">
            <span className="text-2xl">👥</span>
            <h3 className="font-extrabold text-sm text-[#0A2463]">2. التواصل مع طلاب الدفعة</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              الحديث مع الطلاب المقيدين حالياً للتعرف على انطباعاتهم الحقيقية عن قوة الشرح وجودة التدريب.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-right shadow-3xs">
            <span className="text-2xl">📑</span>
            <h3 className="font-extrabold text-sm text-[#0A2463]">3. الاستشارة الأكاديمية المجانية</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              جلسة خاصة مع مستشار القبول لتلقي إجابات شفافة عن كافة تساؤلاتك حول المصروفات والاعتمادات.
            </p>
          </div>
        </div>

        {/* Action CTA Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-3xl text-center space-y-4">
          <h3 className="text-lg font-black text-[#0A2463]">ترغب في التقديم والتسجيل المباشر لحفظ المقعد والخصم؟</h3>
          <p className="text-xs sm:text-sm text-slate-600 font-semibold max-w-xl mx-auto">
            يمكنك الانتقال لبوابة الخصومات لتسجيل بياناتك وحفظ كود التخفيض المعتمد لعام 2026 الآن.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/discounts"
              className="bg-[#0A2463] text-white hover:bg-slate-900 px-6 py-3 rounded-2xl text-xs font-black transition shadow-md inline-flex items-center gap-2"
            >
              <span>احجز مقعدك وتثبيت الخصم المالي 🏷️</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="bg-white text-slate-700 hover:bg-slate-100 px-6 py-3 rounded-2xl text-xs font-bold border border-slate-200 transition inline-flex items-center gap-2"
            >
              <span>العودة للرئيسية 🏠</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
