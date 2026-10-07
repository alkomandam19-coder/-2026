import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Map, Compass, Award, Rocket, CheckCircle, GraduationCap } from "lucide-react";
import { CareerPathRoadmap, InteractiveMajorSimulator } from "../components/InteractiveMarketingSuite";

export default function CareerRoadmapPage() {
  React.useEffect(() => {
    document.title = "خريطة طريق المستقبل المهني 2026 | بوابة المعاهد والأكاديميات الخاصّة";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link to="/" className="hover:text-[#0A2463] transition-colors">الرئيسية</Link>
          <span>/</span>
          <span className="text-slate-900 font-extrabold">خريطة طريق المستقبل المهني والنمو الوظيفي</span>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#0A2463] via-slate-900 to-[#102a6b] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-right relative overflow-hidden">
          <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
            <Map className="w-64 h-64 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-3 py-1 rounded-full text-xs font-black">
            <Compass className="w-3.5 h-3.5" />
            <span>التخطيط الأكاديمي والمهني المحترف لعام 2026 🗺️</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-sans leading-tight text-white">
            خريطة طريق مستقبلك المهني والنمو الوظيفي لعام 2026 🗺️
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-3xl">
            استكشف بالتفصيل المحطات الأربعة الرئيسية لرحلتك الأكاديمية والمهنية بدءاً من التقديم والتدريب بالمعامل، مروراً بالحصول على الشهادات والاعتمادات، وحتى الانضمام المباشر لسوق العمل.
          </p>
        </div>

        {/* Interactive Career Roadmap Component */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <CareerPathRoadmap />
        </div>

        {/* Major Simulator Component */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <InteractiveMajorSimulator />
        </div>

        {/* Guidance Quiz Callout */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <h3 className="text-base sm:text-lg font-black text-amber-400">هل تحتاج مساعدة في اختيار التخصص الأنسب لك؟</h3>
            <p className="text-xs text-slate-300 font-medium">قم بإجراء اختبار التوجيه المهني الذكي المجاني لتحديد ميولك وتلقي ترشيحات دقيقة.</p>
          </div>
          <Link
            to="/guidance"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 rounded-2xl text-xs font-black transition whitespace-nowrap shadow-md inline-flex items-center gap-2"
          >
            <span>خوض اختبار التوجيه الذكي 🧭</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
