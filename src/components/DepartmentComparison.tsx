import React, { useState, useEffect } from "react";
import { ACADEMY_DEPARTMENTS, Department } from "../data";
import { 
  DEFAULT_COMPARISON_EXTRAS, 
  DEFAULT_EXTRA, 
  DepartmentComparisonExtra 
} from "../data/comparisonData";
import { 
  ArrowRightLeft, 
  CheckCircle, 
  Sparkles, 
  Briefcase, 
  GraduationCap, 
  Building2, 
  Clock, 
  Award,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DepartmentComparisonProps {
  onSelectDepartment?: (dept: Department) => void;
}

export function DepartmentComparison({ onSelectDepartment }: DepartmentComparisonProps) {
  const navigate = useNavigate();

  // Dynamic Departments List
  const [departmentsList, setDepartmentsList] = useState<Department[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_academy_departments_v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.warn("Failed to parse custom departments list", e);
        }
      }
    }
    return ACADEMY_DEPARTMENTS;
  });

  // Dynamic Comparison Extras
  const [comparisonExtras, setComparisonExtras] = useState<Record<string, DepartmentComparisonExtra>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("department_comparison_extras");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") return parsed;
        } catch (e) {
          console.warn("Failed to parse department_comparison_extras", e);
        }
      }
    }
    return DEFAULT_COMPARISON_EXTRAS;
  });

  useEffect(() => {
    const syncData = () => {
      // Sync comparison extras
      const savedExtras = localStorage.getItem("department_comparison_extras");
      if (savedExtras) {
        try {
          const parsed = JSON.parse(savedExtras);
          if (parsed && typeof parsed === "object") {
            setComparisonExtras(parsed);
          }
        } catch (e) {}
      }

      // Sync departments list
      const savedDepts = localStorage.getItem("custom_academy_departments_v1");
      if (savedDepts) {
        try {
          const parsed = JSON.parse(savedDepts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDepartmentsList(parsed);
          }
        } catch (e) {}
      }
    };

    window.addEventListener("department_comparison_updated", syncData);
    window.addEventListener("departments_updated", syncData);
    return () => {
      window.removeEventListener("department_comparison_updated", syncData);
      window.removeEventListener("departments_updated", syncData);
    };
  }, []);

  // Default selection: Petroleum vs Surveying
  const [dept1Id, setDept1Id] = useState<string>("petroleum");
  const [dept2Id, setDept2Id] = useState<string>("surveying");

  const dept1 = departmentsList.find(d => d.id === dept1Id) || departmentsList[0] || ACADEMY_DEPARTMENTS[0];
  const dept2 = departmentsList.find(d => d.id === dept2Id) || departmentsList[1] || ACADEMY_DEPARTMENTS[1];

  const extra1 = comparisonExtras[dept1.id] || DEFAULT_COMPARISON_EXTRAS[dept1.id] || DEFAULT_EXTRA;
  const extra2 = comparisonExtras[dept2.id] || DEFAULT_COMPARISON_EXTRAS[dept2.id] || DEFAULT_EXTRA;

  // Preset quick comparisons
  const presets = [
    { title: "بترول ⚡ مساحة", d1: "petroleum", d2: "surveying" },
    { title: "تمريض ⚡ تحاليل طبية", d1: "nursing_assistant", d2: "health_analysis" },
    { title: "برمجة ⚡ تسويق إلكتروني", d1: "programming", d2: "digital_marketing" },
    { title: "ضيافة ⚡ نظم وإدارة", d1: "aviation", d2: "systems_admin" },
  ];

  const handleSwap = () => {
    setDept1Id(dept2Id);
    setDept2Id(dept1Id);
  };

  const handleApply = (dept: Department) => {
    if (onSelectDepartment) {
      onSelectDepartment(dept);
    } else {
      navigate(`/discounts?preselected=${dept.id}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-xs space-y-6 text-right font-sans" dir="rtl" id="departments-comparison-section">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#0A2463]">
                مُقارنة التخصصات الدراسية
              </h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                ميزة تفاعلية 📊
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              اختر تخصصين لمقارنة مدة الدراسة، فرص العمل، ونسبة التطبيق العملي جنباً إلى جنب.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400 block sm:inline w-full sm:w-auto mb-1 sm:mb-0">مقارنات شائعة:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setDept1Id(p.d1);
                setDept2Id(p.d2);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition border border-slate-200 cursor-pointer active:scale-95"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Selector Dropdowns & Swap Controls */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/70">
        
        {/* Dept 1 Dropdown */}
        <div className="md:col-span-5 space-y-1">
          <label className="text-[11px] font-black text-[#0A2463] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            التخصص الأول:
          </label>
          <select
            value={dept1Id}
            onChange={(e) => setDept1Id(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs cursor-pointer"
          >
            {departmentsList.map(d => (
              <option key={`d1-${d.id}`} value={d.id} disabled={d.id === dept2Id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center py-1 md:py-0">
          <button
            type="button"
            onClick={handleSwap}
            title="تبديل التخصصين"
            className="w-9 h-9 rounded-full bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition shadow-xs cursor-pointer active:rotate-180 duration-300"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Dept 2 Dropdown */}
        <div className="md:col-span-5 space-y-1">
          <label className="text-[11px] font-black text-[#0A2463] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            التخصص الثاني:
          </label>
          <select
            value={dept2Id}
            onChange={(e) => setDept2Id(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs cursor-pointer"
          >
            {departmentsList.map(d => (
              <option key={`d2-${d.id}`} value={d.id} disabled={d.id === dept1Id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-right border-collapse min-w-[620px]">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3 sm:p-4 text-xs font-black w-1/4 border-b border-slate-800">
                وجه المقارنة ⚖️
              </th>
              <th className="p-3 sm:p-4 text-xs font-black w-3/8 border-b border-slate-800 border-r border-slate-800 text-blue-300 bg-blue-950/40">
                <div className="flex items-center justify-between">
                  <span>{dept1.name}</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-normal border border-blue-400/30">قسم (أ)</span>
                </div>
              </th>
              <th className="p-3 sm:p-4 text-xs font-black w-3/8 border-b border-slate-800 border-r border-slate-800 text-emerald-300 bg-emerald-950/40">
                <div className="flex items-center justify-between">
                  <span>{dept2.name}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-normal border border-emerald-400/30">قسم (ب)</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 text-xs">
            
            {/* Row 1: Description */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="p-3.5 font-bold text-[#0A2463] bg-slate-50/80 align-top flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>نبذة والتأهيل العام</span>
              </td>
              <td className="p-3.5 text-slate-700 leading-relaxed align-top border-r border-slate-150">
                {dept1.description}
              </td>
              <td className="p-3.5 text-slate-700 leading-relaxed align-top border-r border-slate-150">
                {dept2.description}
              </td>
            </tr>

            {/* Row 2: Duration & Practical Ratio */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="p-3.5 font-bold text-[#0A2463] bg-slate-50/80 align-top">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>مدة الدراسة ونسبة التطبيق</span>
                </div>
              </td>
              <td className="p-3.5 align-top border-r border-slate-150">
                <div className="font-extrabold text-blue-900 mb-1">{extra1.duration}</div>
                <div className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                  ⚡ {extra1.practicalRatio}
                </div>
              </td>
              <td className="p-3.5 align-top border-r border-slate-150">
                <div className="font-extrabold text-emerald-900 mb-1">{extra2.duration}</div>
                <div className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  ⚡ {extra2.practicalRatio}
                </div>
              </td>
            </tr>

            {/* Row 3: Career Opportunities */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="p-3.5 font-bold text-[#0A2463] bg-slate-50/80 align-top">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>الفرص الوظيفية وسوق العمل</span>
                </div>
              </td>
              <td className="p-3.5 align-top border-r border-slate-150">
                <ul className="space-y-1">
                  {dept1.careers.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="p-3.5 align-top border-r border-slate-150">
                <ul className="space-y-1">
                  {dept2.careers.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>

            {/* Row 4: Key Skills */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="p-3.5 font-bold text-[#0A2463] bg-slate-50/80 align-top">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>المهارات المكتسبة</span>
                </div>
              </td>
              <td className="p-3.5 align-top border-r border-slate-150">
                <div className="flex flex-wrap gap-1">
                  {dept1.skills.map((s, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-3.5 align-top border-r border-slate-150">
                <div className="flex flex-wrap gap-1">
                  {dept2.skills.map((s, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              </td>
            </tr>

            {/* Row 5: Training Locations */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="p-3.5 font-bold text-[#0A2463] bg-slate-50/80 align-top">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>أماكن التدريب الميداني</span>
                </div>
              </td>
              <td className="p-3.5 text-slate-700 align-top border-r border-slate-150">
                <ul className="space-y-1">
                  {extra1.trainingLocations.map((loc, i) => (
                    <li key={i} className="text-slate-600 text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>{loc}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="p-3.5 text-slate-700 align-top border-r border-slate-150">
                <ul className="space-y-1">
                  {extra2.trainingLocations.map((loc, i) => (
                    <li key={i} className="text-slate-600 text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{loc}</span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>

            {/* Row 6: Qualifications */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="p-3.5 font-bold text-[#0A2463] bg-slate-50/80 align-top">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>المؤهل المتاح للقبول</span>
                </div>
              </td>
              <td className="p-3.5 text-slate-700 font-medium align-top border-r border-slate-150">
                {extra1.qualifications}
              </td>
              <td className="p-3.5 text-slate-700 font-medium align-top border-r border-slate-150">
                {extra2.qualifications}
              </td>
            </tr>

            {/* Row 7: Action CTA Buttons */}
            <tr className="bg-slate-50">
              <td className="p-3.5 font-black text-slate-800 align-middle">
                الخطوة التالية 🎯
              </td>
              <td className="p-3.5 align-middle border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => handleApply(dept1)}
                  className="w-full py-2.5 px-3 bg-[#0A2463] hover:bg-[#071946] text-white text-xs font-black rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>تقديم وتثبيت الخصم بـ {dept1.name}</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </td>
              <td className="p-3.5 align-middle border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => handleApply(dept2)}
                  className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>تقديم وتثبيت الخصم بـ {dept2.name}</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  );
}
