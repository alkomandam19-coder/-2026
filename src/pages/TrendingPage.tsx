import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, hasSupabase } from "../supabaseClient";
import { PopularDepartments } from "../components/PopularDepartments";
import { ACADEMY_DEPARTMENTS, Department } from "../data";
import { TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

export default function TrendingPage() {
  const navigate = useNavigate();
  const [adminLeads, setAdminLeads] = useState<any[]>([]);
  const [simulatedStudentsCount, setSimulatedStudentsCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("academy_simulated_count_v1");
      return saved ? parseInt(saved, 10) : 4872;
    }
    return 4872;
  });

  const fetchLeadsForStats = async () => {
    try {
      const res = await fetch("/api/admin/data");
      const data = await res.json();
      if (data.success) {
        setAdminLeads(data.leads || []);
      }
    } catch (err) {
      console.warn("Could not retrieve leads for stats on trending page:", err);
    }
  };

  useEffect(() => {
    document.title = "التخصصات الأكثر طلباً وحركة حجز المقاعد | بوابة المعاهد الخاصة";
    fetchLeadsForStats();

    // Listen to custom updates from callback submit
    const handleUpdate = () => {
      fetchLeadsForStats();
    };
    window.addEventListener("admin_data_updated", handleUpdate);

    // Subscribe to real-time updates of students table for hot ranking changes
    let channel: any = null;
    if (hasSupabase) {
      channel = supabase
        .channel("trending-student-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
          },
          () => {
            fetchLeadsForStats();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("admin_data_updated", handleUpdate);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleSelectDepartmentForBooking = (deptId: string) => {
    navigate(`/discounts?preselected=${deptId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl border border-amber-500/10 text-right">
            <div className="flex items-center gap-2 mb-2 justify-start">
              <span className="text-xs bg-amber-500 text-white font-black px-2.5 py-0.5 rounded-full animate-pulse">
                مزامنة حية لايف ⏳
              </span>
              <h1 className="text-lg font-black text-slate-900 font-sans flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-orange-500 shrink-0" />
                <span>التخصصات الأكثر طلباً واهتماماً من الطلاب 🔥</span>
              </h1>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              يتم رصد هذه الإحصائيات وترتيب الأقسام مباشرة بالاعتماد على إجمالي استمارات دفعة العام الحالي بقاعدة البيانات وحركات الاتصال الفورية الجارية لضمان الشفافية والمصداقية.
            </p>
          </div>

          <PopularDepartments 
            adminLeads={adminLeads}
            simulatedStudentsCount={simulatedStudentsCount}
            onSelectDepartmentForBooking={handleSelectDepartmentForBooking}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Notice */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 text-right">
            <h3 className="font-extrabold text-md text-[#0A2463] border-b border-slate-100 pb-3 flex items-center gap-2 justify-start">
              <ShieldCheck className="w-5 h-5 text-emerald-650 shrink-0" />
              <span>ترتيب الأقسام والشغف الطلابي</span>
            </h3>
            <p className="text-xs text-slate-650 leading-relaxed font-sans">
              تختلف اهتمامات وحجوزات الطلاب من فترة لأخرى، وعبر نظام المزامنة الحية، يتم دفع الأقسام الأكثر حجزاً وتواصلاً للمراكز الأولى، لمساعدتك في فهم الاتجاهات والمجالات التي يزداد عليها إقبال زملائك بالدفعات السابقة والجديدة.
            </p>
          </div>

          {/* Tuition warning */}
          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 space-y-3 text-right">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h4 className="font-extrabold text-sm">بيان المصروفات والرسوم الدراسية</h4>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              يرجى العلم بأنه لم يتم حصر قيمة الرسوم أو نسب الخصم المئوية المحددة مالياً في هذا المرجع لضمان عدم حدوث مغالطات مع دفعة العام الجديد. احجز تذكرتك بالتطبيق وسيتم التواصل معك لشرح الميزانية المالية المناسبة لقسمك المختار.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
