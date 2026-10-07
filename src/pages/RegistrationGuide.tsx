import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Compass, Sparkles, CheckCircle2, FileText, Phone, 
  HelpCircle, ClipboardList, Info, ArrowLeft, Search, 
  BookOpen, Landmark, ChevronLeft, ShieldCheck, Download
} from "lucide-react";
import { toast } from "react-hot-toast";
import SpeechButton from "../components/SpeechButton";

export default function RegistrationGuide() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    document.title = "دليل كيفية التسجيل والاستعلام عن الاستمارات | بوابة المعاهد الخاصة";
  }, []);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = phoneNumber.trim();
    if (!query) {
      toast.error("يرجى إدخال رقم الهاتف أو كود الحجز أولاً للاستعلام!");
      return;
    }
    
    // Detect if this is likely a phone number (all digits or starts with 0) or a code
    const isPhonePattern = /^\d+$/.test(query);
    
    if (isPhonePattern && query.length !== 11) {
      toast.error("الرجاء إدخال رقم هاتف صحيح مكون من 11 رقماً أو كود حجز صالح.");
      return;
    }

    setSearchLoading(true);
    try {
      // Query with the general q parameter which handles both phone & code on backend
      const res = await fetch(`/api/search-lead?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data && data.success && data.lead) {
        toast.success("تم العثور على الحجز الخاص بك بنجاح! جاري الانتقال لاستخراج الاستمارة...");
        // Redirect directly to form extraction with query parameter
        setTimeout(() => {
          if (isPhonePattern) {
            navigate(`/form-extraction?phone=${encodeURIComponent(query)}`);
          } else {
            const cleanCode = query.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();
            navigate(`/form-extraction?ref=${encodeURIComponent(cleanCode)}`);
          }
        }, 1200);
      } else {
        toast.error("عذراً! لم نجد أي حجز أو تسجيل مسجل بهذه البيانات. يرجى التأكد من كتابة الرقم بشكل صحيح.");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء فحص البيانات، الرجاء المحاولة مجدداً.");
    } finally {
      setSearchLoading(false);
    }
  };

  const steps = [
    {
      num: "١",
      title: "تصفح الأقسام واختيار التخصص",
      desc: "قم بالدخول إلى قسم 'تصفح الأقسام 📚' أو املأ 'اختبار تحديد التخصص 🧭' لتوجيهك نحو الشعبة الأنسب لقدراتك وطموحك العملي وسوق العمل.",
      icon: Compass,
      color: "text-blue-600 bg-blue-50 border-blue-100"
    },
    {
      num: "٢",
      title: "تسجيل البيانات وحجز المقعد",
      desc: "املأ نموذج التقديم الأساسي بكتابة اسمك بالكامل، رقم هاتفك الفعال ومحافظتك لتسجيل رغبتك المبدئية وحجز مقعدك بالخصومات السارية فوراً.",
      icon: ClipboardList,
      color: "text-amber-600 bg-amber-50 border-amber-100"
    },
    {
      num: "٣",
      title: "استخراج استمارة التقديم الرسمية برقم الهاتف",
      desc: "شرط أساسي لاستخراج وطباعة استمارتك أن تكون مسجلاً في الخطوة السابقة. بمجرد إدخال رقم هاتفك هنا أو في صفحة 'الاستعلام واستخراج الاستمارة 📄'، يتم استدعاء بياناتك ورقم الحجز وصنع استمارة رسمية جاهزة للطباعة والتقديم المباشر.",
      icon: FileText,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100"
    },
    {
      num: "٤",
      title: "تسليم المستندات بمقر الأكاديمية",
      desc: "توجه إلى مقر شؤون الطلاب بالأكاديمية ومعك الاستمارة المستخرجة بالإضافة إلى الأوراق الرسمية والمستندات المطلوبة المبينة بالأسفل لاستكمال عملية القبول النهائي.",
      icon: Landmark,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100"
    }
  ];

const specialtyRequirements = [
  {
    title: "الشعب الهندسية والفنية (البرمجة ونظم المعلومات، المساحة والخرائط، البترول، اللاسلكي):",
    docs: [
      "أصل شهادة الثانوية (عامة/أزهرية/صناعية) أو ما يعادلها للاطلاع عليها",
      "صورة من الشهادة",
      "أصل شهادة الميلاد الكمبيوتر حديثة + 2 صورة منها",
      "عدد 6 صور شخصية حديثة مقاس 4*6 بخلفية بيضاء مدون عليها اسم الطالب",
      "صورة بطاقة الرقم القومي للطالب + صورة بطاقة ولي الأمر",
      "دوسيه أبيض شفاف لحفظ أوراق التقديم بداخله"
    ]
  },
  {
    title: "الشعب الطبية والخدمات الصحية (التمريض، التحاليل الطبية والأشعة، التركيبات السنية، التغذية العلاجية):",
    docs: [
      "أصل شهادة الثانوية (عامة/أزهرية/صناعية) أو ما يعادلها للاطلاع عليها",
      "صورة من الشهادة",
      "أصل شهادة الميلاد الكمبيوتر حديثة + 2 صورة منها",
      "عدد 6 صور شخصية حديثة مقاس 4*6 بخلفية بيضاء مدون عليها اسم الطالب",
      "صورة بطاقة الرقم القومي للطالب + صورة بطاقة ولي الأمر",
      "دوسيه أبيض شفاف لحفظ أوراق التقديم بداخله"
    ]
  },
  {
    title: "الشعب الإدارية والإنسانية (الضيافة الجوية، السياحة والفنادق، الصحافة والإعلام، العلاقات العامة وإدارة الأعمال، لغات وترجمة، تربية خاصة):",
    docs: [
      "أصل شهادة الثانوية (عامة/أزهرية/صناعية) أو ما يعادلها للاطلاع عليها",
      "صورة من الشهادة",
      "أصل شهادة الميلاد الكمبيوتر حديثة + 2 صورة منها",
      "عدد 6 صور شخصية حديثة مقاس 4*6 بخلفية بيضاء مدون عليها اسم الطالب",
      "صورة بطاقة الرقم القومي للطالب + صورة بطاقة ولي الأمر",
      "دوسيه أبيض شفاف لحفظ أوراق التقديم بداخله"
    ]
  }
];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* 1. Header Banner */}
        <div className="bg-[#0A2463] text-white p-8 sm:p-10 rounded-3xl border border-slate-800 text-right space-y-4 relative overflow-hidden shadow-md">
          <div className="absolute -top-10 -left-10 text-slate-800 opacity-20 transform -rotate-12 pointer-events-none">
            <Compass className="w-64 h-64" />
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <Sparkles className="w-5.5 h-5.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-black tracking-wider text-amber-400">الدليل التوجيهي الشامل والخطوات الأربعة</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              كيفية التقديم والتسجيل واستخراج الاستمارة 📋
            </h1>
            <SpeechButton 
              textToSpeak="كيفية التقديم والتسجيل واستخراج الاستمارة. لتسهيل عملية التقديم وضمان حجز مقعدك الدراسي، قمنا بتنظيم وتوضيح الدورة الكاملة لطلبك في خطوات منظمة ومستندات دقيقة لضمان القبول الفوري."
              className="bg-white/10 text-amber-300 border-white/20 hover:bg-amber-500 hover:text-white"
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans relative z-10 max-w-3xl font-semibold">
            مرحباً بك في بوابتنا التفاعلية المعتمدة. لتسهيل عملية التقديم وضمان حجز مقعدك الدراسي، قمنا بتنظيم وتوضيح الدورة الكاملة لطلبك في خطوات منظمة ومرئية للغاية ومستندات دقيقة لضمان أعلى معدلات التحويل والقبول الفوري.
          </p>
        </div>

        {/* 2. Condition & Phone Query Widget Widget (الشرط الأساسي للاستمارة) */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 rounded-3xl border border-amber-500/30 p-6 sm:p-8 space-y-6" id="registration-condition-box">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs px-3 py-1 rounded-full inline-block">
                ⚠️ شرط أساسي وهام لعمل واستخراج الاستمارة
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                يجب أن تكون مسجلاً مسبقاً في المنصة لكي تتمكن من استدعاء الاستمارة!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                بوابة التقديم لا تسمح بإنشاء الاستمارة لغير المسجلين لمنع التلاعب وحفظ حقوق الأسبقية. إذا كنت قد ملأت بياناتك في أي فورم أو بوب-أب بالموقع مسبقاً وتم التواصل معك لشرح كافة التفاصيل واختيار المكان المناسب، يمكنك كتابة رقم هاتفك أو كود حجزك الخاص في الحقل الجانبي لاستخراج وطباعة استمارتك الحية مباشرة في ثوانٍ معدودة!
              </p>
            </div>
            
            {/* Widget Query Box */}
            <form onSubmit={handleQuerySubmit} className="w-full md:w-80 bg-white p-4 rounded-2xl border border-slate-200/95 shadow-xs shrink-0 space-y-3">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[11px] text-[#0A2463] font-black block">استعلام واستخراج الاستمارة الآن 🔍</span>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold">رقم الهاتف أو كود الحجز المسجل:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="الهاتف أو كود الحجز (REG-xxxx)"
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2463] focus:bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="w-full py-2 bg-gradient-to-r from-[#0A2463] to-[#112f75] hover:from-[#112f75] hover:to-[#0A2463] text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {searchLoading ? (
                  <span>جاري البحث والاستدعاء...</span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>فحص الحساب واستخراج الاستمارة</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 3. The 4 Core Steps Timeline */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="font-black text-slate-900 text-lg sm:text-xl">
              الخطوات الأربعة الأساسية لعملية التقديم الكاملة 🧭
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold max-w-xl mx-auto mt-1 leading-normal">
              اتبع هذه الدورة المبسطة لضمان استيفاء شروط القبول والتسجيل المباشر بنجاح وبشكل رسمي
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 flex gap-4 transition hover:shadow-xs group"
                  id={`reg-step-${idx + 1}`}
                >
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${step.color} group-hover:scale-105 transition`}>
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-mono font-bold flex items-center justify-center border border-slate-200">
                        {step.num}
                      </span>
                      <strong className="text-slate-900 text-xs sm:text-sm font-extrabold leading-tight">
                        {step.title}
                      </strong>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Required Documents Section */}
        <div className="space-y-6" id="required-documents-accordion">
          <div className="text-right border-b border-slate-200 pb-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                المستندات والأوراق المطلوبة للتقديم حسب التخصص 📂
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                يرجى تجهيز هذه الأوراق لإحضارها عند زيارة مقر شؤون الطلاب بالأكاديمية لتفعيل التقديم النهائي
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {specialtyRequirements.map((req, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs text-right space-y-3">
                <span className="text-[10px] text-[#D49800] bg-amber-50 font-black px-2.5 py-1 rounded border border-amber-200/50 inline-block">
                  ملف مستندات التخصص الرئيسي
                </span>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight border-b border-slate-50 pb-2">
                  {req.title}
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {req.docs.map((doc, docIdx) => (
                    <li key={docIdx} className="text-slate-600 text-xs flex items-start gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 5. How to browse and explore all site features */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-3xs space-y-5" id="explore-site-guide">
          <div className="border-b border-slate-100 pb-3 text-right space-y-1">
            <h3 className="font-black text-slate-900 text-base sm:text-lg">
              تصفح واكتشف كل شيء بداخل موقعنا 🧭
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold">
              خارطة بوابتنا التفاعلية والخدمات الرقمية التي نوفرها للطلاب بالكامل
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-right">
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
              <strong className="text-[#0A2463] text-xs font-black block">📚 تصفح الأقسام الـ 17 المعتمدة</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                يمكنك التوجه لصفحة <Link to="/departments" className="text-[#FF7F50] underline font-bold">تصفح الأقسام</Link> لقراءة تفاصيل كل شعبة والمستقبل المهني وفرص التوظيف المفتوحة وتحميل الكتيبات.
              </p>
            </div>
            
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
              <strong className="text-[#0A2463] text-xs font-black block">🧭 اختبار التوجيه المهني واكتشف مجالك</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                إذا كنت محتاراً، ادخل لصفحة <Link to="/guidance" className="text-[#FF7F50] underline font-bold">مستشار التوجيه 🧭</Link> لتبدأ بحل بضعة أسئلة ممتعة تدلك بدقة على شعبتك الدراسية المفضلة.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
              <strong className="text-[#0A2463] text-xs font-black block">📢 نظام الشكاوى والمقترحات المباشر</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                نحرص على تلبية طلباتكم بحيادية. توجه لصفحة <Link to="/complaints" className="text-[#FF7F50] underline font-bold">الشكاوى</Link> لرفع شكوى أو مقترح مباشر سري وموثق للإدارة والوكلاء.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
              <strong className="text-[#0A2463] text-xs font-black block">🔥 تخصصات الأكثر طلباً وإقبالاً</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                تابع صفحة <Link to="/trending" className="text-[#FF7F50] underline font-bold">الأقسام الأكثر طلباً</Link> لمعرفة معدلات الحجز وعدد المقاعد المتبقية لكل شعبة والتقديم الفوري قبل الامتلاء.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
              <strong className="text-[#0A2463] text-xs font-black block">📄 تحميل وطباعة الاستمارات مباشرة</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                اذهب لصفحة <Link to="/form-extraction" className="text-[#FF7F50] underline font-bold">استخراج الاستمارات 📄</Link> للحصول على استمارتك مع الباركود المميز والبيانات الموثقة لتقديمها لشؤون الأكاديمية.
              </p>
            </div>
          </div>
        </div>

        {/* 6. End CTA Banner */}
        <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
          <div>
            <strong className="text-sm font-black block text-amber-400">💡 هل تملك أي استفسار إضافي لم تتم الإجابة عليه؟</strong>
            <p className="text-xs text-slate-300 mt-1">تواصل مباشرة معنا أو اطلب اتصالاً هاتفياً مجانياً فورياً من مستشاري الأكاديمية!</p>
          </div>
          <button
            onClick={() => {
              // trigger the window custom event to open the call request dialog
              const btn = document.querySelector('button[title*="مستشار"]');
              if (btn) (btn as HTMLButtonElement).click();
              else {
                toast.success("قم بالضغط على زر 'اطلب اتصالاً' في أعلى الصفحة للتحدث معنا!");
              }
            }}
            className="px-5 py-2.5 bg-[#FF7F50] hover:bg-[#FF7F50]/95 text-white font-black text-xs rounded-xl transition cursor-pointer shrink-0"
          >
            طلب اتصال هاتفي مجاني 📞
          </button>
        </div>

      </div>
    </div>
  );
}
