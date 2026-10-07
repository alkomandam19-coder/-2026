import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FileText, ShieldCheck, Phone, Search, Building, 
  UserCheck, Download, Printer, Share2, CheckCircle2, 
  ArrowLeft, ArrowRight, HelpCircle, Sparkles, AlertCircle, 
  ChevronLeft, Award, QrCode, BookOpen, Layers, Check, Copy
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function FormExtractionGuide() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<number>(1);
  const [testSearch, setTestSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    document.title = "دليل خطوات استخراج وطباعة استمارة التقديم الرسمية | بوابة المعاهد الخاصة";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = testSearch.trim();
    if (!query) {
      toast.error("يرجى إدخال رقم هاتفك أو كود الحجز للبدء فوراً!");
      return;
    }
    const isPhone = /^\d+$/.test(query);
    if (isPhone && query.length !== 11) {
      toast.error("يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً.");
      return;
    }
    setSearchLoading(true);
    setTimeout(() => {
      setSearchLoading(false);
      if (isPhone) {
        navigate(`/form-extraction?phone=${encodeURIComponent(query)}`);
      } else {
        const cleanCode = query.toUpperCase().replace(/^(REG-|#|CODE-)/i, "").trim();
        navigate(`/form-extraction?ref=${encodeURIComponent(cleanCode)}`);
      }
    }, 400);
  };

  const stepsList = [
    {
      stepNumber: "01",
      title: "الاستعلام بالهاتف أو كود الحجز",
      subtitle: "إدخال رقم الهاتف أو الكود المرجعي للتحقق الرقمي الآمن",
      icon: Phone,
      color: "from-blue-600 to-indigo-700",
      accent: "text-blue-600 bg-blue-50 border-blue-200",
      description: "يدخل الطالب رقم هاتفه المسجل به في الموقع (11 رقماً) أو كود الحجز الخاص به (مثل 1008) في خانة البحث للاستدعاء الفوري لبياناته المشفرة.",
      fields: [
        { label: "رقم الهاتف المعتمد", type: "كتابة أرقام (11 رقماً)", example: "01012345678" },
        { label: "كود الحجز المرجعي (بديل)", type: "كتابة رقم الكود", example: "1008 أو REG-1008" }
      ],
      tip: "💡 في حالة مسح رمز الـ QR Code بكاميرا هاتفك من بطاقة الحجز، ستتجاوز هذه الخطوة تلقائياً وتدخل مباشرة لصفحة بياناتك."
    },
    {
      stepNumber: "02",
      title: "مراجعة البيانات واختيار الشعبة",
      subtitle: "تأكيد البيانات الشخصية وتحديد التخصص المعتمد للاستمارة",
      icon: Layers,
      color: "from-amber-500 to-orange-600",
      accent: "text-amber-600 bg-amber-50 border-amber-200",
      description: "تظهر بيانات الطالب تلقائياً (الاسم الرباعي، رقم الهاتف، المحافظة، والمؤهل الدراسي). يقوم الطالب باختيار القسم أو الشعبة التي يرغب في تثبيتها رسمياً في استمارته من القائمة المنسدلة.",
      fields: [
        { label: "البيانات الشخصية", type: "مراجعة وتأكيد تلقائي", example: "الاسم، المحافظة، المؤهل، كود الخصم" },
        { label: "شعبة التخصص", type: "اختيار من قائمة منسدلة", example: "البرمجة والذكاء الاصطناعي / تمريض / مساحة..." }
      ],
      tip: "💡 يمكنك تغيير الشعبة أو التخصص بحرية قبل التوليد، وسيقوم النظام بتحديث رغبتك الرسمية فوراً."
    },
    {
      stepNumber: "03",
      title: "كتابة اسم الأكاديمية ومستشار التقديميات",
      subtitle: "توثيق الجهة المستهدفة ومسؤول المتابعة المعتمد",
      icon: Building,
      color: "from-emerald-600 to-teal-700",
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      description: "يقوم الطالب بكتابة اسم الأكاديمية أو المعهد الذي يرغب في تقديم أوراقه إليه، مع كتابة اسم مستشار التقديميات أو مسؤول المتابعة (السيلز) الذي تواصل معه وشرح له كافة التفاصيل لضمان سرعة اعتماد ملفه.",
      fields: [
        { label: "اسم الأكاديمية أو المعهد", type: "كتابة اسم الأكاديمية", example: "يتم كتابة اسم الأكاديمية التي تود التقديم وتثبيت حجزك بها" },
        { label: "اسم مستشار التقديميات / السيلز", type: "كتابة الاسم", example: "يتم كتابة اسم المستشار أو مسؤول المتابعة الذي تواصل معك وشرح لك التفاصيل" }
      ],
      tip: "💡 كتابة اسم مستشار التقديميات بدقة يضمن تفعيل كود الخصم ومتابعة ملفك الفوري بمجرد وصولك لمقر الأكاديمية."
    },
    {
      stepNumber: "04",
      title: "توليد ومعاينة الاستمارة الكربونية الرسمية",
      subtitle: "ظهور الاستمارة المعتمدة مع الباركود والختم الرسمي",
      icon: Award,
      color: "from-indigo-600 to-[#0A2463]",
      accent: "text-[#0A2463] bg-indigo-50 border-indigo-200",
      description: "يقوم النظام فوراً بإنشاء وتوليد استمارة التقديم الرسمية الموحدة عالية الدقة، والمزودة بترويسة البوابة، جدول البيانات، الباركود المشفر، رمز الـ QR للتحقق، ختم القبول، ومكان توقيع الطالب.",
      fields: [
        { label: "الباركود والـ QR Code", type: "رمز تحقق رقمي مشفر", example: "E-REF: 1008-5678" },
        { label: "الختم وتوقيع الطالب", type: "اعتماد رسمي", example: "ختم النسر الأحمر وتوقيع الطالب المعتمد" }
      ],
      tip: "💡 تحتوي الاستمارة على رقم معاملة رسمي فريد يحفظ أسبقية حجزك وتثبيت خصمك المالي."
    },
    {
      stepNumber: "05",
      title: "خيارات التحميل والطباعة والمشاركة",
      subtitle: "حفظ الاستمارة بصيغة PDF أو صورة عالية الجودة أو طباعتها فوراً",
      icon: Download,
      color: "from-rose-600 to-pink-700",
      accent: "text-rose-600 bg-rose-50 border-rose-200",
      description: "تتوفر 4 أزرار سهلة وسريعة تتيح للطالب تنزيل الاستمارة أو طباعتها أو إرسالها بكل مرونة من الموبايل أو الكمبيوتر.",
      fields: [
        { label: "تحميل كـ PDF للطباعة", type: "مقاس A4 قياسي عالي الجودة", example: "جاهز للطباعة المباشرة في أي مكتبة" },
        { label: "تحميل كصورة PNG", type: "حفظ في معرض صور الهاتف", example: "صورة واضحة ومثالية للموبايل" },
        { label: "طباعة فورية مباشر", type: "إرسال مباشر للطابعة", example: "يدعم الطابعات اللاسلكية والعادية" },
        { label: "مشاركة عبر الواتساب", type: "إرسال مباشر", example: "لإرسالها للمستشار أو لولي الأمر" }
      ],
      tip: "💡 على الهاتف المحمول، يمكنك أيضاً الضغط مطولاً على الاستمارة وحفظها مباشرة كصورة داخل جهازك."
    },
    {
      stepNumber: "06",
      title: "تجهيز أوراق الملف والتوجه للأكاديمية",
      subtitle: "المستندات المطلوبة عند تسليم الاستمارة المطبوعة",
      icon: CheckCircle2,
      color: "from-emerald-600 to-green-700",
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      description: "يطبع الطالب الاستمارة ويوقع عليها، ثم يتوجه إلى مقر الأكاديمية لتقديم الملف والحصول على إشعار القبول النهائي.",
      fields: [
        { label: "أصل استمارة النجاح / المؤهل", type: "للاطلاع + صورتين منها", example: "شهادة الإعدادية / الثانوية / الدبلوم" },
        { label: "أصل شهادة الميلاد كمبيوتر", type: "أصل + صورتين", example: "شهادة ميلاد حديثة مميكنة" },
        { label: "الصور الشخصية", type: "4 إلى 6 صور حديثة", example: "خلفية بيضاء مقاس 4×6" },
        { label: "صور بطاقة الرقم القومي", type: "صورتين", example: "صورة بطاقة الطالب + صورة بطاقة ولي الأمر" }
      ],
      tip: "💡 احرص على تسليم الاستمارة المطبوعة في موعد الحجز المحدد للحفاظ على مقعدك وكود الخصم."
    }
  ];

  const faqs = [
    {
      q: "ماذا أفعل إذا أدخلت رقم هاتفي وظهرت رسالة 'لم يتم العثور على حجز'؟",
      a: "تأكد من إدخال نفس رقم الهاتف الذي سجلت به في الموقع بدون مسافات أو رموز (11 رقماً تبدأ بـ 010 أو 011 أو 012 أو 015)، أو جرب الاستعلام بكود الحجز الذي وصلك بعد التسجيل مباشرة."
    },
    {
      q: "ما الذي يجب كتابته في خانة 'اسم الأكاديمية'؟",
      a: "يتم كتابة اسم الأكاديمية أو المعهد الذي ترغب في الالتحاق به وتوجيه ملف تقديمك إليه."
    },
    {
      q: "من هو 'مستشار التقديميات / السيلز' الذي يجب كتابة اسمه؟",
      a: "هو مسؤول القبول والمتابعة الأكاديمية الذي تواصل معك هاتفياً أو عبر الواتساب وشرح لك تفاصيل الدراسة والأقسام والمصروفات، وكتابة اسمه تضمن متابعة استمارتك فور وصولك للأكاديمية."
    },
    {
      q: "هل يمكنني طباعة الاستمارة بالأبيض والأسود أم يشترط الألوان؟",
      a: "الاستمارة معتمدة بالكامل سواء طُبعت ألوان أو أبيض وأسود، حيث يتم التحقق منها عبر مسح الباركود الرقمي ورمز الـ QR المشفر."
    },
    {
      q: "هل يمكنني تعديل الشعبة أو التخصص في الاستمارة؟",
      a: "نعم بكل سهولة! عند الاستعلام عن استمارتك، يمكنك فتح القائمة المنسدلة للتخصصات واختيار أي قسم آخر ثم الضغط على 'حفظ التعديل في النظام' وستظهر شعبتك الجديدة بالاستمارة فوراً."
    },
    {
      q: "كيف أطبع الاستمارة مباشرة من هاتفي المحمول؟",
      a: "يمكنك الضغط على زر 'تحميل كملف PDF' أو 'تحميل كصورة PNG' لحفظها في هاتفك، ثم إرسالها بالواتساب إلى أقرب مكتبة أو استوديو لطباعتها في ثوانٍ."
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] font-sans text-right py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Breadcrumbs & Back Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link to="/" className="hover:text-[#0A2463] transition flex items-center gap-1">
              <span>🏠 الرئيسية</span>
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/form-extraction" className="hover:text-[#0A2463] transition flex items-center gap-1">
              <span>📄 استخراج الاستمارة</span>
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[#0A2463] font-black">📖 دليل الاستخراج والطباعة</span>
          </div>

          <Link
            to="/form-extraction"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7F50] hover:bg-[#FF7F50]/90 text-white rounded-xl text-xs font-black transition shadow-xs active:scale-95"
          >
            <span>انتقل لاستخراج استمارتك الآن</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#0A2463] via-[#0D2E7A] to-[#143B94] rounded-3xl p-6 sm:p-10 text-white shadow-xl overflow-hidden border border-indigo-900/50">
          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>
          
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>الدليل الإرشادي الموحد لدفعة 2026</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black leading-tight text-white">
              دليل استخراج وطباعة استمارة التقديم والقبول الرسمية (خطوة بخطوة)
            </h1>
            
            <p className="text-xs sm:text-base text-slate-200 leading-relaxed font-medium">
              شرح تفصيلي ومصور يوضح للطالب وولي الأمر كيفية استدعاء استمارة الحجز برقم الهاتف أو كود المعاملة، وتحديد التخصص، وكتابة اسم الأكاديمية ومستشار التقديميات، ثم طباعتها أو تحميلها كملف PDF وصورة معتمدة.
            </p>

            {/* Quick action bar */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <Link
                to="/form-extraction"
                className="px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-lg active:scale-95"
              >
                <FileText className="w-4 h-4 text-slate-950" />
                <span>افتح صفحة استخراج الاستمارة مباشرة 📄</span>
              </Link>
              
              <a
                href="#steps-breakdown"
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border border-white/20"
              >
                <span>تصفح الخطوات المصورة 👇</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Search Tool Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#0A2463]">
                  جرب الاستعلام وسحب استمارتك الآن فوراً
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  أدخل رقم الهاتف الذي سجلت به في الموقع أو كود الحجز للانتقال المباشر لاستمارة قبولك
                </p>
              </div>
            </div>
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 w-fit">
              استعلام حي ومباشر ⚡
            </span>
          </div>

          <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 pointer-events-none">
                <Phone className="w-4 h-4 text-slate-500" />
              </span>
              <input
                type="text"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="أدخل رقم هاتفك (مثال: 01012345678) أو كود الحجز (مثال: 1008)"
                className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] transition"
              />
            </div>
            
            <button
              type="submit"
              disabled={searchLoading}
              className="px-7 py-3.5 bg-[#0A2463] hover:bg-[#12317c] text-white rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0 disabled:opacity-50"
            >
              {searchLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الاستعلام...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>استدعاء الاستمارة 🔍</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* STEP-BY-STEP BREAKDOWN */}
        <div id="steps-breakdown" className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#FF7F50] bg-orange-50 px-3.5 py-1 rounded-full border border-orange-200">
              خطوات استخراج الاستمارة الستة 📋
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-[#0A2463]">
              كيف تستخرج استمارتك الرسمية بالتفصيل؟
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              اتبع هذه المراحل البسيطة لإصدار الاستمارة الكربونية المعتمدة وتجهيزها للتقديم
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stepsList.map((st, idx) => {
              const IconComp = st.icon;
              return (
                <div 
                  key={idx}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${st.accent}`}>
                          <IconComp className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              خطوة {st.stepNumber}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-[#0A2463] mt-1">
                            {st.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-bold leading-normal">
                      {st.subtitle}
                    </p>

                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                      {st.description}
                    </p>

                    {/* Fields specification table */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-black text-slate-400 block">
                        المدخلات والمطلوب في هذه الخطوة:
                      </span>
                      <div className="space-y-1.5">
                        {st.fields.map((f, fIdx) => (
                          <div key={fIdx} className="bg-[#FAFBFD] p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>{f.label}:</span>
                            </span>
                            <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
                              {f.example} <span className="text-amber-600 font-bold">({f.type})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pro Tip */}
                  <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl text-[11px] font-bold text-amber-950">
                    {st.tip}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Mockup Section (How the Official Form looks) */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
              شكل الاستمارة المعتمدة 📄
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-[#0A2463]">
              محتويات الاستمارة الكربونية المعتمدة
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              عند توليد الاستمارة، تظهر لك وثيقة رسمية متكاملة تحتوي على كافة العناصر القانونية والتنظيمية
            </p>
          </div>

          {/* Interactive Form Preview Box */}
          <div className="max-w-2xl mx-auto bg-gradient-to-b from-slate-50 to-white rounded-3xl p-5 sm:p-8 border-2 border-dashed border-indigo-200 shadow-inner space-y-5 text-right">
            
            {/* Header Mockup */}
            <div className="bg-[#0A2463] text-white p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-amber-300">🏛️ بوابة المعاهد والأكاديميات الخاصة المعتمدة</h4>
                <p className="text-[10px] text-slate-200">استمارة حجز وقبول رسمي موحد • دفعة ٢٠٢٦</p>
              </div>
              <div className="text-left font-mono text-[10px] text-amber-400 font-bold bg-white/10 px-2 py-1 rounded-lg">
                REG-2026-XXXX
              </div>
            </div>

            {/* Grid Elements */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">اسم الطالب:</span>
                <span className="font-black text-slate-800 text-[11px] sm:text-xs">الاسم الرباعي المسجل</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">شعبة التخصص:</span>
                <span className="font-black text-[#0A2463] text-[11px] sm:text-xs">القسم المختار بالقائمة</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">الأكاديمية الموجه إليها:</span>
                <span className="font-black text-slate-800 text-[11px] sm:text-xs">اسم الأكاديمية التي كتبتها</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">مستشار التقديميات / السيلز:</span>
                <span className="font-black text-slate-800 text-[11px] sm:text-xs">اسم مسؤول المتابعة المسجل</span>
              </div>
            </div>

            {/* Verification Barcode & Stamp Mock */}
            <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white rounded-xl border border-slate-300 flex items-center justify-center p-1 shadow-2xs">
                  <QrCode className="w-12 h-12 text-[#0A2463]" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-900 block">باركود التحقق الرقمي والـ QR 🛡️</span>
                  <span className="text-[10px] text-slate-500 font-bold block">E-REF: REF-XXXXXXXX</span>
                  <span className="text-[9.5px] text-emerald-700 font-bold block">✓ موثق ومطابق إلكترونياً</span>
                </div>
              </div>

              <div className="w-20 h-20 rounded-full border-2 border-red-600 bg-red-50/50 flex flex-col items-center justify-center text-center text-red-700 rotate-[-12deg] shadow-xs">
                <span className="text-[7.5px] font-black">بوابة المعاهد</span>
                <span className="text-[9px] font-black">★ معتمد ★</span>
                <span className="text-[7.5px] font-black">قبول رسمي</span>
              </div>
            </div>

            {/* Action buttons preview */}
            <div className="pt-2">
              <span className="text-[11px] font-black text-slate-500 block mb-2 text-center">
                أزرار التحميل والطباعة المتاحة لك أسفل الاستمارة:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold shadow-xs">
                  📄 تحميل PDF
                </div>
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-xs">
                  🖼️ تحميل صورة PNG
                </div>
                <div className="p-2.5 bg-slate-800 text-white rounded-xl text-[11px] font-bold shadow-xs">
                  🖨️ طباعة فورية
                </div>
                <div className="p-2.5 bg-green-600 text-white rounded-xl text-[11px] font-bold shadow-xs">
                  📲 إرسال واتساب
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FAQs Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-150 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#0A2463]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#0A2463]">
                الأسئلة الشائعة حول استخراج الاستمارة
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                إجابات عن أكثر الاستفسارات التي تهم الطلاب وأولياء الأمور
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, fIdx) => (
              <div key={fIdx} className="bg-[#FAFBFD] p-4.5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-[#0A2463] flex items-start gap-2">
                  <span className="text-[#FF7F50] text-sm">❓</span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium pr-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Call to Action Card */}
        <div className="bg-gradient-to-r from-amber-500 via-[#FF7F50] to-[#FF6B35] rounded-3xl p-6 sm:p-10 text-white text-center space-y-4 shadow-xl">
          <h3 className="text-xl sm:text-3xl font-black">
            جاهز لاستخراج استمارتك الرسمية الآن؟ 📄
          </h3>
          <p className="text-xs sm:text-sm max-w-xl mx-auto font-medium text-amber-50 leading-relaxed">
            استخرج استمارتك خلال ثوانٍ معدودة، واحتفظ بنسختك المعتمدة لتثبيت خصومات المصروفات وحجز مقعدك الدراسي لعام 2026.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/form-extraction"
              className="px-8 py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-xs sm:text-sm font-black transition shadow-lg active:scale-95 flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>ابدأ استخراج الاستمارة الآن</span>
            </Link>

            <Link
              to="/"
              className="px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border border-white/30"
            >
              <span>العودة للرئيسية 🏠</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
