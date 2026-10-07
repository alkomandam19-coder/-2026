import React from "react";
import { Building2, GraduationCap, Award, BookOpen } from "lucide-react";

export type PortalTabType = "branches" | "specializations" | "accreditations" | "studysystem" | "hq";

export interface TabItem {
  id: string;
  label: string;
  subLabel?: string;
  icon: any;
  count?: number;
  activeColor?: string;
  pillColor?: string;
}

interface PortalTabsNavProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  tabs?: TabItem[];
  counts?: {
    branches?: number;
    specializations?: number;
    accreditations?: number;
    studysystem?: number;
    hq?: number;
    [key: string]: number | undefined;
  };
  theme?: "amber" | "cyan" | "indigo" | "emerald";
}

export const PortalTabsNav: React.FC<PortalTabsNavProps> = ({
  activeTab,
  onSelectTab,
  tabs: customTabs,
  counts,
  theme = "amber"
}) => {
  const defaultTabs: TabItem[] = [
    {
      id: "branches",
      label: "دليل الفروع والمواعيد",
      subLabel: "المقرات وساعات العمل الرسمية",
      icon: Building2,
      count: counts?.branches,
      activeColor: "bg-amber-500 text-slate-950 shadow-xs border-amber-600",
      pillColor: "bg-amber-950/20 text-slate-950"
    },
    {
      id: "specializations",
      label: "التخصصات والمصروفات",
      subLabel: "الأقسام، المصاريف، والأقساط",
      icon: GraduationCap,
      count: counts?.specializations,
      activeColor: "bg-emerald-600 text-white shadow-xs border-emerald-700",
      pillColor: "bg-emerald-950/30 text-white"
    },
    {
      id: "accreditations",
      label: "الاعتمادات والشهادات",
      subLabel: "الجهات المانحة والأختام والتوثيق",
      icon: Award,
      count: counts?.accreditations,
      activeColor: "bg-blue-600 text-white shadow-xs border-blue-700",
      pillColor: "bg-blue-950/30 text-white"
    },
    {
      id: "studysystem",
      label: "نظام الدراسة والتدريب",
      subLabel: "الحضور، العملي، والمستشفيات",
      icon: BookOpen,
      count: counts?.studysystem,
      activeColor: "bg-purple-600 text-white shadow-xs border-purple-700",
      pillColor: "bg-purple-950/30 text-white"
    }
  ];

  const tabs = customTabs || defaultTabs;

  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-y border-slate-200/90 shadow-2xs sticky top-0 z-30 print:hidden" dir="rtl">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 lg:px-6">
        {/* 2x2 Grid Layout (كل تبويبين فوق بعض) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 py-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const countVal = tab.count !== undefined ? tab.count : counts?.[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                className={`flex items-center justify-start gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all text-right cursor-pointer select-none active:scale-[0.99] ${
                  isActive
                    ? `${tab.activeColor || "bg-[#0A2463] text-white border-[#0A2463] shadow-xs"}`
                    : "bg-slate-50/90 hover:bg-slate-100/90 text-slate-700 border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-colors ${
                    isActive
                      ? "bg-white/20 text-current"
                      : "bg-white text-slate-700 shadow-2xs border border-slate-200/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] sm:text-xs font-black truncate leading-tight ${isActive ? "text-current" : "text-slate-900"}`}>
                      {tab.label}
                    </span>
                    {typeof countVal === "number" && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                          isActive
                            ? tab.pillColor || "bg-black/20 text-current"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {countVal}
                      </span>
                    )}
                  </div>
                  {tab.subLabel && (
                    <p
                      className={`text-[9px] sm:text-[10px] truncate mt-0.5 font-medium leading-tight ${
                        isActive ? "text-current/80 font-bold" : "text-slate-500"
                      }`}
                    >
                      {tab.subLabel}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
