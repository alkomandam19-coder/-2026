import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Clock, PhoneCall, Lock, ChevronLeft, X, Check, Users, Menu } from "lucide-react";
import { useSimulatedCount } from "../hooks/useSimulatedCount";
import { supabase, hasSupabase } from "../supabaseClient";
import { UNIFIED_EDUCATION_LEVELS } from "../constants/educationLevels";

// Simulated background entries pool containing at least 30 distinct organic Arabic identities
const SIMULATED_POOL = [
  { name: "أمجد سمير كمال", governorate: "الدقهلية", dept: "تحاليل طبية واشعة ( فني خدمات صحيه )" },
  { name: "فاطمة أحمد الزهراء", governorate: "الإسكندرية", dept: "تمريض (مساعد خدمات صحية)" },
  { name: "كريم حسين مرسي", governorate: "الجيزة", dept: "البرمجة والذكاء الاصطناعي (نظم معلومات)" },
  { name: "ولاء حسن الصياد", governorate: "البحيرة", dept: "إدارة الأعمال والنظم والعلاقات العامة" },
  { name: "إبراهيم فرج الشافعي", governorate: "القليوبية", dept: "بترول وبتروكيماويات" },
  { name: "شروق محمد الرفاعي", governorate: "الشرقية", dept: "تركيبات الأسنان" },
  { name: "مصطفى عادل يسري", governorate: "الفيوم", dept: "مساحة وخرائط" },
  { name: "روان بهجت خليل", governorate: "طنطا", dept: "التسويق الإلكتروني" },
  { name: "سعد الدين محمود", governorate: "أسيوط", dept: "بترول وبتروكيماويات" },
  { name: "منار زكريا عبد الله", governorate: "السويس", dept: "تغذية علاجية" },
  { name: "يوسف أحمد النجار", governorate: "القاهرة", dept: "البرمجة والذكاء الاصطناعي (نظم معلومات)" },
  { name: "رنا سعيد جلال", governorate: "المنوفية", dept: "صحافة وإعلام" },
  { name: "محمود عبد الرحمن", governorate: "الأقصر", dept: "مساحة وخرائط" },
  { name: "ليلى فوزي البدري", governorate: "الإسماعيلية", dept: "لغات وترجمة" },
  { name: "أمجد سيف النصر", governorate: "بورسعيد", dept: "التصميم والفنون الجميلة" },
  { name: "سارة كمال الهواري", governorate: "سوهاج", dept: "تمريض (مساعد خدمات صحية)" },
  { name: "مهند عمرو الشرقاوي", governorate: "الغربية", dept: "ضيافة جوية" },
  { name: "ندى عماد الشريف", governorate: "القاهرة", dept: "تحاليل طبية واشعة ( فني خدمات صحيه )" },
  { name: "عبد الله جلال مراد", governorate: "المنيا", dept: "سياحة وفنادق" },
  { name: "رانيا عصام هلال", governorate: "بني سويف", dept: "ضباط لاسلكي" },
  { name: "حازم أشرف عبد الخالق", governorate: "الإسكندرية", dept: "تربية خاصة" },
  { name: "جهاد رأفت الجبالي", governorate: "القليوبية", dept: "تحاليل طبية واشعة ( فني خدمات صحيه )" },
  { name: "علاء مرسي أبو العزم", governorate: "كفر الشيخ", dept: "بترول وبتروكيماويات" },
  { name: "مروة شريف غانم", governorate: "الجيزة", dept: "البرمجة والذكاء الاصطناعي (نظم معلومات)" },
  { name: "يحيى زكريا الطوخي", governorate: "دمياط", dept: "التسويق الإلكتروني" },
  { name: "إيمان عادل المليجي", governorate: "البحيرة", dept: "تركيبات الأسنان" },
  { name: "باسل فريد الخياط", governorate: "قنا", dept: "مساحة وخرائط" },
  { name: "ضحى مسعد الوكيل", governorate: "الشرقية", dept: "تغذية علاجية" },
  { name: "عمر ياسر القاضي", governorate: "الفيوم", dept: "إدارة الأعمال والنظم والعلاقات العامة" },
  { name: "دينا طارق رسلان", governorate: "أسوان", dept: "صحافة وإعلام" }
];

function stripEmojis(text: string): string {
  if (!text) return "";
  try {
    return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
  } catch (e) {
    return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "").trim();
  }
}

