import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, TrendingUp, DollarSign, Award, Briefcase, Calculator, Sparkles, CheckCircle } from "lucide-react";
import { ROIProfessionalCalculator } from "../components/InteractiveMarketingSuite";
import { ACADEMY_DEPARTMENTS } from "../data";

export default function ROICalculatorPage() {
  React.useEffect(() => {
    document.title = "حاسبة العائد المهني والـ ROI لعام 2026 | بوابة المعاهد والأكاديميات الخاصّة";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link to="/" className="hover:text-[#0A2463] transition-colors">الرئيسية</Link>
          <span>/</span>
          <span className="text-slate-900 font-extrabold">حاسبة العائد المهني واستعادة الاستثمار (ROI)</span>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#0A2463] via-slate-900 to-[#102a6b] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-right relative overflow-hidden">
          <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
            <TrendingUp className="w-64 h-64 text-emerald-400" />
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>دراسة جدوى واقتصاديات التعليم 2026 📈</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-sans leading-tight text-white">
            حاسبة العائد المهني واستعادة الاستثمار (ROI Professional Calculator) 📈
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-3xl">
            احسب التكلفة الإجمالية لدراستك التطبيقية مقارنة بالرواتب والمتوسطات التقديرية المتوقعة للخريجين في سوق العمل المصري والإقليمي. التعلم الاستثماري الذكي يضمن لك استرداد مصروفاتك في أسرع فترة زمنية.
          </p>
        </div>

        {/* Interactive ROI Calculator Component */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <ROIProfessionalCalculator />
        </div>

        {/* Quick Market Overview Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 text-right">
          <h2 className="text-lg font-black text-[#0A2463]">
            📊 نظرة سريعة على متوسطات أجور الورش والأقسام (تقديري لعام 2026):
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACADEMY_DEPARTMENTS.slice(0, 6).map((dept) => (
              <div key={dept.id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2 text-right hover:border-emerald-500/30 transition">
                <span className="text-xs font-black text-[#0A2463] block truncate">{dept.name}</span>
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 border-t border-slate-200 pt-2">
                  <span>المستقبل المهني:</span>
                  <span className="text-emerald-600 font-black">طلب مرتفع بسوق العمل</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                  <span>مدة الدراسة:</span>
                  <span>سنتان دراسيتان (تطبيقي)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Callout */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <h3 className="text-base sm:text-lg font-black text-white">جاهز لبدء رحلتك وحجز مقعدك بالقسم المناسب؟</h3>
            <p className="text-xs text-emerald-100 font-medium">احصل على خصم التسجيل المبكر وحافظ على أسعار المصروفات التفضيلية اليوم.</p>
          </div>
          <Link
            to="/discounts"
            className="bg-white text-emerald-950 hover:bg-emerald-50 px-6 py-3 rounded-2xl text-xs font-black transition whitespace-nowrap shadow-md inline-flex items-center gap-2"
          >
            <span>احجز الخصم الآن 🏷️</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
