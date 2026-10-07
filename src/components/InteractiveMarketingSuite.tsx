import React, { useState, useEffect } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { ACADEMY_DEPARTMENTS } from "../data";
import { combineNotesWithAdAttribution } from "../utils/adAttribution";
import { supabase } from "../supabaseClient";
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  X, 
  Calculator, 
  TrendingUp, 
  ArrowLeft, 
  Building2, 
  Briefcase, 
  CheckCircle, 
  Ticket, 
  Download, 
  ShieldCheck, 
  GraduationCap, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Check, 
  Search, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  Award
} from "lucide-react";

// ==========================================
// 1. Live Job Vacancies Ticker Feed (Idea 14)
// ==========================================
export function LiveJobVacanciesTicker() {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const defaultAnnouncements = [
    "مطلوب مطور تطبيقات ومصمم واجهات - شركة كبرى بالقاهرة - المرتب 12000 ج",
    "مطلوب مصمم بصري فني - وكالة دعاية بالجيزة - المرتب 9500 ج",
    "مطلوب أخصائي تسويق رقمي فني - فروع الدلتا الإقليمية - راتب متميز وعمولات مجزية",
    "فنادق سياحية كبرى بالبحر الأحمر تعلن عن فتح باب التقديم لمساعدي إدارة الضيافة والخدمات الفنية",
    "مجموعة شركات مقاولات وتصميم داخلي تطلب فنيين ديكور وتنسيق مواقع براتب مجزي",
    "مطور برمجيات - بنك استثماري - التجمع الخامس - المرتب 15000 ج مع تأمين شامل"
  ];

  const loadAnnouncements = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_job_announcements");
      if (saved) {
        try {
          setAnnouncements(JSON.parse(saved));
        } catch (e) {
          setAnnouncements(defaultAnnouncements);
        }
      } else {
        setAnnouncements(defaultAnnouncements);
        localStorage.setItem("custom_job_announcements", JSON.stringify(defaultAnnouncements));
      }
    }
  };

  useEffect(() => {
    loadAnnouncements();

    const handleUpdate = () => {
      loadAnnouncements();
    };

    window.addEventListener("job_announcements_updated", handleUpdate);
    return () => {
      window.removeEventListener("job_announcements_updated", handleUpdate);
    };
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-slate-900 border-y border-slate-800 text-white py-3 overflow-hidden font-sans select-none relative z-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
        {/* Fixed Title Label */}
        <div className="bg-amber-500 text-slate-950 text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-md shrink-0 flex items-center gap-1 shadow-sm font-sans z-10 animate-pulse">
          <Briefcase className="w-3 h-3" />
          <span>فرص توظيف نشطة حالياً:</span>
        </div>
        
        {/* Ticker Content */}
        <div className="relative w-full overflow-hidden flex items-center">
          <div className="flex animate-marquee whitespace-nowrap gap-12 text-[11px] sm:text-xs font-bold text-amber-200">
            {announcements.concat(announcements).map((text, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span>
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Dynamic Departments Parser Utility (Strictly No Legacy Fallback)
// ==========================================
export function getDynamicDepartments(): { id: string; name: string }[] {
  const REAL_ACADEMY_DEPARTMENTS = [
    "تحاليل طبية واشعة ( فني خدمات صحيه ) 🧪",
    "تمريض (مساعد خدمات صحية) 🩺",
    "تركيبات الأسنان 🦷",
    "تغذية علاجية 🍎",
    "بترول وبتروكيماويات 🛢️",
    "مساحة وخرائط 🗺️",
    "البرمجة والذكاء الاصطناعي (نظم معلومات) 💻",
    "إدارة الأعمال والنظم والعلاقات العامة 📊",
    "التسويق الإلكتروني 🎯",
    "صحافة وإعلام 📣",
    "لغات وترجمة 🌐",
    "تربية خاصة 🧩",
    "التصميم والفنون الجميلة 🎨",
    "ضيافة جوية ✈️",
    "سياحة وفنادق 🏨",
    "ضباط لاسلكي 📻"
  ];

  if (typeof window === "undefined") {
    return REAL_ACADEMY_DEPARTMENTS.map((name, idx) => ({ id: `real_fallback_${idx}`, name }));
  }

  const prompt = localStorage.getItem("academy_ai_prompt_base") || "";
  const list: string[] = [];

  const invalidKeywords = [
    "أصر", "بلطف", "الاسم", "تلتزم", "قواعد", "إجابة", "توجيه", "قانونية", "تعليمات", 
    "معلومات", "سألك", "بطل", "أنت", "مستشار", "مساعد", "جملة", "قاعدة", "تجاهل", 
    "التزم", "جاوب", "نص", "تغذية", "أعلاه", "أدناه", "مذكورة", "طالب", "تواصل", "هاتفيا"
  ];

  if (prompt.trim()) {
    const lines = prompt.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    
    for (const line of lines) {
      const normalizedLine = line.toLowerCase();
      // Only parse brief strings that mention typical academic labels
      if (
        (normalizedLine.includes("شعبة") || normalizedLine.includes("قسم") || normalizedLine.includes("تخصص") || normalizedLine.includes("برنامج") || normalizedLine.includes("كلية")) &&
        line.length < 75 &&
        !invalidKeywords.some(keyword => normalizedLine.includes(keyword)) &&
        !normalizedLine.includes("شرح") && 
        !normalizedLine.includes("مقدمة") && 
        !normalizedLine.includes("أهلاً") && 
        !normalizedLine.includes("اهلاً") &&
        !normalizedLine.includes("أهلا") &&
        !normalizedLine.includes("مرحبا") &&
        !normalizedLine.includes("إذا سألك") &&
        !normalizedLine.includes("إذا كان")
      ) {
        const cleaned = line.replace(/^[-\*\u2022•\s\d\.\)\-\–\—]+/g, "").trim();
        if (cleaned && cleaned.length > 3) {
          list.push(cleaned);
        }
      }
    }
  }

  // Combine lists: dynamically parsed first (if valid), followed by static high quality fallback
  const filteredDynamicList = list.filter(name => {
    const norm = name.toLowerCase();
    return !invalidKeywords.some(kw => norm.includes(kw)) && name.length < 80;
  });

  const mergedList = [...filteredDynamicList, ...REAL_ACADEMY_DEPARTMENTS];
  const uniqueList = Array.from(new Set(mergedList));

  return uniqueList.map((name, index) => ({
    id: `validated_major_${index}`,
    name: name
  }));
}

function ChatAdvisorThinkingIndicator() {
  const [step, setStep] = useState(0);
  const steps = [
    "جاري تحليل استفسارك وبحث الملفات الأكاديمية... 🧠",
    "جاري مقارنة التخصصات واختيار التوجيه المهني الأنسب... 🔍",
    "المستشار الأكاديمي يقوم بصياغة التوجيه الذكي لك الآن... ✍️"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start animate-pulse">
      <div className="bg-amber-50/80 border border-amber-200/60 rounded-2xl p-3 max-w-[85%] text-[11px] font-bold text-amber-900 flex flex-col gap-1.5 shadow-3xs text-right" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-slate-500 font-medium text-[10px]">المستشار الذكي يفكر</span>
        </div>
        <p className="text-[10px] text-slate-700 font-semibold">{steps[step]}</p>
      </div>
    </div>
  );
}

function TypewriterMessage({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  useEffect(() => {
    let index = 0;
    const words = text.split(" ");
    let timer: any;
    
    const typeWord = () => {
      if (index < words.length) {
        setDisplayedText(prev => prev + (prev ? " " : "") + words[index]);
        index++;
        timer = setTimeout(typeWord, 30 + Math.random() * 25);
      } else {
        setIsTypingComplete(true);
        if (onComplete) onComplete();
      }
    };
    
    typeWord();
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <p className="whitespace-pre-line">
      {displayedText}
      {!isTypingComplete && <span className="inline-block w-1.5 h-3.5 bg-indigo-600 animate-pulse ml-1 align-middle" />}
    </p>
  );
}

// ==========================================
// 3. ROI Professional Calculator Component (Idea 3)
// ==========================================
export function ROIProfessionalCalculator() {
  const [departmentsList, setDepartmentsList] = useState<{
    id: string;
    name: string;
    salary: number;
    careerPct: string;
    role: string;
    demandBadge?: string;
  }[]>([]);

  const [selectedMajorId, setSelectedMajorId] = useState<string>("");
  const [customTuition, setCustomTuition] = useState(13000); // Average custom tuition

  useEffect(() => {
    const loadMajors = async () => {
      try {
        const res = await fetch("/api/roi-departments");
        const data = await res.json();
        if (data.success && Array.isArray(data.departments)) {
          setDepartmentsList(data.departments);
          if (data.departments.length > 0) {
            setSelectedMajorId(prev => {
              if (!prev || !data.departments.some((d: any) => d.id === prev)) {
                return data.departments[0].id;
              }
              return prev;
            });
          }
          return;
        }
      } catch (e) {
        console.warn("Failed REST API lookup. Reverting to localStorage mirror...", e);
      }

      const saved = localStorage.getItem("custom_roi_calculator_constants_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setDepartmentsList(parsed);
            if (parsed.length > 0) {
              setSelectedMajorId(prev => {
                if (!prev || !parsed.some(d => d.id === prev)) {
                  return parsed[0].id;
                }
                return prev;
              });
            }
          }
        } catch (e) {
          console.error("Error parsing custom_roi_calculator_constants_v2", e);
        }
      } else {
        setDepartmentsList([]);
      }
    };

    loadMajors();

    // Event listener for real-time synchronization when updated via the CRUD panel
    window.addEventListener("roi_constants_updated", loadMajors);
    return () => {
      window.removeEventListener("roi_constants_updated", loadMajors);
    };
  }, []);

  // Ensure selectedMajorId remains valid if departmentsList changed
  useEffect(() => {
    if (departmentsList.length > 0 && !departmentsList.some(d => d.id === selectedMajorId)) {
      setSelectedMajorId(departmentsList[0].id);
    }
  }, [departmentsList, selectedMajorId]);

  const details = departmentsList.find(d => d.id === selectedMajorId) || departmentsList[0] || {
    name: "تخصص رئيسي معتمد",
    salary: 10000,
    careerPct: "طلب بنسبة %90 في السوق",
    role: "دور فني ممتاز",
    demandBadge: "🔥 طلب شديد"
  };
  const totalInvestment2Years = customTuition * 2;
  const breakEvenMonths = (totalInvestment2Years / details.salary).toFixed(1);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-205 shadow-xl text-right max-w-4xl mx-auto space-y-6 relative overflow-hidden font-sans" dir="rtl" id="roi-calculator-section">
      <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-l from-[#0A2463] via-amber-500 to-indigo-800" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 justify-start border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
              حاسبة العائد المهني واستعادة الاستثمار (ROI Professional Calculator) 📈
            </h3>
            <p className="text-xs text-slate-500 font-medium">خطط لمستقبلك بثقة واكتشف سرعة استرداد الرسوم الدراسية فور التخرج والعمل الميداني.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Interactive controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-2">١. اختر التخصص الدراسي المستهدف:</label>
            <div className="grid grid-cols-2 gap-2">
              {departmentsList.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedMajorId(dept.id)}
                  className={`p-3 rounded-xl border-2 text-xs font-black transition cursor-pointer text-center truncate ${
                    selectedMajorId === dept.id
                      ? "border-[#0A2463] bg-[#0A2463]/5 text-[#0A2463]"
                      : "border-slate-150 text-slate-650 hover:bg-slate-50"
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-black text-slate-600">٢. حدد القسط السنوية التقريبي (جنيه):</label>
              <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {customTuition.toLocaleString("ar-EG")} ج.م
              </span>
            </div>
            <input
              type="range"
              min="9000"
              max="18000"
              step="500"
              value={customTuition}
              onChange={(e) => setCustomTuition(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0A2463]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
              <span>9,000 ج.م</span>
              <span>18,000 ج.م</span>
            </div>
          </div>
        </div>

        {/* Right Animated results container */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <span className="inline-block text-[10.5px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                💡 تحليل الجدوى المالية المبدئي
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping"></span>
                نبض السوق والطلب الحالي: {details.demandBadge || "🔥 طلب شديد جداً - مقاعد محدودة متبقية"}
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-slate-100 leading-snug">
              {details.name}
            </h4>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">متوسط المرتب المتوقع للتخرج:</span>
                <strong className="text-base font-extrabold text-emerald-400 font-mono">
                  +{details.salary.toLocaleString("ar-EG")} ج
                </strong>
                <p className="text-[9px] text-slate-500 mt-0.5 font-sans">شهرياً بالقطاع الخاص</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold">المرونة وفرص العمل المباشرة:</span>
                <strong className="text-xs font-extrabold text-indigo-300 font-sans block mt-1">
                  💡 {details.careerPct}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-white/10">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">إجمالي مصروفات دبلومتك (سنتين):</span>
              <span className="font-mono font-black text-slate-200">{(customTuition * 2).toLocaleString("ar-EG")} ج.م</span>
            </div>

            {/* Simulated Animated Graph Representation */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-50 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((details.salary / (customTuition * 2)) * 100 * 12))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>تخطيط الاستثمار</span>
                <span className="text-emerald-400">استرداد سريع 💸</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-xs text-emerald-300 font-bold leading-relaxed">
                🚀 ستسترد كامل مصروفات دراستك التقريبية للأكاديمية خلال <span className="underline font-mono text-white text-sm font-black mx-0.5">{breakEvenMonths}</span> أشهر فقط من مباشرة وظيفتك الأولى!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Arabic legal disclaimer below the graphs and calculations */}
      <div className="pt-4 border-t border-slate-150 text-center">
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          * تنويه قانوني: هذه الحسابات تقريبية ومبنية على مؤشرات سوق العمل الواقعية، وليست وعداً بالتوظيف الفوري فور التخرج.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 4. Corporate Hiring Gate (Idea 6)
// ==========================================
export function CorporateHiringGate() {
  const [isOpen, setIsOpen] = useState(false);
  const dynamicDepts = getDynamicDepartments();
  const defaultRequiredDept = dynamicDepts[0]?.name || "العلوم البرمجية والأنظمة الذكية";

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    requiredDept: defaultRequiredDept,
    vacanciesCount: "1",
    notes: ""
  });

  // Dynamically update the default selected department if list is loaded/changed
  useEffect(() => {
    if (defaultRequiredDept) {
      setFormData(prev => ({ ...prev, requiredDept: defaultRequiredDept }));
    }
  }, [defaultRequiredDept]);
  const [isSubmitCheck, setIsSubmitCheck] = useState(false);
  const [success, setSuccess] = useState(false);
  const [corpCompliance, setCorpCompliance] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitCheck(true);

    try {
      // Send to central express leads pipeline with flag
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: `[بوابة شركات] ${formData.companyName}`,
          phoneNumber: formData.phone,
          governorate: `مسؤول: ${formData.contactPerson}`,
          educationLevel: "شريك توظيف",
          basicCourse: formData.requiredDept,
          selectedDepartments: [`طلب خريجين عدد ${formData.vacanciesCount}`],
          notes: combineNotesWithAdAttribution(formData.notes)
        })
      });

      // Also append to local list of business partners
      const savedPartners = JSON.parse(localStorage.getItem("academy_business_leads") || "[]");
      savedPartners.push({
        id: "corp-" + Date.now(),
        ...formData,
        date: new Date().toLocaleDateString("ar-EG")
      });
      localStorage.setItem("academy_business_leads", JSON.stringify(savedPartners));

      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitCheck(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl text-right max-w-4xl mx-auto space-y-6 relative overflow-hidden font-sans" dir="rtl" id="corporate-hiring-section">
      <div className="absolute top-0 right-0 h-1.5 w-64 bg-amber-500" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 text-xs font-black">
            <Building2 className="w-4 h-4" />
            <span>بوابة الشراكة الاستراتيجية وتوظيف الشركات والمستشفيات 💼</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
            هل تبحث عن فنيين ذوي كفاءة علمية ملموسة؟ نوفر لك نخبة خريجينا!
          </h3>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-2xl">
            تتعاون الأكاديمية مع مئات المستشفيات المعامل، ومعامل الحاسب الآلي، ومراكز التوثيق في مصر لتأمين كوادر فنية جاهزة للعمل الفوري والميداني دون عثرات وبأعلى التزامات الجودة والنزاهة التعليمية.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setSuccess(false);
          }}
          className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black rounded-xl cursor-pointer shadow-lg transition active:scale-98 shrink-0 flex items-center gap-2"
          style={{ minHeight: "44px" }}
        >
          <span>🤝 تسجيل طلب توظيف وخريجين</span>
          <ArrowLeft className="w-4 h-4 text-slate-950" />
        </button>
      </div>

      {/* Modal Popup Form with interactive inputs */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-205 overflow-hidden text-right my-auto animate-scale-up">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <span className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                طلب انتداب وتوظيف خريجين (شراكة ٢٠٢٦)
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-amber-400 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {!success ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-800 font-extrabold mb-1">اسم الشركة أو المجموعة الطبية:</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: مجموعة مستشفيات الحياة"
                        value={formData.companyName}
                        onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-indigo-505/20 focus:border-[#0A2463] focus:outline-none transition font-extrabold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-800 font-extrabold mb-1">اسم مسؤول التواصل المباشر:</label>
                      <input
                        type="text"
                        required
                        placeholder="اكتب اسم مسؤول الموارد البشرية..."
                        value={formData.contactPerson}
                        onChange={(e) => setFormData(p => ({ ...p, contactPerson: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-indigo-505/20 focus:border-[#0A2463] focus:outline-none transition font-extrabold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-800 font-extrabold mb-1">رقم موبايل المسؤول (واتساب):</label>
                      <input
                        type="tel"
                        required
                        placeholder="010XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-indigo-505/20 focus:border-[#0A2463] focus:outline-none transition font-mono font-extrabold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-800 font-extrabold mb-1">الشعبة الفنية المطلوبة للعمل:</label>
                      <select
                        value={formData.requiredDept}
                        onChange={(e) => setFormData(p => ({ ...p, requiredDept: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-505/20 focus:outline-none focus:border-[#0A2463] cursor-pointer font-extrabold"
                      >
                        {dynamicDepts.length > 0 ? (
                          dynamicDepts.map((dept) => (
                            <option key={dept.id} value={dept.name} className="font-extrabold text-slate-900 bg-white">
                              {dept.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="العلوم البرمجية والأنظمة الذكية" className="font-extrabold text-slate-900 bg-white">العلوم البرمجية والأنظمة الذكية 💻</option>
                            <option value="العلوم الفنية والخدمات الصحية" className="font-extrabold text-slate-900 bg-white">العلوم الفنية والخدمات الصحية 🩺</option>
                            <option value="إدارة السجلات والخدمات اللوجستية" className="font-extrabold text-slate-900 bg-white">إدارة السجلات والخدمات اللوجستية 🔬</option>
                            <option value="الهندسة الميدانية والتصميم العملي" className="font-extrabold text-slate-900 bg-white">الهندسة الميدانية والتصميم العملي 📐</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-extrabold mb-1">عدد الفنيين المطلوب انتدابهم:</label>
                    <select
                      value={formData.vacanciesCount}
                      onChange={(e) => setFormData(p => ({ ...p, vacanciesCount: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-550/20 focus:outline-none focus:border-[#0A2463] font-extrabold"
                    >
                      <option value="1" className="font-extrabold text-slate-900 bg-white">١ فني ممارس</option>
                      <option value="2-5" className="font-extrabold text-slate-900 bg-white">من ٢ إلى ٥ فنيين</option>
                      <option value="5-10" className="font-extrabold text-slate-900 bg-white">من ٥ إلى ١٠ فنيين</option>
                      <option value="above10" className="font-extrabold text-slate-905 bg-white">حملة توظيف كبرى (أكثر من ١٠ فنيين ممارسين)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-extrabold mb-1">تفاصيل إضافية لشروط التعيين أو المزايا:</label>
                    <textarea
                      placeholder="امكانية التدريب قبل الاستلام، كشف تفاصيل الأجازات والموقع الجغرافي للعمل..."
                      value={formData.notes}
                      onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-indigo-550/20 focus:border-[#0A2463] focus:outline-none transition h-20 text-right font-extrabold"
                    />
                  </div>
                  {/* Legal Compliance Checkbox */}
                  <div 
                    className={`p-3.5 rounded-xl border text-right transition-all leading-normal ${
                      !corpCompliance
                        ? "bg-rose-50 border-r-4 border-r-rose-500 border-rose-100" 
                        : "bg-emerald-50 border-r-4 border-r-emerald-500 border-emerald-100"
                    }`}
                    id="corp-compliance-checkbox-wrapper"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={corpCompliance}
                        onChange={(e) => setCorpCompliance(e.target.checked)}
                        className="mt-0.5 w-4.5 h-4.5 accent-emerald-600 rounded-sm cursor-pointer shrink-0"
                      />
                      <span className="text-[10px] font-extrabold text-slate-900 leading-relaxed block">
                        ☑️ أقر بصفتي الممثل المفوض للمؤسسة بالاطلاع والموافقة الكاملة على شروط وأحكام بوابة القبول والتوظيف المباشر، ونعلم أن المنصة هي بوابة تأهلية وإدارية خاصة للشراكات المهنية.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitCheck || !corpCompliance}
                    className={`w-full py-4 font-black text-xs rounded-xl shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                      isSubmitCheck || !corpCompliance
                        ? "bg-slate-300 text-slate-400 cursor-not-allowed border border-slate-200"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                    style={{ minHeight: "44px" }}
                  >
                    {isSubmitCheck ? "جاري ربط طلب الشراكة..." : "🤝 إرسال الطلب واعتماد المؤسسة المهنية"}
                  </button>
                </form>

              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">تم تسجيل طلب التوظيف بنجاح!</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      سيتواصل منسق التدريب بالمنظومة العامة مع مسؤول التواصل بمجموعة <strong className="text-[#0A2463]">{formData.companyName}</strong> لتلقي بيانات السير الذاتية ومطابقتها خلال ٢٤ ساعة عمل.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. Free Shadowing Ticket Booking (Idea 9)
// ==========================================
export function FreeShadowingTicketBooking() {
  const [isOpen, setIsOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const dynamicDepts = getDynamicDepartments();
  const defaultTargetDept = dynamicDepts[0]?.name || "العلوم البرمجية والأنظمة الذكية";

  const [targetDept, setTargetDept] = useState(defaultTargetDept);

  // Sync state if dynamic list changes or loads after initial render
  useEffect(() => {
    if (defaultTargetDept) {
      setTargetDept(defaultTargetDept);
    }
  }, [defaultTargetDept]);

  const [loading, setLoading] = useState(false);
  const [ticketCode, setTicketCode] = useState("");

  const [complianceChecked, setComplianceChecked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complianceChecked) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setLocalError("يرجى التكرم بالموافقة على إقرار شروط القبول أولاً للمتابعة");
      return;
    }
    if (!name.trim() || !phone.trim()) return;

    setLocalError(null);
    setLoading(true);

    try {
      const code = `SHADOW-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
      setTicketCode(code);

      // Submit inside Google sheets and Leads list
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: `[يوم معايشة] ${name.trim()}`,
          phoneNumber: phone,
          governorate: "يوم معايشة بالمعامل",
          educationLevel: "حجز تذكرة مجانية",
          basicCourse: targetDept,
          selectedDepartments: ["تذكرة معايشة تجريبية مجانية"],
          notes: combineNotesWithAdAttribution(""),
          complianceLevelChecked: true,
          consentTimestamp: new Date().toISOString()
        })
      });

      // Append to state as active
      const localTickets = JSON.parse(localStorage.getItem("academy_shadow_tickets") || "[]");
      localTickets.push({
        id: "tkt-" + Date.now(),
        code,
        ticketCode: code,
        name: name.trim(),
        studentName: name.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        dept: targetDept,
        selectedDept: targetDept,
        date: new Date().toLocaleDateString("ar-EG"),
        complianceApproved: true,
        consentTimestamp: new Date().toISOString()
      });
      localStorage.setItem("academy_shadow_tickets", JSON.stringify(localTickets));

      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="pt-2 text-center" id="shadow-ticket-container">
        <button
          onClick={() => {
            setIsOpen(true);
            setSuccess(false);
            setName("");
            setPhone("");
          }}
          className="w-full max-w-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-605 text-white font-black px-6 py-4 rounded-xl text-xs sm:text-sm shadow-xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer duration-200"
          id="shadowing-trigger-btn"
          type="button"
        >
          <Ticket className="w-5 h-5 animate-pulse text-amber-200 shrink-0" />
          <span>🎫 احجز مقعتك المجاني ليوم المعايشة التجريبية داخل المعامل (اضغط هنا)</span>
        </button>
      </div>

      {/* Ticket Modal popup */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-205 overflow-hidden text-right my-auto relative animate-scale-up">
            
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <span className="font-sans font-black text-sm flex items-center gap-2 text-white">
                <Ticket className="w-5 h-5 text-amber-300" />
                دعوة حجز حضور المعامل الميدانية مجاناً
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-emerald-100 p-1.5 bg-white/10 hover:bg-white/25 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {!success ? (
                <form onSubmit={handleBooking} className="space-y-4 text-xs font-semibold">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-slate-700 text-xs leading-relaxed text-center font-bold">
                    أهلاً بك! تتيح لك هذه البطاقة حضور يوم دراسي كامل مع دفعة لطلاب الأكاديمية بالمعامل الكبرى والوقوف على جودة المعدات قبل سداد أي مصروفات.
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-black">اسم الطالب كاملاً:</label>
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم ثلاثي أو رباعي..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-60) mb-1 font-black">رقم الموبايل للمتابعة:</label>
                    <input
                      type="tel"
                      required
                      placeholder="010XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-black">الشعبة التجريبية المرغوب تفقدها:</label>
                    <select
                      value={targetDept}
                      onChange={(e) => setTargetDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 rounded-xl cursor-pointer"
                    >
                      {dynamicDepts.length > 0 ? (
                        dynamicDepts.map((dept) => (
                          <option key={dept.id} value={dept.name}>
                            {dept.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="العلوم البرمجية والأنظمة الذكية">العلوم البرمجية والأنظمة الذكية 💻</option>
                          <option value="العلوم الفنية والخدمات الصحية">العلوم الفنية والخدمات الصحية 🩺</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Legal Compliance Checkbox */}
                  <div 
                    className={`p-3 rounded-xl border text-right transition-all leading-normal ${
                      !complianceChecked 
                        ? "bg-slate-50 border-r-4 border-r-rose-500 border-slate-205" 
                        : "bg-emerald-500/5 border-r-4 border-r-emerald-500 border-emerald-500/20"
                    }`}
                    id="shadowing-compliance-checkbox-wrapper"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={complianceChecked}
                        onChange={(e) => {
                          setComplianceChecked(e.target.checked);
                          if (e.target.checked) setLocalError(null);
                        }}
                        className="mt-0.5 w-4.5 h-4.5 accent-emerald-600 rounded-sm cursor-pointer shrink-0"
                      />
                      <span className="text-[10px] font-extrabold text-slate-800 leading-relaxed block">
                        ☑️ أقر أنا المتقدم (أو ولي الأمر) باطلاعي وموافقتي الكاملة على شروط وأحكام منصة القبول المباشر، وأعلم تمام العلم أن هذه المنصة هي بوابة تدريبية وتأهيلية مهنية خاصة غير خاضعة لنظام التنسيق الحكومي، وأن البرامج تهدف لتطوير المهارات العملية الفنية اللازمة والربط المباشر مع سوق العمل والشراكات المؤسسية.
                      </span>
                    </label>
                  </div>

                  {localError && (
                    <p className="text-[11px] text-rose-650 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-lg animate-pulse text-right">
                      ⚠️ {localError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition flex items-center justify-center gap-1 ${
                      isShaking ? "animate-shake" : ""
                    } ${
                      loading 
                        ? "bg-slate-400 cursor-not-allowed" 
                        : !complianceChecked
                        ? "bg-[#0A2463]/60 hover:bg-[#0A2463]/70"
                        : "bg-[#0A2463] hover:bg-slate-800 active:scale-98"
                    }`}
                    style={{ minHeight: "44px" }}
                  >
                    🎫 حجز بطاقة المعايشة المجانية وصرف الكود
                  </button>
                </form>
              ) : (
                <div className="space-y-5 animate-scale-up text-center" id="generated-virtual-ticket-print">
                  
                  {/* Real interactive printable virtual ticket card */}
                  <div className="border border-dashed border-slate-205 rounded-2xl bg-slate-50/50 p-5 relative overflow-hidden text-right shadow-3xs">
                    
                    {/* Punch holes styling */}
                    <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-white border border-slate-202 rounded-full -translate-y-1/2"></div>
                    <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-white border border-slate-202 rounded-full -translate-y-1/2"></div>

                    <div className="flex items-center justify-between border-b border-dashed border-slate-202 pb-3 mb-3">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-700 font-extrabold px-2.5 py-1 rounded-md">
                        تذكرة حضور معايشة معتمدة 🔬
                      </span>
                      <strong className="font-mono text-emerald-800 text-sm tracking-wider">
                        {ticketCode}
                      </strong>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">حامل الدعوة والمقعد:</span>
                        <strong className="text-slate-800">{name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الشعبة الفنية:</span>
                        <strong className="text-[#0A2463]">{targetDept}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">موقع الحضور التجريبي:</span>
                        <span className="text-slate-800 font-bold">مقر معامل ومختبرات الأكاديمية الرئيسية</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">نوع التذكرة والتكلفة:</span>
                        <strong className="text-emerald-600">مجانية بالكامل (%100 خصومة معتمدة)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Mandated statement and copy verbatim as requested */}
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 text-emerald-950 rounded-xl leading-relaxed text-xs font-bold text-center">
                    📢 تم إصدار تذكرتك المجانية بنجاح! سيقوم قسم القبول والتسجيل بتبليغك بالموعد المحدد للحضور الفعلي للمعامل والنزول الميداني عبر الهاتف قريباً.
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 py-3 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>طباعة أو حفظ التذكرة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-202 transition cursor-pointer"
                    >
                      موافق
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

          export function InteractiveMajorSimulator() {
  const dynamicDepts = getDynamicDepartments();
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState({ computers: 0, medical: 0, labs: 0, office: 0 });
  const [quizDone, setQuizDone] = useState(false);

  const questions = [
    {
      text: "١. ما هي المهارة اليدوية أو العقلية التي تفضل التدريب العملي عليها أكثر؟",
      options: [
        { label: "🖥️ فحص أكواد البرمجة، حماية الشبكات وإدارة أنظمة البرمجيات", score: "computers" },
        { label: "⚙️ تتبع جودة العمل والأنظمة الفنية التشغيلية المتقدمة والمحاكاة", score: "medical" },
        { label: "🔬 التعامل مع السجلات وإدارة البيانات وتدفق المعلومات بنظام", score: "labs" },
        { label: "📐 التصميم الميداني، رصد مساحات المواقع ورسم المخططات العملية", score: "office" }
      ]
    },
    {
      text: "٢. نوع بيئة العمل الأكثر متعة وإرضاءً لطموحك بعد استلام الشهادة والعمل؟",
      options: [
        { label: "💻 مكاتب شركات البرمجيات، البنوك، الغرف السحابية وإدارة المواقع الإلكترونية", score: "computers" },
        { label: "🩺 المؤسسات والجهات الحديثة وأطقم الأجهزة العلاجية والخدمية", score: "medical" },
        { label: "🧬 المنشآت والشركات الإدارية ومراكز التوثيق اللوجستي الكبرى", score: "labs" },
        { label: "🗺️ شركات التصميم والمقاولات العامة والإنشاءات الميدانية الحديثة", score: "office" }
      ]
    },
    {
      text: "٣. كيف تتعامل مع التحديات التقنية اليومية التي تقابلها عادة؟",
      options: [
        { label: "🧠 أبحث عن خلل برمجي أو ثغرة لغوية في الإدخال لكتابة الحل السريع", score: "computers" },
        { label: "🔌 أفكك البوردة أو الموصل لفحص الدوائر وإعادة لحام المكونات", score: "medical" },
        { label: "🧪 ألتزم بالمعيار والأمن والسلامة دون تعديل في تدوين وحفظ عينات البيانات", score: "labs" },
        { label: "🗺️ أستخدم القياسات والمسافات الدقيقة للوصول لتفسير معزز وسليم", score: "office" }
      ]
    },
    {
      text: "٤. ما هي أكثر ميزة تبحث عنها في خيار دراستك بالأكاديميات؟",
      options: [
        { label: "🚀 فرصة عمل مرنة عن بعد أو بالقطاع التكنولوجي الرقمي الكثيف", score: "computers" },
        { label: "🩺 العمل الدائم بالمؤسسات الخدمية والقطاعات العامة بمكانة فنية متميزة", score: "medical" },
        { label: "🔬 مستويات الدقة القياسية وتسهيل المهام التنظيمية والإدارية المتطورة", score: "labs" },
        { label: "🏗️ النزول الميداني الممتع للمواقع والمشاركة برسم المخططات وتنسيق الأماكن", score: "office" }
      ]
    }
  ];

  const handleSelect = (key: string) => {
    setScores(prev => ({ ...prev, [key]: (prev[key as keyof typeof scores] || 0) + 1 }));
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setQuizDone(true);
    }
  };

  const handleReset = () => {
    setQIndex(0);
    setScores({ computers: 0, medical: 0, labs: 0, office: 0 });
    setQuizDone(false);
  };

  // Convert scores to match percentages
  const getTotal: number = (Object.values(scores) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;
  const matchPct = (val: number) => Math.min(95, Math.round(((val + 1) / (getTotal + 4)) * 105));

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-205 shadow-xl text-right max-w-2xl mx-auto space-y-5 font-sans relative overflow-hidden" dir="rtl" id="major-simulator-survey">
      <div className="absolute top-0 right-0 h-1 bg-gradient-to-l from-emerald-500 via-emerald-600 to-[#0A2463] w-full" />
      
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 justify-start">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
        <h3 className="font-extrabold text-[#0A2463] text-sm sm:text-base">
          محاكي التخصصات الميدانية: اكتشف في دقيقة شعبتك الأنسب لعام 2026 📋
        </h3>
      </div>

      {!quizDone ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold">مستشار التقييم التلقائي</span>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
              خطوة {qIndex + 1} من {questions.length}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-relaxed">
            {questions[qIndex].text}
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {questions[qIndex].options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(opt.score)}
                className="w-full text-right p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all text-xs font-bold font-sans cursor-pointer flex justify-between items-center group"
                style={{ minHeight: "52px" }}
              >
                <span>{opt.label}</span>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center animate-scale-up py-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-sm">تم تحليل اهتماماتك بنجاح! 🎉</h4>
            <p className="text-[10px] text-slate-500 mt-1">إليك نسبة التوافق المجدية للمواد التدريبية لدفعة ٢٠٢٦:</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-right py-1">
            {dynamicDepts.length > 0 ? (
              dynamicDepts.map((dept, index) => {
                const keys = ["computers", "medical", "labs", "office"];
                const scoreKey = keys[index % keys.length];
                const scoreVal = scores[scoreKey as keyof typeof scores];
                return (
                  <div key={dept.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">✨ {dept.name}:</span>
                    <strong className="text-sm font-mono text-emerald-600">{matchPct(scoreVal)}% توافق</strong>
                  </div>
                );
              })
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">💻 العلوم البرمجية والذكاء الاصطناعي:</span>
                  <strong className="text-sm font-mono text-emerald-600">{matchPct(scores.computers)}% توافق</strong>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">🩺 العلوم الفنية والخدمات الصحية:</span>
                  <strong className="text-sm font-mono text-emerald-600">{matchPct(scores.medical)}% توافق</strong>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">🔬 إدارة الأعمال اللوجستية والسجلات:</span>
                  <strong className="text-sm font-mono text-emerald-600">{matchPct(scores.labs)}% توافق</strong>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">📐 الهندسة الميدانية والتصميم العملي:</span>
                  <strong className="text-sm font-mono text-emerald-600">{matchPct(scores.office)}% توافق</strong>
                </div>
              </>
            )}
          </div>

          <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-center text-[10.5px] font-bold text-slate-700 leading-relaxed">
            💡 ننصحك بحجز وتثبيت الخصم المركزي المفتوح لحفظ المقعد لتأكيد مواءمتك مع مستشارك الأكاديمي هاتفياً.
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("booking-card-main");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex-1 py-3 bg-[#0A2463] text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all hover:bg-slate-800"
            >
              ✍️ اذهب للتقديم وتأكيد الشعبة فوراً
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 bg-slate-100 text-slate-650 text-xs font-bold rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
            >
              إعادة الاختبار
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



// ==========================================
// 7. Career Path Roadmap Timeline (Idea 13)
// ==========================================
export function CareerPathRoadmap() {
  const steps = [
    {
      title: "العام التدريبي الأول 📅 (تأسيس كامل)",
      desc: "التدريب على أساسيات التخصص، الهندسة، لغات البرمجة (Python/C) في ورش الحاسب وتصميم النظم والتقنيات بالأكاديمية.",
      benefit: "تثبيت المفهوم النظري مع 180 ساعة تدريب ميداني صريح."
    },
    {
      title: "العام التدريبي الثاني 📊 (تخصص متقدم)",
      desc: "تفكيك وبناء البورد والدوائر المتقدمة، التعاقد الميداني بالمستشفيات والشركات الشريكة لاجتياز قياس الأداء.",
      benefit: "تقديم مشروع التخرج التطبيقي ومطابقة معايير فني ممارس متمكن."
    },
    {
      title: "تخرُّج رسمي وحقيبة المستندات 📜 (استلام الشهادات)",
      desc: "استلام دبلوم مهني معتمد مع ختم النسر وتوصيات جامعة حكومية والخارجية للتقديم في النقابات المهنية وتفعيل كارنيه الغرفة.",
      benefit: "استحقاق كارنيه فني ممارس معتمد للقطاع الخاص بشكل فوري."
    },
    {
      title: "مسار العثور والعمل الفوري 🚀 (مرتبات واعدة)",
      desc: "الانفتاح والعمل المباشر بمعامل البرج، شركات الاتصالات، شركات المقاولات برواتب تبدأ من 8000 إلى 12000 جنيه.",
      benefit: "رعاية مستمرة وتلقي عروض فرص انتداب من شُركائنا المعتمدين."
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-205 shadow-xl text-right max-w-4xl mx-auto space-y-6 font-sans" dir="rtl" id="career-path-timeline">
      
      <div className="text-center space-y-1 pb-2 border-b border-slate-100">
        <h3 className="font-extrabold text-[#0A2463] text-base sm:text-lg flex items-center gap-2 justify-center">
          <GraduationCap className="w-5.5 h-5.5 text-amber-500 shrink-0" />
          خريطة طريق مستقبلك المهني والنمو الوظيفي لعام 2026 🗺️
        </h3>
        <p className="text-xs text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
          تتبع توازن تدرج الطالب طوال فترة الدراسة والتدريب العملي، من اليوم الأول للتسجيل حتى حصد مقعدك المهني بالأسواق.
        </p>
      </div>

      <div className="relative border-r-2 border-slate-200 mr-4 sm:mr-8 space-y-6 py-2">
        {steps.map((st, idx) => (
          <div key={idx} className="relative pr-6 group">
            {/* Timeline Bullet Indicator */}
            <div className="absolute -right-[11px] top-1 w-5 h-5 bg-white border-2 border-indigo-650 rounded-full flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:border-amber-400 transition-all duration-200">
              <span className="w-2 h-2 rounded-full bg-indigo-600 block"></span>
            </div>

            <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-4 transition-all duration-150">
              <h4 className="font-extrabold text-[#0A2463] text-xs sm:text-sm">{st.title}</h4>
              <p className="text-[11px] text-slate-650 leading-relaxed mt-1 font-semibold">{st.desc}</p>
              
              <div className="mt-2.5 bg-white border border-slate-150 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-[10px] text-emerald-700 font-black">النتيجة: {st.benefit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 8. Parents VIP Assurance Section (Idea 15)
// ==========================================
export function ParentsVIPAssurance() {
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const dynamicDepts = getDynamicDepartments();
  const defaultDeptInterest = dynamicDepts[0]?.name || "العلوم البرمجية والأنظمة الذكية";

  const [deptInterest, setDeptInterest] = useState(defaultDeptInterest);

  // Sync state if dynamic list changes or loads after initial render
  useEffect(() => {
    if (defaultDeptInterest) {
      setDeptInterest(defaultDeptInterest);
    }
  }, [defaultDeptInterest]);

  const [preferredSlot, setPreferredSlot] = useState<"morning" | "evening">("morning");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [complianceChecked, setComplianceChecked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complianceChecked) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setLocalError("يرجى التكرم بالموافقة على إقرار شروط القبول أولاً للمتابعة");
      return;
    }
    if (!parentName.trim() || !parentPhone.trim()) return;

    setLocalError(null);
    setLoading(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: `[طلب ولي أمر] ${parentName.trim()}`,
          phoneNumber: parentPhone.trim(),
          governorate: "استشارة ولي أمر",
          educationLevel: "شراكة وتقسيط مالي",
          basicCourse: deptInterest,
          selectedDepartments: ["طلب تفاصيل الاستحقاق والتقسيط"],
          notes: combineNotesWithAdAttribution(`شرح باقات مصروفات دفعات سنتين معتمدة. الفترة المفضلة: ${preferredSlot === "morning" ? "صباحية (١٠ص-٢ظ)" : "مسائية (٤ع-٨م)"}`),
          complianceLevelChecked: true,
          consentTimestamp: new Date().toISOString()
        })
      });

      // Save to local parent list of inquiries
      const localParents = JSON.parse(localStorage.getItem("academy_parent_inquiries") || "[]");
      localParents.push({
        id: "pnt-" + Date.now(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        deptInterest,
        preferredSlot: preferredSlot === "morning" ? "🌅 الفترة الصباحية: 10 ص - 2 ظ" : "🌆 الفترة المسائية: 4 ع - 8 م",
        date: new Date().toLocaleDateString("ar-EG"),
        complianceApproved: true,
        consentTimestamp: new Date().toISOString()
      });
      localStorage.setItem("academy_parent_inquiries", JSON.stringify(localParents));

      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl text-right max-w-4xl mx-auto space-y-6 relative overflow-hidden font-sans" dir="rtl" id="parents-assurance-box">
      <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-l from-amber-400 to-[#FF7F50]" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Editorial Executive Administrative Assurance Letter */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 text-[10.5px] font-black">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>رسالة إدارية هامة ومفتوحة لكافة أولياء الأمور 🏛️</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
            إلى السادة أولياء أمور الطلاب: التزام مهني وقانوني بنسبة %100 دون التباس
          </h3>

          <div className="space-y-3 text-[11px] sm:text-xs text-slate-300 leading-relaxed font-semibold">
            <p>
              تحية طيبة وبعد؛ نود التنويه صراحة ومسؤولية تامة، بأن غرض الأكاديمية والبرامج المعتمدة هو تمكين وتدريب ابنكم مهنياً للحصول على دبلومة عملية قوية تؤهله للعمل في منشآت القطاع الخاص فوراُ.
            </p>
            <p>
              نحن نلتزم بتقديم المناهج العملية داخل معامل فيزيائية كبرى، بحضور فعلي ملزم ولا يقبل التهاون للطلاب لضمان تسليم الخبرة الحقيقية. كما متاح تأجيل الموقف التجنيدي للطلاب الذكور بشكل معتمد.
            </p>
            <p className="text-amber-300">
              💡 نتيح نظام تقسيط مريح للرسوم السنوية على 4 أقساط متساوية تخفيفاً عن الميزانيات الأسرية دون أي غرامات أو زيادات تراكمية طوال مدة دراسة البرنامج.
            </p>
          </div>

          {/* Institutional Compliance Indicators Labels */}
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-start gap-2 bg-slate-950 pb-2.5 pt-2 px-3.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 mt-0.5 text-xs">🏛️</span>
              <div className="text-right">
                <span className="block text-slate-100 font-extrabold text-[11px]">الشفافية المؤسسية والقانونية المطلقة</span>
                <span className="block text-[10px] text-slate-400 leading-relaxed mt-0.5">منصة إرشادية وتأهيلية معتمدة تدريبياً فقط، وننفي رسمياً تبعيتنا للتنسيق الجامعي الحكومي التقليدي لوزارة التعليم العالي.</span>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-950 pb-2.5 pt-2 px-3.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 mt-0.5 text-xs">🔬</span>
              <div className="text-right">
                <span className="block text-slate-100 font-extrabold text-[11px]">محاكاة المعامل والتأهيل الفني والفيزيائي</span>
                <span className="block text-[10px] text-slate-400 leading-relaxed mt-0.5">يتطلب اجتياز البرامج حضوراً عملياً مكثفاً داخل منشآتنا التدريبية ولا مجال للتعليم النظري البحت لضمان المهارة المطلوبة بسوق العمل.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Callback request form for parent counselor */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-100 border-b border-white/10 pb-3">
            ☎️ تقديم طلب استشارة ولي الأمر المباشرة ونظام التقسيط:
          </h4>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs text-slate-205 font-bold">
              <div>
                <label className="block mb-1 text-slate-300 font-extrabold text-[11px]">اسم ولي الأمر بالكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="اكتب اسم ولي الأمر..."
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl text-white text-xs transition"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-300 font-extrabold text-[11px]">رقم هاتف المتابعة والواتساب:</label>
                <input
                  type="tel"
                  required
                  placeholder="010XXXXXXXX"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl text-white text-xs transition font-mono"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-300 font-extrabold text-[11px]">الشعبة المرشحة لدراسة الابن:</label>
                <select
                  value={deptInterest}
                  onChange={(e) => setDeptInterest(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-white/15 text-white text-xs rounded-xl focus:outline-none cursor-pointer font-extrabold"
                >
                  {dynamicDepts.length > 0 ? (
                    dynamicDepts.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="العلوم البرمجية والأنظمة الذكية">العلوم البرمجية والأنظمة الذكية 💻</option>
                      <option value="العلوم الفنية والخدمات الصحية">العلوم الفنية والخدمات الصحية 🩺</option>
                      <option value="إدارة السجلات والخدمات اللوجستية">إدارة السجلات والخدمات اللوجستية 🔬</option>
                      <option value="الهندسة الميدانية والتصميم العملي">الهندسة الميدانية والتصميم العملي 📐</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-slate-300 font-extrabold text-[11px]">الفترة المفضلة للمتابعة والاتصال الهاتفي:</label>
                <div className="grid grid-cols-2 gap-2" id="parents-time-slot-grid">
                  <button
                    type="button"
                    onClick={() => setPreferredSlot("morning")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      preferredSlot === "morning"
                        ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                        : "bg-slate-800 border-white/15 text-slate-300"
                    }`}
                  >
                    <span className="text-[11px] font-black">🌅 الفترة الصباحية</span>
                    <span className="text-[9px] opacity-90 mt-0.5">١٠ ص - ٢ ظ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredSlot("evening")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      preferredSlot === "evening"
                        ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                        : "bg-slate-800 border-white/15 text-slate-300"
                    }`}
                  >
                    <span className="text-[11px] font-black">🌆 الفترة المسائية</span>
                    <span className="text-[9px] opacity-90 mt-0.5">٤ ع - ٨ م</span>
                  </button>
                </div>
              </div>

              {/* Legal Compliance Checkbox */}
              <div 
                className={`p-3 rounded-xl border text-right transition-all leading-normal ${
                  !complianceChecked 
                    ? "bg-white/5 border-r-4 border-r-rose-500 border-white/10" 
                    : "bg-emerald-500/10 border-r-4 border-r-emerald-500 border-emerald-500/20"
                }`}
                id="parents-compliance-checkbox-wrapper"
              >
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={complianceChecked}
                    onChange={(e) => {
                      setComplianceChecked(e.target.checked);
                      if (e.target.checked) setLocalError(null);
                    }}
                    className="mt-0.5 w-4 h-4 accent-emerald-500 rounded-sm cursor-pointer shrink-0"
                  />
                  <span className="text-[10px] font-bold text-slate-100 leading-relaxed block">
                    ☑️ أقر أنا المتقدم (أو ولي الأمر) باطلاعي وموافقتي الكاملة على شروط وأحكام منصة القبول المباشر، وأعلم تمام العلم أن هذه المنصة هي بوابة تدريبية وتأهيلية مهنية خاصة غير خاضعة لنظام التنسيق الحكومي، وأن البرامج تهدف لتطوير المهارات العملية الفنية اللازمة والربط المباشر مع سوق العمل والشراكات المؤسسية.
                  </span>
                </label>
              </div>

              {localError && (
                <p className="text-[11px] text-rose-450 font-bold bg-rose-950/40 border border-rose-900/30 p-2.5 rounded-lg animate-pulse text-right">
                  ⚠️ {localError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-slate-950 font-black rounded-xl transition cursor-pointer ${
                  isShaking ? "animate-shake" : ""
                } ${
                  loading 
                    ? "bg-slate-500 cursor-not-allowed text-white" 
                    : !complianceChecked
                    ? "bg-amber-500/50 hover:bg-amber-500/60" // Visually disabled but clickable
                    : "bg-amber-500 hover:bg-amber-600 active:scale-98"
                }`}
                style={{ minHeight: "40px" }}
              >
                {loading ? "جاري تسجيل طلب الوالد..." : "تأكيد واستدعاء منسق التقسيط والأقساط 🚀"}
              </button>
            </form>
          ) : (
            <div className="text-center py-5 space-y-3 animate-scale-up">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h5 className="font-extrabold text-white text-xs">تم حفظ استمارة ولي الأمر بنجاح!</h5>
                <p className="text-[10px] text-slate-300 leading-relaxed mt-1">
                  سيقوم كبير المستشارين الماليين للتنسيق بالتواصل المباشر معكم هاتفياً لعرض خطط وأقساط دفعات ٢٠٢٦ لتيسير سبل القبول.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. Live Application Track & Trace Route/Widget (Idea 11)
// ==========================================
export function LiveApplicationTrackAndTrace() {
  const [phoneQuery, setPhoneQuery] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const cleanQ = phoneQuery.trim().replace(/[\s\-\(\)]/g, "");

    // Mock lookups based on phone matching locally or central fallback
    if (cleanQ.length >= 10) {
      // Create a deterministic track outcome
      const hash = cleanQ.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const statuses = [
        { label: "تم استلام الطلب وفتح الملف المبدئي", step: 1, desc: "الملف معروض للاستشارة" },
        { label: "تحت المراجعة وفحص المواءمة الميدانية", step: 2, desc: "جاري تقدير النسبة وخصم المصاريف" },
        { label: "بانتظار وتجهيز استمارات الموقف العسكري", step: 3, desc: "بوابة تنسيق الطلبة والذكور" },
        { label: "مكتمل وبانتظار المقابلة للنزول الفعلي للمعامل", step: 4, desc: "تم تأكيد إصدار تذكرة الاستحقاق" }
      ];
      
      // Look for custom tracker status mapped by the Admin
      let matchedStatus = statuses[hash % statuses.length];
      let hasCustomStatus = false;
      
      if (typeof window !== "undefined") {
        const customStatusMapStr = localStorage.getItem("academy_live_tracker_status");
        if (customStatusMapStr) {
          try {
            const customStatusMap = JSON.parse(customStatusMapStr);
            // Search by full phone or matching suffix
            const matchedKey = Object.keys(customStatusMap).find(
              k => k === cleanQ || k.includes(cleanQ) || cleanQ.includes(k)
            );
            
            if (matchedKey) {
              const statusVal = customStatusMap[matchedKey];
              hasCustomStatus = true;
              
              if (statusVal === "تحت المراجعة") {
                matchedStatus = { label: "تحت المراجعة والتدقيق المبدئي 🔍", step: 2, desc: "جاري فحص المستندات وتقدير النسبة والخصومات" };
              } else if (statusVal === "تم قبول الأوراق") {
                matchedStatus = { label: "تم قبول الأوراق ومطابقة الشروط المعتمدة 🟢", step: 3, desc: "تم فتح الملف الفعلي وإدراج الاسم في كشوف الخصومات" };
              } else if (statusVal === "مرحلة المقابلة الشخصية") {
                matchedStatus = { label: "مرحلة المقابلة الشخصية بالاكاديمية 🤝", step: 4, desc: "مطلوب حضور الطالب مع ولي أمره للمطابقة الفنية" };
              } else if (statusVal === "تم صدور الكارنيه المبدئي") {
                matchedStatus = { label: "تم صدور الكارنيه المبدئي وتفعيل المنحة 🥇", step: 4, desc: "تم اعتماد الطالب وتثبيت خصم القبول والدراسة" };
              } else {
                matchedStatus = { label: statusVal, step: 2, desc: "تحديث من إدارة شؤون الطلاب الحالية" };
              }
            }
          } catch (e) {}
        }
      }
      
      // Look for custom local storage registration
      let studentName = "الطالب المرشح المعتمد";
      const savedRes = localStorage.getItem("last_success_reservation");
      if (savedRes) {
        try {
          const parsed = JSON.parse(savedRes);
          if (parsed.phoneNumber && (parsed.phoneNumber.includes(cleanQ.slice(-6)) || cleanQ.includes(parsed.phoneNumber.slice(-6)))) {
            studentName = parsed.studentName;
          }
        } catch(e){}
      }

      // Fallback search through direct leads
      if (studentName === "الطالب المرشح المعتمد") {
        try {
          const directLeads = JSON.parse(localStorage.getItem("academy_direct_leads") || "[]");
          const matchedLead = directLeads.find((l: any) => l.phoneNumber && (l.phoneNumber.includes(cleanQ.slice(-6)) || cleanQ.includes(l.phoneNumber.slice(-6))));
          if (matchedLead) {
            studentName = matchedLead.studentName;
          }
        } catch(e){}
      }

      setResult({
        name: studentName,
        phone: cleanQ,
        step: matchedStatus.step,
        statusText: matchedStatus.label,
        desc: matchedStatus.desc,
        code: `TRACK-2026-${1000 + (hash % 9000)}`
      });
    } else {
      setResult(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-205 shadow-xl text-right max-w-2xl mx-auto space-y-6 font-sans" dir="rtl" id="track-and-trace-widget">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 justify-start">
        <Clock className="w-5.5 h-5.5 text-[#0A2463] shrink-0" />
        <h3 className="font-extrabold text-[#0A2463] text-sm sm:text-base">
          تتبع وتفقد حالة ملفك التقديمي الفوري (Live Application Tracker) 🔍
        </h3>
      </div>

      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
        هل قمت بملء استمارة تسجيل وحجز الخصومات بالأكاديمية؟ أدخل رقم الموبايل المسجل لمعاينة كشف تتبع ملفك والخطوة التنظيمية الحالية لدفعة ٢٠٢٦.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="tel"
            required
            placeholder="أدخل رقم الهاتف المسجل بالطلب (مثال: 010...)..."
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-3 bg-slate-50 border border-slate-200 focus:border-[#0A2463] rounded-xl text-xs text-slate-800 text-right focus:outline-none transition font-mono"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <button
          type="submit"
          className="px-5 bg-gradient-to-r from-brand-navy to-[#05113a] hover:from-[#05113a] text-white text-xs font-black rounded-xl cursor-pointer shadow-md transition"
        >
          بحث وتتبع
        </button>
      </form>

      {hasSearched && result && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">الملف ومكود المستعلم:</span>
              <strong className="text-xs font-black text-slate-800">{result.name}</strong>
            </div>
            <div className="text-left font-mono">
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md font-bold uppercase block">
                {result.code}
              </span>
            </div>
          </div>

          {/* Stepper Timeline UI */}
          <div className="space-y-4">
            <span className="text-[11px] text-indigo-700 font-black block">📍 الخطوة التنظيمية والمسار الفعلي للمستندات:</span>
            
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] relative pt-2 font-black">
              {/* Connector line behind circles */}
              <div className="absolute top-4 left-[12%] right-[12%] h-1 bg-slate-200 -translate-y-1/2 z-0" />
              
              {/* Step 1 */}
              <div className="space-y-1.5 relative z-10">
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center mx-auto text-[10px] ${
                  result.step >= 1 
                    ? "bg-emerald-500 text-white font-mono" 
                    : "bg-slate-200 text-slate-400 font-mono"
                }`}>1</div>
                <span className={result.step >= 1 ? "text-emerald-700 font-black" : "text-slate-400"}>تم الإرسال</span>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5 relative z-10">
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center mx-auto text-[10px] ${
                  result.step >= 2 
                    ? "bg-emerald-500 text-white font-mono" 
                    : "bg-slate-200 text-slate-400 font-mono"
                }`}>2</div>
                <span className={result.step >= 2 ? "text-emerald-700 font-black" : "text-slate-400"}>قيد الفحص</span>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5 relative z-10">
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center mx-auto text-[10px] ${
                  result.step >= 3 
                    ? "bg-emerald-500 text-white font-mono" 
                    : "bg-slate-200 text-slate-400 font-mono"
                }`}>3</div>
                <span className={result.step >= 3 ? "text-emerald-700 font-black" : "text-slate-400"}>فتح الملف</span>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5 relative z-10">
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center mx-auto text-[10px] ${
                  result.step >= 4 
                    ? "bg-emerald-500 text-white font-mono" 
                    : "bg-slate-200 text-slate-400 font-mono"
                }`}>4</div>
                <span className={result.step >= 4 ? "text-emerald-700 font-black" : "text-slate-400"}>المقابلات معلنة</span>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">ملاحظة المستشار الحالية للملف:</span>
              <p className="text-xs text-[#0A2463] font-black mt-0.5 leading-relaxed">{result.statusText} ({result.desc})</p>
            </div>
          </div>
        </div>
      )}

      {hasSearched && !result && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl text-center text-xs font-bold text-amber-800 flex items-center gap-2 justify-center leading-relaxed animate-fade-in">
          <span>⚠️ لم نجد أي استمارة مسجلة بهذا الرقم حالياً. يرجى ملء الاستمارة المبدئية بالأسفل لحفظ مقعدك وتوليد ملف التتبع فورياً.</span>
        </div>
      )}
    </div>
  );
}
