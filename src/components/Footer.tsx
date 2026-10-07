import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Facebook,
  Instagram,
  Mail,
  ShieldCheck,
  Award,
  Lock,
  X,
  Check,
  ShieldAlert,
  Code2,
  TrendingUp,
  Copy,
  ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";
import DeveloperFeederModal from "./DeveloperFeederModal";

export default function Footer() {
  const navigate = useNavigate();
  const [flagClicks, setFlagClicks] = useState(0);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Developer Easter Egg (5 clicks on Developer badge)
  const [devClicks, setDevClicks] = useState(0);
  const [isDevPromptOpen, setIsDevPromptOpen] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState("");
  const [devPasswordError, setDevPasswordError] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  const officialEmail = "almahdwalakadymyatalkhash@gmail.com";

  const handleFlagClick = () => {
    setFlagClicks((prev) => {
      const nextClicks = prev + 1;
      if (nextClicks >= 3) {
        setIsAdminPasswordModalOpen(true);
        setAdminPasswordInput("");
        setPasswordError(false);
        return 0;
      }
      return nextClicks;
    });
  };

  const handleVerifyPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput.trim() === "admin123") {
      setPasswordError(false);
      setIsAdminPasswordModalOpen(false);
      setAdminPasswordInput("");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("admin_authenticated", "true");
      }
      navigate("/admin");
    } else {
      setPasswordError(true);
      setFlagClicks(0);
    }
  };

  const handleDevBadgeClick = () => {
    setDevClicks((prev) => {
      const nextClicks = prev + 1;
      if (nextClicks >= 5) {
        setIsDevPromptOpen(true);
        setDevPasswordInput("");
        setDevPasswordError(false);
        return 0;
      }
      return nextClicks;
    });
  };

  const handleVerifyDevPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasswordInput.trim() === "Mm151997") {
      setDevPasswordError(false);
      setIsDevPromptOpen(false);
      setDevPasswordInput("");
      setIsDevModalOpen(true);
    } else {
      setDevPasswordError(true);
      setDevClicks(0);
    }
  };

  const handleComplaintClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/complaints");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenGmail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // 1. Copy email to clipboard
    try {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(officialEmail);
      }
    } catch (err) {
      console.warn("Clipboard access:", err);
    }

    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);

    toast.success("تم نسخ البريد الإلكتروني وجاري فتح Gmail ✉️", {
      duration: 3500,
      icon: "📧",
      style: {
        background: "#0f172a",
        color: "#f8fafc",
        border: "1px solid #334155",
        fontSize: "13px",
        fontWeight: "bold",
        direction: "rtl"
      }
    });

    // 2. Open Gmail Web compose direct URL
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(officialEmail)}&su=${encodeURIComponent("استفسار بخصوص بوابة المعاهد والأكاديميات")}`;
    
    const win = window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      // Fallback to mailto if browser popups blocked
      window.location.href = `mailto:${officialEmail}?subject=${encodeURIComponent("استفسار بخصوص بوابة المعاهد والأكاديميات")}`;
    }
  };

  const handleCopyEmailOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(officialEmail);
      }
    } catch (err) {
      console.warn("Clipboard access:", err);
    }
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);
    toast.success("تم نسخ البريد الإلكتروني بنجاح!", {
      duration: 2500,
      icon: "📋",
      style: {
        background: "#0f172a",
        color: "#f8fafc",
        border: "1px solid #334155",
        fontSize: "13px",
        direction: "rtl"
      }
    });
  };

  return (
    <div className="font-sans" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. PRE-FOOTER SECTION: الاعتماد والجودة + الشعار الوطني + التنبيه القانوني */}
      {/* ========================================================================= */}
      <section className="relative bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100 border-t border-slate-200/80 py-8 px-4 md:px-8 text-slate-800 overflow-hidden">
        {/* Ambient subtle light glows */}
        <div className="absolute -top-24 right-10 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-10 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto space-y-5">
          
          {/* Top Row: الاعتماد والجودة والأمان & الشعار الوطني ومصر 2030 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            
            {/* بطاقة الاعتماد والجودة والأمان */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="w-2 h-4 bg-emerald-500 rounded-full inline-block shadow-xs" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">الاعتماد والجودة والأمان</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                <div className="flex items-start gap-2.5 bg-slate-50/90 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200/70 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">خصوصية وسرية البيانات 🔒</strong>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed mt-1">
                      سجلات التسجيل وأرقام هواتف الطلاب مشفرة تماماً ومحمية بأعلى معايير الخصوصية.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50/90 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200/70 transition-colors">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">معايير الدقة والنزاهة</strong>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed mt-1">
                      توجيه أكاديمي بمصداقية لربط الطلاب بالمقاعد والشعب الفعلية المعتمدة دون مغالطات.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* بطاقة الشعار الوطني ورؤية مصر 2030 */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-all duration-300">
              <div 
                onClick={handleFlagClick}
                className="flex items-center gap-3 cursor-pointer select-none group/flag border-b border-slate-100 pb-2.5 transition-colors"
                title="جمهورية مصر العربية 🇪🇬"
              >
                {/* علم مصر الحقيقي */}
                <div className="flex flex-col w-9 h-6 border border-slate-300 overflow-hidden rounded shrink-0 shadow-xs group-hover/flag:scale-105 transition-transform duration-200">
                  <div className="bg-[#FF0000] h-1/3"></div>
                  <div className="bg-white h-1/3 flex items-center justify-center relative">
                    <span className="text-[6px] text-amber-600 absolute select-none leading-none">🦅</span>
                  </div>
                  <div className="bg-[#000000] h-1/3"></div>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight group-hover/flag:text-amber-600 transition-colors">
                    جمهورية مصر العربية
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    تحت مظلة رعاية الكفاءات الشابة وتمكين رغبات التعليم والمهارات الوطنية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-amber-50/60 hover:bg-amber-50/90 p-3 rounded-xl border border-amber-200/60 transition-colors">
                <span className="bg-amber-500/15 text-amber-800 px-2.5 py-1 rounded-lg text-[9.5px] font-black border border-amber-300/80 shrink-0">
                  رؤية مصر ٢٠٣٠ 🇪🇬✨
                </span>
                <p className="text-[10.5px] text-slate-700 leading-relaxed">
                  ندعم جهود الدولة الاستباقية لتنمية مهارات الكوادر الواعدة وتمكين التكنولوجيا لبناء الجمهورية الجديدة.
                </p>
              </div>
            </div>

          </div>

          {/* التنبيه القانوني */}
          <div className="bg-white/90 backdrop-blur-xl border border-amber-200/80 rounded-xl p-3.5 sm:p-4 text-center text-slate-600 text-[11px] leading-relaxed shadow-2xs">
            <span className="font-bold text-amber-700 ml-1">تنبيه قانوني:</span>
            المنصة عبارة عن بوابة تدريبية مهنية خاصة معتمدة لتقديم برامج ودبلومات تدريبية وعملية لتأهيل الطلاب لسوق العمل والتوظيف، وليست منشأة تعليمية أكاديمية تابعة لوزارة التعليم العالي والبحث العلمي ولا تخضع لنظام التنسيق الجامعي الحكومي. الشهادات الممنوحة هي شهادات تدريب مهني وخبرة عملية معتمدة.
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN STREAMLINED FOOTER: الفوتر المدمج والمنظم بدون زحمة               */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 text-white pt-10 pb-6 px-4 md:px-8 border-t border-amber-500/40">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Main Grid: 3 Clean Balanced Columns (About on Right, Quick Links in Middle, Contact on Left) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 text-right items-start">
            
            {/* Column 1: About Portal (Right in RTL - 5 cols) */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  className="h-10 w-10 object-cover rounded-full bg-white border border-slate-800 shadow shrink-0" 
                  alt="بوابة المعاهد والأكاديميات" 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight">بوابة المعاهد والأكاديميات</h3>
                  <p className="text-[10px] text-amber-400 font-extrabold tracking-wider leading-none mt-1">المنصة الشريكة للتوجيه الذكي</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                خبرة متراكمة وشراكات أكاديمية وتدريبية راسخة لمساندة الطلاب وأولياء الأمور في توجيه رغباتهم وحجز مقاعدهم بالقبول المباشر.
              </p>
              
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>مظلة استشارية معتمدة ومستقلة</span>
                </span>
              </div>
            </div>

            {/* Column 2: Quick Links (Middle - 3 cols) */}
            <div className="md:col-span-3 space-y-2.5">
              <h4 className="text-xs sm:text-sm font-black text-white border-r-3 border-amber-500 pr-2">روابط سريعة</h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link 
                    to="/" 
                    className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>الرئيسية</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/departments" 
                    className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>الأقسام والتخصصات</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/about" 
                    className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>عن البوابة</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/privacy" 
                    className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>سياسة الخصوصية</span>
                  </Link>
                </li>
                <li>
                  <a 
                    href="/complaints" 
                    onClick={handleComplaintClick}
                    className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>الشكاوى والمقترحات</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact & Channels (Left in RTL - 4 cols) */}
            <div className="md:col-span-4 space-y-2.5">
              <h4 className="text-xs sm:text-sm font-black text-white border-r-3 border-amber-500 pr-2">تواصل معنا والدعم</h4>
              <p className="text-[11px] text-slate-400">تابع قنواتنا الرسمية أو راسل فريق الدعم:</p>
              
              {/* Circular Social Icons */}
              <div className="flex items-center gap-2.5 pt-0.5">
                {/* Facebook */}
                <a 
                  href="https://www.facebook.com/Privateinstitutesandacademies1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="صفحة الفيسبوك الرسمية"
                  title="صفحة الفيسبوك الرسمية"
                  className="w-9 h-9 rounded-full bg-blue-600/10 hover:bg-blue-600 border border-blue-500/25 flex items-center justify-center text-blue-400 hover:text-white transition-all transform hover:scale-110 shadow-sm cursor-pointer"
                >
                  <Facebook className="w-4 h-4" />
                </a>

                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/private_institutes_and_academi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="حساب انستجرام الرسمي"
                  title="حساب انستجرام الرسمي (@private_institutes)"
                  className="w-9 h-9 rounded-full bg-rose-600/10 hover:bg-gradient-to-tr hover:from-amber-600 hover:via-rose-600 hover:to-purple-600 border border-rose-500/25 flex items-center justify-center text-rose-400 hover:text-white transition-all transform hover:scale-110 shadow-sm cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                </a>

                {/* Gmail Direct Action Button */}
                <button 
                  type="button"
                  onClick={handleOpenGmail}
                  aria-label="مراسلة عبر Gmail"
                  title="انقر لفتح بريد Gmail مباشرة ونسخ العنوان"
                  className="w-9 h-9 rounded-full bg-amber-500/15 hover:bg-amber-500 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:text-slate-950 transition-all transform hover:scale-110 shadow-sm cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Email Bar with Direct Gmail Button & Copy */}
              <div className="pt-1">
                <div 
                  onClick={handleOpenGmail}
                  className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-inner"
                  title="انقر لفتح Gmail أو نسخ البريد الإلكتروني"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono text-[10px] text-slate-300 group-hover:text-amber-300 truncate transition-colors">
                      {officialEmail}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyEmailOnly}
                      className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                      title="نسخ البريد الإلكتروني"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Divider */}
          <div className="border-t border-slate-800/80 pt-4 flex flex-col md:flex-row items-center justify-between gap-3.5 text-[11px] text-slate-400 text-center md:text-right">
            
            {/* Copyright Statement */}
            <p className="font-semibold text-slate-400">
              جميع الحقوق محفوظة لبوابة المعاهد والأكاديميات الخاصة © {new Date().getFullYear()}
            </p>
            
            {/* Compact Developer & Supervision Badges (بدون مساحات ضخمة) */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
              
              {/* شريط المطور - مع الحفاظ على ميزة الـ 5 نقرات */}
              <div 
                onClick={handleDevBadgeClick}
                className="inline-flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-amber-500/40 text-[10px] text-slate-300 transition-all cursor-pointer group select-none shadow-xs"
                title="برمجة وتطوير النظام"
              >
                <Code2 className="w-3 h-3 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>برمجة وتطوير: <strong className="text-slate-200 group-hover:text-amber-400 transition-colors">م / محمد ممدوح الروبي</strong></span>
                <span className="text-[8.5px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/20">إدارة النظم</span>
              </div>

              {/* شريط الإشراف والتسويق */}
              <div 
                className="inline-flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-300 shadow-xs"
                title="الإشراف وإستراتيجيات النمو"
              >
                <TrendingUp className="w-3 h-3 text-blue-400" />
                <span>الإشراف والنمو: <strong className="text-slate-200">م / أيمن عبدالرؤوف حسبو</strong></span>
                <span className="text-[8.5px] font-bold text-blue-400 bg-blue-500/15 px-1.5 py-0.2 rounded border border-blue-500/20">مستشار القبول</span>
              </div>

            </div>

          </div>

        </div>
      </footer>

      {/* Admin Password Modal Triggered via Egyptian flag 3 clicks */}
      {isAdminPasswordModalOpen && (
        <div className="fixed inset-0 bg-[#0a2463]/30 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right animate-scale-up">
            
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500 animate-pulse" />
                <h4 className="font-extrabold text-sm text-white">التحقق الثنائي المشدد للإدارة 🔐</h4>
              </div>
              <button
                onClick={() => {
                  setIsAdminPasswordModalOpen(false);
                  setFlagClicks(0);
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleVerifyPasswordSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  بموجب النقر الثلاثي على الرابط السيادي لجمهورية مصر العربية، يرجى تقديم كلمة مرور المشرف العام لتخطي جدار الحماية:
                </p>

                <div>
                  <label htmlFor="admin-pass-input" className="block text-xs font-bold text-slate-700 mb-1.5">أدخل كلمة مرور الإدارة السريّة:</label>
                  <input
                    id="admin-pass-input"
                    type="password"
                    required
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (passwordError) setPasswordError(false);
                    }}
                    placeholder="••••••••"
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/15 focus:outline-none focus:border-slate-800 text-center font-bold tracking-widest text-lg text-slate-800"
                    autoFocus
                  />
                </div>

                {passwordError && (
                  <p className="text-xs text-red-650 font-bold bg-red-50 p-2.5 rounded-lg border border-red-250 flex items-center gap-1.5 animate-bounce text-red-600">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>كلمة المرور خاطئة، حاول مرة أخرى!</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>تأكيد الهوية وتخطي بوابات الحماية 🔓</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Developer Master Password Modal (5 clicks on Developer badge) */}
      {isDevPromptOpen && (
        <div className="fixed inset-0 bg-[#0a2463]/30 backdrop-blur-md z-[210] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right animate-scale-up">
            
            <div className="bg-[#0a2463] p-5 text-white flex justify-between items-center border-b border-indigo-950">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500 animate-pulse" />
                <h4 className="font-extrabold text-sm text-white">بوابة التحقق من المطور السريّة 🥇</h4>
              </div>
              <button
                onClick={() => {
                  setIsDevPromptOpen(false);
                  setDevClicks(0);
                }}
                className="text-slate-355 hover:text-white transition-all cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleVerifyDevPasswordSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  بموجب النقر الخماسي على شريط التميز والإدارة البرمجية، يرجى تقديم الرمز السري الرئيسي لتغذية النظام (System Feeder):
                </p>

                <div>
                  <label htmlFor="dev-pass-input" className="block text-xs font-bold text-slate-700 mb-1.5">أدخل رمز تفويض المطور الأكبر:</label>
                  <input
                    id="dev-pass-input"
                    type="password"
                    required
                    value={devPasswordInput}
                    onChange={(e) => {
                      setDevPasswordInput(e.target.value);
                      if (devPasswordError) setDevPasswordError(false);
                    }}
                    placeholder="••••••••"
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:outline-none focus:border-slate-800 text-center font-bold tracking-widest text-lg text-slate-900"
                    autoFocus
                  />
                </div>

                {devPasswordError && (
                  <p className="text-xs text-red-650 font-bold bg-red-50 p-2.5 rounded-lg border border-red-250 flex items-center gap-1.5 animate-bounce text-red-600">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>الرمز البرمجي خاطئ! تم إلغاء التفويض الأمني.</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0a2463] hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-indigo-950"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>تأكيد الهوية البرمجية لفك القفل 🔓</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Developer Feeder Master Modal */}
      <DeveloperFeederModal 
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
    </div>
  );
}
