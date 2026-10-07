import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { StudentBookingForm } from "../components/StudentBookingForm";
import { Ticket, AlertTriangle, ShieldCheck } from "lucide-react";

export default function DiscountsPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    document.title = "تثبيت وحجز خصومات المصروفات الفورية | بوابة المعاهد الخاصة";
  }, []);
  const preSelected = searchParams.get("preselected");
  const preselectedDepts = preSelected ? [preSelected] : [];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Booking Form Area */}
        <div className="lg:col-span-8">
          <StudentBookingForm preselectedDepts={preselectedDepts} />
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Discount Policy Info */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-900 text-right space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Ticket className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-sm font-sans">تنبيه حيازة تذكرة الخصم 🎟️</h3>
            </div>
            
            <p className="text-xs text-slate-350 leading-relaxed font-sans">
              عند إتمام استمارة حجز مقعدك وتلقي تذكرة الخصم الفورية بالبوابة، يتم حجز الرقم التسلسلي المميز الخاص بك مجاناً بالكامل دون أي رسوم تقديم مبدئية.
            </p>

            <ul className="space-y-2 text-xs font-semibold text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>تثبيت خصم المصروفات للعام الجديد</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>أولوية الاتصال الهاتفي والتنسيق الفردي</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>فرص الانضمام للقوافل الميدانية والتدريب</span>
              </li>
            </ul>
          </div>

          {/* Verification Shield */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3.5 text-right">
            <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>خصوصية وسرية البيانات مشددة 🔒</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              إن أرقام هواتف الطلاب مخصصة للاتصال والتحقق الفردي من مكتب التسجيل فقط ولا يتم مشاركتها أو تسريبها للمسوقين أو الكيانات الخارجية لمراعاة أقصى درجات حماية البيانات لعملائنا.
            </p>
          </div>

          {/* Pricing notification */}
          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 space-y-3 text-right">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h4 className="font-extrabold text-sm">التواصل الهاتفي للمصروفات والرسوم الفردية</h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              يرجى كتابة رقم هاتفك وهاتف ولي الأمر بشكل سليم للاتصال بك وتثبيت نسب الخصم المئوية، حيث تختلف الموازنة بناءً على التخصص والشعب المتاحة ونصف التقسيط الشهري للعام الجديد.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
