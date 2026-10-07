import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { StudentReviews } from "../components/StudentReviews";
import Hero from "../components/Hero";
import { ACADEMY_DEPARTMENTS } from "../data";
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle, 
  Ticket, 
  Award, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Compass, 
  Sparkles,
  BookMarked,
  ShieldCheck,
  TrendingUp,
  X,
  Calendar,
  Layers,
  FileCheck,
  Share2,
  Copy,
  Check,
  Microscope,
  Calculator,
  PhoneCall,
  Pause,
  Play
} from "lucide-react";
import { 
  LiveJobVacanciesTicker, 
  CorporateHiringGate 
} from "../components/InteractiveMarketingSuite";
import HomeTrustStatsCarousel from "../components/HomeTrustStatsCarousel";
import CarouselErrorBoundary from "../components/CarouselErrorBoundary";

const DEFAULT_NEWS_POSTS: any[] = [];

const AI_FAKE_TITLES = [
  "كيف تكتشف شغفك",
  "أسرار سوق العمل",
  "تجهيز المستندات",
  "التوفير المالي",
  "تأجيل التجنيد",
  "الفرق الجوهري",
  "الأنشطة والرحلات",
  "بدء فتح باب قيد الشعب",
];

function isAiGeneratedPost(p: any): boolean {
  if (!p) return true;
  const title = String(p.title || "");
  const id = String(p.id || "");
  if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(id)) {
    if (AI_FAKE_TITLES.some(t => title.includes(t))) return true;
  }
  return AI_FAKE_TITLES.some(t => title.includes(t));
}

