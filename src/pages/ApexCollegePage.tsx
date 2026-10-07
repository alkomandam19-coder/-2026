import React, { useState, useEffect } from "react";
import { 
  Building2, 
  GraduationCap, 
  Award, 
  BookOpen, 
  Sparkles, 
  Share2, 
  Ticket
} from "lucide-react";
import { 
  Branch 
} from "../data/branchesData";
import { 
  Specialization, 
  AccreditationItem, 
  StudySystemItem 
} from "../data/academyPortalData";
import { PortalTabsNav, TabItem } from "../components/portal/PortalTabsNav";
import { BranchesListView } from "../components/portal/BranchesListView";
import { SpecializationsView } from "../components/portal/SpecializationsView";
import { AccreditationsView } from "../components/portal/AccreditationsView";
import { StudySystemView } from "../components/portal/StudySystemView";
import { DeveloperCreditFooter } from "../components/portal/DeveloperCreditFooter";
import { AcademyAdminDashboardModal } from "../components/portal/AcademyAdminDashboardModal";
import { AcademyRegistrationModal } from "../components/portal/AcademyRegistrationModal";
import { 
  AuthModal, 
  BranchFormModal,
  SpecializationFormModal, 
  AccreditationFormModal, 
  StudySystemFormModal, 
  DeleteConfirmModal 
} from "../components/portal/PortalModals";
import { saveSiteConfig, syncAllConfigsFromDatabase } from "../utils/configSync";
import toast from "react-hot-toast";

const APEX_BRANCHES_KEY = "apex_college_branches_data_v2";
const APEX_SPECS_KEY = "apex_college_specs_data_v2";
const APEX_ACCS_KEY = "apex_college_accs_data_v2";
const APEX_STUDY_KEY = "apex_college_study_data_v2";

const DEFAULT_APEX_ACCS: AccreditationItem[] = [
  {
    id: "acc_apex_cairo_1",
    title: "شهادة معتمدة من جامعة حكومية وموثقة بختم النسر والخارجية المصرية",
    grantingBody: "الجامعات الحكومية المصرية / وزارة الخارجية / وزارة العمل",
    certificateType: "شهادة دبلومة تدريبية وتطبيقية معتمدة + بيان درجات",
    authenticationDetails: "بختم النسر وقابلة للتوثيق المباشر من وزارة الخارجية المصرية لتغيير المسمى والسفر للخارج",
    benefits: [
      "شهادة معتمدة من جامعة حكومية مصرية ومعها بيان درجات معتمد",
      "إمكانية توثيق الشهادة من وزارة الخارجية المصرية للسفر والعمل بالخارج",
      "استخراج كارنيه النقابة والوزارة لتغيير المسمى الوظيفي في بطاقة الرقم القومي",
      "شهادة قياس مستوى المهارة وترخيص مزاولة المهنة",
      "إمكانية تأجيل التجنيد للطلاب المستحقين قانوناً وفقاً للقواعد الرسمية",
      "تدريب عملي تطبيقي وميداني في كبرى المستشفيات والمعامل والمواقع الهندسية"
    ],
    notes: "اعتمادات وتراخيص رسمية لكافة الأقسام والتخصصات بالفروع"
  }
];

