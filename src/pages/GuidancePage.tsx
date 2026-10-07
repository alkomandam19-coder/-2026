import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CareerQuiz } from "../components/CareerQuiz";
import { Department } from "../data";
import { Compass, Sparkles, ShieldCheck } from "lucide-react";

export default function GuidancePage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "مستشار التوجيه الأكاديمي واكتشاف تخصصك الدراسي | بوابة المعاهد الخاصة";
  }, []);

  const handleSelectDepartmentForBooking = (dept: Department) => {
    navigate(`/discounts?preselected=${dept.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Intro layout */}
        <div className="bg-[#0A2463] text-white p-6 sm:p-8 rounded-3xl border border-slate-800 text-right space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 text-slate-850 opacity-20 transform -translate-x-4 -translate-y-4">
            <Compass className="w-48 h-48" />
          </div>

          <div className="flex items-center gap-2.5 relative z-10">
            <Sparkles className="w-5.5 h-5.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs font-black tracking-wider text-amber-400">مستشار التوجيه الأكاديمي واختيار التخصص الدراسي</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white relative z-10 leading-tight">
            اختبار تحديد التخصص والمسار الدراسي المناسب لك 🧭
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans relative z-10 max-w-2xl font-semibold">
            هل أنت متردد في اختيار قسم الدراسة المناسب لك؟ أجب بصدق على هذه الأسئلة البسيطة ليقوم نظام التوجيه الذكي بتحليل مهاراتك وترشيح القسم الأكثر مواءمة لاهتماماتك وقدراتك الفعلية.
          </p>
        </div>

        {/* Core Quiz Module */}
        <div className="text-right">
          <CareerQuiz 
            onSelectDepartment={handleSelectDepartmentForBooking} 
          />
        </div>

      </div>
    </div>
  );
}
