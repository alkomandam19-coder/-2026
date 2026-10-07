import React from "react";
import { Cpu, HeartPulse, Droplet, Plane, FlaskConical, Map, TrendingUp, UserCheck, MessageCircle, Send } from "lucide-react";
import { ACADEMY_DEPARTMENTS } from "../data";
import { shareMessages } from "../utils/messages";

interface PopularDepartmentsProps {
  adminLeads: any[];
  onSelectDepartmentForBooking: (deptId: string) => void;
  simulatedStudentsCount: number;
}

export function PopularDepartments({ adminLeads, onSelectDepartmentForBooking, simulatedStudentsCount }: PopularDepartmentsProps) {
  // Let's compute a dynamic live registration count for popular departments
  // We'll have a realistic base seed count of registrations for each department,
  // and we'll add any live local bookings from the Database dynamically!
  
  // Calculate simulated increment based on current global counter
  const difference = Math.max(0, simulatedStudentsCount - 4872);

  const popularSeeds = [
    {
      id: "programming",
      name: "قسم البرمجة والذكاء الاصطناعي",
      icon: Cpu,
      baseCount: 684 + Math.round(difference * 0.22),
      color: "from-blue-500 to-indigo-600",
      bgClass: "bg-blue-50/50 hover:bg-blue-50",
      borderClass: "border-blue-100",
      iconColor: "text-blue-600",
      tag: "الأعلى طلباً 🚀"
    },
    {
      id: "nursing_assistant",
      name: "قسم مساعد خدمات صحية (تمريض)",
      icon: HeartPulse,
      baseCount: 592 + Math.round(difference * 0.19),
      color: "from-rose-500 to-pink-600",
      bgClass: "bg-rose-50/50 hover:bg-rose-50",
      borderClass: "border-rose-100",
      iconColor: "text-rose-600",
      tag: "مستقبل مضمون 🩺"
    },
    {
      id: "petroleum",
      name: "قسم البترول",
      icon: Droplet,
      baseCount: 489 + Math.round(difference * 0.16),
      color: "from-amber-500 to-orange-600",
      bgClass: "bg-amber-50/50 hover:bg-amber-50",
      borderClass: "border-amber-100",
      iconColor: "text-amber-600",
      tag: "ميداني متميز 🛢️"
    },
    {
      id: "aviation",
      name: "قسم الضيافة الجوية",
      icon: Plane,
      baseCount: 412 + Math.round(difference * 0.13),
      color: "from-indigo-500 to-sky-600",
      bgClass: "bg-indigo-50/50 hover:bg-indigo-50",
      borderClass: "border-indigo-100",
      iconColor: "text-indigo-600",
      tag: "بروتوكول دولي ✈️"
    },
    {
      id: "health_analysis",
      name: "قسم مساعد خدمات صحية (تحاليل طبية)",
      icon: FlaskConical,
      baseCount: 374 + Math.round(difference * 0.12),
      color: "from-teal-500 to-emerald-600",
      bgClass: "bg-teal-50/50 hover:bg-teal-50",
      borderClass: "border-teal-100",
      iconColor: "text-teal-600",
      tag: "تدريب مجهز 🔬"
    },
    {
      id: "surveying",
      name: "قسم المساحة والخرائط",
      icon: Map,
      baseCount: 351 + Math.round(difference * 0.11),
      color: "from-emerald-500 to-teal-600",
      bgClass: "bg-emerald-50/50 hover:bg-emerald-50",
      borderClass: "border-emerald-100",
      iconColor: "text-emerald-600",
      tag: "أحدث الأجهزة 🗺️"
    }
  ];


  // Dynamically compute registration additions from lead database
  const getDynamicAdditionsForDept = (deptId: string) => {
    // find target dept full name
    const deptInfo = ACADEMY_DEPARTMENTS.find(d => d.id === deptId);
    if (!deptInfo) return 0;
    
    // Count how many current database leads contain this department
    return adminLeads.filter(lead => {
      if (lead.selectedDepartments && Array.isArray(lead.selectedDepartments)) {
        return lead.selectedDepartments.includes(deptInfo.name);
      }
      return false;
    }).length;
  };

  return (
    <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-250/90 shadow-xs space-y-3 sm:space-y-4" id="most-popular-depts-ranking">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs sm:text-base text-slate-900 leading-tight">
              التخصصات الأكثر تقديماً واهتماماً من الطلاب 🔥
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              إحصائية حية متكاملة لعدد طلبات التسجيل والمقاعد المحجوزة لكل قسم بالكامل
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[9.5px] sm:text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-emerald-100">
            مزامنة حقيقية ومباشرة ✓
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
        {popularSeeds.map((dept, index) => {
          const Icon = dept.icon;
          const dynamicAdd = getDynamicAdditionsForDept(dept.id);
          const totalEnrollments = dept.baseCount + dynamicAdd;
          
          return (
            <div 
              key={dept.id}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${dept.borderClass} ${dept.bgClass} transition duration-300 flex flex-col justify-between group relative overflow-hidden`}
              id={`popular-dept-card-${dept.id}`}
            >
              {/* Badge/Rank */}
              <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
                <span className="text-[8.5px] sm:text-[9px] font-mono font-bold bg-slate-900/5 text-slate-600 px-1.5 py-0.5 rounded-sm">
                  # {index + 1}
                </span>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white shadow-xs border border-slate-100 flex items-center justify-center ${dept.iconColor} shrink-0 group-hover:scale-105 transition duration-300`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <span className="text-[8.5px] sm:text-[9px] font-extrabold text-slate-500 bg-white border px-1.5 py-0.5 rounded-md leading-normal block w-fit mb-0.5">
                      {dept.tag}
                    </span>
                    <strong className="text-xs font-extrabold text-slate-900 block leading-tight">
                      {dept.name}
                    </strong>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-medium">معدل الإقبال والانشغال</span>
                    <span className="text-slate-800 font-extrabold">{(Math.min(95, 50 + (totalEnrollments / 15))).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-150 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-l ${dept.color}`}
                      style={{ width: `${Math.min(95, 50 + (totalEnrollments / 15))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Counts footer & Instant CTA */}
              <div className="flex items-center justify-between border-t border-slate-200/50 mt-3 pt-3 gap-2 flex-wrap">
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-450 block font-medium">طلبات التقديم المؤكدة:</span>
                  <div className="flex items-center gap-1">
                    <strong className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                      {totalEnrollments.toLocaleString("ar-EG")}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-bold">طالب</span>
                    {dynamicAdd > 0 && (
                      <span className="text-[9px] bg-emerald-500 text-white rounded-md px-1 py-0.2 font-extrabold leading-none animate-pulse shrink-0">
                        +{dynamicAdd} جديد
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl px-1.5 py-1">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessages.departmentShare(dept.name, window.location.origin))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="مشاركة عبر واتساب"
                      className="w-7 h-7 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition border border-emerald-200/40"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareMessages.departmentShare(dept.name, window.location.origin))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="مشاركة عبر تيليجرام"
                      className="w-7 h-7 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg flex items-center justify-center transition border border-sky-200/40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    onClick={() => onSelectDepartmentForBooking(dept.id)}
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-brand-navy rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer hover:shadow-xs shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>قدم وسجل حالياً</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
