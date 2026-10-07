import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Star, 
  Quote, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Pause,
  Play,
  Globe,
  Sparkles,
  GraduationCap,
  Plus,
  X,
  MessageSquarePlus,
  ShieldCheck,
  Send,
  ThumbsUp,
  UserCheck,
  Building2,
  MapPin,
  HelpCircle
} from "lucide-react";

import { 
  ReviewerType, 
  Review, 
  INITIAL_STUDENT_REVIEWS 
} from "../data/studentReviewsData";

export type { ReviewerType, Review };

export const REVIEW_TYPES_CONFIG: Record<ReviewerType, {
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  iconColor: string;
  desc: string;
  fieldPrompt: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  enrolled_student: {
    label: "طالب مقيد وموثق",
    shortLabel: "طالب مقيد",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    badgeText: "text-emerald-800",
    iconColor: "text-emerald-600",
    desc: "يشارك رأيه بعد التقديم وأثناء دراسته الحالية (المحاضرات، المعامل، والتدريب الميداني)",
    fieldPrompt: "ما هو رأيك في الدراسة بالأكاديمية بعد إتمام التقديم وحالياً وأنت تدرس في تخصصك؟",
    placeholder: "اكتب رأيك وتجربتك بعد ما قدمت وحالياً بتدرس في الأكاديمية، وعن التدريب العملي والمعامل والمحاضرين ونظام التقسيط...",
    icon: CheckCircle2
  },
  visitor: {
    label: "زائر للبوابة",
    shortLabel: "زائر",
    badgeBg: "bg-sky-50",
    badgeBorder: "border-sky-200",
    badgeText: "text-sky-800",
    iconColor: "text-sky-600",
    desc: "يشارك انطباعه وتقييمه للبوابة الإلكترونية وتجربة التصفح وحجز المواعيد والخدمات",
    fieldPrompt: "ما هو انطباعك وتقييمك لخدمات البوابة الإلكترونية وسهولة تصفح التخصصات وحجز المقاعد؟",
    placeholder: "اكتب رأيك في البوابة الإلكترونية وسرعة التصفح، وضوح المعلومات، وميزة اختبار التخصص وسهولة الوصول للخدمات...",
    icon: Globe
  },
  new_applicant: {
    label: "طالب جديد",
    shortLabel: "طالب جديد",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    badgeText: "text-amber-800",
    iconColor: "text-amber-600",
    desc: "يشارك تفاصيل ما تم معه في التواصل من خلال مستشاري التقديمات والتوجيه الأكاديمي",
    fieldPrompt: "كيف كانت تجربتك وتفاصيل تواصلك مع مستشاري القبول والتسجيل وتوجيهك للأقسام؟",
    placeholder: "اكتب تجربتك مع مستشاري التقديمات والتسجيل، سرعة الرد، وتوضيح شروط القبول والتوجيه للقسم المناسب وتثبيت الحجز...",
    icon: Sparkles
  },
  graduate: {
    label: "طالب خريج",
    shortLabel: "خريج",
    badgeBg: "bg-purple-50",
    badgeBorder: "border-purple-200",
    badgeText: "text-purple-800",
    iconColor: "text-purple-600",
    desc: "يشارك تجربته في سوق العمل وحياته المهنية والمهارات الفنية التي اكتسبها أثناء دراسته",
    fieldPrompt: "كيف هي مسيرتك وحياتك المهنية بعد التخرج؟ وما هي المهارات والخبرات التي اكتسبتها؟",
    placeholder: "اكتب عن مسيرتك المهنية وسوق العمل بعد التخرج، الشركات والمراكز التي التحقت بها، وكيف أثرت دراستك والتدريب العملي على مستواك الفني...",
    icon: GraduationCap
  }
};

