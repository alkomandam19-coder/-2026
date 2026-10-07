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

const TRUST_BRANCHES_KEY = "trust_academy_branches_data_v2";
const TRUST_HQ_KEY = "trust_academy_hq_data_v1";
const TRUST_SPECS_KEY = "trust_academy_specs_data_v2";
const TRUST_ACCS_KEY = "trust_academy_accs_data_v2";
const TRUST_STUDY_KEY = "trust_academy_study_data_v2";

const DEFAULT_TRUST_ACCS: AccreditationItem[] = [
  {
    id: "acc_trust_1",
    title: "شهادة معتمدة من جامعة الأزهر بختم النسر وتوثيق الخارجية",
    grantingBody: "جامعة الأزهر / وزارة الخارجية / وزارة العمل والقوات المسلحة",
    certificateType: "شهادة دبلومة مهنية وتدريبية معتمدة + بيان درجات رسمي",
    authenticationDetails: "بختم النسر الرسمي وقابلة للتوثيق المباشر من وزارة الخارجية المصرية للسفر والعمل بالخارج",
    benefits: [
      "شهادة معتمدة من جامعة الأزهر ومعها بيان درجات تفصيلي بكل المواد التي تمت دراستها",
      "الشهادة بختم النسر ومتاح توثيقها من وزارة الخارجية المصرية للسفر والعمل بالخارج",
      "استخراج كارنيه النقابة وكارنيه الوزارة لتغيير المسمى الوظيفي في بطاقة الرقم القومي",
      "استخراج شهادة قياس مستوى المهارة وكارنيه مزاولة المهنة المعتمد",
      "شهادة معتمدة بالتدريب العملي الميداني من جهة ومقر التدريب الفعلي",
      "حضور المحاضرات النظرية والعملية في معاهد ومقرات تابعة للقوات المسلحة",
      "إمكانية تأجيل التجنيد للطلاب المستحقين وفقاً للقواعد الرسمية"
    ],
    notes: "اعتمادات رسمية شاملة لكافة التخصصات مع توثيقات حكومية كاملة"
  }
];