export default function Home() {
  const navigate = useNavigate();
  const [simulatedStudentsCount, setSimulatedStudentsCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("academy_simulated_count_v1");
      return saved ? parseInt(saved, 10) : 4872;
    }
    return 4872;
  });

  const [instCount, setInstCount] = useState(0);
  const [studCount, setStudCount] = useState(0);
  const [partCount, setPartCount] = useState(0);
  const [satCount, setSatCount] = useState(0);

  useEffect(() => {
    let currentStep = 0;
    const duration = 1200; // 1.2 seconds animation
    const stepTime = 25;
    const steps = duration / stepTime;

    const timer = setInterval(() => {
      currentStep++;
      setInstCount(Math.min(34, Math.floor((34 / steps) * currentStep)));
      setStudCount(Math.min(23450, Math.floor((23450 / steps) * currentStep)));
      setPartCount(Math.min(120, Math.floor((120 / steps) * currentStep)));
      setSatCount(Math.min(98, Math.floor((98 / steps) * currentStep)));

      if (currentStep >= steps) {
        clearInterval(timer);
        setInstCount(34);
        setStudCount(23450);
        setPartCount(120);
        setSatCount(98);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [showArticles, setShowArticles] = useState<boolean>(true);
  const [showAllArticles, setShowAllArticles] = useState<boolean>(false);
  const [currentArticleIdx, setCurrentArticleIdx] = useState<number>(0);
  const [articleDirection, setArticleDirection] = useState<number>(1);
  const [isArticleAutoPlay, setIsArticleAutoPlay] = useState<boolean>(true);
  const [isArticleHovered, setIsArticleHovered] = useState<boolean>(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [sharedCopiedId, setSharedCopiedId] = useState<string | null>(null);

  const handleNextArticle = useCallback(() => {
    if (newsPosts.length === 0) return;
    setArticleDirection(1);
    setCurrentArticleIdx((prev) => (prev + 1) % newsPosts.length);
  }, [newsPosts.length]);

  const handlePrevArticle = useCallback(() => {
    if (newsPosts.length === 0) return;
    setArticleDirection(-1);
    setCurrentArticleIdx((prev) => (prev - 1 + newsPosts.length) % newsPosts.length);
  }, [newsPosts.length]);

  useEffect(() => {
    if (!isArticleAutoPlay || isArticleHovered || showAllArticles || newsPosts.length <= 1) return;
    const timer = setInterval(() => {
      handleNextArticle();
    }, 5500);
    return () => clearInterval(timer);
  }, [isArticleAutoPlay, isArticleHovered, showAllArticles, newsPosts.length, handleNextArticle]);

  const handleCopyShare = (postId: string, title: string) => {
    const shareUrl = `${window.location.origin}/?post=${postId}&source=organic_student_share`;
    const text = `اقرأ هذا المنشور الهام من بوابة المعاهد والأكاديميات المهنية المعتمدة دفعة 2026: "${title}"\n${shareUrl}`;
    navigator.clipboard.writeText(text);
    setSharedCopiedId(postId);
    setTimeout(() => setSharedCopiedId(null), 2500);
  };

  const getWhatsAppShareUrl = (postId: string, title: string) => {
    const shareUrl = `${window.location.origin}/?post=${postId}&source=whatsapp_share`;
    const text = `بوابة المعاهد والأكاديميات المهنية المعتمدة 🎓\nانظر المادة التثقيفية المنشورة: "${title}"\nرابط القبول والتسجيل المباشر:\n${shareUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const getFacebookShareUrl = (postId: string) => {
    const shareUrl = `${window.location.origin}/?post=${postId}&source=facebook_share`;
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  };

  // Sync news posts with localStorage and simulate mounting skeleton placeholders
  useEffect(() => {
    document.title = "بوابة المعاهد والأكاديميات الخاصة - الرئيسية";
    
    const loadNews = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("custom_news_posts_v1");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((p: any) => !isAiGeneratedPost(p));
              setNewsPosts(clean);
              localStorage.setItem("custom_news_posts_v1", JSON.stringify(clean));
              return;
            }
          } catch (e) {}
        }
        setNewsPosts([]);
      }
    };

    loadNews();
    setIsLoadingPosts(false);

    // Trigger local update listener
    const handleNewsUpdate = () => {
      loadNews();
      setIsLoadingPosts(false);
    };
    window.addEventListener("news_posts_updated", handleNewsUpdate);
    window.addEventListener("site_configs_updated", handleNewsUpdate);

    return () => {
      window.removeEventListener("news_posts_updated", handleNewsUpdate);
      window.removeEventListener("site_configs_updated", handleNewsUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans" dir="rtl" id="homepage-root">
      
      {/* 1. Hero Showcase Section */}
      <Hero />

      {/* 1.5 Live Job Vacancies Ticker Feed */}
      <LiveJobVacanciesTicker />

      {/* 2. Compact Interactive Trust Metrics & Live Statistics Carousel (Framer Motion) */}
      <CarouselErrorBoundary fallbackTitle="جاري تحديث بيانات الإحصائيات والاعتمادات...">
        <HomeTrustStatsCarousel 
          studCount={studCount} 
          instCount={instCount} 
          partCount={partCount} 
          satCount={satCount} 
        />
      </CarouselErrorBoundary>

      {/* 2.8 Lightweight Interactive Hub Overview Grid */}
      <section className="bg-slate-50 py-8 px-3 md:px-8 border-b border-slate-200" id="home-interactive-suite">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Section Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[10px] sm:text-xs font-black text-[#0A2463] bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
              الخدمات والأدوات التفاعلية المعتمدة لدفعة 2026 🚀
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-[#0A2463]">
              بوابة الخدمات الرقمية والدليل الشامل
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              انقر على أي قسم للانتقال المباشر لصفحته المخصصة واستخدام الأدوات التفاعلية بالكامل:
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1: Accreditation & Fees */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0A2463]/30 hover:shadow-md transition duration-200 space-y-3 flex flex-col justify-between text-right group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    رسمي ومُعتمد
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463] group-hover:text-amber-600 transition-colors">
                  الاعتمادات والمصروفات الرسمية وملفات القبول 🏛️
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  اطّلع على الضوابط التنظيمية، شروط القبول، جدول المصروفات الشفافة بدون رسوم خفية، وتأجيل التجنيد.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/accreditation"
                  className="w-full inline-flex items-center justify-between bg-slate-50 hover:bg-[#0A2463] text-[#0A2463] hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-200"
                >
                  <span>عرض المصروفات والاعتمادات</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: Lab Shadowing Experience */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0A2463]/30 hover:shadow-md transition duration-200 space-y-3 flex flex-col justify-between text-right group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                    <Microscope className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    تصريح مجاني
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463] group-hover:text-emerald-600 transition-colors">
                  يوم المعايشة التجريبي والنزول الميداني للمعامل 🏫
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  احجز تذكرة استضافة حرة ليوم كامل داخل المعامل المركزية لممارسات تطبيقية ومعاينة الأجهزة بنفسك.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/lab-experience"
                  className="w-full inline-flex items-center justify-between bg-slate-50 hover:bg-emerald-600 text-slate-800 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-200"
                >
                  <span>احجز يوم المعايشة الآن</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Live Application Tracker */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0A2463]/30 hover:shadow-md transition duration-200 space-y-3 flex flex-col justify-between text-right group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                    متابعة لحظية
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463] group-hover:text-cyan-600 transition-colors">
                  تتبع حالة ملف التقديم الموحد (Live Tracker) 🔍
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  أدخل رقم هاتفك أو رمز الحجز للاستعلام اللحظي عن حالة فحص الملف وتثبيت مقعدك بالقسم وطباعة الاستمارة.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/application-tracker"
                  className="w-full inline-flex items-center justify-between bg-slate-50 hover:bg-[#0A2463] text-[#0A2463] hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-200"
                >
                  <span>تتبع حالة حجزك</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 4: ROI Professional Calculator */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0A2463]/30 hover:shadow-md transition duration-200 space-y-3 flex flex-col justify-between text-right group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    دراسة اقتصادية
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463] group-hover:text-indigo-600 transition-colors">
                  حاسبة العائد المهني واستعادة الاستثمار (ROI) 📈
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  احسب تكلفة الدراسة التطبيقية مقارنة بمتوسطات الأجور والرواتب التقديرية المتوقعة للخريجين بسوق العمل.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/roi-calculator"
                  className="w-full inline-flex items-center justify-between bg-slate-50 hover:bg-indigo-600 text-slate-800 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-200"
                >
                  <span>افتح حاسبة العائد (ROI)</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 5: Career Roadmap */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0A2463]/30 hover:shadow-md transition duration-200 space-y-3 flex flex-col justify-between text-right group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
                    <Compass className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    خطة 2026
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463] group-hover:text-purple-600 transition-colors">
                  خريطة طريق المستقبل المهني والنمو الوظيفي 🗺️
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  دليل المحطات الأربعة من التقديم والتدريب، مروراً بالشهادات والاعتمادات، وحتى الانضمام الفعلي لسوق العمل.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/career-roadmap"
                  className="w-full inline-flex items-center justify-between bg-slate-50 hover:bg-purple-600 text-slate-800 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-200"
                >
                  <span>استكشف خريطة المستقبل</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 6: Parents VIP Assurance & Installments */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0A2463]/30 hover:shadow-md transition duration-200 space-y-3 flex flex-col justify-between text-right group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    استشارة وتقسيط
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463] group-hover:text-rose-600 transition-colors">
                  رسالة أولياء الأمور وتنسيق الأقساط المباشرة ☎️
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  رسالة إدارية رسمية موجهة لكافة أولياء الأمور، مع خدمة طلب استشارة هاتفية وتنسيق نظام دفع أقساط المصروفات 2026.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/parents-assurance"
                  className="w-full inline-flex items-center justify-between bg-slate-50 hover:bg-rose-600 text-slate-800 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-200"
                >
                  <span>تقديم طلب استشارة ولي الأمر</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Main Body Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 my-1 sm:my-2" id="home-split-container">
        
        {/* Left Column (8 cols): Article Feed + Testimonials */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-8 text-right" id="home-left-rail">
          
          {/* ARTICLE CONTENT FEED SECTION (INTERACTIVE CAROUSEL + EXPAND ALL) */}
          <CarouselErrorBoundary fallbackTitle="جاري تحديث بيانات دليل النجاح والتثقيف الأكاديمي...">
            <div 
              className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4 text-right select-none" 
              id="news-section-feed"
              onMouseEnter={() => setIsArticleHovered(true)}
              onMouseLeave={() => setIsArticleHovered(false)}
            >
            {/* Header Row with Toggle & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <BookMarked className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#0A2463] font-sans flex items-center gap-2">
                    <span>دليل النجاح والتثقيف الأكاديمي الرقمي 📚</span>
                  </h2>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    مقالات ونشرات رقمية لتوجيه الطالب نحو الاختيار الصحيح
                  </p>
                </div>
              </div>

              {/* Action Buttons: "اضغط لرؤية المزيد" + Carousel Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                
                {/* Expand / Collapse All Button */}
                <button
                  type="button"
                  onClick={() => setShowAllArticles(!showAllArticles)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  id="toggle-all-articles-btn"
                >
                  <span>{showAllArticles ? "عرض ككاروسيل 🎠" : "اضغط لرؤية المزيد 📑"}</span>
                </button>

                {/* Carousel Controls (when in carousel mode) */}
                {!showAllArticles && newsPosts.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    <button
                      onClick={() => setIsArticleAutoPlay(!isArticleAutoPlay)}
                      title={isArticleAutoPlay ? "إيقاف التبديل التلقائي" : "تشغيل التبديل التلقائي"}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#0A2463] hover:bg-slate-200/60 transition cursor-pointer"
                    >
                      {isArticleAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-[11px] font-mono font-bold text-slate-500 px-1">
                      {currentArticleIdx + 1} / {newsPosts.length}
                    </span>

                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handlePrevArticle}
                      className="p-1.5 rounded-lg bg-white hover:bg-[#0A2463] text-slate-700 hover:text-white transition cursor-pointer border border-slate-200"
                      aria-label="المقال السابق"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleNextArticle}
                      className="p-1.5 rounded-lg bg-white hover:bg-[#0A2463] text-slate-700 hover:text-white transition cursor-pointer border border-slate-200"
                      aria-label="المقال التالي"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area: Carousel Mode OR All Grid Mode */}
            {isLoadingPosts ? (
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-150 animate-pulse">
                <div className="h-4 bg-slate-200 rounded-md w-24"></div>
                <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded-md w-full"></div>
              </div>
            ) : newsPosts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-bold bg-slate-50 border border-slate-150 rounded-2xl text-xs sm:text-sm">
                📪 لا توجد مقالات مسجلة حالياً بالمنصة.
              </div>
            ) : !showAllArticles ? (
              // 1. CAROUSEL MODE: One article at a time with Framer Motion
              (() => {
                const activeArt = newsPosts[currentArticleIdx < newsPosts.length ? currentArticleIdx : 0];
                return (
                  <div className="space-y-3">
                    <div className="relative min-h-[175px] sm:min-h-[185px] bg-slate-50/70 border border-slate-150 p-4 sm:p-5 rounded-2xl overflow-hidden">
                      <AnimatePresence custom={articleDirection} mode="wait">
                        <motion.div
                          key={`article-slide-${activeArt.id}`}
                          custom={articleDirection}
                          initial={{ x: articleDirection > 0 ? 40 : -40, opacity: 0, scale: 0.98 }}
                          animate={{ x: 0, opacity: 1, scale: 1, transition: { x: { type: "spring", stiffness: 350, damping: 28 }, opacity: { duration: 0.22 } } }}
                          exit={{ x: articleDirection > 0 ? -40 : 40, opacity: 0, scale: 0.98, transition: { opacity: { duration: 0.18 } } }}
                          className="space-y-3 z-10"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
                            <span className="bg-indigo-50 text-[#0A2463] px-2.5 py-0.5 rounded-md text-[10px] font-black border border-indigo-100">
                              {activeArt.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {activeArt.readTime || "قراءة في ٣ دقائق"}
                            </span>
                          </div>

                          <h3 
                            onClick={() => navigate(`/news/${activeArt.id}`)}
                            className="text-sm sm:text-base font-black text-slate-900 font-sans hover:text-amber-600 transition duration-150 leading-snug cursor-pointer"
                          >
                            {activeArt.title}
                          </h3>
                          
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold line-clamp-2 sm:line-clamp-3">
                            {activeArt.desc}
                          </p>

                          <div className="pt-3 border-t border-slate-200/60 mt-2 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                              <button
                                onClick={() => navigate(`/news/${activeArt.id}`)}
                                className="px-4 py-2 bg-[#0A2463] hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer select-none inline-flex items-center gap-1.5 w-fit"
                                id={`read-article-btn-${activeArt.id}`}
                              >
                                <span>شاهد الخبر / شاهد المزيد 👁️📖</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>

                              {/* Social Sharing bar */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 ml-1">مشاركة:</span>
                                
                                <a
                                  href={getWhatsAppShareUrl(activeArt.id, activeArt.title)}
                                  target="_blank"
                                  rel="noreferrer referrer"
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="مشاركة عبر واتساب"
                                >
                                  <span>واتساب</span>
                                </a>

                                <a
                                  href={getFacebookShareUrl(activeArt.id)}
                                  target="_blank"
                                  rel="noreferrer referrer"
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="مشاركة عبر فيسبوك"
                                >
                                  <span>فيسبوك</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleCopyShare(activeArt.id, activeArt.title)}
                                  className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                    sharedCopiedId === activeArt.id
                                      ? "bg-emerald-500 text-white border-emerald-500"
                                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                  title="نسخ رابط المقال"
                                >
                                  {sharedCopiedId === activeArt.id ? (
                                    <>
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>تم النسخ!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>نسخ الرابط</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Direct News URL Bar as requested */}
                            <div className="flex items-center gap-1.5 bg-slate-100/80 p-2 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-sans">
                              <span className="font-black text-[#0A2463] shrink-0 text-[10.5px]">🔗 رابط الخبر:</span>
                              <a
                                href={`${window.location.origin}/news/${activeArt.id}`}
                                target="_blank"
                                rel="noreferrer referrer"
                                className="font-mono text-blue-600 hover:underline truncate dir-ltr text-left"
                                dir="ltr"
                              >
                                {`${window.location.origin}/news/${activeArt.id}`}
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Dots Indicator */}
                    <div className="flex justify-center items-center gap-1.5 pt-0.5">
                      {newsPosts.map((_, idx) => (
                        <button
                          key={idx}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            currentArticleIdx === idx ? 'w-6 bg-[#0A2463]' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                          }`}
                          onClick={() => {
                            setArticleDirection(idx > currentArticleIdx ? 1 : -1);
                            setCurrentArticleIdx(idx);
                          }}
                          aria-label={`تخطي للمقال رقم ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              // 2. GRID MODE (When user clicks "اضغط لرؤية المزيد"): All articles
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 gap-3.5 pt-1" 
                id="news-posts-all-grid"
              >
                {newsPosts.map((art) => (
                  <div 
                    key={art.id}
                    className="p-4 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200 hover:border-amber-500/30 hover:shadow-xs transition duration-200 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
                      <span className="bg-indigo-50 text-[#0A2463] px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black border border-indigo-100">
                        {art.category}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono font-bold">
                        {art.readTime || "قراءة في ٣ دقائق"}
                      </span>
                    </div>

                    <h3 
                      onClick={() => navigate(`/news/${art.id}`)}
                      className="text-sm sm:text-base font-black text-slate-900 font-sans hover:text-amber-600 transition duration-150 leading-snug cursor-pointer"
                    >
                      {art.title}
                    </h3>
                    
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      {art.desc}
                    </p>

                    <div className="pt-3 border-t border-slate-200/60 mt-2 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <button
                          onClick={() => navigate(`/news/${art.id}`)}
                          className="px-4 py-2 bg-[#0A2463] hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer select-none inline-flex items-center gap-1.5 w-fit"
                        >
                          <span>شاهد الخبر / شاهد المزيد 👁️📖</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 ml-1">مشاركة:</span>
                          
                          <a
                            href={getWhatsAppShareUrl(art.id, art.title)}
                            target="_blank"
                            rel="noreferrer referrer"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <span>واتساب</span>
                          </a>

                          <a
                            href={getFacebookShareUrl(art.id)}
                            target="_blank"
                            rel="noreferrer referrer"
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <span>فيسبوك</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyShare(art.id, art.title)}
                            className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              sharedCopiedId === art.id
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {sharedCopiedId === art.id ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>نسخ الرابط</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Direct News URL Bar */}
                      <div className="flex items-center gap-1.5 bg-slate-100/80 p-2 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-sans">
                        <span className="font-black text-[#0A2463] shrink-0 text-[10.5px]">🔗 رابط الخبر:</span>
                        <a
                          href={`${window.location.origin}/news/${art.id}`}
                          target="_blank"
                          rel="noreferrer referrer"
                          className="font-mono text-blue-600 hover:underline truncate dir-ltr text-left"
                          dir="ltr"
                        >
                          {`${window.location.origin}/news/${art.id}`}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
          </CarouselErrorBoundary>

          {/* STUDENT REVIEW LIST SECTION */}
          <div className="space-y-4" id="home-reviews-slider-box">
            <CarouselErrorBoundary fallbackTitle="جاري تحديث آراء وتقييمات الطلاب...">
              <StudentReviews />
            </CarouselErrorBoundary>
          </div>

        </div>

        {/* Right Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6 text-right" id="home-right-rail">
          
          {/* Quick Guidance Portal Promo */}
          <div className="bg-gradient-to-br from-[#0A2463] to-slate-900 text-white p-4 sm:p-6 rounded-3xl border border-slate-800 space-y-3 sm:space-y-4 shadow-sm" id="home-sidebar-guidance-card">
            <div className="flex items-center gap-2.5 text-amber-400">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Compass className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-extrabold text-xs sm:text-base font-sans">مستشار التوجيه الذكي</h3>
            </div>
            
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              إذا كنت في حيرة من أمرك ولم تستقر بعد على شعبة معينة، تتيح لك البوابة أداة ذكاء توجيهي معتمدة لتحليل ميولك وتقييم رغباتك وترشيح القسم الملائم لك.
            </p>

            <Link 
              to="/guidance"
              className="inline-flex w-full items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[10.5px] sm:text-xs font-black transition shadow-md"
            >
              <span>ابدأ اختبار تحديد تخصصك الدراسي الآن 💯</span>
              <ChevronLeft className="w-3.5 h-3.5 animate-bounce-short" />
            </Link>
          </div>

          {/* Ethics guidelines */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 space-y-3 sm:space-y-4" id="home-ethics-card">
            <h3 className="font-extrabold text-sm sm:text-md text-[#0A2463] border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600" />
              <span>ميثاق النزاهة والحياد الأكاديمي</span>
            </h3>
            
            <p className="text-[11px] sm:text-xs text-slate-650 leading-relaxed font-semibold">
              تلتزم بوابة المعاهد والأكاديميات بالوقوف كشريك تعليمي حقيقي للطالب دون إثقال كاهله بوعود تعيين فوري أو نسب توظيف خيالية ومزيفة:
            </p>

            <ul className="space-y-2">
              {[
                "تقييم دقيق للمؤهل الدراسي (عام، أزهري، دبلومات تكنولوجية)",
                "مساواة كاملة في الدعم العملي لجميع فئات الطلاب المتقدمين",
                "نشارك الطلاب وأولياء أمورهم في صياغة الأهداف المهنية والواقعية"
              ].map((policy, idx) => (
                <li key={idx} className="text-[11px] sm:text-xs text-slate-755 flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-650 shrink-0 mt-0.5" />
                  <span>{policy}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </main>

      {/* 4. Strategic Bottom Trust-Building Enclosures */}
      <section className="bg-slate-100 py-6 sm:py-10 px-3 md:px-8 border-t border-slate-200" id="trust-building-showroom">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8 element-reveal">
          <CorporateHiringGate />
        </div>
      </section>

      {/* Floating Chat bot widget helper has been moved globally to App.tsx */}

    </div>
  );
}