const DEFAULT_DEPARTMENTS = [
  "قسم البرمجة والذكاء الاصطناعي",
  "قسم تحاليل طبية واشعة ( فني خدمات صحيه )",
  "قسم تمريض (مساعد خدمات صحية)",
  "قسم مساحة وخرائط",
  "قسم بترول وبتروكيماويات",
  "قسم تركيبات الأسنان",
  "قسم ضباط لاسلكي",
  "قسم ضيافة جوية",
  "قسم إدارة الأعمال والنظم",
  "قسم التسويق الإلكتروني",
  "قسم صحافة وإعلام",
  "قسم تغذية علاجية",
  "قسم تربية خاصة",
  "قسم سياحة وفنادق",
  "قسم التصميم والفنون الجميلة",
  "تصفح عام لخدمات البوابة الإلكترونية"
];

const EGYPTIAN_GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "القليوبية",
  "كفر الشيخ", "الغربية", "المنوفية", "البحيرة", "دمياط", "بورسعيد",
  "الإسماعيلية", "السويس", "الفيوم", "بني سويف", "المنيا", "أسيوط",
  "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "مطروح", "شمال سيناء", "جنوب سيناء", "الوادي الجديد"
];

const defaultReviews: Review[] = INITIAL_STUDENT_REVIEWS;