const DEFAULT_TRUST_STUDY: StudySystemItem[] = [
  {
    id: "study_trust_system_1",
    title: "📚 نظام الدراسة والتدريب العملي",
    type: "attendance",
    description: "سنتان دراسيتان مكثفتان (من 12 إلى 14 شهراً) مقسمة على 4 فصول دراسية، مع حضور المحاضرات في معاهد تابعة للقوات المسلحة وتدريب عملي معتمد بالمستشفيات والمعامل.",
    details: [
      "نظام دراسة مكثف وعملي مرن يناسب جميع الطلاب",
      "محاضرات نظرية وتطبيقية في معاهد تابعة للقوات المسلحة",
      "تدريب عملي سريري وميداني داخل المستشفيات والمعامل مع شهادة تدريب معتمدة",
      "تأجيل التجنيد متاح للطلاب المستحقين قانوناً"
    ],
    scheduleNotes: "مواعيد صباحية ومسائية مرنة"
  },
  {
    id: "study_trust_free_courses",
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
    id: "study_trust_welcome_party",
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

const DEFAULT_TRUST_BRANCHES: Branch[] = [
  {
    id: "branch_1787633904997",
    name: "المقر الرئيسي - أكاديمية تراست للعلوم والتدريب",
    city: "القاهرة",
    regionCategory: "القاهرة الكبرى",
    address: "سجل بياناتك للتواصل وشرح العنوان بالتفصيل",
    directions: "",
    floor: "",
    mapUrl: "",
    days: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    workingHours: "من 9:00 صباحاً حتى 5:00 مساءً",
    contacts: [],
    notes: "مقر استقبال الطلاب وسحب استمارات التقديم وتسليم المستندات."
  }
];

const DEFAULT_TRUST_SPECS: Specialization[] = [
  {
    "id": "spec_1787650083438",
    "name": "التغذية العلاجية",
    "category": "طبي وتمريض",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "أخصائي نظم غذاء وتغذية / أخصائي تغذية",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "يمكن أن تشمل مجالات العمل المرتبطة بالتخصص:\n• المستشفيات والمراكز الطبية.\n• العيادات ومراكز علاج السمنة والنحافة.\n• النوادي والمراكز الرياضية.\n• المدارس والجامعات والجهات الحكومية.\n• شركات الأغذية والمكملات الغذائية.\n• مراكز الرعاية الصحية.",
    "description": "يركز البرنامج على أساسيات التغذية والحميات والتغذية العلاجية، مع التعرف على طرق تقييم الحالة الغذائية والصحية، وتحديد الاحتياجات الغذائية، ووضع الخطط الغذائية المناسبة للأمراض المزمنة والرياضيين.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "availableInBranch": "",
    "installmentDetails": "4 آلاف مقدم تشمل الكتب والنوت بوك وفتح الملف والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_trust_languages_translation",
    "name": "لغات وترجمة",
    "category": "إداري ولغات",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "أخصائي لغات / مترجم فوري وتحريري",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "يمكن أن تشمل مجالات العمل المرتبطة بالتخصص:\n• شركات الترجمة الدولية والمحلية.\n• شركات السياحة والطيران.\n• وسائل الإعلام والمواقع الصحفية.\n• المؤسسات والهيئات الدبلوماسية والدولية.\n• خدمة العملاء الدولية (Call Centers).\n• العمل الحر والترجمة عن بُعد (Freelance).",
    "description": "يركز البرنامج على تأهيل وإعداد الكوادر في إتقان اللغات الأجنبية وفنون الترجمة التحريرية والفورية، وإعداد التقارير والمراسلات الدبلوماسية والتجارية.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_trust_special_education",
    "name": "تربية خاصة",
    "category": "أخرى",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "أخصائي تربية خاصة وتعديل سلوك / معلم تربية خاصة",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "مراكز التربية الخاصة والتأهيل، مدارس الدمج ومدارس التربية الفكرية، الجمعيات والمؤسسات التنموية، عيادات التخاطب وصعوبات التعلم، العمل الحر ومتابعة الحالات الخاصة.",
    "description": "يركز البرنامج على تأهيل وتدريب الكوادر للتعامل مع ذوي الاحتياجات الخاصة، برامج تعديل السلوك، تنمية المهارات، التخاطب وعلاج اضطرابات النطق والكلام، والتشخيص والتقييم النفسي والتربوي.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_trust_wireless_officers",
    "name": "ضباط لاسلكي (الملاحة والاتصالات البحرية)",
    "category": "هندسي وفني",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "ضابط لاسلكي / فني اتصالات وملاحة بحرية",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "السفن التجارية وناقلات البترول والغاز، الموانئ وهيئات الملاحة البحرية، شركات النقل والخدمات البحرية واللوجستية، محطات الاتصالات اللاسلكية والرادارية، منصات الحفر البحرية (Offshore).",
    "description": "قسم ضباط لاسلكي متاح حصرياً في فرع تراست وأبيكس الجيزة. معتمد ومصروفاته 8500 للسنة، ويتم أداء الامتحانات النهائية رسمياً في وزارة الاتصالات مع إمكانية تأجيل التجنيد، ورسوم إضافية اختيارية في حال طلب بدلة الملاحة (~5000 ج).",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة (رسوم إضافية ~5 آلاف في حال طلب بدلة الملاحة اللاسلكية)"
  },
  {
    "id": "spec_1787644438855",
    "name": "قسم المساحة والخرائط",
    "category": "هندسي وفني",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "مساح عام / أخصائي مساحة وخرائط",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "شركات المقاولات والإنشاءات الكبرى، المشروعات القومية، المكاتب الهندسية والاستشارية، هيئات المساحة والتخطيط العمراني.",
    "description": "يركز البرنامج على تدريب المتدرب على أساسيات المساحة وإعداد الخرائط ونظم المعلومات الجغرافية GIS، واستخدام أحدث أجهزة Total Station والميزان والـ GPS.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "availableInBranch": "",
    "installmentDetails": "4 آلاف مقدم تشمل الكتب والنوت بوك وفتح الملف والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787517530970",
    "name": "تحاليل طبية واشعة ( فني خدمات صحيه )",
    "category": "طبي وتمريض",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "أخصائي وفني تحاليل طبية وأشعة / فني خدمات صحية",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "معامل التحاليل الطبية الكبرى، مراكز الأشعة والتشخيص، المستشفيات، المراكز الطبية التخصصية، بنوك الدم، معامل ومراكز الأبحاث الصحية.",
    "description": "يركز البرنامج على التعرف على أساسيات التحاليل الطبية وتجهيز أجهزة الأشعة والعمل المعملي وسحب وتجهيز العينات، وأساسيات الكيمياء الإكلينيكية، الميكروبيولوجي، وأمراض الدم والسلامة الحيوية والوقاية.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787512934379",
    "name": "السياحة والفنادق",
    "category": "إداري ولغات",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "أخصائي ضيافة وفنادق / شيف وإدارة أغذية",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "الفنادق والمنتجعات السياحية، شركات السياحة والطيران، إدارة الفعاليات والمؤتمرات، خدمة العملاء والنزلاء.",
    "description": "يركز البرنامج على تأهيل المتدرب للتعرف على مجالات السياحة والفنادق والسفر والضيافة، وإدارة الحجوزات وتنظيم الرحلات والفعاليات وخدمة النزلاء والبروتوكول.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787511247779",
    "name": "البترول",
    "category": "هندسي وفني",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "فني بترول وحفر آبار وإنتاج",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "شركات البترول والغاز، شركات خدمات الحقول والصيانة، محطات التكرير والمعالجة، مواقع الإنتاج البحرية والصحراوية.",
    "description": "يركز البرنامج على التعرف على مراحل وعمليات صناعة البترول والغاز من الحفر والإنتاج والمعالجة، وتشغيل المعدات وتطبيق معايير السلامة المهنية والبيئية (HSE).",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787509168066",
    "name": "الضيافة الجوية",
    "category": "أخرى",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "مضيف / مضيفة طيران وخدمات أرضية",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "شركات الطيران المحلية والدولية، خدمات المطارات والعمليات الأرضية، قطاع الاستقبال والضيافة الفاخرة.",
    "description": "يهدف البرنامج إلى إعداد متدربين يمتلكون المهارات الأساسية للعمل في مجال الضيافة الجوية، إجراءات التعامل مع الركاب، السلامة الجوية، الإسعافات الأولية والإتيكيت الدولي.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787504475750",
    "name": "النظم وإدارة الأعمال",
    "category": "إداري ولغات",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "أخصائي إدارة أعمال / مدير علاقات عامة",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "الشركات والمؤسسات الخاصة، البنوك، مكاتب الإدارة والسكرتارية، إدارات العلاقات العامة وخدمة العملاء، تنظيم المؤتمرات.",
    "description": "يجمع التخصص بين إدارة الأعمال، إدارة المكاتب، العلاقات العامة، خدمة العملاء، تنظيم الفعاليات، المراسلات الإدارية، واستخدام التطبيقات الرقمية في العمل المؤسسي.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787503567703",
    "name": "الصحافة والإعلام",
    "category": "أخرى",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "كاتب صحفي / معد برامج ومحتوى رقمي",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "الصحف والمجلات، المواقع الإخبارية، القنوات التلفزيونية، شركات الإنتاج الإعلامي، إدارة منصات السوشيال ميديا وصناعة المحتوى.",
    "description": "يهدف البرنامج إلى إعداد كوادر إعلامية قادرة على إنتاج محتوى احترافي، إعداد التقارير والبرامج، التحرير الصحفي، التصوير والمونتاج، والتقديم الإعلامي الحديث.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع"
  },
  {
    "id": "spec_1787503102187",
    "name": "تركيبات الأسنان",
    "category": "طبي وتمريض",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "فني تركيبات أسنان / مساعد فني معامل أسنان",
    "totalFees": "17,000 جنيه للسنتين (+ 1,500 ج خامات معملية)",
    "workplaces": "معامل تركيبات الأسنان، عيادات ومراكز طب وجراحة الأسنان، مراكز تصنيع التعويضات السنية، شركات مستلزمات الأسنان.",
    "description": "يركز البرنامج على أساسيات تركيبات الأسنان والعمل داخل المعامل، تشكيل التيجان والجسور وأطقم الأسنان، والتعامل مع الخامات والأجهزة المعملية الحديثة. (يوجد رسوم إضافية 1500 ج فقط خاصة بمستلزمات وخامات المعمل).",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم والباقي على أقساط مريحة تناسب الجميع (+ 1500 ج رسوم خامات معملية)"
  },
  {
    "id": "spec_1787476775117",
    "name": "تمريض (مساعد خدمات صحية)",
    "category": "طبي وتمريض",
    "duration": "سنتين مكثفين من 12 الي 14 شهر (4 فصول)",
    "jobTitle": "مساعد خدمات صحية - تمريض ورعاية طبية",
    "totalFees": "17,000 جنيه للسنتين",
    "workplaces": "المستشفيات العامة والخاصة، المراكز الطبية، دور الرعاية، العيادات والمراكز الصحية التخصصية.",
    "description": "تأهيل المتدرب لاكتساب المهارات الأساسية في الرعاية الصحية ومتابعة العلامات الحيوية والإسعافات الأولية والتعامل مع الأدوات الطبية ومكافحة العدوى والعمل ضمن الفريق الطبي.",
    "feesPerTerm": "8,500 جنيه في السنة",
    "requirements": "الثانوية العامة والأزهرية والدبلومات الفنية بجميع أنواعها بمجموع 50%",
    "installmentDetails": "4 آلاف مقدم تشمل الشنطة والبالطو والباقي على أقساط مريحة تناسب الجميع"
  }
];

type TrustTabType = "branches" | "specializations" | "accreditations" | "studysystem";

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

export default function TrustAcademyPage() {
  // 1. Tab State with URL query sync
  const [activeTab, setActiveTab] = useState<TrustTabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "specializations" || tabParam === "accreditations" || tabParam === "studysystem" || tabParam === "branches" || tabParam === "hq") {
        return (tabParam === "hq" ? "branches" : tabParam) as TrustTabType;
      }
    } catch (e) {
      console.error(e);
    }
    return "branches";
  });

  const handleSelectTab = (tab: TrustTabType) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Data States
  const [branches, setBranches] = useState<Branch[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedBranches = localStorage.getItem(TRUST_BRANCHES_KEY);
        if (savedBranches) return parseList(savedBranches, DEFAULT_TRUST_BRANCHES);
        const savedHq = localStorage.getItem(TRUST_HQ_KEY);
        if (savedHq) {
          const parsed = JSON.parse(savedHq);
          if (parsed && typeof parsed === "object") return [parsed];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TRUST_BRANCHES;
  });

  const [specializations, setSpecializations] = useState<Specialization[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TRUST_SPECS_KEY);
        if (saved) return parseList(saved, DEFAULT_TRUST_SPECS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TRUST_SPECS;
  });

  const [accreditations, setAccreditations] = useState<AccreditationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TRUST_ACCS_KEY);
        if (saved) return parseList(saved, DEFAULT_TRUST_ACCS);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TRUST_ACCS;
  });

  const [studySystemItems, setStudySystemItems] = useState<StudySystemItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TRUST_STUDY_KEY);
        if (saved) return parseList(saved, DEFAULT_TRUST_STUDY);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TRUST_STUDY;
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
        if (configs[TRUST_BRANCHES_KEY] !== undefined) {
          const b = parseList(configs[TRUST_BRANCHES_KEY], DEFAULT_TRUST_BRANCHES);
          setBranches(b);
        } else if (configs[TRUST_HQ_KEY]) {
          setBranches([configs[TRUST_HQ_KEY]]);
        }
        if (configs[TRUST_SPECS_KEY] !== undefined) {
          const s = parseList(configs[TRUST_SPECS_KEY], DEFAULT_TRUST_SPECS);
          setSpecializations(s);
        }
        if (configs[TRUST_ACCS_KEY] !== undefined) {
          const a = parseList(configs[TRUST_ACCS_KEY], DEFAULT_TRUST_ACCS);
          setAccreditations(a);
        }
        if (configs[TRUST_STUDY_KEY] !== undefined) {
          const st = parseList(configs[TRUST_STUDY_KEY], DEFAULT_TRUST_STUDY);
          setStudySystemItems(st);
        }
      }
    }
    loadCloudData();

    const handleConfigsUpdated = () => {
      try {
        const savedB = localStorage.getItem(TRUST_BRANCHES_KEY);
        if (savedB !== null) setBranches(parseList(savedB, DEFAULT_TRUST_BRANCHES));

        const savedS = localStorage.getItem(TRUST_SPECS_KEY);
        if (savedS !== null) setSpecializations(parseList(savedS, DEFAULT_TRUST_SPECS));

        const savedA = localStorage.getItem(TRUST_ACCS_KEY);
        if (savedA !== null) setAccreditations(parseList(savedA, DEFAULT_TRUST_ACCS));

        const savedSt = localStorage.getItem(TRUST_STUDY_KEY);
        if (savedSt !== null) setStudySystemItems(parseList(savedSt, DEFAULT_TRUST_STUDY));
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

  // Auth Success
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsAdminUnlocked(true);
    setIsAdminDashboardOpen(true);
    toast.success("تم فتح لوحة تحكم أكاديمية تراست بنجاح 🛡️");
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
      saveSiteConfig(TRUST_BRANCHES_KEY, next);
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
      saveSiteConfig(TRUST_SPECS_KEY, next);
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
      saveSiteConfig(TRUST_ACCS_KEY, next);
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
      saveSiteConfig(TRUST_STUDY_KEY, next);
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
        saveSiteConfig(TRUST_BRANCHES_KEY, next);
        return next;
      });
      toast.success("تم حذف الفرع بنجاح");
    } else if (type === "spec") {
      setSpecializations((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(TRUST_SPECS_KEY, next);
        return next;
      });
      toast.success("تم حذف التخصص بنجاح");
    } else if (type === "acc") {
      setAccreditations((prev) => {
        const next = prev.filter((a) => a.id !== item.id);
        saveSiteConfig(TRUST_ACCS_KEY, next);
        return next;
      });
      toast.success("تم حذف الاعتماد بنجاح");
    } else if (type === "study") {
      setStudySystemItems((prev) => {
        const next = prev.filter((s) => s.id !== item.id);
        saveSiteConfig(TRUST_STUDY_KEY, next);
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
        title: "بوابة أكاديمية تراست الدولية",
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
      activeColor: "bg-emerald-600 text-white shadow-xs border-emerald-700",
      pillColor: "bg-emerald-950/30 text-white"
    },
    {
      id: "specializations",
      label: "التخصصات والمصروفات",
      subLabel: "الأقسام الدراسية، المصاريف، والأقساط",
      icon: GraduationCap,
      count: specializations.length,
      activeColor: "bg-teal-600 text-white shadow-xs border-teal-700",
      pillColor: "bg-teal-950/30 text-white"
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
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between" dir="rtl">
      
      <div>
        {/* 1. Header Banner & Branding */}
        <header className="relative bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 pt-7 pb-8 overflow-hidden print:hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-950 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>المنظومة الرسمية للطلاب والدارسين بأكاديمية تراست</span>
                <span className="bg-emerald-200/80 text-emerald-950 text-[11px] px-2 py-0.5 rounded font-mono font-bold">2026 - 2027</span>
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
                بوابة <span className="text-emerald-600 font-extrabold">أكاديمية تراست الدولية للعلوم والتكنولوجيا</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                دليلك المعتمد لمقرات وفروع الأكاديمية، التخصصات الدراسية، المصروفات ونظام الأقساط، التوثيقات والشهادات الرسمية، ونظام التدريب العملي بالمستشفيات والمراكز المتخصصة.
              </p>
            </div>

            {/* Register Now Button Directly Under Header */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                id="trust-register-now-btn"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95"
              >
                <Ticket className="w-5 h-5 text-white" />
                <span>سجل الآن بأكاديمية تراست الدولية</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>

              <div className="text-xs font-bold text-slate-600 bg-emerald-50/80 px-3.5 py-2 rounded-xl border border-emerald-200/80 flex items-center gap-2">
                <span>🏛️ التوثيقات المعتمدة:</span>
                <span className="text-emerald-900 font-black">شهادات معتمدة + توثيق الخارجية المصرية + كارنيه مزاولة المهنة</span>
              </div>
            </div>

          </div>
        </header>

        {/* 2. Sub-Pages Navigation Tabs */}
        <PortalTabsNav
          activeTab={activeTab}
          onSelectTab={(tab) => handleSelectTab(tab as TrustTabType)}
          tabs={navTabs}
        />

        {/* 3. Main Views Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* TAB 1: BRANCHES */}
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
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>أكاديمية تراست الدولية للعلوم والتكنولوجيا © 2026</span>
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
        academyName="أكاديمية تراست الدولية للعلوم والتكنولوجيا"
        availableSpecializations={specializations.map(s => ({ id: s.id, name: s.name }))}
      />

      {/* 2. Admin Passcode Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        academyScope="trust"
        academyName="أكاديمية تراست الدولية"
        actionTitle="التحقق من صلاحية الإدارة للوحة تحكم أكاديمية ترست"
      />

      {/* 3. Central Admin Dashboard Modal */}
      <AcademyAdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        academyName="أكاديمية تراست الدولية للعلوم والتكنولوجيا"
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
