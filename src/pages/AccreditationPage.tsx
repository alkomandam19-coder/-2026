import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudentCertificates } from "../components/StudentCertificates";
import { Award, ShieldAlert, CheckCircle } from "lucide-react";

export default function AccreditationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الشهادات المعتمدة وتأجيل التجنيد للطلاب | بوابة المعاهد الخاصة";
  }, []);

  const handleNavigateToBooking = () => {
    navigate("/discounts");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Intro */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-right space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">
                الشهادات المعتمدة
              </h1>
              <p className="text-xs text-slate-500 font-bold">
                كل ما تحتاج لمعرفته حول الاعتمادات المهنية والتدريبات الفنية الجارية.
              </p>
            </div>
          </div>
          
          <p className="text-xs text-slate-650 leading-relaxed font-sans max-w-3xl">
            استعرض التفاصيل الكاملة للمستندات المطلوبة للتأجيل المعتمدة طوال سنوات دراستك بالأكاديمية والشهادات المهنية الموثقة التي تستلمها فور التخرج لتعزيز حظوظك في سوق العمل والمشاريع الخاصة.
          </p>
        </div>

        {/* Certificates & Enlistment content */}
        <StudentCertificates onNavigateToBooking={handleNavigateToBooking} />

      </div>
    </div>
  );
}