const DEFAULT_APEX_STUDY: StudySystemItem[] = [
  {
    id: "study_apex_system_1",
    title: "📚 نظام الدراسة والتدريب العملي",
    type: "attendance",
    description: "سنتان دراسيتان مكثفتان (من 12 إلى 14 شهراً) مقسمة على 4 فصول دراسية تجمع بين الشق النظري والتطبيق العملي، بالإضافة إلى فترة تدريب عملي بالمستشفيات والمعامل والشركات المتخصصة.",
    details: [
      "نظام دراسة مكثف وعملي مرن يناسب جميع الطلاب",
      "تدريب عملي سريري وميداني داخل المستشفيات والمعامل والمواقع الميدانية",
      "فرع الجيزة: 15 ألف للسنتين (ما عدا المساحة 18 ألف، واللاسلكي 17 ألف)",
      "فرع الإسكندرية: 16.500 للسنتين (المساحة بالإسكندرية ليس لها تكليف)",
      "تأجيل التجنيد متاح للطلاب المستحقين"
    ],
    scheduleNotes: "مواعيد صباحية ومسائية مرنة"
  },
  {
    id: "study_apex_free_courses",
    title: "🎁 الكورسات والدورات المجانية الممنوحة للطالب",
    type: "general",
    description: "يحصل الطالب مجاناً طوال فترة دراسته على باقة دورات تدريبية وتأهيلية معتمدة لرفع كفاءته لسوق العمل:",
    details: [
      "🤖 كورس الذكاء الاصطناعي (AI) وتطبيقاته الحديثة",
      "🌱 كورس التنمية البشرية وتطوير المهارات الشخصية وبناء الوعي",
      "🇬🇧 كورس اللغة الإنجليزية (English) والمصطلحات التخصصية",
      "🚑 كورس الإسعافات الأولية الشاملة والتعامل مع الطوارئ"
    ],
    scheduleNotes: "متاحة مجاناً لجميع الطلاب الملتحقين"
  },
  {
    id: "study_apex_welcome_party",
    title: "🎉 حفل الاستقبال وهدايا وتسليمات الطالب",
    type: "general",
    description: "يحضر الطالب المقبول حفل استقبال رسمي ويستلم شنطة متكاملة تشمل كافة المستلزمات والأدوات مجاناً:",
    details: [
      "🎒 شنطة متكاملة تشمل: الكتب الدراسية + البالطو الطبي الرسمي",
      "🪪 الكارنيه الطلابي الرسمي + نوت بوك أنيق + قلم",
      "🩺 سماعة طبية معتمدة + ترمومتر طبي رقمي مجاناً (لقسم التمريض والخدمات الصحية)",
      "📋 باقي التخصصات تستلم: الكارنيه والنوت بوك والقلم وحقيبة الكتب"
    ],
    scheduleNotes: "يتم التسليم في حفل الاستقبال الرسمي للطلاب الجدد"
  }
];

const DEFAULT_APEX_BRANCHES: Branch[] = [
  {
    id: "apex-branch-1",
    name: "فرع الجيزة (المقر الرئيسي)",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    city: "الجيزة",
    regionCategory: "القاهرة الكبرى",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "من 9:00 صباحاً حتى 5:00 مساءً",
    contacts: [],
    notes: "المصروفات 15 ألف للسنتين (ما عدا المساحة 18 ألف، واللاسلكي 17 ألف / 8500 للسنة) - مقدم الحجز 4000 ج."
  },
  {
    id: "apex-branch-2",
    name: "فرع الإسكندرية",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    city: "الاسكندرية",
    regionCategory: "الوجه البحري والدلتا",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "من 9:30 صباحاً حتى 4:30 مساءً",
    contacts: [],
    notes: "المصروفات 16.500 للسنتين (8250 للسنة) - قسم المساحة بالإسكندرية ليس له تكليف - مقدم الحجز 4000 ج."
  }
];

