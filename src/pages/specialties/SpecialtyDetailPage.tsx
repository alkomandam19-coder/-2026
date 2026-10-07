import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import * as Icons from "lucide-react";
import { getSpecialtyDetails, SPECIALTIES_DETAILS } from "./specialtiesData";
import { ACADEMY_DEPARTMENTS, Department } from "../../data";
import { DEPARTMENT_DEFAULT_IMAGES, LOCAL_IMAGES } from "../../assets/images";
import SpeechButton from "../../components/SpeechButton";
import { PDFDownloadModal } from "../../components/PDFDownloadModal";
import { StudentBookingForm } from "../../components/StudentBookingForm";
import toast from "react-hot-toast";

export default function SpecialtyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const specialtyId = id || "petroleum";

  // Accordion state: by default 'overview' and 'careers' can be open, or allow multi-toggle
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    careers: false,
    curriculum: false,
    admission: false,
    faqs: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const expandAllSections = () => {
    setOpenSections({
      overview: true,
      careers: true,
      curriculum: true,
      admission: true,
      faqs: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      overview: false,
      careers: false,
      curriculum: false,
      admission: false,
      faqs: false,
    });
  };
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick Inline Enrollment Form state for instant conversion on ads landing pages
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentGov, setStudentGov] = useState("القاهرة");
  const [studentQual, setStudentQual] = useState("ثانوية عامة");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const specialty = getSpecialtyDetails(specialtyId);

  // Dynamic image fetching
  const specialtyBgImage = DEPARTMENT_DEFAULT_IMAGES[specialtyId] || LOCAL_IMAGES.petroleumImg;

  useEffect(() => {
    // 1. Page Title & Meta Description
    const pageTitle = `${specialty.name} | التفاصيل والاعتمادات وفرص العمل وسوق ٢٠٢٦`;
    document.title = pageTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', `${specialty.name}: ${specialty.heroTagline}. تعرف على الخطة الدراسية، الشهادات المعتمدة، وفرص العمل الحقيقية وقدم الآن بسهولة.`);

    // 2. Canonical URL setup
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `https://eg-academies.com/specialties/${specialtyId}`);

    // 3. OpenGraph Tags
    const setOgMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setOgMeta('og:title', pageTitle);
    setOgMeta('og:description', specialty.heroTagline);
    setOgMeta('og:url', `https://eg-academies.com/specialties/${specialtyId}`);
    setOgMeta('og:type', 'article');
    if (specialtyBgImage) {
      setOgMeta('og:image', specialtyBgImage);
    }

    // 4. Fire Facebook / TikTok Pixel Events if present
    if (typeof (window as any).fbq === "function") {
      (window as any).fbq('track', 'ViewContent', {
        content_name: specialty.name,
        content_category: specialty.category,
        content_ids: [specialtyId],
        content_type: 'product'
      });
    }

    // 5. Scroll to top on specialty switch
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [specialtyId, specialty]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      toast.success("تم نسخ رابط التخصص بنجاح! يمكنك استخدامه في الإعلانات والمشاركة.");
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const handleQuickEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentPhone.trim()) {
      toast.error("يرجى كتابة الاسم ورقم الهاتف بشكل كامل.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          phoneNumber: studentPhone,
          governorate: studentGov,
          qualification: studentQual,
          selectedDepartments: [specialty.name],
          source: `Landing Page: ${specialty.name}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الاستمارة.");

      // Fire Pixel Lead Event
      if (typeof (window as any).fbq === "function") {
        (window as any).fbq('track', 'Lead', {
          content_name: specialty.name,
          value: 1,
          currency: 'EGP'
        });
      }

      setSubmitSuccess(true);
      toast.success("تم تأكيد وتثبيت طلب الحجز المبدئي بالقسم بنجاح!");
    } catch (err: any) {
      toast.error(err.message || "عذراً، حدث خطأ أثناء إرسال بياناتك.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get list of other specializations to recommend
  const otherSpecialties = ACADEMY_DEPARTMENTS.filter(d => d.id !== specialtyId).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10 px-3 md:px-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Breadcrumbs Navigation Bar */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-white p-3 rounded-2xl border border-slate-200 shadow-3xs overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-brand-navy transition flex items-center gap-1 shrink-0">
            <Icons.Home className="w-3.5 h-3.5" />
            <span>الرئيسية</span>
          </Link>
          <Icons.ChevronLeft className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <Link to="/departments" className="hover:text-brand-navy transition shrink-0">
            تصفح الأقسام والتخصصات
          </Link>
          <Icons.ChevronLeft className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-slate-900 font-extrabold shrink-0 truncate max-w-[180px] md:max-w-none">
            {specialty.name}
          </span>
        </nav>

        {/* Dynamic Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg text-white">
          {/* Background Visual Image */}
          <div className="absolute inset-0 z-0">
            <LazyLoadImage
              src={specialtyBgImage}
              alt={specialty.name}
              className="w-full h-full object-cover opacity-35"
              referrerPolicy="no-referrer"
              effect="opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40"></div>
          </div>

          <div className="relative z-10 p-4 sm:p-8 md:p-12 space-y-4 sm:space-y-6">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="bg-[#0A2463] text-white text-[11px] sm:text-xs font-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl border border-white/10 shadow-xs">
                  {specialty.categoryLabel}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] sm:text-xs font-extrabold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1">
                  <Icons.CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  <span>تخصص معتمد 2026</span>
                </span>
              </div>

              {/* Share & Copy Link Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/15 backdrop-blur-xs transition flex items-center gap-1 cursor-pointer"
                  title="نسخ رابط الصفحة للإعلانات والتتبع"
                >
                  <Icons.Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{copiedLink ? "تم النسخ ✓" : "نسخ الرابط"}</span>
                </button>

                <SpeechButton
                  textToSpeak={`${specialty.name}. ${specialty.heroTagline}. ${specialty.fullOverview}`}
                />
              </div>
            </div>

            {/* Title & Tagline */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-sans leading-tight">
                {specialty.name}
              </h1>
              <p className="text-xs sm:text-base md:text-lg text-slate-200 font-medium max-w-3xl leading-relaxed">
                {specialty.heroTagline}
              </p>
            </div>

            {/* Quick Spec Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1 sm:pt-2">
              <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-right">
                <div className="flex items-center gap-1 text-amber-400 mb-0.5 sm:mb-1">
                  <Icons.Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold">مدة الدراسة:</span>
                </div>
                <p className="text-[11px] sm:text-xs font-extrabold text-white">{specialty.duration}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-right">
                <div className="flex items-center gap-1 text-emerald-400 mb-0.5 sm:mb-1">
                  <Icons.Award className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold">المسمى المهني:</span>
                </div>
                <p className="text-[11px] sm:text-xs font-extrabold text-white truncate">{specialty.certificateTitle}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-right">
                <div className="flex items-center gap-1 text-sky-400 mb-0.5 sm:mb-1">
                  <Icons.BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold">نوع التدريب:</span>
                </div>
                <p className="text-[11px] sm:text-xs font-extrabold text-white truncate">{specialty.trainingType}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 text-right">
                <div className="flex items-center gap-1 text-rose-400 mb-0.5 sm:mb-1">
                  <Icons.TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold">مؤشر طلب السوق:</span>
                </div>
                <p className="text-[11px] sm:text-xs font-extrabold text-white">{specialty.jobMarketOutlook.demandLevel}</p>
              </div>
            </div>

            {/* Closed Alert Banner if full/closed */}
            {(specialty.isClosed || specialty.isFull || specialty.id === "construction") && (
              <div className="bg-rose-500/20 border-2 border-rose-400 p-4 rounded-2xl text-white space-y-1 backdrop-blur-md">
                <div className="flex items-center gap-2 font-black text-sm sm:text-base text-rose-300">
                  <Icons.AlertOctagon className="w-5 h-5 text-rose-400" />
                  <span>تنبيه رسمي: القسم ممتلئ - تم غلق باب التقديم والحجز</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200">
                  نعتذر لكم، اكتملت الطاقة الاستيعابية بالكامل لهذا التخصص ولا يمكن استقبال طلبات حجز جديدة حالياً.
                </p>
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-2 sm:pt-3 border-t border-white/10">
              {(specialty.isClosed || specialty.isFull || specialty.id === "construction") ? (
                <button
                  type="button"
                  onClick={() => navigate("/departments")}
                  className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.AlertCircle className="w-4 h-4" />
                  <span>القسم ممتلئ 🚫 تصفح باقي الأقسام المتاحة</span>
                </button>
              ) : (
                <a
                  href="#enroll-section"
                  className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Icons.Sparkles className="w-4 h-4" />
                  <span>احجز مقعدك بالقسم مع الخصم ⚡</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setDownloadModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs"
              >
                <Icons.FileDown className="w-4 h-4 text-amber-400" />
                <span>تحميل كتيب التخصص (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/discounts?preselected=${specialty.id}`)}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3.5 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icons.Tag className="w-4 h-4 text-amber-300" />
                <span>عرض خصم التقديم المبكر</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vertical Collapsible Accordion Cards List (قوائم التفاصيل المنسدلة المدمجة) */}
        <div className="space-y-4" dir="rtl">
          {/* Mobile Quick Drawer Index Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-3xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icons.ListFilter className="w-4 h-4 text-brand-navy" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  قوائم تفاصيل التخصص (اضغط لمعاينة القسم):
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={expandAllSections}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition text-[11px] cursor-pointer"
                >
                  فتح الكل 📂
                </button>
                <button
                  type="button"
                  onClick={collapseAllSections}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition text-[11px] cursor-pointer"
                >
                  إغلاق الكل 📁
                </button>
              </div>
            </div>

            {/* Quick Mobile Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 whitespace-nowrap scrollbar-none text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setOpenSections(prev => ({ ...prev, overview: !prev.overview }))}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  openSections.overview ? "bg-[#0A2463] text-white border-[#0A2463]" : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>🌟 نظرة عامة</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenSections(prev => ({ ...prev, careers: !prev.careers }))}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  openSections.careers ? "bg-[#0A2463] text-white border-[#0A2463]" : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>💼 فرص العمل</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenSections(prev => ({ ...prev, curriculum: !prev.curriculum }))}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  openSections.curriculum ? "bg-[#0A2463] text-white border-[#0A2463]" : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>📚 المناهج الدراسية</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenSections(prev => ({ ...prev, admission: !prev.admission }))}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  openSections.admission ? "bg-[#0A2463] text-white border-[#0A2463]" : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>📜 شروط القبول</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenSections(prev => ({ ...prev, faqs: !prev.faqs }))}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  openSections.faqs ? "bg-[#0A2463] text-white border-[#0A2463]" : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>❓ الأسئلة الشائعة</span>
              </button>
            </div>
          </div>

          {/* Item 1: Overview & Key Skills */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-3xs overflow-hidden transition">
            <button
              type="button"
              onClick={() => toggleSection("overview")}
              className={`w-full p-3 sm:p-5 flex items-center justify-between gap-2.5 text-right cursor-pointer transition ${
                openSections.overview
                  ? "bg-slate-900 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                  openSections.overview ? "bg-amber-400 text-slate-950" : "bg-brand-navy/10 text-brand-navy"
                }`}>
                  <Icons.BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-bold sm:font-black">🌟 نظرة عامة والمهارات المكتسبة</h3>
                  <p className={`text-[10px] sm:text-[11px] font-medium ${openSections.overview ? "text-slate-300" : "text-slate-500"}`}>
                    الأهداف الأكاديمية والخبرات والشهادات
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg hidden sm:inline-block ${
                  openSections.overview ? "bg-white/10 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {specialty.keySkills.length} مهارات رئيسية
                </span>
                <Icons.ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  openSections.overview ? "rotate-180 text-amber-400" : "text-slate-400"
                }`} />
              </div>
            </button>

            {openSections.overview && (
              <div className="p-3.5 sm:p-7 border-t border-slate-100 bg-white space-y-4 sm:space-y-6 animate-fade-in text-right">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                  <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                    {/* Detailed Overview */}
                    <div className="space-y-3 sm:space-y-4">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Icons.BookOpen className="w-4 h-4 text-brand-navy" />
                        <span>عن التخصص والأهداف الأكاديمية</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                        {specialty.fullOverview}
                      </p>
                      <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
                        <Icons.Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p>
                          تم إعداد كافة المقررات الدراسية بالقسم بالتعاون مع نخبة من الخبراء والممارسين الميدانيين لضمان مطابقة المهارات المكتسبة لاحتياجات شركات ومؤسسات سوق العمل الفعلية لعام 2026.
                        </p>
                      </div>
                    </div>

                    {/* Skills Learned */}
                    <div className="space-y-3 sm:space-y-4">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Icons.CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>المهارات والخبرات العملية التي ستكتسبها</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                        {specialty.keySkills.map((skill, idx) => (
                          <div key={idx} className="p-3 sm:p-3.5 bg-emerald-50/50 rounded-xl sm:rounded-2xl border border-emerald-100/80 flex items-start gap-2.5">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-[10px] sm:text-xs mt-0.5">
                              ✓
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                              {skill}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Highlights */}
                  <div className="lg:col-span-4 space-y-4 sm:space-y-6">
                    <div className="p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-3 sm:space-y-4">
                      <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-2">
                        معلومات الاعتماد والتوثيق
                      </h4>
                      <ul className="space-y-2.5 sm:space-y-3 text-xs text-slate-700">
                        <li className="flex items-start gap-2">
                          <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>اعتماد الشهادة:</strong> {specialty.accreditation}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>الشهادة الممنوحة:</strong> {specialty.certificateTitle}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>مدة الدراسة والتدريب:</strong> {specialty.duration}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Item 2: Career Opportunities & Market Outlook */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-3xs overflow-hidden transition">
            <button
              type="button"
              onClick={() => toggleSection("careers")}
              className={`w-full p-3 sm:p-5 flex items-center justify-between gap-2.5 text-right cursor-pointer transition ${
                openSections.careers
                  ? "bg-slate-900 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                  openSections.careers ? "bg-amber-400 text-slate-950" : "bg-brand-navy/10 text-brand-navy"
                }`}>
                  <Icons.Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-bold sm:font-black">💼 فرص ومجالات العمل ومستقبل السوق 2026</h3>
                  <p className={`text-[10px] sm:text-[11px] font-medium ${openSections.careers ? "text-slate-300" : "text-slate-500"}`}>
                    نطاقات التوظيف والشركات والرواتب المتوقعة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg hidden sm:inline-block ${
                  openSections.careers ? "bg-white/10 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {specialty.careerOpportunities.length} مجالات عمل
                </span>
                <Icons.ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  openSections.careers ? "rotate-180 text-amber-400" : "text-slate-400"
                }`} />
              </div>
            </button>

            {openSections.careers && (
              <div className="p-3.5 sm:p-7 border-t border-slate-100 bg-white space-y-4 sm:space-y-6 animate-fade-in text-right">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {specialty.careerOpportunities.map((career, idx) => (
                    <div key={idx} className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0 font-bold">
                        <Icons.Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">{career}</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500">فرص توظيف وتدريب ميداني متاحة</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Salary & Job Market Overview */}
                <div className="p-3.5 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl sm:rounded-2xl space-y-2.5 sm:space-y-3">
                  <h4 className="font-extrabold text-xs sm:text-sm text-amber-400 flex items-center gap-2">
                    <Icons.TrendingUp className="w-4 h-4" />
                    <span>مؤشرات وتوقعات سوق العمل لعام 2026</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                    <div className="bg-white/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-white/10">
                      <span className="text-slate-400 block text-[9.5px] sm:text-[10px]">مستوى الطلب:</span>
                      <strong className="text-emerald-400 text-xs sm:text-sm">{specialty.jobMarketOutlook.demandLevel}</strong>
                    </div>
                    <div className="bg-white/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-white/10 sm:col-span-2">
                      <span className="text-slate-400 block text-[9.5px] sm:text-[10px]">متوسط الرواتب الدارجة:</span>
                      <strong className="text-white text-xs sm:text-sm">{specialty.jobMarketOutlook.expectedSalaryRange}</strong>
                    </div>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300">
                    <span className="font-bold text-amber-300">أبرز أماكن ونطاقات العمل: </span>
                    <span>{specialty.jobMarketOutlook.topLocations.join(" • ")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Item 3: Curriculum & Modules */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-3xs overflow-hidden transition">
            <button
              type="button"
              onClick={() => toggleSection("curriculum")}
              className={`w-full p-3 sm:p-5 flex items-center justify-between gap-2.5 text-right cursor-pointer transition ${
                openSections.curriculum
                  ? "bg-slate-900 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                  openSections.curriculum ? "bg-amber-400 text-slate-950" : "bg-brand-navy/10 text-brand-navy"
                }`}>
                  <Icons.GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-bold sm:font-black">📚 الخطة الدراسية والمناهج التدريبية</h3>
                  <p className={`text-[10px] sm:text-[11px] font-medium ${openSections.curriculum ? "text-slate-300" : "text-slate-500"}`}>
                    الوحدات الدراسية والمواد العملية لكل فصل
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg hidden sm:inline-block ${
                  openSections.curriculum ? "bg-white/10 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {specialty.curriculumModules.length} فصول دراسية
                </span>
                <Icons.ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  openSections.curriculum ? "rotate-180 text-amber-400" : "text-slate-400"
                }`} />
              </div>
            </button>

            {openSections.curriculum && (
              <div className="p-3.5 sm:p-7 border-t border-slate-100 bg-white space-y-4 sm:space-y-6 animate-fade-in text-right">
                {/* Clarification Alert regarding differences in subjects across institutions */}
                <div className="p-3.5 sm:p-4 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 font-bold shadow-2xs">
                  <Icons.AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block font-black text-amber-950 text-xs sm:text-sm">📌 تنبيه هام بشأن المواد والمناهج الدراسية:</span>
                    <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed font-sans font-medium">
                      تختلف أسماء المواد الدراسية وتفاصيل المناهج التدريبية نسبياً من معهد إلى آخر أو بين الأكاديميات بناءً على اللائحة الداخلية والاعتمادات المقررة لكل جهة تعليمية، وتخضع لعمليات التطوير والتحديث الدوري بما يلبي متطلبات التوظيف ومستجدات سوق العمل.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Icons.GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-brand-navy" />
                    <span>نماذج ومحاور المحتوى التعليمي لكل ترم</span>
                  </h4>
                  <span className="text-[11px] sm:text-xs text-slate-500 font-bold">{specialty.duration}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {specialty.curriculumModules.map((module, idx) => (
                    <div key={idx} className="p-3.5 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2.5 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs sm:text-sm text-brand-navy bg-brand-navy/10 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl">
                          {module.term}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold">وحدة دراسية</span>
                      </div>
                      <ul className="space-y-1.5 sm:space-y-2 text-xs text-slate-700">
                        {module.topics.map((topic, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-navy shrink-0 mt-1.5"></span>
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Item 4: Accreditation & Admission Requirements */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-3xs overflow-hidden transition">
            <button
              type="button"
              onClick={() => toggleSection("admission")}
              className={`w-full p-3 sm:p-5 flex items-center justify-between gap-2.5 text-right cursor-pointer transition ${
                openSections.admission
                  ? "bg-slate-900 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                  openSections.admission ? "bg-[#FF7F50] text-white" : "bg-emerald-50 text-emerald-600"
                }`}>
                  <Icons.ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-bold sm:font-black">🏛️ الاعتماد والقبول والتأجيل التجنيدي</h3>
                  <p className={`text-[10px] sm:text-[11px] font-medium ${openSections.admission ? "text-slate-300" : "text-slate-500"}`}>
                    المؤهلات المطلوبة، الأوراق الرسمية، وموقف الجيش
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg hidden sm:inline-block ${
                  openSections.admission ? "bg-white/10 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}>
                  مؤهلات وثانوية ودبلومات
                </span>
                <Icons.ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  openSections.admission ? "rotate-180 text-amber-400" : "text-slate-400"
                }`} />
              </div>
            </button>

            {openSections.admission && (
              <div className="p-3.5 sm:p-7 border-t border-slate-100 bg-white space-y-4 sm:space-y-6 animate-fade-in text-right">
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">المؤهلات الدراسية وشروط القبول بالقسم:</h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {specialty.admissionRequirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-100">
                        <Icons.CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 sm:p-5 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-200 space-y-1.5 sm:space-y-2 text-xs text-slate-800">
                  <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Icons.AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>الموقف التجنيدي للطلاب الذكور:</span>
                  </h4>
                  <p className="leading-relaxed">
                    يتوفر خيار تأجيل التجنيد طوال فترة الدراسة لمن ينطبق عليهم الشروط الإدارية الرسمية وتأكيد القبول.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Item 5: FAQs */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-3xs overflow-hidden transition">
            <button
              type="button"
              onClick={() => toggleSection("faqs")}
              className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-right cursor-pointer transition ${
                openSections.faqs
                  ? "bg-slate-900 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                  openSections.faqs ? "bg-amber-400 text-slate-950" : "bg-brand-navy/10 text-brand-navy"
                }`}>
                  <Icons.HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">❓ الأسئلة الشائعة حول {specialty.name}</h3>
                  <p className={`text-[11px] font-medium ${openSections.faqs ? "text-slate-300" : "text-slate-500"}`}>
                    إجابات أسئلة الطلاب وحقائق الاعتمادات
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg hidden sm:inline-block ${
                  openSections.faqs ? "bg-white/10 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {specialty.faqs.length} إجابات سريعة
                </span>
                <Icons.ChevronDown className={`w-5 h-5 transition-transform duration-300 ${
                  openSections.faqs ? "rotate-180 text-amber-400" : "text-slate-400"
                }`} />
              </div>
            </button>

            {openSections.faqs && (
              <div className="p-5 sm:p-7 border-t border-slate-100 bg-white space-y-4 animate-fade-in text-right">
                <div className="space-y-3">
                  {specialty.faqs.map((faq, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                        <span className="text-amber-500 font-bold">س:</span>
                        <span>{faq.question}</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed pr-5">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Direct Full Registration Section */}
        <div id="enroll-section" className="space-y-4">
          {(specialty.isClosed || specialty.isFull || specialty.id === "construction") ? (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 text-slate-800">
              <Icons.Lock className="w-12 h-12 text-rose-600 mx-auto" />
              <h3 className="text-lg sm:text-xl font-black text-rose-900">
                باب التقديم والحجز لقسم {specialty.name} مغلق حالياً
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                تم اكتمال العدد الأقصى للطلاب المقبولين بهذا القسم للعام الدراسي 2026. يمكنك اختيار أحد التخصصات المتاحة الأخرى أو التقديم على باقي الأقسام المعتمدة.
              </p>
              <div className="pt-2">
                <Link
                  to="/departments"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-sm rounded-xl transition shadow-xs"
                >
                  <Icons.Grid className="w-4 h-4" />
                  <span>تصفح باقي الأقسام المتاحة للتقديم</span>
                </Link>
              </div>
            </div>
          ) : (
            <StudentBookingForm preselectedDepts={[specialty.id, specialty.name]} />
          )}
        </div>

        {/* Explore Other Specializations Section */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 space-y-4 text-right shadow-3xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Icons.Compass className="w-5 h-5 text-brand-navy" />
              <span>تخصصات أخرى قد تناسب اهتمامك</span>
            </h3>
            <Link to="/departments" className="text-xs font-bold text-brand-navy hover:underline">
              عرض كل الأقسام ⬅️
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {otherSpecialties.map((dept) => (
              <Link
                key={dept.id}
                to={`/specialties/${dept.id}`}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition text-right group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-brand-navy transition">
                    {dept.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {dept.description}
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-bold text-brand-navy">
                  <span>تعرف علي المزيد</span>
                  <Icons.ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* PDF Download Catalog Modal */}
      <PDFDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        defaultSpecialization={specialty.name}
      />
    </div>
  );
}