export function StudentReviews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | ReviewerType>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [reviewsList, setReviewsList] = useState<Review[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("custom_student_reviews");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= INITIAL_STUDENT_REVIEWS.length) {
            return parsed.map((item: any) => ({
              ...item,
              type: item.type || "enrolled_student"
            }));
          }
        }
      } catch (e) {
        // Fallback
      }
    }
    return INITIAL_STUDENT_REVIEWS;
  });

  const loadReviews = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_student_reviews");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // If user has custom added items, preserve them alongside initial dataset
            if (parsed.length >= INITIAL_STUDENT_REVIEWS.length) {
              setReviewsList(parsed.map((item: any) => ({
                ...item,
                type: item.type || "enrolled_student"
              })));
              return;
            } else {
              // Upgrade older small list: keep custom non-initial ones and prepend to INITIAL_STUDENT_REVIEWS
              const initialIds = new Set(INITIAL_STUDENT_REVIEWS.map(r => String(r.id)));
              const customOnly = parsed.filter((r: any) => !initialIds.has(String(r.id)) && typeof r.id === "string" && r.id.startsWith("review_"));
              const merged = [...customOnly, ...INITIAL_STUDENT_REVIEWS];
              setReviewsList(merged);
              localStorage.setItem("custom_student_reviews", JSON.stringify(merged));
              return;
            }
          }
        } catch (e) {
          // fallback
        }
      }
      setReviewsList(INITIAL_STUDENT_REVIEWS);
      localStorage.setItem("custom_student_reviews", JSON.stringify(INITIAL_STUDENT_REVIEWS));
    }
  }, []);

  useEffect(() => {
    loadReviews();

    const handleUpdate = () => {
      loadReviews();
    };

    window.addEventListener("student_reviews_updated", handleUpdate);
    return () => {
      window.removeEventListener("student_reviews_updated", handleUpdate);
    };
  }, [loadReviews]);

  // Filter reviews based on selected category tab
  const filteredReviews = useMemo(() => {
    if (selectedFilter === "all") return reviewsList;
    return reviewsList.filter((r) => r.type === selectedFilter);
  }, [reviewsList, selectedFilter]);

  // Reset index if filter changes or reviews list shrinks
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedFilter]);

  const handleNext = useCallback(() => {
    if (filteredReviews.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % filteredReviews.length);
  }, [filteredReviews.length]);

  const handlePrev = useCallback(() => {
    if (filteredReviews.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + filteredReviews.length) % filteredReviews.length);
  }, [filteredReviews.length]);

  const handleDotClick = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  // Auto-play timer with hover pause
  useEffect(() => {
    if (!isAutoPlay || isHovered || filteredReviews.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5500);

    return () => clearInterval(timer);
  }, [isAutoPlay, isHovered, filteredReviews.length, handleNext]);

  // Handle adding new review from modal
  const handleAddNewReview = (newReview: Review) => {
    const updated = [newReview, ...reviewsList];
    setReviewsList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("custom_student_reviews", JSON.stringify(updated));
      window.dispatchEvent(new Event("student_reviews_updated"));
    }

    // Attempt background persistence to API
    try {
      fetch("/api/student-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview)
      }).catch(() => {});
    } catch (e) {}

    // Switch filter to show this review
    setSelectedFilter("all");
    setCurrentIndex(0);
    setIsModalOpen(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4500);
  };

  if (reviewsList.length === 0) return null;

  const activeReview = filteredReviews[currentIndex < filteredReviews.length ? currentIndex : 0] || filteredReviews[0];
  const typeConfig = activeReview ? (REVIEW_TYPES_CONFIG[activeReview.type] || REVIEW_TYPES_CONFIG.enrolled_student) : REVIEW_TYPES_CONFIG.enrolled_student;
  const TypeIcon = typeConfig.icon;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 28 },
        opacity: { duration: 0.22 },
        scale: { duration: 0.22 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 28 },
        opacity: { duration: 0.18 },
        scale: { duration: 0.18 }
      }
    })
  };

  const countsByType = {
    all: reviewsList.length,
    enrolled_student: reviewsList.filter(r => r.type === "enrolled_student").length,
    visitor: reviewsList.filter(r => r.type === "visitor").length,
    new_applicant: reviewsList.filter(r => r.type === "new_applicant").length,
    graduate: reviewsList.filter(r => r.type === "graduate").length,
  };

  return (
    <div 
      className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-right select-none relative" 
      id="students-testimonials-section"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toast confirmation */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-4 right-4 z-30 bg-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>شكراً لمشاركتك! تم إضافة استطلاع رأيك بنجاح وبكل شفافية في القائمة.</span>
            </div>
            <button onClick={() => setShowSuccessToast(false)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Row with Title + Add Survey Button + Slider Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-xs">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
              آراء الطلاب والزائرين وتجارب الخريجين الموثقة وطلابنا الجدد ⭐
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              تجارب واستطلاعات رأي شفافة لطلابنا، زوارنا، المتقدمين الجدد، والخريجين الممارسين
            </p>
          </div>
        </div>

        {/* Action Button & Slider controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
          {/* Add Survey / Review Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsModalOpen(true)}
            id="add-student-review-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0A2463] to-indigo-700 hover:from-indigo-900 hover:to-indigo-800 text-white text-xs font-black shadow-xs cursor-pointer transition border border-indigo-600/30"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-300" />
            <span>إضافة استطلاع رأي ✍️</span>
          </motion.button>

          {/* Autoplay & Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              title={isAutoPlay ? "إيقاف التبديل التلقائي" : "تشغيل التبديل التلقائي"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0A2463] hover:bg-white transition cursor-pointer"
            >
              {isAutoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>

            <span className="text-[10.5px] font-mono font-bold text-slate-600 px-1">
              {filteredReviews.length > 0 ? currentIndex + 1 : 0} / {filteredReviews.length}
            </span>

            <div className="flex items-center gap-0.5">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handlePrev}
                disabled={filteredReviews.length <= 1}
                className="p-1.5 rounded-lg bg-white hover:bg-[#0A2463] text-slate-700 hover:text-white transition cursor-pointer border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                aria-label="التقييم السابق"
              >
                <ChevronRight className="w-3 h-3" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleNext}
                disabled={filteredReviews.length <= 1}
                className="p-1.5 rounded-lg bg-white hover:bg-[#0A2463] text-slate-700 hover:text-white transition cursor-pointer border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                aria-label="التقييم التالي"
              >
                <ChevronLeft className="w-3 h-3" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
        <button
          onClick={() => setSelectedFilter("all")}
          className={`px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedFilter === "all"
              ? "bg-[#0A2463] text-white border-[#0A2463] shadow-xs"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <span>عرض الكل</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
            {countsByType.all}
          </span>
        </button>

        <button
          onClick={() => setSelectedFilter("enrolled_student")}
          className={`px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedFilter === "enrolled_student"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
              : "bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>طلاب مقيدون وموثقون</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedFilter === "enrolled_student" ? "bg-white/20 text-white" : "bg-emerald-200/70 text-emerald-900"}`}>
            {countsByType.enrolled_student}
          </span>
        </button>

        <button
          onClick={() => setSelectedFilter("visitor")}
          className={`px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedFilter === "visitor"
              ? "bg-sky-700 text-white border-sky-700 shadow-xs"
              : "bg-sky-50/60 text-sky-800 border-sky-200 hover:bg-sky-100/60"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>زوار البوابة</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedFilter === "visitor" ? "bg-white/20 text-white" : "bg-sky-200/70 text-sky-900"}`}>
            {countsByType.visitor}
          </span>
        </button>

        <button
          onClick={() => setSelectedFilter("new_applicant")}
          className={`px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedFilter === "new_applicant"
              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
              : "bg-amber-50/60 text-amber-800 border-amber-200 hover:bg-amber-100/60"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>طلابنا الجدد</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedFilter === "new_applicant" ? "bg-white/20 text-white" : "bg-amber-200/70 text-amber-900"}`}>
            {countsByType.new_applicant}
          </span>
        </button>

        <button
          onClick={() => setSelectedFilter("graduate")}
          className={`px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedFilter === "graduate"
              ? "bg-purple-700 text-white border-purple-700 shadow-xs"
              : "bg-purple-50/60 text-purple-800 border-purple-200 hover:bg-purple-100/60"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
          <span>تجارب الخريجين</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedFilter === "graduate" ? "bg-white/20 text-white" : "bg-purple-200/70 text-purple-900"}`}>
            {countsByType.graduate}
          </span>
        </button>
      </div>

      {/* Slider Viewport Container */}
      <div className="relative min-h-[190px] bg-slate-50/80 border border-slate-200/90 p-4 sm:p-5 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xs">
        
        {/* Decorative Quote mark */}
        <div className="absolute top-3 left-3 text-slate-200 pointer-events-none opacity-40">
          <Quote className="w-12 h-12 transform rotate-180" />
        </div>

        {filteredReviews.length === 0 ? (
          <div className="py-8 text-center space-y-2 z-10">
            <p className="text-xs font-bold text-slate-500">لا توجد آراء مسجلة في هذا القسم حتى الآن.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-black text-[#0A2463] hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              كن أول من يضيف استطلاع رأي في هذه الفئة
            </button>
          </div>
        ) : (
          <AnimatePresence custom={direction} mode="wait">
            <motion.div 
              key={`review-${activeReview.id}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3 z-10"
            >
              {/* Top row in card: Stars + Category Badge + Meaning Tooltip */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400 gap-0.5 justify-start">
                    {[...Array(activeReview.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  {activeReview.recommendation && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      <ThumbsUp className="w-2.5 h-2.5 text-indigo-600" />
                      <span>{activeReview.recommendation}</span>
                    </span>
                  )}
                </div>

                {/* 4-Types Badge with Icon */}
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-black ${typeConfig.badgeText} ${typeConfig.badgeBg} px-2.5 py-1 rounded-lg border ${typeConfig.badgeBorder} flex items-center gap-1.5 shadow-2xs`}>
                    <TypeIcon className={`w-3 h-3 ${typeConfig.iconColor}`} />
                    <span>{typeConfig.label}</span>
                  </span>
                </div>
              </div>

              {/* Sub-label description for transparency */}
              <div className="text-[10px] text-slate-500 font-semibold bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/50 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-slate-600">{typeConfig.desc}</span>
              </div>

              {/* Testimonial Quote */}
              <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-medium pt-0.5">
                "{activeReview.text}"
              </p>

              {/* Reviewer Details */}
              <div className="flex items-center gap-2.5 border-t border-slate-200/70 pt-2.5 mt-2">
                <div className={`w-9 h-9 rounded-full ${activeReview.avatarColor || "bg-indigo-600 text-white"} font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-white/40`}>
                  {activeReview.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">{activeReview.studentName}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold space-x-1.5 space-x-reverse flex items-center flex-wrap">
                    <span className="text-indigo-800 font-extrabold">{activeReview.department}</span>
                    <span>•</span>
                    <span>محافظة {activeReview.governorate}</span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono">{activeReview.date}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

      </div>

      {/* Dots / Progress Indicator */}
      {filteredReviews.length > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 px-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 order-2 sm:order-1">
            <span>التقييم</span>
            <span className="font-mono font-black text-[#0A2463] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {currentIndex + 1} من {filteredReviews.length}
            </span>
          </div>

          {/* If list is concise, show full dots; if large, show responsive windowed dot cluster */}
          <div className="flex justify-center items-center gap-1.5 order-1 sm:order-2 max-w-full overflow-hidden py-1">
            {filteredReviews.length <= 15 ? (
              filteredReviews.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx ? 'w-6 bg-[#0A2463]' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                  onClick={() => handleDotClick(idx)}
                  aria-label={`تخطي للتقييم رقم ${idx + 1}`}
                />
              ))
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100"
                >
                  السابق
                </button>
                <div className="w-24 sm:w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-[#0A2463] rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / filteredReviews.length) * 100}%` }}
                  />
                </div>
                <button
                  onClick={handleNext}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FOR ADDING USER OPINION / SURVEY */}
      <AddReviewSurveyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewReview}
      />
    </div>
  );
}

// ----------------------------------------------------
// ADD REVIEW & SURVEY MODAL COMPONENT
// ----------------------------------------------------
interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: Review) => void;
}

function AddReviewSurveyModal({ isOpen, onClose, onSubmit }: AddModalProps) {
  const [selectedType, setSelectedType] = useState<ReviewerType>("enrolled_student");
  const [name, setName] = useState("");
  const [governorate, setGovernorate] = useState(EGYPTIAN_GOVERNORATES[0]);
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENTS[0]);
  const [customDept, setCustomDept] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [pledgeChecked, setPledgeChecked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const currentConfig = REVIEW_TYPES_CONFIG[selectedType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("يرجى كتابة اسمك (أو اسمك المستعار) للمتابعة.");
      return;
    }
    if (!text.trim() || text.trim().length < 15) {
      setErrorMsg("يرجى كتابة رأيك أو استطلاعك بوضوح (15 حرفاً على الأقل).");
      return;
    }
    if (!pledgeChecked) {
      setErrorMsg("يرجى الموافقة على إقرار الشفافية والمصداقية.");
      return;
    }

    setIsSubmitting(true);

    const nameParts = name.trim().split(" ");
    const initials = nameParts.length >= 2 
      ? `${nameParts[0][0]} ${nameParts[1][0]}` 
      : (nameParts[0]?.[0] || "ط");

    const colors = [
      "bg-blue-600 text-white",
      "bg-emerald-600 text-white",
      "bg-purple-600 text-white",
      "bg-amber-600 text-white",
      "bg-indigo-600 text-white",
      "bg-rose-600 text-white",
      "bg-teal-600 text-white"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const deptVal = customDept.trim() 
      ? customDept.trim() 
      : (selectedType === "visitor" ? "زائر للبوابة الإلكترونية" : department);

    // Format Arabic date
    const today = new Date();
    const formattedDate = today.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    const newReviewItem: Review = {
      id: Date.now(),
      studentName: name.trim(),
      department: deptVal,
      governorate: governorate,
      rating: rating,
      text: text.trim(),
      avatarColor: randomColor,
      initials: initials,
      date: formattedDate,
      verified: true,
      type: selectedType,
      recommendation: selectedType === "graduate" 
        ? "أوصي بالتأهيل العملي في سوق العمل" 
        : selectedType === "visitor"
        ? "خدمات رقمية ممتازة وواضحة"
        : selectedType === "new_applicant"
        ? "تواصل واستشارة متميزة"
        : "يوصي بالدراسة بالأكاديمية"
    };

    setTimeout(() => {
      onSubmit(newReviewItem);
      setIsSubmitting(false);
      setName("");
      setText("");
      setCustomDept("");
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto text-right">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0A2463] via-[#0d2d7a] to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-amber-300" />
              <h3 className="font-extrabold text-sm sm:text-base">
                إضافة استطلاع رأي وتقييم شفاف 📝
              </h3>
            </div>
            <p className="text-[11px] text-slate-200 font-normal">
              شارك تجربتك الحقيقية بكل مصداقية لمساعدة الطلاب والزوار في اتخاذ قراراتهم
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Select Reviewer Category (4 Types) */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-800">
              ١. حدد صفتك وفئة مشاركتك <span className="text-rose-500">*</span>:
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(REVIEW_TYPES_CONFIG) as ReviewerType[]).map((typeKey) => {
                const cfg = REVIEW_TYPES_CONFIG[typeKey];
                const Icon = cfg.icon;
                const isSelected = selectedType === typeKey;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setSelectedType(typeKey)}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected 
                        ? `${cfg.badgeBg} ${cfg.badgeBorder} ring-2 ring-[#0A2463]/30 shadow-xs` 
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                        <span className={`text-xs font-black ${isSelected ? cfg.badgeText : "text-slate-800"}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-[#0A2463] bg-[#0A2463]" : "border-slate-300"}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-normal">
                      {cfg.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guidelines Callout for Selected Type */}
          <div className={`p-3 rounded-2xl border ${currentConfig.badgeBorder} ${currentConfig.badgeBg} flex items-start gap-2.5`}>
            <currentConfig.icon className={`w-4 h-4 ${currentConfig.iconColor} shrink-0 mt-0.5`} />
            <div className="text-[11px] font-semibold leading-relaxed">
              <span className={`font-black ${currentConfig.badgeText}`}>{currentConfig.fieldPrompt}</span>
            </div>
          </div>

          {/* Name & Governorate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                الاسم بالكامل أو المستعار <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد محمود"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0A2463] focus:outline-hidden transition"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                المحافظة <span className="text-rose-500">*</span>:
              </label>
              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0A2463] focus:outline-hidden transition cursor-pointer"
              >
                {EGYPTIAN_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>محافظة {gov}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Department / Scope */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {selectedType === "visitor" ? "موضوع التقييم / الخدمة المستهدفة:" : "القسم أو التخصص المرتبط:"}
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0A2463] focus:outline-hidden transition cursor-pointer"
            >
              {DEFAULT_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Star Rating */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700">
              تقييمك العام للتجربة <span className="text-rose-500">*</span>:
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-125 transition cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating 
                          ? "fill-amber-400 text-amber-400" 
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-600 mr-2">
                {rating === 5 ? "⭐⭐⭐⭐⭐ ممتاز وموثوق جداً" :
                 rating === 4 ? "⭐⭐⭐⭐ جيد جداً" :
                 rating === 3 ? "⭐⭐⭐ جيد" : "⭐⭐ تقييم متوسط"}
              </span>
            </div>
          </div>

          {/* Review Text Body */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700">
              نص الاستطلاع والرأي الصادق <span className="text-rose-500">*</span>:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={currentConfig.placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#0A2463] focus:outline-hidden transition leading-relaxed"
              required
            />
          </div>

          {/* Transparency Pledge Checkbox */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={(e) => setPledgeChecked(e.target.checked)}
                className="mt-0.5 rounded-md text-[#0A2463] focus:ring-[#0A2463] w-4 h-4 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                أقر بأن هذا الاستطلاع والرأي يعكس تجربتي الحقيقية بكل شفافية ومصداقية لمساعدة مجتمع الطلاب والزوار.
              </span>
            </label>
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A2463] hover:bg-indigo-900 text-white text-xs font-black shadow-md cursor-pointer transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري النشر...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>نشر استطلاع الرأي فوراً ✨</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