const DEFAULT_APEX_SPECS: Specialization[] = [
  {
    id: "spec_1787648743370",
    name: "قسم المساحة والخرائط",
    category: "هندسي وفني",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "مساح عام / أخصائي مساحة وخرائط GIS",
    totalFees: "18,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "9,000 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة (ملاحظة: فرع الإسكندرية ليس له تكليف)",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "فرع الجيزة (18 ألف) وفرع الإسكندرية (16.5 ألف - بدون تكليف)",
    workplaces: "شركات المقاولات والإنشاءات الكبرى، المشروعات القومية، المكاتب الاستشارية والهندسية، هيئات المساحة.",
    description: "تدريب تطبيقي على أجهزة الرفع المساحي الحديثة (Total Station / GPS / Level)، إعداد الخرائط الطبوغرافية، وبرامج AutoCAD وGIS. (المصروفات بفرع الجيزة 18 ألف، وبفرع الإسكندرية 16.5 ألف مع العلم أن فرع الإسكندرية ليس له تكليف)."
  },
  {
    id: "spec_apex_wireless_officers",
    name: "ضباط لاسلكي (الملاحة والاتصالات البحرية)",
    category: "هندسي وفني",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "ضابط لاسلكي / فني اتصالات وملاحة بحرية",
    totalFees: "17,000 جنيه للسنتين (8,500 ج للسنة)",
    feesPerTerm: "8,500 جنيه في السنة",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة (رسوم إضافية ~5 آلاف في حال طلب بدلة الملاحة)",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح حصرياً في فرع الجيزة (وتراست)",
    workplaces: "السفن التجارية وناقلات البترول والغاز، الموانئ وهيئات الملاحة البحرية، شركات النقل والخدمات البحرية واللوجستية، محطات الاتصالات اللاسلكية والرادارية، منصات الحفر البحرية (Offshore).",
    description: "قسم ضباط لاسلكي متاح حصرياً في فرع أبيكس الجيزة وأكاديمية تراست. مصروفاته 8500 للسنة (17 ألف للسنتين)، الامتحانات النهائية رسمياً في وزارة الاتصالات، متاح تأجيل التجنيد، ورسوم إضافية اختيارية لبدلة الملاحة (~5000 ج)."
  },
  {
    id: "spec_1787499166948",
    name: "تمريض (مساعد خدمات صحية)",
    category: "طبي وتمريض",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "مساعد خدمات صحية - تمريض ورعاية طبية",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "المستشفيات العامة والخاصة، المراكز الطبية، دور رعاية المسنين، الرعاية المنزلية، مراكز الرعاية الصحية التخصصية.",
    description: "تأهيل وتدريب المتدرب على أساسيات التمريض والرعاية الصحية وقياس العلامات الحيوية والإسعافات الأولية ومكافحة العدوى والعمل الميداني بالمستشفيات."
  },
  {
    id: "spec_1787517537936",
    name: "تحاليل طبية واشعة ( فني خدمات صحيه )",
    category: "طبي وتمريض",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "أخصائي وفني تحاليل طبية وأشعة / فني خدمات صحية",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "معامل التحاليل الطبية الكبرى، مراكز الأشعة والتشخيص الطبي، المستشفيات، المراكز الطبية التخصصية، بنوك الدم، معامل الأبحاث.",
    description: "التعرف على أساسيات التحاليل الطبية وأجهزة الأشعة وتجهيزها والتعامل مع العينات وسحبها وتجهيزها، واستخدام أجهزة التحليل الحديثة وإجراءات السلامة الحيوية وضبط الجودة."
  },
  {
    id: "spec_1787503118833",
    name: "تركيبات الأسنان",
    category: "طبي وتمريض",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "فني تركيبات أسنان / مساعد فني تركيبات أسنان",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "معامل الأسنان، عيادات الأسنان، مراكز الأسنان، معامل التركيبات السنية، شركات ومراكز مستلزمات الأسنان.",
    description: "يركز البرنامج على أساسيات تركيبات الأسنان والعمل داخل معامل الأسنان، مع التعرف على أنواع التركيبات والخامات والأدوات المستخدمة في تصنيعها."
  },
  {
    id: "spec_1787509177786",
    name: "قسم البترول والبتروكيماويات",
    category: "هندسي وفني",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "فني بترول واستكشاف / فني حفر وتشغيل",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "شركات البترول والغاز الطبيعي، شركات خدمات الحقول والصيانة، محطات التكرير والمعالجة، مواقع الإنتاج البحرية والصحراوية.",
    description: "التعرف على مراحل وعمليات صناعة البترول والغاز، الحفر والإنتاج، تشغيل المعدات البترولية ومعايير السلامة والصحة المهنية (HSE)."
  },
  {
    id: "spec_1787504524251",
    name: "النظم وإدارة الأعمال",
    category: "إداري ولغات",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "أخصائي إدارة أعمال / مسؤول علاقات عامة وإدارية",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "الشركات والمؤسسات الخاصة، البنوك، مكاتب الإدارة والسكرتارية، إدارات العلاقات العامة وخدمة العملاء، تنظيم المؤتمرات.",
    description: "يجمع بين إدارة الأعمال، المكاتب والسكرتارية، العلاقات العامة، خدمة العملاء، المراسلات الإدارية واستخدام الأدوات الرقمية في العمل الإداري."
  },
  {
    id: "spec_apex_tourism_cairo",
    name: "السياحة والفنادق",
    category: "إداري ولغات",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "أخصائي ضيافة وفنادق / شيف وإدارة أغذية",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "الفنادق والمنتجعات السياحية العالمية، شركات السياحة والطيران، إدارة الفعاليات والمؤتمرات، خدمة العملاء والنزلاء.",
    description: "تدريب تطبيقي على نظم إدارة الفنادق العالمية، خدمة النزلاء، وتخطيط وتنظيم الجولات السياحية والمؤتمرات."
  },
  {
    id: "spec_apex_special_education_cairo",
    name: "التربية الخاصة",
    category: "أخرى",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "أخصائي تربية خاصة وتعديل سلوك / معلم تربية خاصة",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "مراكز التربية الخاصة والتأهيل، مدارس الدمج ومدارس التربية الفكرية، الجمعيات والمؤسسات التنموية، عيادات التخاطب وصعوبات التعلم، العمل الحر ومتابعة الحالات الخاصة.",
    description: "يركز البرنامج على تأهيل وتدريب الكوادر للتعامل مع ذوي الاحتياجات الخاصة، برامج تعديل السلوك، تنمية المهارات، التخاطب وعلاج اضطرابات النطق والكلام، والتشخيص والتقييم النفسي والتربوي."
  },
  {
    id: "spec_apex_aviation_dept",
    name: "الضيافة الجوية وخدمات الطيران",
    category: "أخرى",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "مضيف / مضيفة طيران وخدمات أرضية",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "شركات الطيران المحلية والدولية، خدمات المطارات والعمليات الأرضية، قطاع الاستقبال والضيافة الفندقية الفاخرة.",
    description: "إعداد وتأهيل الكوادر للعمل في مجال الضيافة الجوية والمطارات، إجراءات السلامة الجوية، خدمة الركاب والتعامل مع الطوارئ والإتيكيت الدولي."
  },
  {
    id: "spec_apex_journalism_media_dept",
    name: "الصحافة والإعلام",
    category: "أخرى",
    duration: "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    jobTitle: "محرر صحفي / صانع محتوى ومعد برامج",
    totalFees: "15,000 ج (الجيزة) / 16,500 ج (الإسكندرية)",
    feesPerTerm: "7,500 ج/سنة (الجيزة) - 8,250 ج/سنة (الإسكندرية)",
    installmentDetails: "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع",
    requirements: "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    availableInBranch: "متاح في فرع الجيزة وفرع الإسكندرية",
    workplaces: "الصحف والمجلات، المواقع الإخبارية، القنوات التلفزيونية والإذاعية، شركات الإنتاج وصناعة المحتوى الرقمي.",
    description: "إعداد وتدريب الكوادر على التحرير الصحفي، إعداد التقارير والبرامج، التصوير والمونتاج، وإدارة منصات التواصل الاجتماعي والتغطية الإعلامية."
  }
];

