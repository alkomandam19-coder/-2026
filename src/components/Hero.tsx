import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSimulatedCount } from "../hooks/useSimulatedCount";
import { PDFDownloadModal } from "./PDFDownloadModal";
import SpeechButton from "./SpeechButton";

export default function Hero() {
  const [deptCount, setDeptCount] = useState(0);
  const [yearsCount, setYearsCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const simulatedStudentsRealValue = useSimulatedCount();

  // Lead Magnet states
  const [isBookletModalOpen, setIsBookletModalOpen] = useState(false);

  const toArabicDigits = (num: number) => {
    let str = num.toString();
    if (num >= 1000) {
      str = num.toLocaleString("en-US");
    }
    return str.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]).replace(/,/g, "،");
  };

  useEffect(() => {
    let animationFrameId: number;
    let observer: IntersectionObserver;

    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Reset and trigger custom slow counting animation
              let startTime: number | null = null;
              const duration = 2500; // Slowed down counting speed for visible and satisfying numerical roll

              const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing outQuad
                const ease = progress * (2 - progress);

                setDeptCount(Math.round(ease * 17));
                setYearsCount(Math.round(ease * 10));
                setStudentsCount(Math.round(ease * simulatedStudentsRealValue));

                if (progress < 1) {
                  animationFrameId = requestAnimationFrame(animate);
                }
              };

              cancelAnimationFrame(animationFrameId);
              animationFrameId = requestAnimationFrame(animate);
            } else {
              // Reset to 0 when out of view so it restarts next time
              setDeptCount(0);
              setYearsCount(0);
              setStudentsCount(0);
            }
          });
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
    } else {
      // Fallback
      setDeptCount(17);
      setYearsCount(10);
      setStudentsCount(simulatedStudentsRealValue);
    }

    return () => {
      if (observer) observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [simulatedStudentsRealValue]);

  return (
    <section 
      className="relative bg-gradient-to-b from-[#081b47] via-[#0A2463] to-[#040c24] w-full min-h-[75vh] sm:min-h-[90vh] flex flex-col justify-center items-center py-8 sm:py-20 px-3.5 sm:px-4 overflow-hidden"
      dir="rtl"
    >
      {/* خلفية فنية بنقش متناسق ودقيق للبرمجة والمستقبل العلمي */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* توهج ضوئي فني في الخلفية ليعطي عمق وجمالية فائقة */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[200px] sm:w-[400px] h-[200px] bg-emerald-500/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[150px] sm:w-[300px] h-[150px] bg-[#FF7F50]/10 rounded-full blur-[70px] pointer-events-none" />

      <div className="max-w-5xl w-full flex flex-col items-center relative z-10 text-center space-y-3.5 sm:space-y-6">
        {/* 1. Top Badges & Elite Developer Greeting Badge */}
        <div className="flex flex-col items-center gap-2.5 sm:gap-4">
          <span className="text-amber-300 text-[9.5px] sm:text-xs font-black bg-white/5 border border-white/10 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-lg backdrop-blur-md animate-fade-in select-none">
            المنصة التفاعلية المستقلة والأولى بمصر لتوجيه وحجز الطلاب 🇪🇬
          </span>

          {/* Premium Developer dynamic greeting banner with glowing neon elements and deep gradients */}
          <div className="relative group overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-400/5 hover:from-amber-500/15 hover:via-orange-500/15 hover:to-amber-400/10 border border-amber-500/30 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300 flex items-center gap-2 sm:gap-3">
            {/* Soft background light glow inside */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <div className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500 shadow-sm shadow-emerald-400/50"></span>
            </div>
            
            <span className="text-[11px] sm:text-sm font-black bg-gradient-to-r from-amber-250 via-yellow-250 to-orange-150 bg-clip-text text-amber-200 font-sans tracking-wide">
              {new Date().getHours() < 12 
                ? "🌅 صباح الخير يا بطل.. مستعد تبدأ وتؤمن رحلتك الأكاديمية بنجاح؟" 
                : "🌇 مساء الخير.. مستقبلك المشرق والمضمون يبدأ بخطوة واثقة الآن"
              }
            </span>
          </div>
        </div>

        {/* 2. Main Headings */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 px-1">
          <h1 className="text-base sm:text-2xl md:text-5xl font-black text-white text-center leading-snug sm:leading-tight">
            بوابتك الموثوقة لمستقبل عملي حقيقي <br />
            <span className="text-amber-300 font-black inline-block mt-1 sm:mt-2 drop-shadow-[0_2px_12px_rgba(252,211,77,0.45)]">
              وتصفح أقسام الأكاديميات المعتمدة
            </span>
          </h1>
          <SpeechButton 
            textToSpeak="بوابتك الموثوقة لمستقبل عملي حقيقي وتصفح أقسام الأكاديميات المعتمدة. تصفح الدليل الأحدث لعام ألفين وستة وعشرين لأكثر من سبعة عشر شعبة علمية وهندسية وصحية معتمدة محلياً."
            className="mt-0.5 bg-white/10 text-amber-300 border-white/20 hover:bg-amber-500 hover:text-white"
          />
        </div>

        {/* 3. Subparagraph */}
        <p className="text-[11px] sm:text-sm md:text-base text-slate-200 max-w-2xl text-center leading-relaxed font-medium">
          تصفح الدليل الأحدث لعام ٢٠٢٦ لأكثر من ١٧ شعبة علمية وهندسية وصحية معتمدة محلياً. احصل على التوجيه الأكاديمي الحقيقي المبني على معايير المصداقية الكاملة بعيداً عن المبالغات.
        </p>

        {/* 4. Action Buttons Row */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 mt-1 sm:mt-2 w-full justify-center px-2 max-w-lg sm:max-w-none">
          {/* Button 1 */}
          <Link to="/discounts" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-5 py-3 sm:px-8 sm:py-4 rounded-xl text-xs sm:text-base shadow-lg active:scale-98 transition-all duration-200 text-center cursor-pointer">
            🚀 احجز مقعدك الآن وقدم في ثوانٍ
          </Link>
          {/* Button 2 */}
          <Link to="/departments" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-4 py-2.5 sm:px-6 sm:py-4 rounded-xl text-xs sm:text-sm transition-all duration-200 text-center cursor-pointer backdrop-blur-md">
            📚 استكشاف الشعب والمهارات
          </Link>
        </div>

        {/* Lead Magnet Interactive Trigger Button */}
        <div className="pt-1 sm:pt-2 w-full max-w-xl">
          <button
            type="button"
            onClick={() => setIsBookletModalOpen(true)}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black px-3.5 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm border-2 border-amber-300/80 shadow-lg shadow-amber-500/20 transition-all duration-200 cursor-pointer active:scale-98 tracking-wide flex items-center justify-center gap-1.5"
          >
            <span className="text-sm sm:text-base">⬇️</span>
            <span>تحميل الدليل الرسمي الشامل للمصروفات والشعب لعام 2026 (نسخة PDF)</span>
          </button>
        </div>

        {/* 5. Counters Row */}
        <div ref={containerRef} className="counters-row-item grid grid-cols-3 gap-2 sm:gap-6 mt-4 sm:mt-6 bg-slate-900/65 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl max-w-md w-full shadow-xl">
          <div className="text-center">
            <strong className="text-amber-400 text-base sm:text-2xl font-black block">+{toArabicDigits(deptCount)}</strong>
            <span className="text-[9.5px] sm:text-xs text-slate-300 block font-medium mt-0.5 sm:mt-1">تخصص معتمد</span>
          </div>
          <div className="text-center border-x border-white/10">
            <strong className="text-emerald-400 text-base sm:text-2xl font-black block">+{toArabicDigits(yearsCount)}</strong>
            <span className="text-[9.5px] sm:text-xs text-slate-300 block font-medium mt-0.5 sm:mt-1">سنوات خبرة</span>
          </div>
          <div className="text-center">
            <strong className="text-amber-400 text-base sm:text-2xl font-black block">+{toArabicDigits(studentsCount)}</strong>
            <span className="text-[9.5px] sm:text-xs text-slate-300 block font-medium mt-0.5 sm:mt-1">طالب مسجل</span>
          </div>
        </div>

        {/* 6. Live Badges Footer */}
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center items-center mt-2 sm:mt-4 text-[10px] sm:text-[11px] text-slate-300">
          <span className="live-badge-item flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 animate-pulse"/> 
            تسجيلات حية جارية الآن
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="live-badge-item flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            متاح تأجيل تجنيد قانوني من خلال معهد لاسلكي
          </span>
        </div>
      </div>

      {/* Sleek Booklet Validation Modal */}
      <PDFDownloadModal
        isOpen={isBookletModalOpen}
        onClose={() => setIsBookletModalOpen(false)}
        defaultSpecialization="الدليل الرسمي الشامل 2026"
      />
    </section>
  );
}