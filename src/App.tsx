import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import { RealtimeNotificationToast } from "./components/RealtimeNotificationToast";
import ProgressBar from "./components/ProgressBar";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { SITE_BACKGROUNDS } from "./assets/images";

import { syncAllConfigsFromDatabase, subscribeToSiteConfigsRealtime } from "./utils/configSync";
import { captureAdAttribution } from "./utils/adAttribution";

// Resilient dynamic module import with automatic retry on chunk loading failure
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      console.warn("Retrying dynamic chunk import...", error);
      try {
        // Wait briefly and retry once
        await new Promise((res) => setTimeout(res, 500));
        return await factory();
      } catch (retryError) {
        // If still failing and not recently refreshed, reload window to pull latest bundle
        const key = "ais_module_fetch_recovery";
        const lastRefresh = sessionStorage.getItem(key);
        const now = Date.now();
        if (!lastRefresh || now - Number(lastRefresh) > 15000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}

// Lazy load non-homepage routes for maximum mobile performance & code splitting
const NewsPage = lazyWithRetry(() => import("./pages/NewsPage"));
const About = lazyWithRetry(() => import("./pages/About"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const DepartmentsPage = lazyWithRetry(() => import("./pages/DepartmentsPage"));
const TrendingPage = lazyWithRetry(() => import("./pages/TrendingPage"));
const GuidancePage = lazyWithRetry(() => import("./pages/GuidancePage"));
const AccreditationPage = lazyWithRetry(() => import("./pages/AccreditationPage"));
const DiscountsPage = lazyWithRetry(() => import("./pages/DiscountsPage"));
const ComplaintsPage = lazyWithRetry(() => import("./pages/ComplaintsPage"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const ThankYou = lazyWithRetry(() => import("./pages/ThankYou"));
const FormExtraction = lazyWithRetry(() => import("./pages/FormExtraction"));
const FormExtractionGuide = lazyWithRetry(() => import("./pages/FormExtractionGuide"));
const RegistrationGuide = lazyWithRetry(() => import("./pages/RegistrationGuide"));
const LabExperiencePage = lazyWithRetry(() => import("./pages/LabExperiencePage"));
const ApplicationTrackerPage = lazyWithRetry(() => import("./pages/ApplicationTrackerPage"));
const ROICalculatorPage = lazyWithRetry(() => import("./pages/ROICalculatorPage"));
const CareerRoadmapPage = lazyWithRetry(() => import("./pages/CareerRoadmapPage"));
const ParentsVIPPage = lazyWithRetry(() => import("./pages/ParentsVIPPage"));
const SpecialtyDetailPage = lazyWithRetry(() => import("./pages/specialties/SpecialtyDetailPage"));
const SalesPortal = lazyWithRetry(() => import("./pages/SalesPortal"));
const BranchesPage = lazyWithRetry(() => import("./pages/BranchesPage"));
const TrustAcademyPage = lazyWithRetry(() => import("./pages/TrustAcademyPage"));
const ApexCollegePage = lazyWithRetry(() => import("./pages/ApexCollegePage"));
const RefaqAcademyPage = lazyWithRetry(() => import("./pages/RefaqAcademyPage"));
const AcademyPortal = lazyWithRetry(() => import("./pages/AcademyPortal"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Lightweight suspense fallback loader
const PageFallbackLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-6 text-center" dir="rtl">
    <div className="space-y-3">
      <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto shadow-sm"></div>
      <p className="text-xs font-bold text-slate-300">جاري تحميل الصفحة...</p>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();

  React.useEffect(() => {
    captureAdAttribution();
  }, [location.search]);
  const showFooter = location.pathname !== "/admin";
  const [configsSynced, setConfigsSynced] = React.useState(false);

  React.useEffect(() => {
    async function initSync() {
      await syncAllConfigsFromDatabase();
      // Dispatch events to notify active views that configs have loaded/updated
      window.dispatchEvent(new Event("news_posts_updated"));
      window.dispatchEvent(new Event("news_ad_updated"));
      window.dispatchEvent(new Event("news_page_meta_updated"));
      window.dispatchEvent(new Event("roi_constants_updated"));
      window.dispatchEvent(new Event("reviews_updated"));
      window.dispatchEvent(new Event("student_reviews_updated"));
      window.dispatchEvent(new Event("job_announcements_updated"));
      window.dispatchEvent(new Event("departments_updated"));
      window.dispatchEvent(new Event("site_configs_updated"));
      setConfigsSynced(true);
    }
    initSync();

    const unsubscribe = subscribeToSiteConfigsRealtime();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const titlesMap: Record<string, string> = {
      "/": "بوابة حجز المعاهد والأكاديميات الخاصة والتعليم المهني المعتمد بمصر",
      "/departments": "تصفح الأقسام والتخصصات الدراسية المعتمدة | بوابة المعاهد الخاصة",
      "/discounts": "تثبيت وحجز خصومات المصروفات الفورية | بوابة المعاهد الخاصة",
      "/accreditation": "تفاصيل الشهادات والاعتمادات والتوثيق الرسمي | بوابة المعاهد الخاصة",
      "/registration-guide": "دليل الخطوات الأربعة للتسجيل الإلكتروني واستخراج الاستمارة الموحدة",
      "/trending": "الأقسام والتخصصات الأكثر طلباً في سوق العمل المصري حالياً",
      "/guidance": "اختبار تحديد التخصص والمسار الدراسي المناسب لميولك ومهاراتك",
      "/news": "أحدث الأخبار والتنبيهات العامة للقبول والتدريب بالأكاديميات المعتمدة",
      "/about": "من نحن | بوابة التعريف بالمعاهد والأكاديميات المهنية المعتمدة بمصر",
      "/privacy": "سياسة الخصوصية وميثاق الأمان الرقمي وخصوصية البيانات للطلاب",
      "/thank-you": "تم تأكيد طلبك بنجاح | يرجى الاحتفاظ برمز الحجز المركزي",
      "/form-extraction": "استخراج وطباعة استمارة الحجز الإلكتروني الموحدة",
      "/form-extraction-guide": "دليل وخطوات استخراج وطباعة استمارة التقديم والقبول الرسمية",
      "/complaints": "بوابة الاستفسارات والدعم المباشر للمسجلين",
      "/lab-experience": "يوم المعايشة التجريبي والنزول الفعلي للمعامل 2026",
      "/application-tracker": "تتبع حالة ملف التقديم الفوري | بوابة المعاهد والتعليم المهني",
      "/roi-calculator": "حاسبة العائد المهني واستعادة الاستثمار (ROI Calculator)",
      "/career-roadmap": "خريطة طريق المستقبل المهني والنمو الوظيفي 2026",
      "/parents-assurance": "استشارة ولي الأمر المباشرة ونظام التقسيط 2026",
      "/branches": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/salam": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/salam-academy": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/elsalam": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/alsalam": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/peace": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/peace-academy": "بوابة أكاديمية السلام للتدريب والاستشارات الرسمية 2026",
      "/trust": "بوابة أكاديمية تراست للعلوم الطبية الحديثة الرسمية 2026",
      "/trust-academy": "بوابة أكاديمية تراست للعلوم الطبية الحديثة الرسمية 2026",
      "/apex": "بوابة أكاديمية أبيكس كولج الرسمية 2026",
      "/apex-college": "بوابة أكاديمية أبيكس كولج الرسمية 2026",
      "/apexcollege": "بوابة أكاديمية أبيكس كولج الرسمية 2026",
      "/refaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
      "/refaq-academy": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
      "/alrefaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
      "/al-refaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية 2026",
      "/sales-portal": "بوابة مستشاري القبول والتسجيل والمبيعات",
      "/admin": "لوحة الإدارة والمطور"
    };

    const descriptionsMap: Record<string, string> = {
      "/": "منصة تعريفية وتسويقية تتيح لك التعرف على تخصصات المعاهد الخاصة والأكاديميات المعتمدة بمصر وحجز مقعدك الدراسي مباشرة مع خصومات للتسجيل المبكر.",
      "/departments": "استكشف التخصصات والشعب الدراسية المتاحة بالأكاديميات والمعاهد الخاصة المعتمدة، وتعرف على شروط القبول والمستقبل المهني والمهارات المطلوبة لكل قسم.",
      "/discounts": "سجل بياناتك المبدئية الآن لحفظ مقعدك وتثبيت الخصومات المتاحة لفترة محدودة على المصروفات وحجز ميزات التنسيق الفردي مجاناً بالكامل.",
      "/accreditation": "اطلع على تفاصيل الاعتمادات الرسمية للشهادات المهنية الممنوحة وفرص التوثيق بالخارجية وتأجيل الخدمة العسكرية والتدريب الميداني والعملي المتاح للطلاب.",
      "/registration-guide": "تعرف على الخطوات الأربعة البسيطة للتقديم الإلكتروني، والأوراق الرسمية المطلوبة لدفعة ٢٠٢٦، وكيفية استدعاء وطباعة استمارة الحجز الموحدة بالمنصة.",
      "/trending": "رصد حي لأكثر التخصصات والأقسام طلباً واهتماماً من الطلاب هذا العام، مرتبة بناءً على الإحصائيات الفعلية لحركات حجز المقاعد والاتصال الجاري.",
      "/guidance": "قم بإجراء اختبار توجيهي سريع ومبسط يساعدك في اختيار التخصص الأكاديمي والمستقبل المهني الأنسب لمهاراتك الفردية وقدراتك الفنية مجاناً.",
      "/news": "تابع آخر الأخبار والبيانات الصحفية والتنبيهات الحصرية حول برامج التدريب العملي، وفرص التوظيف، وتفاصيل الأنشطة الطلابية بالأكاديميات المعتمدة.",
      "/about": "تعرف على رؤية وأهداف بوابتنا المستقلة في تقديم الاستشارات والتوجيه الأكاديمي الموثوق وحجز تخصصات المعاهد الخاصة والبرامج التدريبية بمصر.",
      "/branches": "دليل الفروع الرسمية لأكاديمية السلام المعتمدة بمختلف محافظات مصر، مواعيد وساعات العمل الرسمية، العناوين التفصيلية، وأرقام التواصل المباشر مع مديري الفروع.",
      "/trust": "بوابة أكاديمية تراست للعلوم الطبية الحديثة الرسمية، دليل التخصصات والمقر والاعتمادات والشهادات المعتمدة.",
      "/apex": "بوابة أكاديمية أبيكس كولج الرسمية، دليل التخصصات والدبلومات المهنية والمقر والاعتمادات الرسمية.",
      "/refaq": "بوابة أكاديمية الرفاق للتدريب والاستشارات الرسمية، دليل البرامج التدريبية والاستشارات والمقر المعتمد والشهادات الرسمية.",
      "/privacy": "نلتزم بحماية خصوصية بيانات الطلاب وهواتفهم وسريتها التامة بالمنصة. تعرف على بنود ميثاق الأمان الرقمي وسياسة الاستخدام العادل للاستمارة الموحدة."
    };

    const currentTitle = titlesMap[location.pathname] || "البوابة الموحدة للتسجيل الإلكتروني المهني";
    document.title = currentTitle;

    const currentDesc = descriptionsMap[location.pathname] || "منصة تعريفية وتسويقية تتيح لك التعرف على تخصصات المعاهد الخاصة والأكاديميات المعتمدة بمصر وحجز مقعدك الدراسي مباشرة مع خصومات للتسجيل المبكر.";
    
    // 1. Dynamic Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', currentDesc);

    // 2. Clean Path and Canonical setup
    const indexablePages = [
      "/",
      "/departments",
      "/discounts",
      "/accreditation",
      "/registration-guide",
      "/trending",
      "/guidance",
      "/news",
      "/about",
      "/branches",
      "/privacy"
    ];

    let cleanPath = location.pathname;
    if (cleanPath.endsWith("/") && cleanPath.length > 1) {
      cleanPath = cleanPath.slice(0, -1);
    }

    // 3. Dynamic Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (indexablePages.includes(cleanPath)) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', `https://eg-academies.com${cleanPath === "/" ? "" : cleanPath}`);
    } else {
      if (canonicalLink) {
        canonicalLink.remove();
      }
    }

    // 4. Dynamic Open Graph Tags
    const setOgMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setOgMeta('og:title', currentTitle);
    setOgMeta('og:description', currentDesc);
    setOgMeta('og:url', `https://eg-academies.com${cleanPath === "/" ? "" : cleanPath}`);
    setOgMeta('og:image', 'https://eg-academies.com/logo.png');
    setOgMeta('og:type', 'website');

    // 5. Dynamic Twitter Cards Tags
    const setTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setTwitterMeta('twitter:card', 'summary_large_image');
    setTwitterMeta('twitter:title', currentTitle);
    setTwitterMeta('twitter:description', currentDesc);
    setTwitterMeta('twitter:image', 'https://eg-academies.com/logo.png');

    // Dynamic Schema.org structured data injection
    const schemaScriptId = "jsonld-structured-data";
    let existingSchemaScript = document.getElementById(schemaScriptId);
    if (existingSchemaScript) {
      existingSchemaScript.remove();
    }

    if (indexablePages.includes(cleanPath)) {
      const pageTitleClean = currentTitle;
      const pageDescClean = currentDesc || "";
      const fullUrl = `https://eg-academies.com${cleanPath === "/" ? "" : cleanPath}`;

      const schemas: any[] = [];

      // 1. Organization Schema
      schemas.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://eg-academies.com/#organization",
        "name": "بوابة المعاهد الخاصة والتعليم المهني بمصر",
        "url": "https://eg-academies.com",
        "logo": "https://eg-academies.com/logo.png",
        "description": "منصة تعريفية وتسويقية تتيح لك التعرف على تخصصات المعاهد الخاصة والأكاديميات المعتمدة بمصر وحجز مقعدك الدراسي مباشرة مع خصومات للتسجيل المبكر."
      });

      // 2. WebSite Schema
      schemas.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://eg-academies.com/#website",
        "name": "بوابة المعاهد الخاصة والتعليم المهني بمصر",
        "url": "https://eg-academies.com",
        "publisher": {
          "@id": "https://eg-academies.com/#organization"
        }
      });

      // 3. WebPage Schema
      schemas.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${fullUrl}/#webpage`,
        "url": fullUrl,
        "name": pageTitleClean,
        "description": pageDescClean,
        "isPartOf": {
          "@id": "https://eg-academies.com/#website"
        },
        "about": {
          "@id": "https://eg-academies.com/#organization"
        }
      });

      // 4. BreadcrumbList Schema (Only for subpages)
      if (cleanPath !== "/") {
        const breadcrumbNames: Record<string, string> = {
          "/departments": "تصفح الأقسام والتخصصات",
          "/discounts": "المنح والخصومات",
          "/accreditation": "الاعتمادات والشهادات المعتمدة",
          "/registration-guide": "دليل التقديم والتسجيل",
          "/trending": "التخصصات الأكثر طلباً",
          "/guidance": "اختبار تحديد التخصص",
          "/news": "أحدث الأخبار والتنببهات",
          "/about": "من نحن",
          "/branches": "فروع الأكاديمية ومواعيد العمل",
          "/privacy": "سياسة الخصوصية"
        };

        const pageName = breadcrumbNames[cleanPath] || "الصفحة الفرعية";

        schemas.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "@id": `${fullUrl}/#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "الرئيسية",
              "item": "https://eg-academies.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": pageName,
              "item": fullUrl
            }
          ]
        });
      }

      const script = document.createElement("script");
      script.id = schemaScriptId;
      script.type = "application/ld+json";
      script.innerHTML = JSON.stringify(schemas);
      document.head.appendChild(script);
    }
  }, [location.pathname]);

  // Global GPU-Accelerated 120FPS IntersectionObserver for Scroll Reveals (.element-reveal)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            // Unobserve immediately after triggering to save RAM and CPU resources
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -20px 0px", // Polished early reveal threshold
        threshold: 0.01,
      }
    );

    const observeElements = () => {
      const elements = document.querySelectorAll(".element-reveal:not(.is-revealed)");
      elements.forEach((el) => {
        observer.observe(el);
      });
    };

    // Observe elements once on page navigation
    observeElements();
    const timer1 = setTimeout(observeElements, 150);
    const timer2 = setTimeout(observeElements, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      observer.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${SITE_BACKGROUNDS.mainBg})` }}>
      {/* Global Toast Notifications */}
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          style: {
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
            fontWeight: "bold",
            borderRadius: "12px",
            direction: "rtl"
          }
        }}
      />
      
      {/* Global Progress Bar */}
      <ProgressBar />
      
      {/* Global sticky navbar at the top */}
      <Navbar />
      
      {/* Router mapping screens */}
      <main className="flex-grow">
        <RouteErrorBoundary>
          <Suspense fallback={<PageFallbackLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:id" element={<NewsPage />} />
              <Route path="/registration-guide" element={<RegistrationGuide />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/departments/:id" element={<SpecialtyDetailPage />} />
              <Route path="/specialties/:id" element={<SpecialtyDetailPage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/guidance" element={<GuidancePage />} />
              <Route path="/accreditation" element={<AccreditationPage />} />
              <Route path="/lab-experience" element={<LabExperiencePage />} />
              <Route path="/application-tracker" element={<ApplicationTrackerPage />} />
              <Route path="/roi-calculator" element={<ROICalculatorPage />} />
              <Route path="/career-roadmap" element={<CareerRoadmapPage />} />
              <Route path="/parents-assurance" element={<ParentsVIPPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/branches/:id" element={<BranchesPage />} />
              <Route path="/salam" element={<BranchesPage />} />
              <Route path="/salam-academy" element={<BranchesPage />} />
              <Route path="/elsalam" element={<BranchesPage />} />
              <Route path="/alsalam" element={<BranchesPage />} />
              <Route path="/peace" element={<BranchesPage />} />
              <Route path="/peace-academy" element={<BranchesPage />} />
              <Route path="/trust" element={<TrustAcademyPage />} />
              <Route path="/trust-academy" element={<TrustAcademyPage />} />
              <Route path="/apex" element={<ApexCollegePage />} />
              <Route path="/apex-college" element={<ApexCollegePage />} />
              <Route path="/apexcollege" element={<ApexCollegePage />} />
              <Route path="/refaq" element={<RefaqAcademyPage />} />
              <Route path="/refaq-academy" element={<RefaqAcademyPage />} />
              <Route path="/alrefaq" element={<RefaqAcademyPage />} />
              <Route path="/al-refaq" element={<RefaqAcademyPage />} />
              <Route path="/discounts" element={<DiscountsPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/form-extraction" element={<FormExtraction />} />
              <Route path="/form-extraction-guide" element={<FormExtractionGuide />} />
              <Route path="/form-extraction/guide" element={<FormExtractionGuide />} />
              <Route path="/sales-portal" element={<SalesPortal />} />
              <Route path="/sales-portal/:agentSlug" element={<SalesPortal />} />
              <Route path="/rep/:agentSlug" element={<SalesPortal />} />
              <Route path="/sales/:agentSlug" element={<SalesPortal />} />
              <Route path="/academy-portal" element={<AcademyPortal />} />
              <Route path="/academy-portal/:academySlug" element={<AcademyPortal />} />
              <Route path="/academy/:academySlug" element={<AcademyPortal />} />
              <Route path="/academies-master" element={<AcademyPortal />} />
              <Route path="/academies" element={<AcademyPortal />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>

      {showFooter && <Footer />}
      
      {/* Real-time live enrollment popups */}
      <RealtimeNotificationToast />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}