type ApexTabType = "branches" | "specializations" | "accreditations" | "studysystem";

function parseList<T extends { id?: string }>(data: any, fallback: T[]): T[] {
  if (data === null || data === undefined) return fallback;
  let parsed: any[] = [];
  if (Array.isArray(data)) parsed = data;
  else if (typeof data === "string") {
    try {
      const p = JSON.parse(data);
      if (Array.isArray(p)) parsed = p;
      else return fallback;
    } catch (e) {
      return fallback;
    }
  } else {
    return fallback;
  }
  if (parsed.length === 0) return fallback;

  const existingIds = new Set(parsed.map(item => item?.id).filter(Boolean));
  const newItems = fallback.filter(item => item?.id && !existingIds.has(item.id));
  return [...parsed, ...newItems];
}

export default function ApexCollegePage() {
  // 1. Tab State with URL query sync
  const [activeTab, setActiveTab] = useState<ApexTabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "specializations" || tabParam === "accreditations" || tabParam === "studysystem" || tabParam === "branches") {
        return tabParam as ApexTabType;
      }
    } catch (e) {
      console.error(e);
    }
    return "branches";
  });

  const handleSelectTab = (tab: ApexTabType) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Data States - initialized from storage or defaults
  const [branches, setBranches] = useState<Branch[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(APEX_BRANCHES_KEY);
        if (saved) return parseList(saved, DEFAULT_APEX_BRANCHES);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_APEX_BRANCHES;
  });

  const [specializations, setSpecializations] = useState<Specialization[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(APEX_SPECS_KEY);
        if (saved) return parseList(saved, DEFAULT_APEX_SPECS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_APEX_SPECS;
  });

  const [accreditations, setAccreditations] = useState<AccreditationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(APEX_ACCS_KEY);
        if (saved) return parseList(saved, DEFAULT_APEX_ACCS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_APEX_ACCS;
  });

  const [studySystemItems, setStudySystemItems] = useState<StudySystemItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(APEX_STUDY_KEY);
        if (saved) return parseList(saved, DEFAULT_APEX_STUDY);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_APEX_STUDY;
  });

  // 3. Admin & Registration Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Sub-entity Form Modals
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | undefined>();

  const [isSpecFormOpen, setIsSpecFormOpen] = useState(false);
  const [specToEdit, setSpecToEdit] = useState<Specialization | undefined>();

  const [isAccFormOpen, setIsAccFormOpen] = useState(false);
  const [accToEdit, setAccToEdit] = useState<AccreditationItem | undefined>();

  const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);
  const [studyToEdit, setStudyToEdit] = useState<StudySystemItem | undefined>();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "branch" | "spec" | "acc" | "study"; item: any } | null>(null);

  // Persistence & Cloud Sync
  useEffect(() => {
    let isMounted = true;

    async function loadCloudData() {
      const configs = await syncAllConfigsFromDatabase();
      if (isMounted && configs) {
        if (configs[APEX_BRANCHES_KEY] !== undefined) {
          const b = parseList(configs[APEX_BRANCHES_KEY], DEFAULT_APEX_BRANCHES);
          setBranches(b);
        }
        if (configs[APEX_SPECS_KEY] !== undefined) {
          const s = parseList(configs[APEX_SPECS_KEY], DEFAULT_APEX_SPECS);
          setSpecializations(s);
        }
        if (configs[APEX_ACCS_KEY] !== undefined) {
          const a = parseList(configs[APEX_ACCS_KEY], DEFAULT_APEX_ACCS);
          setAccreditations(a);
        }
        if (configs[APEX_STUDY_KEY] !== undefined) {
          const st = parseList(configs[APEX_STUDY_KEY], DEFAULT_APEX_STUDY);
          setStudySystemItems(st);
        }
      }
    }
    loadCloudData();

    const handleConfigsUpdated = () => {
      try {
        const savedB = localStorage.getItem(APEX_BRANCHES_KEY);
        if (savedB !== null) setBranches(parseList(savedB, DEFAULT_APEX_BRANCHES));

        const savedS = localStorage.getItem(APEX_SPECS_KEY);
        if (savedS !== null) setSpecializations(parseList(savedS, DEFAULT_APEX_SPECS));

        const savedA = localStorage.getItem(APEX_ACCS_KEY);
        if (savedA !== null) setAccreditations(parseList(savedA, DEFAULT_APEX_ACCS));

        const savedSt = localStorage.getItem(APEX_STUDY_KEY);
        if (savedSt !== null) setStudySystemItems(parseList(savedSt, DEFAULT_APEX_STUDY));
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("site_configs_updated", handleConfigsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("site_configs_updated", handleConfigsUpdated);
    };
  }, []);

  // 3-Click Footer Trigger: Open Passcode auth if locked, or Dashboard directly if unlocked
  const handleFooterTrigger = () => {
    if (isAdminUnlocked) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  // Auth Success -> Open Central Admin Dashboard
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsAdminUnlocked(true);
    setIsAdminDashboardOpen(true);
    toast.success("تم فتح لوحة تحكم أكاديمية أبيكس كولج بنجاح 🛡️");
  };

  // Lock Admin
  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setIsAdminDashboardOpen(false);
    toast.success("تم قفل لوحة التحكم وتأمين الواجهة بنجاح 🔒");
  };

  // Dispatch Auth for in-view actions
  const handleRequestAuth = (
    type: "branch" | "specialization" | "accreditation" | "studysystem",
    action: "add" | "edit" | "delete",
    targetItem?: any
  ) => {
    if (!isAdminUnlocked) {
      setIsAuthModalOpen(true);
      return;
    }

    if (action === "delete") {
      setDeleteTarget({
        type: type === "branch" ? "branch" : type === "specialization" ? "spec" : type === "accreditation" ? "acc" : "study",
        item: targetItem
      });
      setIsDeleteModalOpen(true);
      return;
    }

    if (type === "branch") {
      setBranchToEdit(action === "edit" ? targetItem : undefined);
      setIsBranchFormOpen(true);
    } else if (type === "specialization") {
      setSpecToEdit(action === "edit" ? targetItem : undefined);
      setIsSpecFormOpen(true);
    } else if (type === "accreditation") {
      setAccToEdit(action === "edit" ? targetItem : undefined);
      setIsAccFormOpen(true);
    } else if (type === "studysystem") {
      setStudyToEdit(action === "edit" ? targetItem : undefined);
      setIsStudyFormOpen(true);
    }
  };

  // Save Branch
  const handleSaveBranch = (branch: Branch) => {
    setBranches((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      const next = exists ? prev.map((b) => (b.id === branch.id ? branch : b)) : [branch, ...prev];
      saveSiteConfig(APEX_BRANCHES_KEY, next);
      return next;
    });
    setIsBranchFormOpen(false);
    toast.success("تم حفظ بيانات الفرع بنجاح");
  };

  // Save Specialization
  const handleSaveSpecialization = (spec: Specialization) => {
    setSpecializations((prev) => {
      const exists = prev.some((s) => s.id === spec.id);
      const next = exists ? prev.map((s) => (s.id === spec.id ? spec : s)) : [spec, ...prev];
      saveSiteConfig(APEX_SPECS_KEY, next);
      return next;
    });
    setIsSpecFormOpen(false);
    toast.success("تم حفظ بيانات التخصص بنجاح");
  };

  // Save Accreditation
  const handleSaveAccreditation = (acc: AccreditationItem) => {
    setAccreditations((prev) => {
      const exists = prev.some((a) => a.id === acc.id);
      const next = exists ? prev.map((a) => (a.id === acc.id ? acc : a)) : [acc, ...prev];
      saveSiteConfig(APEX_ACCS_KEY, next);
      return next;
    });
    setIsAccFormOpen(false);
    toast.success("تم حفظ بيانات الاعتماد بنجاح");
  };

  // Save Study System
  const handleSaveStudySystem = (item: StudySystemItem) => {
    setStudySystemItems((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      const next = exists ? prev.map((s) => (s.id === item.id ? item : s)) : [item, ...prev];
      saveSiteConfig(APEX_STUDY_KEY, next);
      return next;
    });
    setIsStudyFormOpen(false);
    toast.success("تم حفظ بيانات نظام الدراسة بنجاح");
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;

    if (type === "branch") {
      setBranches((prev) => {
        const next = prev.filter((b) => b.id !== item.id);
        saveSiteConfig(APEX_BRANCHES_KEY, next);
        return next;
      });
      toast.success("تم حذف الفرع بنجاح");
    } else if (type === "spec") {
      setSpecializations((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(APEX_SPECS_KEY, next);
        return next;
      });
      toast.success("تم حذف التخصص بنجاح");
    } else if (type === "acc") {
      setAccreditations((prev) => {
        const next = prev.filter((a) => a.id !== item.id);
        saveSiteConfig(APEX_ACCS_KEY, next);
        return next;
      });
      toast.success("تم حذف الاعتماد بنجاح");
    } else if (type === "study") {
      setStudySystemItems((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(APEX_STUDY_KEY, next);
        return next;
      });
      toast.success("تم حذف البند بنجاح");
    }

    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // Share direct tab link
  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "بوابة أكاديمية أبيكس كولج (Apex Academy)",
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط البوابة بنجاح لمشاركته");
    }
  };

  const navTabs: TabItem[] = [
    {
      id: "branches",
      label: "الفروع والمقرات",
      subLabel: "العناوين، الاستقبال، والتواصل",
      icon: Building2,
      count: branches.length,
      activeColor: "bg-indigo-600 text-white shadow-xs border-indigo-700",
      pillColor: "bg-indigo-950/30 text-white"
    },
    {
      id: "specializations",
      label: "التخصصات والمصروفات",
      subLabel: "الأقسام الدراسية، المصاريف، والأقساط",
      icon: GraduationCap,
      count: specializations.length,
      activeColor: "bg-emerald-600 text-white shadow-xs border-emerald-700",
      pillColor: "bg-emerald-950/30 text-white"
    },
    {
      id: "accreditations",
      label: "الاعتمادات والشهادات",
      subLabel: "التوثيقات الحكومية والشهادات المهنية",
      icon: Award,
      count: accreditations.length,
      activeColor: "bg-blue-600 text-white shadow-xs border-blue-700",
      pillColor: "bg-blue-950/30 text-white"
    },
    {
      id: "studysystem",
      label: "نظام الدراسة والمميزات",
      subLabel: "الحضور والتدريب العملي والامتحانات",
      icon: BookOpen,
      count: studySystemItems.length,
      activeColor: "bg-purple-600 text-white shadow-xs border-purple-700",
      pillColor: "bg-purple-950/30 text-white"
    }
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between" dir="rtl">
      
      <div>
        {/* 1. Header Banner & Branding */}
        <header className="relative bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 pt-7 pb-8 overflow-hidden print:hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-950 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>المنظومة الرسمية للطلاب والدارسين بأكاديمية أبيكس</span>
                <span className="bg-indigo-200/80 text-indigo-950 text-[11px] px-2 py-0.5 rounded font-mono font-bold">2026 - 2027</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareLink}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs transition flex items-center gap-1.5"
                  title="مشاركة رابط الصفحة"
                >
                  <Share2 className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">مشاركة الرابط</span>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="max-w-3xl space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                بوابة <span className="text-indigo-600 font-extrabold">أكاديمية أبيكس كولج (Apex College)</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                دليلك المعتمد لمقرات وفروع الأكاديمية (فرع القاهرة وفرع الاسكندرية)، التخصصات الدراسية، المصروفات والأقساط، التوثيقات والشهادات المعتمدة، ونظام الدراسة والتدريب العملي.
              </p>
            </div>

            {/* Register Now Button Directly Under Header */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                id="apex-register-now-btn"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95"
              >
                <Ticket className="w-5 h-5 text-white" />
                <span>سجل الآن بأكاديمية أبيكس (Apex)</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>

              <div className="text-xs font-bold text-slate-600 bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-200/80 flex items-center gap-2">
                <span>📍 الفروع المعتمدة:</span>
                <span className="text-indigo-900 font-black">فرع القاهرة / الجيزة وفرع الاسكندرية</span>
              </div>
            </div>

          </div>
        </header>

        {/* 2. Sub-Pages Navigation Tabs */}
        <PortalTabsNav
          activeTab={activeTab}
          onSelectTab={(tab) => handleSelectTab(tab as ApexTabType)}
          tabs={navTabs}
        />

        {/* 3. Main Views Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* TAB 1: BRANCHES (2 Branches) */}
          {activeTab === "branches" && (
            <BranchesListView
              branches={branches}
              onSaveBranch={handleSaveBranch}
              onRequestAuth={(action, branch) => handleRequestAuth("branch", action, branch)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 2: SPECIALIZATIONS */}
          {activeTab === "specializations" && (
            <SpecializationsView
              specializations={specializations}
              onSave={setSpecializations}
              onRequestAuth={(action, spec) => handleRequestAuth("specialization", action, spec)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 3: ACCREDITATIONS */}
          {activeTab === "accreditations" && (
            <AccreditationsView
              accreditations={accreditations}
              onSave={setAccreditations}
              onRequestAuth={(action, item) => handleRequestAuth("accreditation", action, item)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

          {/* TAB 4: STUDY SYSTEM */}
          {activeTab === "studysystem" && (
            <StudySystemView
              studySystemItems={studySystemItems}
              onSave={setStudySystemItems}
              onRequestAuth={(action, item) => handleRequestAuth("studysystem", action, item)}
              isAdminUnlocked={isAdminUnlocked}
            />
          )}

        </main>
      </div>

      {/* 4. Unified Clean Footer with 3-Click Developer Credit Trigger */}
      <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-xs py-8 px-4 sm:px-6 lg:px-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          
          <div className="space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>أكاديمية أبيكس كولج (Apex College) © 2026</span>
            </div>
            <p className="text-[11px] text-slate-500">
              بوابة الدارسين والفروع المعتمدة لكافة التخصصات والاعتمادات الرسمية
            </p>
          </div>

          <DeveloperCreditFooter
            onTriggerAdmin={handleFooterTrigger}
            isAdminUnlocked={isAdminUnlocked}
            onLockAdmin={handleLockAdmin}
          />

        </div>
      </footer>

      {/* =========================================================
          Admin Modals & Forms
      ========================================================= */}
      
      {/* 1. Register Now Modal */}
      <AcademyRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        academyName="أكاديمية أبيكس كولج (Apex College)"
        availableSpecializations={specializations.map(s => ({ id: s.id, name: s.name }))}
      />

      {/* 2. Admin Passcode Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        academyScope="apex"
        academyName="أكاديمية أبيكس كولج"
        actionTitle="التحقق من صلاحية الإدارة للوحة تحكم أكاديمية أبيكس"
      />

      {/* 3. Central Admin Dashboard Modal */}
      <AcademyAdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        academyName="أكاديمية أبيكس كولج (Apex College)"
        onAddBranch={() => {
          setIsAdminDashboardOpen(false);
          setBranchToEdit(undefined);
          setIsBranchFormOpen(true);
        }}
        onAddSpecialization={() => {
          setIsAdminDashboardOpen(false);
          setSpecToEdit(undefined);
          setIsSpecFormOpen(true);
        }}
        onAddAccreditation={() => {
          setIsAdminDashboardOpen(false);
          setAccToEdit(undefined);
          setIsAccFormOpen(true);
        }}
        onAddStudySystem={() => {
          setIsAdminDashboardOpen(false);
          setStudyToEdit(undefined);
          setIsStudyFormOpen(true);
        }}
        onLockAdmin={handleLockAdmin}
        isLiveAdminMode={isAdminUnlocked}
        onToggleLiveAdminMode={() => setIsAdminUnlocked(!isAdminUnlocked)}
      />

      {/* 4. Branch Form Modal (Add / Edit) */}
      {isBranchFormOpen && (
        <BranchFormModal
          isOpen={isBranchFormOpen}
          onClose={() => setIsBranchFormOpen(false)}
          onSave={handleSaveBranch}
          branchToEdit={branchToEdit}
        />
      )}

      {/* 5. Specialization Form Modal */}
      {isSpecFormOpen && (
        <SpecializationFormModal
          isOpen={isSpecFormOpen}
          onClose={() => setIsSpecFormOpen(false)}
          onSave={handleSaveSpecialization}
          initialData={specToEdit}
          isApex={true}
        />
      )}

      {/* 6. Accreditation Form Modal */}
      {isAccFormOpen && (
        <AccreditationFormModal
          isOpen={isAccFormOpen}
          onClose={() => setIsAccFormOpen(false)}
          onSave={handleSaveAccreditation}
          initialData={accToEdit}
        />
      )}

      {/* 7. Study System Form Modal */}
      {isStudyFormOpen && (
        <StudySystemFormModal
          isOpen={isStudyFormOpen}
          onClose={() => setIsStudyFormOpen(false)}
          onSave={handleSaveStudySystem}
          initialData={studyToEdit}
        />
      )}

      {/* 8. Delete Confirm Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={deleteTarget.item.name || deleteTarget.item.title || "هذا البند"}
          itemType={deleteTarget.type === "branch" ? "فرع" : deleteTarget.type === "spec" ? "تخصص" : deleteTarget.type === "acc" ? "اعتماد" : "بند دراسي"}
        />
      )}

    </div>
  );
}
