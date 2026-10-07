import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  CheckCircle, 
  Ticket, 
  Award, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Star, 
  ChevronRight, 
  ChevronLeft, 
  Pause, 
  Play, 
  Sparkles,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

interface HomeTrustStatsCarouselProps {
  studCount?: number;
  instCount?: number;
  partCount?: number;
  satCount?: number;
}

export default function HomeTrustStatsCarousel({
  studCount = 23450,
  instCount = 13,
  partCount = 120,
  satCount = 98
}: HomeTrustStatsCarouselProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "metrics">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("academy_carousel_tab") as "stats" | "metrics") || "stats";
    }
    return "stats";
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // LocalStorage Cache persistence for carousel stats
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("academy_carousel_tab", activeTab);
        localStorage.setItem("academy_cached_trust_stats", JSON.stringify({
          studCount,
          instCount,
          partCount,
          satCount,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Safe cache write fallback
      }
    }
  }, [activeTab, studCount, instCount, partCount, satCount]);

  // 1. Statistics Cards (Screenshot 2)
  const statsItems = [
    {
      id: "stat-inst",
      iconEmoji: "🏛️",
      value: `+${instCount}`,
      title: "المعاهد والأكاديميات",
      desc: "معاهد تدريب خاصة مسجلة وموثقة",
      badge: "شراكات معتمدة",
      colorClass: "text-[#0A2463] bg-indigo-50 border-indigo-200"
    },
    {
      id: "stat-students",
      iconEmoji: "🎓",
      value: studCount.toLocaleString("ar-EG"),
      title: "طالب وطالبة",
      desc: "قاموا بالاستعلام والتسجيل واستخراج الاستمارات",
      badge: "إقبال قياسي 2026",
      colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200"
    },
    {
      id: "stat-protocols",
      iconEmoji: "💼",
      value: `${partCount}`,
      title: "بروتوكول توظيف",
      desc: "شراكات مبرمة لتوجيه الطلاب وتوظيفهم",
      badge: "فرص تدريب واقعية",
      colorClass: "text-amber-700 bg-amber-50 border-amber-200"
    },
    {
      id: "stat-satisfaction",
      iconEmoji: "⭐",
      value: `%${satCount}`,
      title: "نسبة الرضا والنجاح",
      desc: "تقييم الطلاب لتجربة الدعم والاعتماد",
      badge: "جودة وتوجيه موثوق",
      colorClass: "text-rose-700 bg-rose-50 border-rose-200"
    }
  ];

  // 2. Metrics & Guarantees (Screenshot 1)
  const metricItems = [
    {
      id: "metric-guide",
      IconComponent: BookOpen,
      category: "الدليل الأكاديمي",
      title: "١٧ تخصصاً وشعبة معتمدة",
      desc: "مغطي ببيانات تفصيلية حية بالمرجع",
      badge: "دليل شامل ومحدث",
      colorClass: "text-indigo-700 bg-indigo-50 border-indigo-200"
    },
    {
      id: "metric-integrity",
      IconComponent: CheckCircle,
      category: "النزاهة الأكاديمية",
      title: "معايير صدق ١٠٠٪",
      desc: "توجيه صريح ضد مبالغات التوظيف المباشر",
      badge: "شفافية ومصداقية",
      colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200"
    },
    {
      id: "metric-discounts",
      IconComponent: Ticket,
      category: "خصومات المصروفات",
      title: "حفظ خصومات الدفعة (AM2026)",
      desc: "حجز المقاعد مجاني ومثبت للعام الجديد",
      badge: "توفير مالي مضمون",
      colorClass: "text-[#FF7F50] bg-amber-50 border-amber-200"
    },
    {
      id: "metric-accreditation",
      IconComponent: Award,
      category: "الاعتمادات والتأجيل",
      title: "شهادات مهنية معتمدة",
      desc: "تأجيل الموقف التجنيدي للذكور متاح في بعض الأكاديميات",
      badge: "توثيق وتأجيل عسكري",
      colorClass: "text-[#0A2463] bg-blue-50 border-blue-200"
    }
  ];

  const currentList = activeTab === "stats" ? statsItems : metricItems;

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % currentList.length);
  }, [currentList.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + currentList.length) % currentList.length);
  }, [currentList.length]);

  // Reset index when changing tab
  const switchTab = (tab: "stats" | "metrics") => {
    setActiveTab(tab);
    setCurrentIndex(0);
  };

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlay || isHovered) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [isAutoPlay, isHovered, handleNext]);

  // Motion variants for slider
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.97
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 28 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      scale: 0.97,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 28 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    })
  };

  return (
    <section 
      className="bg-white border-b border-slate-200 py-3.5 sm:py-5 px-3 md:px-8 text-right select-none"
      id="compact-trust-stats-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto space-y-3">
        
        {/* Top Header & Fast Switcher Tabs (Compact Row) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Section Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => switchTab("stats")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "stats"
                  ? "bg-[#0A2463] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📊 الأرقام والإحصائيات الحية</span>
            </button>

            <button
              onClick={() => switchTab("metrics")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "metrics"
                  ? "bg-[#0A2463] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🛡️ الضمانات والاعتمادات</span>
            </button>
          </div>

          {/* Carousel Controls (Auto-Play Toggle + Nav Arrows) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              title={isAutoPlay ? "إيقاف التبديل التلقائي" : "تشغيل التبديل التلقائي"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0A2463] hover:bg-slate-200/60 transition cursor-pointer"
            >
              {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-1 px-1 text-[11px] font-bold font-mono text-slate-500">
              <span>{currentIndex + 1}</span>
              <span>/</span>
              <span>{currentList.length}</span>
            </div>

            {/* Prev (Right in RTL) */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-white hover:bg-[#0A2463] text-slate-700 hover:text-white shadow-2xs transition cursor-pointer border border-slate-200"
              aria-label="السابق"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.button>

            {/* Next (Left in RTL) */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-white hover:bg-[#0A2463] text-slate-700 hover:text-white shadow-2xs transition cursor-pointer border border-slate-200"
              aria-label="التالي"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* 1. Mobile & Tablet: Interactive Compact Slider (Single Card on mobile, saves huge space!) */}
        <div className="block lg:hidden relative">
          <div className="min-h-[105px] overflow-hidden relative">
            <AnimatePresence custom={direction} mode="wait">
              {activeTab === "stats" ? (
                // Stats Item View
                (() => {
                  const item = statsItems[currentIndex];
                  return (
                    <motion.div
                      key={`stat-${item.id}`}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="bg-slate-50/90 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl shrink-0 p-2 bg-white rounded-xl border border-slate-150 shadow-2xs">
                          {item.iconEmoji}
                        </span>
                        <div className="space-y-0.5">
                          <strong className="text-xl font-black font-mono block leading-none text-[#0A2463]">
                            {item.value}
                          </strong>
                          <span className="text-xs font-extrabold text-slate-900 block">
                            {item.title}
                          </span>
                          <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-black px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                        {item.badge}
                      </span>
                    </motion.div>
                  );
                })()
              ) : (
                // Metrics Item View
                (() => {
                  const item = metricItems[currentIndex];
                  const Icon = item.IconComponent;
                  return (
                    <motion.div
                      key={`metric-${item.id}`}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="bg-slate-50/90 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-150 flex items-center justify-center shrink-0 shadow-2xs">
                          <Icon className="w-5 h-5 text-[#0A2463]" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-black block">
                            {item.category}
                          </span>
                          <strong className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">
                            {item.title}
                          </strong>
                          <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-black px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                        {item.badge}
                      </span>
                    </motion.div>
                  );
                })()
              )}
            </AnimatePresence>
          </div>

          {/* Dots Indicator for Mobile */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {currentList.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => {
                  setDirection(dotIdx > currentIndex ? 1 : -1);
                  setCurrentIndex(dotIdx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  dotIdx === currentIndex
                    ? "w-6 bg-[#0A2463]"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`انتقال للبند ${dotIdx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 2. Desktop: Fluid 4-Column Grid with Animated Tab Transition */}
        <div className="hidden lg:block">
          <AnimatePresence mode="wait">
            {activeTab === "stats" ? (
              <motion.div
                key="desktop-stats-grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-4 gap-3.5"
              >
                {statsItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-slate-50/80 hover:bg-white p-3.5 rounded-2xl border border-slate-200/90 hover:border-indigo-400/40 hover:shadow-sm transition-all duration-200 flex items-center gap-3.5"
                  >
                    <span className="text-2xl p-2 bg-white rounded-xl border border-slate-150 shadow-2xs shrink-0">
                      {item.iconEmoji}
                    </span>
                    <div className="min-w-0">
                      <strong className="text-lg font-black font-mono block leading-tight text-[#0A2463]">
                        {item.value}
                      </strong>
                      <span className="text-xs font-extrabold text-slate-800 block truncate">
                        {item.title}
                      </span>
                      <p className="text-[10px] text-slate-500 font-semibold truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="desktop-metrics-grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-4 gap-3.5"
              >
                {metricItems.map((item, idx) => {
                  const Icon = item.IconComponent;
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50/80 hover:bg-white p-3.5 rounded-2xl border border-slate-200/90 hover:border-indigo-400/40 hover:shadow-sm transition-all duration-200 flex items-center gap-3.5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 flex items-center justify-center shrink-0 shadow-2xs">
                        <Icon className="w-5 h-5 text-[#0A2463]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-black block">
                          {item.category}
                        </span>
                        <strong className="text-xs font-extrabold text-slate-900 block truncate">
                          {item.title}
                        </strong>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
