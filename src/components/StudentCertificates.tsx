import React, { useState } from "react";
import { Award, ShieldAlert, Check, AlertTriangle, Milestone, Landmark, Info, FileBadge, CalendarCheck, Camera, Compass, Users } from "lucide-react";

interface StudentCertificatesProps {
  onNavigateToBooking?: () => void;
}

export function StudentCertificates({ onNavigateToBooking }: StudentCertificatesProps) {
  const [galleryFilter, setGalleryFilter] = useState("all");

  const galleryItems = [
    {
      id: 1,
      title: "ممر الشرف العسكري واستقبال دفعة الملاحة البحرية والأكاديمية 🎉",
      category: "parties",
      description: "لقطة حية فريدة لمرور الطلاب المهيب بالبدلات البيضاء الناصعة وقبعات الكاپتن تحت قوس البالونات الاحتفالي المصمم خصيصاً لاستقبال الطلاب الجدد بمرافقة المنظمين.",
      imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 2,
      title: "طابور العرض الرسمي والانضباط العسكري لطلبة الأكاديمية ⚓",
      category: "parties",
      description: "خطوات ثابتة تعكس أعلى مستويات الهيبة والجدية والانضباط، حيث يصطف الطلاب والطالبات بالزي الرسمي العسكري الأبيض المتكامل في طابور مهيب.",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 3,
      title: "التدريب الميداني والعملي لطلاب شعبة المساحة بالموقع المفتوح 🛠️",
      category: "trainings",
      description: "صورة واقعية لطلاب قسم المساحة بهندسة المواقع يرتدون السترات الخضراء والصفراء العاكسة والخوذات الواقية بجانب شاحنة ومعدات الحفر والتنقيب الثقيلة، والتعلم التجريبي الحي.",
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 4,
      title: "المؤتمر التوجيهي الكبير واستقبال عائلات الطلاب في المسرح الرئيسي 🏛️",
      category: "parties",
      description: "صورة مذهلة للمدرج الأكاديمي التاريخي وقاعة الاحتفالات الكبرى تضج بالحياة وممتلئة بالكامل بالطلاب وأولياء الأمور المهتمين بحضور انطلاقة المهرجان السنوي.",
      imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 5,
      title: "المرح والأنشطة الترفيهية والتمارين الرياضية بالهواء الطلق وحمام السباحة 🏊‍♂️",
      category: "trips",
      description: "تغطية ممتازة مدمجة من رحلتنا الترفيهية: يظهر الطلاب في الجزء العلوي يستمتعون بالسباحة والأنشطة المائية، والجزء السفلي يوثق تجمع الطالبات بالزي الرياضي الموحد لإجراء تدريبات الإحماء واليوجا في بيئة طبيعية خضراء.",
      imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 6,
      title: "طالبات شعبة الضيافة والملاحة الجوية بالبدل الأنيقة ورموز الهوية ✈️",
      category: "trainings",
      description: "صورة جماعية مميزة لطالبات قسم الملاحة الجوية والضيافة يرتدين الزي الأسود الأنيق والرابطة المتناسقة أمام الأعلام والرايات في صالة المحاكاة المرموقة.",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 7,
      title: "محاضرة نظم الضيافة وهيكل الطائرات لطلبة الطيران 🛩️",
      category: "trainings",
      description: "التواجد داخل الفصول الذكية، حيث يتلقى الطلاب في كامل زيهم الموحد الشرح التفصيلي لأسس ومبادئ سلامة الركاب وفنيات الخدمة الأرضية والملاحة.",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 8,
      title: "التدريب العملي السريري وعلوم التمريض والمختبرات في المدرج الطبي 🔬",
      category: "trainings",
      description: "محاضرة تطبيقية تفاعلية بمشاركة واسعة لطلبة الخدمات الطبية العاجلة والتحاليل في المدرج بملابس العمل والبالطو الأبيض لتعلم أسرار الإنعاش والإسعاف السريع.",
      imageUrl: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 9,
      title: "شرح تفاعلي لمجسمات المطارات ومدرجات الهبوط اللوجستية 📐",
      category: "trainings",
      description: "العمل اليدوي والتطبيقي الرائع: يقوم الطلاب بمراجعة تفاصيل تخطيط المطارات وممرات الطيران باستخدام مجسمات ثلاثية الأبعاد وعربات مدرج لثقل قدراتهم التخطيطية.",
      imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 10,
      title: "الحفل الأكاديمي وتكريم المتفوقين في المسرح الخشبي الفسيح 🏆",
      category: "parties",
      description: "اللقطة الأيقونية لتكريم الخريجين وتسليم دروع التفوق بحضور حاشد يملأ الأركان والمدرجات في أجواء الفخر والإنجاز.",
      imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    }
  ];

  const filteredItems = galleryFilter === "all"
    ? galleryItems
    : galleryItems.filter(item => item.category === galleryFilter);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-8" id="certificates-wrapper" dir="rtl">
      {/* Top Graphic Line with warning & award colors */}
      <div className="h-2 bg-gradient-to-r from-brand-gold via-brand-navy to-brand-coral"></div>

      <div className="p-6 md:p-8 space-y-6 text-right">
        {/* Title */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-gold to-brand-navy text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-6 h-6 text-brand-gold" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-slate-900 font-sans">
              الشهادات والاعتمادات والامتيازات القانونية 🎓
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              المرجع الرسمي لتوضيح الموقف والاعتمادات لطلبتنا وأولياء الأمور للشفافية المطلقة
            </p>
          </div>
        </div>

        {/* 1. CRITICAL NOTICE: Ministry & Supreme Council Affiliation Breakdown */}
        <div className="p-6 bg-red-50/75 border-r-4 border-red-555 rounded-l-xl space-y-3" id="affiliation-warning-container">
          <div className="flex items-center gap-2.5 text-red-800">
            <Landmark className="w-6 h-6 shrink-0" />
            <h4 className="font-extrabold text-base md:text-lg">
              توضيح وإقرار قانوني هام جداً للكل:
            </h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed font-semibold">
            جميع البرامج التعليمية، الأكاديميات، والتخصصات المدرجة في هذه البوابة <span className="text-red-750 font-extrabold underline">غير خاضعة للتعليم العالي المصري</span> و <span className="text-red-750 font-extrabold underline">لا تتبع المجلس الأعلى للجامعات المصرية</span>.
          </p>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • الدراسة بهذه البرامج هي دراسة **مهنية، تطبيقية، وتدريبية بحتة** تهدف فقط لتأهيل الطلاب لسوق العمل واكتساب المهارات اليدوية والتقنية اللازمة للتوظيف في الشركات أو العيادات أو المعامل الخاصة.
            </p>
            <p>
              • لا تمنح هذه المعاهد والأكاديميات تخصصات أكاديمية معادلة لدرجة البكالوريوس أو الليسانس أو الدبلوم الأكاديمي الصادر عن الجامعات الحكومية الخاضعة للمجلس الأعلى للجامعات.
            </p>
          </div>
        </div>

        {/* Required Documents Section for Batch 2026 */}
        <div className="p-6 bg-amber-50/40 border-r-4 border-amber-500 rounded-l-xl space-y-4" id="required-documents-batch-2026">
          <div className="flex items-center gap-2.5 text-amber-900">
            <FileBadge className="w-6 h-6 shrink-0 text-amber-655 animate-pulse" />
            <h4 className="font-extrabold text-base md:text-lg">
              الأوراق والمستندات المطلوبة للعرض على الأكاديمية (دفعة 2026):
            </h4>
          </div>
          <p className="text-xs text-slate-700 font-bold leading-normal">
            يرجى تجهيز وحيازة المستندات التالية عند التقديم والقبول بالملف لدفعة عام 2026:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <span className="text-xs font-bold text-slate-800">صورة من شهادة ميلاد الطالب / الطالبة</span>
            </div>
            
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span className="text-xs font-bold text-slate-800">صورة من البطاقة الشخصية للطالب</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 font-sans">3</span>
              <span className="text-xs font-bold text-slate-800">صورة من بطاقة ولي الأمر (الأب / الأم)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 font-sans">4</span>
              <span className="text-xs font-bold text-slate-800">أربع صور شخصية مكتوب عليها اسم الطالب/ة</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 font-sans">5</span>
              <span className="text-xs font-bold text-slate-800">صورة من الشهادة المؤهلة (الشهادة الإعدادية، الدبلوم، الثانوية، إلخ)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 font-sans">6</span>
              <span className="text-xs font-bold text-slate-800">دوسيه أبيض شفاف</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 text-emerald-850 rounded-xl border border-emerald-100 text-xs font-semibold leading-relaxed space-y-1.5">
            <p className="font-extrabold text-emerald-900">🔔 الملاحظات التنظيمية والمالية الهامة:</p>
            <p>• يتم إبلاغك وتبليغ ولي الأمر من قبل **خدمة العملاء المتعلقة بالمصاريف**.</p>
            <p>• تشمل الإجراءات: **فتح الملف وتأكيد التقديم وحجز مقعد وطباعة الكتب الخاصة بالطالب** لضمان الجاهزية التامة طوال فترة دراستك.</p>
          </div>
        </div>

        {/* 2. GOVERNMENT ACCREDITATIONS & GOLD STAMP INFO PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="official-stamps-highlights">
          
          {/* Government University Stamp Box */}
          <div className="p-5 rounded-2xl bg-[#fffdf0] border-2 border-emerald-500/30 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">اعتماد جامعة حكومية + ختم النسر 🦅</h4>
                <span className="inline-block text-[11px] text-emerald-800 font-extrabold bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200 mt-0.5">
                  معتمد مع ختم النسر الرسمي
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-bold">
              نؤكد لجميع طلابنا الأعزاء أن الشهادة المهنية التي يستلمها الخريج{" "}
              <strong className="text-emerald-900 font-black text-xs sm:text-sm block mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-right leading-relaxed shadow-3xs">
                معتمدة بالكامل من جامعة حكومية مصرية وعليها ختم النسر الرسمي للجمهورية 🦅
              </strong>
              ، مما يعكس قوتها المعنوية والمهنية للتوظيف الفوري.
            </p>
          </div>

          {/* Ministry of Foreign Affairs Attestation option */}
          <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200/95 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
                <Landmark className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">توثيق الخارجية المصرية 🏛️</h4>
                <p className="text-[10px] text-sky-800 font-bold">متاح رسمياً للراغبين بالسفر</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              لمن يود السفر للعمل بالخارج، <strong className="text-sky-900 block mt-1">يتوفر خيار توثيق وتصديق الشهادة من وزارة الخارجية المصرية بصفة رسمية وتكلفة مالية إضافية</strong> (تُدفع كرسوم تصديق إدارية خاصة بالجهات المختصة).
            </p>
          </div>

          {/* Tuition & Financial Expenses Card */}
          <div className="p-5 rounded-2xl bg-emerald-50/75 border border-emerald-250 shadow-xs space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm md:text-base text-slate-900">المصروفات والرسوم الدراسية الميسرة وعروض الخصومات الرسمية 💰</h4>
                <p className="text-[11px] text-emerald-800 font-bold">نظام دفع مرن وودود لتيسير المستقبل لشبابنا</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: Annual Fees */}
              <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-700 font-extrabold block">💵 الرسوم الدراسية المعتمدة:</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  تتراوح المصروفات السنوية المعتمدة لكافة تخصصات المعاهد والأكاديميات من <strong className="text-emerald-700 font-extrabold text-sm underline">10 آلاف إلى 17 ألف جنيه مصري فقط في السنة</strong> (حسب القسم المختار، شاملة جميع المختبرات والنزول الميداني).
                </p>
              </div>

              {/* Box 2: Current Discount Programs */}
              <div className="p-3 bg-amber-500/5 border border-amber-200 rounded-xl space-y-1">
                <span className="text-[10px] text-amber-700 font-extrabold block">🔥 خصومات دفعة العام الجديد حالياً:</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  متاح حالياً خصم حصري معتمد يبدأ من <strong className="text-amber-700 font-extrabold text-sm">2,000 جنيه مصري ويصل حتى 6,000 جنيه مصري كاملة</strong> عند إتمام الحجز المبدئي وتأكيد الملف اليوم.
                </p>
                <div className="text-[9px] text-amber-600 font-bold bg-white px-2 py-0.5 rounded border border-amber-100 w-fit">
                  متاحة للتقديم المبكر حالياً ✓
                </div>
              </div>

              {/* Box 3: Payment modes (Cash & Installment Plans) */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-150 rounded-xl space-y-1">
                <span className="text-[10px] text-indigo-700 font-extrabold block">💳 خصومات الكاش ونظام التقسيط المريح:</span>
                <div className="text-xs text-slate-700 leading-relaxed space-y-1 pt-0.5">
                  <p>• **خصم مميز وخاص جداً في حالة الدفع كاش** بالكامل.</p>
                  <p>• **نظام التقسيط**: متاح التقسيط المريح بصورة **كل شهر** أو بصورة **كل تيرم دبلوم** تيسيراً لظروف الطلاب المادية، وذلك بعد التنسيق والاتفاق مع الإدارة المعنية.</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center text-center sm:text-right shadow-xs gap-2 border border-emerald-100/40">
              <span className="text-[11px] text-emerald-800 font-extrabold">شعارنا الأولوية لمستقبل الطالب: دراسة مهنية متميزة وتوفير مالي حقيقي وبنزاهة تامة</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigateToBooking) {
                    onNavigateToBooking();
                  } else {
                    const el = document.getElementById("booking-form-wrapper");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition cursor-pointer"
              >
                احجز الآن مستفيداً بالخصم والتقسيط 🏷️
              </button>
            </div>
          </div>

          {/* Co-curricular/Students Life and Extracurricular Welcomes */}
          <div className="p-5 rounded-2xl bg-[#fffcf0] border border-amber-200/60 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">حفلات استقبال وفعاليات حية للطلبة 🎉</h4>
                <p className="text-[10px] text-amber-800 font-bold">بناء بيئة جامعية دافئة</p>
              </div>
            </div>
            <p className="text-xs text-slate-755 leading-relaxed font-medium">
              نؤمن بأهمية الجانب النفسي للطلاب، لذلك نقوم بتنظيم <strong className="text-amber-800 block mt-1">حفلات استقبال ترحيبية ضخمة للطلبة الجدد مع بداية كل موسم دراسي</strong> بهدف كسر حواجز الرهبة، وتعديل العلاقات الاجتماعية بين الطلاب والدكاترة، بالإضافة لرحلات ترفيهية دورية ممتعة.
            </p>
          </div>

          {/* Plentiful Supporting Short Courses */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/65 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-550/10 text-indigo-600 flex items-center justify-center shrink-0">
                <FileBadge className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">عرض الدورات الإضافية والورش المجانية 🚀</h4>
                <p className="text-[10px] text-indigo-800 font-bold">دورات مكملة وداعمة مجاناً طوال العام</p>
              </div>
            </div>
            <p className="text-xs text-slate-755 leading-relaxed font-semibold">
              يحصل الطلاب الملتحقون بالتخصصات على <strong className="text-indigo-900 block mt-1">باقة من الدورات المهنية الموازية (كورسات مكثفة في اللغات، الحاسب الآلي، برمجيات المبيعات، والإسعافات الأولية)</strong>، وهي مدمجة داخل الخطة ومقدمة لدعم جودة سيرتك الذاتية في التوظيف مجاناً وبلا رسوم دراسية إضافية!
            </p>
          </div>

        </div>

        {/* 3. Educational & Personal Certification list */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-900 text-md flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-brand-navy" />
            <span>الشهادات والمستندات المهنية التي يحصل عليها الطالب:</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="certificates-cards-grid">
            
            {/* Certificate Card 1 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-navy/20 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center">
                <Award className="w-5 h-5 text-brand-gold" />
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">شهادة الدبلوم التدريبي المعتمد</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                الشهادة المهنية النهائية الصادرة باعتماد الجامعة الحكومية وممهورة بختم النسر لإبراز الكفاءة والمهارة الفنية.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-brand-navy bg-white px-2 py-1 rounded w-fit border border-slate-100">
                <span>معتمدة بختم النسر</span>
              </div>
            </div>

            {/* Certificate Card 2 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-navy/20 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-turquoise/10 text-brand-navy flex items-center justify-center">
                <Milestone className="w-5 h-5 text-brand-turquoise" />
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">شهادة تدريب وخبرة عملية ميدانية</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                شهادة تثبت مشاركتك في النزول الميداني التطبيقي طوال شهور الدراسة بالمستشفيات، معامل التحاليل، أو الورش الفنية الشريكة.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-white px-2 py-1 rounded w-fit border border-slate-100">
                <span>إثبات تدريب ميداني حقيقي</span>
              </div>
            </div>

            {/* Certificate Card 3 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-navy/20 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                <FileBadge className="w-5 h-5 text-brand-coral" />
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">بيان درجات المهارات والإنجاز الفعلي</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                ملحق تقييمي يوضح كشفا دقيقا بالمهارات العملية التي يتقنها الطالب بنجاح، لتقديمها كملف ثبوتي عند التقديم لأي جهة توظيف.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-white px-2 py-1 rounded w-fit border border-slate-100">
                <span>السيرة الذاتية المدعمة</span>
              </div>
            </div>

            {/* Certificate Card 4 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-navy/20 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">كارنيه العضوية والانتساب للأكاديمية</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                بطاقة الدخول الرسمية والانتساب للطالب، لتنظيم الدخول وتأكيد تواجده في غرف المحاضرات والمختبرات طوال مدة البرنامج.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-white px-2 py-1 rounded w-fit border border-slate-100">
                <span>كارنيه معتمد</span>
              </div>
            </div>

          </div>
        </div>

        {/* 4. MILITARY SERVICE POSTPONEMENT SECTION */}
        <div className="p-6 bg-brand-navy/5 border-r-4 border-brand-navy rounded-l-xl space-y-4" id="military-postponement-info">
          
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-brand-navy">
              <CalendarCheck className="w-6 h-6 text-brand-coral shrink-0" />
              <h4 className="font-extrabold text-base md:text-lg">
                تأجيل التجنيد والخدمة العسكرية للطلاب (هام) 🪖
              </h4>
            </div>
            <span className="bg-brand-coral text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              خيار متاح للراغبين
            </span>
          </div>

          <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
            إيماناً منا بضرورة تيسير الظروف لطلبتنا لاستكمال دراستهم التطبيقية، <strong className="text-brand-navy">يتوفر خيار تأجيل التجنيد العسكري</strong> للطلاب الذكور الراغبين في ذلك، والذين ينطبق عليهم السن والضوابط القانونية.
          </p>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-coral shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-slate-600 space-y-1.5 text-right">
              <p className="font-bold text-slate-800">تفاصيل وتكاليف الخدمة:</p>
              <p>
                يخضع تأجيل التجنيد لـ **سداد رسوم إضافية تفرضها العيادات والمعاهد بصفة إدارية وتنظيمية** لتجهيز المستندات الرسمية المعتمدة ودفاتر استمارات التأجيل وربطها مع الجهات المعنية لتأمين تأجيل التجنيد القانوني للطالب طوال سنين دراسته.
              </p>
            </div>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-500 font-sans">
              * يرجى إبداء رغبتك في تأجيل التجنيد لمندوب التسجيل عند تواصله الهاتفي المباشر لإنهاء الشروط.
            </p>
            <a
              href="#booking-form-wrapper"
              className="w-full sm:w-auto px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold rounded-xl text-center cursor-pointer transition focus:outline-none"
            >
              احجز مقعدك واطلب تأجيل التجنيد الآن
            </a>
          </div>

        </div>

        {/* 5. LIVE STUDENT ACTIVITIES GALLERY */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand-coral animate-pulse" />
                <span>معرض الأنشطة الطلابية والرحلات والتدريبات الحية لحفلات استقبال وبداية العام الدراسي 📸</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                تغطية مصورة حقيقية من نبض الحياة الطلابية لفعاليات حفلات الاستقبال والنزول الميداني بالمستشفيات والمواقع والرحلات الترفيهية
              </p>
            </div>

            {/* Gallery Category Filter Switches */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit shrink-0">
              <button
                onClick={() => setGalleryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  galleryFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:bg-white/50"
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setGalleryFilter("parties")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  galleryFilter === "parties" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:bg-white/50"
                }`}
              >
                🎉 استقبال الطلبة
              </button>
              <button
                onClick={() => setGalleryFilter("trips")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  galleryFilter === "trips" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:bg-white/50"
                }`}
              >
                🏖️ رحلات ومصايف
              </button>
              <button
                onClick={() => setGalleryFilter("trainings")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  galleryFilter === "trainings" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:bg-white/50"
                }`}
              >
                🔬 تدريبات وتدشين
              </button>
            </div>
          </div>

          {/* Gallery Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col hover:-translate-y-0.5"
              >
                {/* Image Wrap */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-200">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full">
                    {item.category === "parties" ? "🎉 حفل استقبال" : item.category === "trips" ? "🏖️ رحلة ترفيهية" : "🔬 تدريب ميداني"}
                  </div>
                </div>

                {/* Content info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2 text-right">
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-slate-900 text-xs md:text-sm line-clamp-1 group-hover:text-brand-coral transition-colors">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-normal font-sans line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>تفاعلي 100%</span>
                    </span>
                    <span className="text-brand-navy">تصوير دفعة المعهد المعتمدة ✓</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Practical Checklist for the Student and Guardian */}
        <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-emerald-800">قواعد الاستحقاق المهني:</p>
            <p>
              يطلب من الطلاب الحضور الفعلي والملتزم بالمعامل والمواقع للحصول على شهادات الخبرة. الأكاديمية تركز على جعل السيرة الذاتية الخاصة بك مبهرة للعمل مباشرة دون عثرات وبمصداقية واقعية 100%.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