function maskName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const firstName = parts[0];
  if (parts.length === 1) {
    return firstName + " " + "*".repeat(3);
  }
  const secondInitial = parts[1][0] || "";
  return `${firstName} ${secondInitial}${"*".repeat(3)}`;
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [mobileHomeExpanded, setMobileHomeExpanded] = useState(true);
  
  const simulatedStudentsCount = useSimulatedCount();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");
  const [cbWhatsapp, setCbWhatsapp] = useState("");
  const [cbGovernorate, setCbGovernorate] = useState("");
  const [cbGraduationYear, setCbGraduationYear] = useState("");
  const [cbEducationLevel, setCbEducationLevel] = useState("");
  const [cbSpecialization, setCbSpecialization] = useState("");
  const [cbBasicCourse, setBasicCourse] = useState("دورة أكتوبر 2026 (الرئيسية)");
  const [cbNotes, setCbNotes] = useState("");
  const [cbSuccess, setCbSuccess] = useState(false);
  const [cbError, setCbError] = useState<string | null>(null);
  const [cbLoading, setCbLoading] = useState(false);

  // Live Geo-Registration Ticker states
  const [tickerActive, setTickerActive] = useState(true);
  const [trueRegistrations, setTrueRegistrations] = useState<any[]>([]);
  const [activeDepts, setActiveDepts] = useState<string[]>([
    "تحاليل طبية واشعة ( فني خدمات صحيه )",
    "تمريض (مساعد خدمات صحية)",
    "تركيبات الأسنان",
    "تغذية علاجية",
    "بترول وبتروكيماويات",
    "مساحة وخرائط",
    "البرمجة والذكاء الاصطناعي (نظم معلومات)",
    "إدارة الأعمال والنظم والعلاقات العامة",
    "التسويق الإلكتروني",
    "صحافة وإعلام",
    "لغات وترجمة",
    "تربية خاصة",
    "التصميم والفنون الجميلة",
    "ضيافة جوية",
    "سياحة وفنادق",
    "ضباط لاسلكي"
  ]);

  const loadTrueRegistrations = async () => {
    try {
      let combined: any[] = [];
      if (hasSupabase) {
        // 1. Fetch from Supabase with specialization and selected_departments included
        const { data, error } = await supabase
          .from("students")
          .select("full_name, governorate, created_at, specialization, selected_departments")
          .order("created_at", { ascending: false })
          .limit(15);
        
        if (data && !error) {
          combined = data.map(item => {
            let deptName = item.specialization || "";
            if (!deptName && item.selected_departments) {
              let depts = [];
              if (Array.isArray(item.selected_departments)) {
                depts = item.selected_departments;
              } else if (typeof item.selected_departments === "string") {
                try { depts = JSON.parse(item.selected_departments); } catch (e) { depts = []; }
              }
              if (depts && depts.length > 0) {
                deptName = depts[0];
              }
            }
            // Strip emojis from department name to keep the ticker display perfectly clean
            if (deptName) {
              deptName = stripEmojis(deptName);
            }
            if (!deptName || deptName === "القبول والتسجيل المباشر" || deptName === "استفسار عام بالشات" || deptName === "مستندات وقبول كلي") {
              deptName = "البرمجة والذكاء الاصطناعي (نظم معلومات)";
            }
            return {
              name: item.full_name,
              governorate: item.governorate || "محافظة القاهرة",
              dept: deptName,
              isReal: true
            };
          });
        }
      }

      // 2. Fetch/merge from immediate local storage leads for instant client-side testing response
      const localLeadsRaw = localStorage.getItem("academy_direct_leads");
      if (localLeadsRaw) {
        try {
          const localParsed = JSON.parse(localLeadsRaw);
          if (Array.isArray(localParsed)) {
            const mapped = localParsed.map((item: any) => {
              let deptName = (Array.isArray(item.selectedDepartments) && item.selectedDepartments.length > 0) ? item.selectedDepartments[0] : (item.specialization || "");
              if (deptName) {
                deptName = stripEmojis(deptName);
              }
              if (!deptName || deptName === "القبول والتسجيل المباشر" || deptName === "استفسار عام بالشات" || deptName === "مستندات وقبول كلي") {
                deptName = "البرمجة والذكاء الاصطناعي (نظم معلومات)";
              }
              return {
                name: item.studentName || item.fullName,
                governorate: item.governorate || "استمارة حية",
                dept: deptName,
                isReal: true
              };
            });
            // Append and deduplicate by name slightly to prioritize latest inputs
            combined = [...mapped, ...combined];
          }
        } catch (e) {
          console.warn("Local leads parse error", e);
        }
      }

      // De-duplicate matching names
      const seen = new Set();
      const uniqueCombined = combined.filter(item => {
        if (!item.name) return false;
        const key = item.name.trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setTrueRegistrations(uniqueCombined);
    } catch (err) {
      console.warn("Error loading true registrations ticker list", err);
    }
  };

  useEffect(() => {
    const handleTickerActiveCheck = () => {
      const active = localStorage.getItem("academy_simulated_ticker_active") !== "false";
      setTickerActive(active);
    };

    handleTickerActiveCheck();
    loadTrueRegistrations();

    // Fetch live active departments
    fetch("/api/roi-departments")
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.departments)) {
          const names = data.departments
            .filter((d: any) => !d.isClosed && !d.isFull && d.id !== "construction" && !d.name?.includes("تشييد"))
            .map((d: any) => {
              // Strip any emojis for cleaner display in the scrolling ticker
              return stripEmojis(d.name);
            });
          if (names.length > 0) {
            setActiveDepts(names);
          }
        }
      })
      .catch(err => console.warn("Failed to fetch roi departments", err));

    // Event listeners for absolute live reactivity
    window.addEventListener("storage", (e) => {
      if (e.key === "academy_simulated_ticker_active") {
        setTickerActive(e.newValue !== "false");
      }
      if (e.key === "academy_direct_leads") {
        loadTrueRegistrations();
      }
    });

    const handleLeadsUpdatedEvent = () => {
      loadTrueRegistrations();
    };

    window.addEventListener("academy_leads_updated", handleLeadsUpdatedEvent);

    return () => {
      window.removeEventListener("academy_leads_updated", handleLeadsUpdatedEvent);
    };
  }, []);

  // Stable, performance-optimized, non-shivering ticker items stream
  const tickerItems = useMemo(() => {
    const simulatedMapped = SIMULATED_POOL.map((item, index) => {
      // Deterministically map simulated names to actual active departments in the academy
      const deptName = activeDepts[index % activeDepts.length];
      return {
        text: `🔥 انضم الآن الطالب ${maskName(item.name)} من ${item.governorate} لشعبة ${deptName}`,
        isReal: false
      };
    });

    const realMapped = trueRegistrations.map(item => ({
      text: `🎉 حجز مؤكد وموثق للطالب ${maskName(item.name || "جديد")} من ${item.governorate || "محافظة القاهرة"} لشعبة ${item.dept || "مستندات وقبول كلي"}`,
      isReal: true
    }));

    if (tickerActive) {
      return [...realMapped, ...simulatedMapped];
    } else {
      return realMapped;
    }
  }, [trueRegistrations, tickerActive, activeDepts]);

  // Dynamically calculate ticker duration for a uniform scrolling speed (constant pace per item)
  // Highly readable on mobile (very slow: 22s per item) and smooth on desktop (14s per item)
  const tickerDuration = useMemo(() => {
    const factor = isMobile ? 22 : 14;
    return `${Math.max(30, tickerItems.length * factor)}s`;
  }, [tickerItems.length, isMobile]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCbError(null);

    // 1. الاسم الرباعي بالكامل *
    const nameTrim = cbName.trim();
    if (!nameTrim) {
      setCbError("شرط إجباري *: يرجى كتابة اسم الطالب الرباعي بالكامل.");
      return;
    }

    const nameWords = nameTrim.split(/\s+/).filter(Boolean);
    if (nameWords.length < 4) {
      setCbError(`شرط إجباري *: يرجى كتابة الاسم رباعياً كاملاً (كتبت ${nameWords.length} من أصل 4 كلمات مطلوبة).`);
      return;
    }

    // 2. الهاتف *
    const cleanPhone = cbPhone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 11 || !/^(010|011|012|015)/.test(cleanPhone)) {
      setCbError("شرط إجباري *: يرجى كتابة رقم تواصل مصري صحيح (11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015).");
      return;
    }

    // 3. الواتساب *
    const cleanWa = cbWhatsapp.trim().replace(/\D/g, "");
    if (!cleanWa || cleanWa.length !== 11 || !/^(010|011|012|015)/.test(cleanWa)) {
      setCbError("شرط إجباري *: يرجى كتابة رقم واتساب مصري صحيح (11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015).");
      return;
    }

    // 4. المحافظة *
    if (!cbGovernorate.trim()) {
      setCbError("شرط إجباري *: يرجى اختيار المحافظة.");
      return;
    }

    // 5. سنة التخرج *
    if (!cbGraduationYear.trim()) {
      setCbError("شرط إجباري *: يرجى كتابة سنة التخرج.");
      return;
    }

    // 6. المؤهل الدراسي *
    if (!cbEducationLevel.trim()) {
      setCbError("شرط إجباري *: يرجى تحديد المؤهل الدراسي (خريج ايه؟).");
      return;
    }

    // 7. الأقسام المطلوب التسجيل بها *
    if (!cbSpecialization.trim()) {
      setCbError("شرط إجباري *: يرجى اختيار التخصص أو القسم المطلوب الاستفسار والتسجيل به.");
      return;
    }

    setCbLoading(true);
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: nameTrim,
          phoneNumber: cleanPhone,
          whatsappNumber: cleanWa,
          governorate: cbGovernorate.trim(),
          graduationYear: cbGraduationYear.trim(),
          educationLevel: cbEducationLevel.trim(),
          specialization: cbSpecialization.trim(),
          basicCourse: cbBasicCourse,
          notes: cbNotes.trim(),
          source: "استمارة طلب اتصال من مستشار التسجيل"
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Local lead tracking for instant display
      const directLeads = JSON.parse(localStorage.getItem("academy_direct_leads") || "[]");
      directLeads.unshift({
        studentName: nameTrim,
        phoneNumber: cleanPhone,
        whatsappNumber: cleanWa,
        specialization: cbSpecialization,
        educationLevel: cbEducationLevel,
        governorate: cbGovernorate || "استمارة حية",
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("academy_direct_leads", JSON.stringify(directLeads.slice(0, 30)));
      window.dispatchEvent(new Event("academy_leads_updated"));
      
      setCbSuccess(true);
      setCbName("");
      setCbPhone("");
      setCbWhatsapp("");
      setCbGovernorate("");
      setCbGraduationYear("");
      setCbEducationLevel("");
      setCbSpecialization("");
      setCbNotes("");
    } catch (err: any) {
      setCbError(err.message || "عذراً فشل إرسال الطلب.");
    } finally {
      setCbLoading(false);
    }
  };

  const formatEgyptianTime = (date: Date) => {
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-full flex flex-col font-sans sticky top-0 z-50 shadow-sm" dir="rtl">
      
      {/* 1. شريط الإعلانات العلوي الرفيع */}
      <div className="bg-[#0A2463] text-white text-[7px] md:text-xs py-1 md:py-1.5 px-2 md:px-3 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className="bg-[#FF7F50] text-white font-black text-[7px] md:text-[9px] px-1 py-0.5 rounded-sm animate-pulse shrink-0">
              خصومات حصرية محدودة🔥
            </span>
            <p className="font-medium text-slate-200 text-center text-[7.5px] md:text-xs">
              فرص حجز مفعّلة مؤقتاً للتقديم المبكر لعام ٢٠٢٦
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 text-[8px] md:text-xs font-sans text-slate-350">
            <span className="flex items-center gap-1 bg-[#102a6b] px-1 md:px-2 py-0.5 rounded text-amber-300 font-bold border border-amber-500/25 text-[8px]">
              <Users className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-400 shrink-0" />
              <span>التقديمات لحظياً:</span>
              <span className="font-mono text-white font-extrabold">{simulatedStudentsCount.toLocaleString("ar-EG")}</span>
            </span>
            <span className="flex items-center gap-1 font-mono hidden sm:flex">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>بتوقيت القاهرة: {formatEgyptianTime(time)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 شريط التسجيلات والقبول الحي (Live Geo-Registration Ticker) */}
      <div 
        className="bg-[#040D21] text-white py-0.5 md:py-1.5 px-2 md:px-3 border-b border-indigo-950/50 text-[7px] md:text-[10px] font-sans overflow-hidden select-none relative z-20" 
        id="geo-registration-ticker"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center gap-1.5 md:gap-3">
          <div className="bg-emerald-500 text-slate-950 text-[8px] md:text-xs px-1.5 py-0.5 md:px-3 md:py-1 font-black rounded shrink-0 flex items-center gap-0.5 md:gap-1 shadow-xs animate-pulse">
            <span className="relative flex h-1 w-1 md:h-1.5 md:w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1 w-1 md:h-1.5 md:w-1.5 bg-slate-950"></span>
            </span>
            <span>لوحة التسجيلات 🟢</span>
          </div>

          <div className="relative w-full overflow-hidden flex items-center h-4 md:h-5">
            {tickerItems.length > 0 ? (
              <div 
                className="flex animate-marquee whitespace-nowrap gap-4 md:gap-8 text-[8px] md:text-[12px] font-extrabold text-[#94A3B8]"
                style={{ animationDuration: tickerDuration, animationTimingFunction: "linear", willChange: "transform" }}
              >
                {tickerItems.concat(tickerItems).map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 md:gap-2.5">
                    <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full inline-block ${item.isReal ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"}`}></span>
                    <span className={item.isReal ? "text-emerald-300 font-black border-b border-emerald-500/20" : "text-white"}>
                      {item.text}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[7px] md:text-[10px] text-slate-400 animate-pulse">بانتظار تسجيلات الطلاب النشطة للظهور هنا...</span>
            )}
          </div>
        </div>
      </div>

       {/* 2. شريط التنقل الأساسي الزجاجي النحيف جداً على الموبايل */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 py-1.5 md:py-2 px-2.5 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 md:gap-2">
          
          {/* الشعار والاسم متجاوب ورشيق للغاية - يوجه للصفحة الرئيسية */}
          <Link to="/" className="flex items-center gap-2 shrink-0 text-right hover:opacity-95 transition-opacity">
            <img 
              src="/logo.png" 
              className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-white p-0.5 rounded-full border border-slate-200 object-cover shadow-sm" 
              alt="بوابة المعاهد والأكاديميات الخاصة" 
              referrerPolicy="no-referrer"
              fetchPriority="high"
            />
            <div className="space-y-0">
              <span className="block font-black text-[9px] sm:text-xs md:text-sm text-[#0A2463] font-sans tracking-tight">
                بوابة المعاهد والأكاديميات الخاصة
              </span>
              <p className="hidden xl:block text-[8.5px] sm:text-[10.5px] text-[#D49800] font-black font-sans leading-none mt-1">
                المنصة التفاعلية المعتمدة للتسجيل والتوجيه
              </p>
            </div>
          </Link>

          {/* القائمة للكمبيوتر فقط واللاب توب - موسطنة ومنسقة بشكل شيك */}
          <div className="hidden lg:flex flex-1 justify-center mx-1.5 xl:mx-3">
            <nav className="flex items-center gap-1.5 bg-slate-50/70 p-1 rounded-2xl border border-slate-100/80 relative">
              
              {/* 1. الرئيسية مع قائمة فرعية منسدلة كالمواقع العالمية */}
              <div 
                className="relative shrink-0" 
                onMouseEnter={() => setShowHomeDropdown(true)} 
                onMouseLeave={() => setShowHomeDropdown(false)}
              >
                <Link
                  to="/"
                  onClick={() => setShowHomeDropdown(false)}
                  className={`px-3.5 py-2 rounded-xl text-xs xl:text-sm font-black transition flex items-center gap-1.5 shrink-0 ${
                    isActive("/") || isActive("/accreditation") || isActive("/parents-assurance") || isActive("/lab-experience") || isActive("/application-tracker") || isActive("/roi-calculator") || isActive("/career-roadmap")
                      ? "bg-[#0A2463] text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>الرئيسية</span>
                  <span className="text-[10px] text-amber-400 font-bold">▾</span>
                </Link>

                {showHomeDropdown && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-30 text-right animate-scale-up" dir="rtl">
                    <div className="px-3 py-1 mb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      الصفحات الفرعية للرئيسية 🏛️
                    </div>
                    {[
                      { path: "/", text: "الصفحة الرئيسية بالكامل", icon: "🏠" },
                      { path: "/accreditation", text: "الاعتمادات والمصروفات الرسمية 2026", icon: "🏛️" },
                      { path: "/parents-assurance", text: "استشارة ولي الأمر ونظام التقسيط", icon: "☎️" },
                      { path: "/lab-experience", text: "يوم المعايشة والنزول الميداني للمعامل", icon: "🏫" },
                      { path: "/application-tracker", text: "تتبع حالة الملف التقديمي الفوري", icon: "🔍" },
                      { path: "/roi-calculator", text: "حاسبة العائد المهني والـ ROI", icon: "📈" },
                      { path: "/career-roadmap", text: "خريطة الطريق والنمو المهني 2026", icon: "🗺️" }
                    ].map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        onClick={() => setShowHomeDropdown(false)}
                        className={`block px-3.5 py-2 text-xs font-black transition-colors ${
                          isActive(subItem.path)
                            ? "bg-[#0A2463]/10 text-[#0A2463] font-black border-r-4 border-[#0A2463]"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm shrink-0">{subItem.icon}</span>
                          <span className="truncate">{subItem.text}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {[
                { path: "/registration-guide", text: "دليل التسجيل", icon: "📋" },
                { path: "/departments", text: "الأقسام", icon: "📚" },
                { path: "/news", text: "الأخبار", icon: "📰" },
                { path: "/form-extraction", text: "الاستمارة 📄", icon: "", isSpecial: true }
              ].map((item) => (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`px-3.5 py-2 rounded-xl text-xs xl:text-sm font-black transition flex items-center gap-1.5 shrink-0 ${
                    isActive(item.path) 
                      ? "bg-[#0A2463] text-white shadow-sm" 
                      : (item as any).isHighlight
                        ? "bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300 font-black shadow-3xs"
                        : item.isSpecial 
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-600 border border-amber-400 font-black shadow-3xs" 
                          : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.text}</span>
                  {item.icon && <span className="text-xs xl:text-sm opacity-90 inline-block">{item.icon}</span>}
                </Link>
              ))}

              {/* Dropdown "المزيد ▾" */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className={`px-3.5 py-2 rounded-xl text-xs xl:text-sm font-black transition flex items-center gap-1 cursor-pointer select-none ${
                    showMoreDropdown ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>المزيد ▾</span>
                </button>

                {showMoreDropdown && (
                  <>
                    {/* Backdrop to close the dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMoreDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2.5 z-20 text-right animate-scale-up" dir="rtl">
                      <div className="px-4 py-1 text-[10px] font-black text-amber-700 uppercase tracking-wider border-b border-slate-100 bg-amber-50/50 mb-1">
                        بوابات الأكاديميات المعتمدة 🏛️
                      </div>
                      {[
                        { path: "/salam", text: "أكاديمية السلام للتدريب", icon: "🏛️" },
                        { path: "/trust", text: "أكاديمية تراست للعلوم الطبية", icon: "🩺" },
                        { path: "/apex", text: "أكاديمية أبيكس", icon: "🎓" },
                        { path: "/refaq", text: "أكاديمية الرفاق للتدريب", icon: "💼" },
                      ].map((acad) => (
                        <Link
                          key={acad.path}
                          to={acad.path}
                          onClick={() => setShowMoreDropdown(false)}
                          className={`block px-4 py-2 text-xs font-black transition-colors ${
                            isActive(acad.path)
                              ? "bg-amber-100/60 text-amber-950 font-black border-r-4 border-amber-600"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm shrink-0">{acad.icon}</span>
                            <span className="truncate">{acad.text}</span>
                          </div>
                        </Link>
                      ))}

                      <div className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-t border-slate-100 bg-slate-50/50 my-1">
                        أدوات ومحتوى إضافي 📌
                      </div>
                      {[
                        { path: "/form-extraction-guide", text: "دليل استخراج الاستمارة", icon: "📖" },
                        { path: "/trending", text: "الأكثر طلباً", icon: "🔥" },
                        { path: "/guidance", text: "اكتشف مجالك", icon: "🧭" },
                        { path: "/complaints", text: "الشكاوى", icon: "📢" },
                        { path: "/about", text: "عن البوابة", icon: "🏢" },
                        { path: "/privacy", text: "الخصوصية", icon: "🔒" },
                      ].map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setShowMoreDropdown(false)}
                          className={`block px-4 py-2 text-xs font-black transition-colors ${
                            isActive(subItem.path)
                              ? "bg-[#0A2463]/10 text-[#0A2463]"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {subItem.icon && <span className="text-sm shrink-0">{subItem.icon}</span>}
                            <span>{subItem.text}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </nav>
          </div>

          {/* زر الطلب السريع للاتصال */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setCbSuccess(false); setCbError(null); setIsCallbackModalOpen(true); }}
              className="bg-[#FF7F50] text-white hover:bg-[#FF7F50]/95 px-4 py-2.5 rounded-xl text-xs xl:text-sm font-black transition flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>اتصل بمستشار 📞</span>
            </button>
          </div>

          {/* واجهة التليفون: زر الحجز السريع + زر تصفح المزيد بسهم متبوعاً بزر القائمة المنسدلة */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
            <Link
              to="/discounts"
              className="bg-[#FF7F50] hover:bg-[#FF7F50]/95 text-white px-2.5 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition shadow-xs active:scale-95 shrink-0"
            >
              احجز الآن 🏷️
            </Link>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-slate-100 hover:bg-slate-200 text-[#0A2463] px-2 py-1.5 text-[9.5px] sm:text-[11px] font-black rounded-lg transition border border-slate-200 flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
              title="تصفح باقي أقسام وصفحات الموقع"
            >
              <span>تصفح المزيد</span>
              <ChevronLeft className="w-3 h-3 text-amber-500 animate-pulse shrink-0" />
            </button>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg border border-slate-200 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="القائمة المنسدلة"
            >
              {isOpen ? <X className="w-4 h-4 text-red-500" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* المنيو المنسدل للموبايل - بيقفل ويفتح بضغطة واحدة من غير أي بوظان */}
        {isOpen && (
          <div className="lg:hidden mt-2 border-t border-slate-100 pt-2 pb-2 space-y-1 bg-white text-right animate-fade-in px-1">
            
            {/* الرئيسية وبداخلها الصفحات الفرعية بالموبايل */}
            <div className="space-y-1 bg-slate-50/80 p-2 rounded-2xl border border-slate-150">
              <div className="flex items-center justify-between">
                <Link 
                  to="/" 
                  onClick={() => setIsOpen(false)}
                  className={`text-xs font-black ${isActive("/") ? "text-[#0A2463]" : "text-slate-900"}`}
                >
                  🏠 الرئيسية بالكامل
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileHomeExpanded(!mobileHomeExpanded)}
                  className="text-[10px] text-amber-600 font-extrabold px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-3xs"
                >
                  {mobileHomeExpanded ? "إخفاء الفرعيات ▲" : "عرض الصفحات الفرعية ▾"}
                </button>
              </div>

              {mobileHomeExpanded && (
                <div className="pr-2 space-y-1 border-r-2 border-amber-400 mt-2">
                  {[
                    { path: "/accreditation", label: "🏛️ الاعتمادات والمصروفات 2026" },
                    { path: "/parents-assurance", label: "☎️ استشارة ولي الأمر والتقسيط" },
                    { path: "/lab-experience", label: "🏫 يوم المعايشة والنزول للمعامل" },
                    { path: "/application-tracker", label: "🔍 تتبع حالة الملف التقديمي" },
                    { path: "/roi-calculator", label: "📈 حاسبة العائد المهني (ROI)" },
                    { path: "/career-roadmap", label: "🗺️ خريطة الطريق والنمو الوظيفي" }
                  ].map((sub) => (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      onClick={() => setIsOpen(false)}
                      className={`block px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                        isActive(sub.path) ? "bg-[#0A2463] text-white" : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* الأكاديميات المعتمدة */}
            <div className="p-2.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1.5">
              <div className="text-[10px] font-black text-amber-900 px-1 mb-1">
                بوابات الأكاديميات المعتمدة 🏛️
              </div>
              {[
                { path: "/salam", label: "🏛️ أكاديمية السلام للتدريب" },
                { path: "/trust", label: "🩺 أكاديمية تراست للعلوم الطبية" },
                { path: "/apex", label: "🎓 أكاديمية أبيكس" },
                { path: "/refaq", label: "💼 أكاديمية الرفاق للتدريب" }
              ].map((acad) => (
                <Link
                  key={acad.path}
                  to={acad.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-2.5 py-1.5 rounded-lg text-[11.5px] font-black transition-all ${
                    isActive(acad.path) ? "bg-amber-600 text-white shadow-xs" : "text-slate-800 hover:bg-amber-100/50"
                  }`}
                >
                  {acad.label}
                </Link>
              ))}
            </div>

            {[
              { path: "/registration-guide", label: "كيفية التسجيل 📋" },
              { path: "/form-extraction", label: "📄 استخرج استمارتك للتقديم" },
              { path: "/form-extraction-guide", label: "📖 دليل استخراج الاستمارة" },
              { path: "/departments", label: "تصفح الأقسام 📚" },
              { path: "/news", label: "أخبار ومقالات 📰" },
              { path: "/trending", label: "الأكثر طلباً 🔥" },
              { path: "/guidance", label: "اكتشف مجالك 🧭" },
              { path: "/complaints", label: "الشكاوى والمقترحات 📢" },
              { path: "/about", label: "عن البوابة" },
              { path: "/privacy", label: "سياسة الخصوصية 🔒" }
            ].map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  isActive(item.path) ? "bg-[#0A2463] text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <button
              onClick={() => { setIsOpen(false); setCbSuccess(false); setCbError(null); setIsCallbackModalOpen(true); }}
              className="w-full text-right block px-3 py-2.5 text-xs font-black text-[#FF7F50] bg-amber-50/50 rounded-xl hover:bg-amber-50"
            >
              طلب مكالمة مستشار 📞
            </button>
          </div>
        )}
      </header>

      {/* مودال طلب الاتصال السريع */}
      {isCallbackModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[150] flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right animate-scale-up my-auto">
            <div className="bg-[#0A2463] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <h4 className="font-extrabold text-xs sm:text-sm">طلب اتصال من مستشار التسجيل 📞</h4>
              </div>
              <button onClick={() => setIsCallbackModalOpen(false)} className="text-slate-300 hover:text-white" aria-label="إغلاق النافذة"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleRequestCallbackSubmit} className="p-4 sm:p-5 space-y-3">
              {cbSuccess ? (
                <div className="space-y-3 text-center py-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100"><Check className="w-6 h-6" /></div>
                  <h5 className="font-black text-sm sm:text-base text-emerald-800">تم تسجيل طلبك بنجاح! ⭐</h5>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">سيقوم مستشار القبول بالتواصل المباشر معكم لشرح التخصصات وشروط القبول والخصومات المتاحة.</p>
                  <button type="button" onClick={() => { setIsCallbackModalOpen(false); setCbSuccess(false); }} className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer">موافق</button>
                </div>
              ) : (
                <>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <p className="text-[11px] font-bold text-amber-900">
                      📢 الحقول التي تحمل علامة (<span className="text-[#FF7F50] font-black">*</span>) مطلوبة وإجبارية
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* 1. اسم الطالب رباعي */}
                    <div>
                      <label htmlFor="callback-name" className="block text-[11px] font-black text-slate-800 mb-1">
                        1. الاسم الرباعي بالكامل: <span className="text-[#FF7F50] font-black">*</span>
                      </label>
                      <input 
                        id="callback-name" 
                        type="text" 
                        required 
                        value={cbName} 
                        onChange={(e) => setCbName(e.target.value)} 
                        placeholder="أكتب اسمك الرباعي كاملاً..." 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]" 
                      />
                    </div>

                    {/* 2 & 3. رقم التواصل ورقم الواتساب */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="callback-phone" className="block text-[11px] font-black text-slate-800 mb-1">
                          2. الهاتف: <span className="text-[#FF7F50] font-black">*</span>
                        </label>
                        <input 
                          id="callback-phone" 
                          type="tel" 
                          required 
                          value={cbPhone} 
                          onChange={(e) => setCbPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} 
                          placeholder="010XXXXXXXX" 
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]" 
                        />
                      </div>
                      <div>
                        <label htmlFor="callback-whatsapp" className="block text-[11px] font-black text-slate-800 mb-1">
                          3. الواتساب: <span className="text-[#FF7F50] font-black">*</span>
                        </label>
                        <input 
                          id="callback-whatsapp" 
                          type="tel" 
                          required 
                          value={cbWhatsapp} 
                          onChange={(e) => setCbWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))} 
                          placeholder="011XXXXXXXX" 
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]" 
                        />
                      </div>
                    </div>

                    {/* 4 & 5. المحافظة وسنة التخرج */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="callback-gov" className="block text-[11px] font-black text-slate-800 mb-1">
                          4. المحافظة: <span className="text-[#FF7F50] font-black">*</span>
                        </label>
                        <select
                          id="callback-gov"
                          required
                          value={cbGovernorate}
                          onChange={(e) => setCbGovernorate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]"
                        >
                          <option value="">-- اختر المحافظة ▾ --</option>
                          {[
                            "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم",
                            "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس",
                            "الشرقية", "دمياط", "بني سويف", "بورسعيد", "جنوب سيناء", "قنا", "كفر الشيخ", "مطروح",
                            "الأقصر", "أسوان", "أسيوط", "سوهاج", "شمال سيناء"
                          ].map((gov) => (
                            <option key={gov} value={gov}>{gov}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="callback-grad-year" className="block text-[11px] font-black text-slate-800 mb-1">
                          5. سنة التخرج: <span className="text-[#FF7F50] font-black">*</span>
                        </label>
                        <input
                          id="callback-grad-year"
                          type="text"
                          required
                          value={cbGraduationYear}
                          onChange={(e) => setCbGraduationYear(e.target.value)}
                          placeholder="مثال: 2026 أو 2025"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]"
                        />
                      </div>
                    </div>

                    {/* 6. المؤهل الحالي */}
                    <div>
                      <label htmlFor="callback-edu" className="block text-[11px] font-black text-slate-800 mb-1">
                        6. المؤهل الدراسي: <span className="text-[#FF7F50] font-black">*</span>
                      </label>
                      <select
                        id="callback-edu"
                        required
                        value={cbEducationLevel}
                        onChange={(e) => setCbEducationLevel(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]"
                      >
                        <option value="">-- اختر المؤهل الدراسي ▾ --</option>
                        {UNIFIED_EDUCATION_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    {/* 7. التخصص المطلوب */}
                    <div>
                      <label htmlFor="callback-spec" className="block text-[11px] font-black text-slate-800 mb-1">
                        7. الأقسام التي تود التسجيل بها: <span className="text-[#FF7F50] font-black">*</span>
                      </label>
                      <select
                        id="callback-spec"
                        required
                        value={cbSpecialization}
                        onChange={(e) => setCbSpecialization(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]"
                      >
                        <option value="">-- اختر التخصص المطلوب من القائمة ▾ --</option>
                        {activeDepts.map((dept, i) => (
                          <option key={i} value={dept}>{dept}</option>
                        ))}
                        <option value="استفسار عام عن كافة التخصصات المتاحة">استفسار عام عن كافة التخصصات المتاحة</option>
                      </select>
                    </div>

                    {/* 8 & 9. الدورة الرئيسية (اختياري) والملاحظات (اختياري) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="callback-course" className="block text-[11px] font-black text-slate-800 mb-1">
                          الدورة والدفعة: <span className="text-slate-400 text-[10px] font-normal">(اختياري)</span>
                        </label>
                        <select
                          id="callback-course"
                          value={cbBasicCourse}
                          onChange={(e) => setBasicCourse(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]"
                        >
                          <option value="دورة أكتوبر 2026 (الرئيسية)">أكتوبر 2026 (الرئيسية)</option>
                          <option value="دورة يناير 2027">يناير 2027</option>
                          <option value="دورة مارس 2027">مارس 2027</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="callback-notes" className="block text-[11px] font-black text-slate-800 mb-1">
                          ملاحظات: <span className="text-slate-400 text-[10px] font-normal">(اختياري)</span>
                        </label>
                        <input
                          id="callback-notes"
                          type="text"
                          value={cbNotes}
                          onChange={(e) => setCbNotes(e.target.value)}
                          placeholder="ملاحظاتك..."
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A2463]"
                        />
                      </div>
                    </div>
                  </div>

                  {cbError && (
                    <div className="bg-red-50 border border-red-200 p-2 rounded-xl text-[11px] text-red-700 font-bold leading-relaxed">
                      ⚠️ {cbError}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={cbLoading} 
                    className="w-full py-3 bg-[#FF7F50] text-white text-xs sm:text-sm font-black rounded-xl hover:bg-[#FF7F50]/90 disabled:opacity-40 shadow-md active:scale-98 transition-all cursor-pointer"
                  >
                    {cbLoading ? "جاري الإرسال وتأكيد الطلب..." : "إرسال طلب الاستفسار وتأكيد القبول 📞"}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}