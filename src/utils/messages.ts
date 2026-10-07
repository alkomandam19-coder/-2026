/**
 * Centralized Messages & Templates Management
 * ملف إدارة ونصوص كافة الرسائل وقوالب التواصل والإشعارات في الموقع
 */

export const DEFAULT_DISCOUNT_CODE = "AM2026";
export const PORTAL_NAME = "بوابة المعاهد والأكاديميات الخاصة";
export const PORTAL_TITLE_FULL = "بوابة القبول والتسجيل الموحدة للمعاهد والأكاديميات المعتمدة";

export interface StudentMessageParams {
  studentName?: string;
  specialty?: string;
  reservationCode?: string;
  discountCode?: string;
  agentName?: string;
  extractionLink?: string;
}

/**
 * رسائل وقوالب التواصل المباشر مع الطلاب (واتساب ورسائل نصية)
 */
export const studentMessages = {
  /**
   * 1. تذكير بموعد الزيارة ومراجعة الأوراق
   */
  visitReminder: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    discountCode = DEFAULT_DISCOUNT_CODE,
  }: StudentMessageParams): string =>
    `أهلاً بك يا ${studentName} 🌟\n` +
    `نود تذكيرك بموعد زيارتك للأكاديمية لمراجعة أوراق التقديم في تخصص (${specialty}) واستلام بطاقتك وتثبيت حجزك المعتمد.\n\n` +
    `📌 كود الحجز الخاص بك على البوابة: #${reservationCode}\n` +
    `🎟️ كود الخصم الدراسي المعتمد: ${discountCode}\n` +
    `📄  المستندات المطلوبة: صورة المؤهل الدراسي + الصور شخصية + صورة البطاقة الشخصية + صورة بطاقة ولي الأمر + استمارة بوابة المعاهد والأكاديميات الخاصة + دوسيه شفاف .\n\n` +
    `نتمنى لك دوام التوفيق والنجاح! 🎓`,

  /**
   * 2. تنبيه بقرب انتهاء مدة كود الخصم
   */
  discountExpiry: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    discountCode = DEFAULT_DISCOUNT_CODE,
  }: StudentMessageParams): string =>
    `تنبيه هام للطالب/ة ${studentName} ⚠️\n` +
    `يرجى العلم أن خصم المصروفات الاستثنائي المعتمد لتخصص (${specialty}) على وشك الانتهاء خلال الساعات القادمة لاكتمال المقاعد المخصصة.\n\n` +
    `🎟️ كود الخصم المعتمد الخاص بك: ${discountCode}\n` +
    `📌 رقم كود الحجز على البوابة: #${reservationCode}\n\n` +
    `للاحتفاظ بقيمة الخصم وتأكيد تثبيت مقعدك، يرجى الرد على هذه الرسالة أو التواصل معنا فوراً لتأكيد الحضور.`,

  /**
   * 3. إرسال رابط استمارة القبول المباشر
   */
  formLink: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    discountCode = DEFAULT_DISCOUNT_CODE,
    extractionLink = "",
  }: StudentMessageParams): string =>
    `مرحباً ${studentName} 📋\n` +
    `تم إصدار وتوثيق استمارة حجزك الرسمية برقم كود #${reservationCode} لتخصص (${specialty}) بكود خصم معتمد [${discountCode}].\n\n` +
    `يمكنك استعراض وتحميل وطباعة استمارتك بضغطة واحدة عبر الرابط المباشر التالي:\n` +
    `🔗 ${extractionLink}\n\n` +
    `يرجى الاحتفاظ بنسخة منها عند زيارة مقر الأكاديمية. مع تحيات إدارة القبول والتسجيل.`,

  /**
   * 4. متابعة ترحيبية وتأكيد تسجيل الحجز
   */
  welcomeFollowup: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    discountCode = DEFAULT_DISCOUNT_CODE,
    agentName = "",
  }: StudentMessageParams): string => {
    const presenter = agentName && agentName.trim() ? `/ ${agentName.trim()}` : "مستشار القبول";
    return (
      `أهلاً بك يا ${studentName} في بوابة القبول والتسجيل الموحدة 🌟\n` +
      `تم استلام وتثبيت طلبك بنجاح لحجز مقعدك في تخصص (${specialty}) برقم حجز #${reservationCode} مع تفعيل كود الخصم (${discountCode}).\n\n` +
      `معك ${presenter} من ${PORTAL_NAME}، هل لديك أي استفسار عن تخصص أو نظام المصروفات والتقسيط؟ أو اي سؤال اخر - يسعدنا خدمتكم في أي وقت!`
    );
  },

  /**
   * رسائل سريعة للاستخدام المباشر في لوحة التحكم بنقرة واحدة
   */
  adminQuickVisitReminder: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    discountCode = DEFAULT_DISCOUNT_CODE,
  }: StudentMessageParams): string =>
    `أهلاً بك يا ${studentName} 🌟\n` +
    `نود تذكيرك بموعد زيارتك للأكاديمية لمراجعة أوراق التقديم في تخصص (${specialty}) واستلام بطاقتك وتثبيت حجزك المعتمد.\n\n` +
    `📌 كود الحجز: #${reservationCode}\n` +
    `🎟️ كود الخصم المعتمد: ${discountCode}\n` +
    `📄 المستندات: صورة المؤهل + صور شخصية + صورة البطاقة الشخصية + صورة بطاقة ولي الأمر + دوسيه شفاف.\n` +
    `نتمنى لك التوفيق! 🎓`,

  adminQuickDiscountAlert: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    discountCode = DEFAULT_DISCOUNT_CODE,
  }: StudentMessageParams): string =>
    `تنبيه هام للطالب/ة ${studentName} ⚠️\n` +
    `يرجى العلم أن خصم المصروفات الاستثنائي المعتمد لتخصص (${specialty}) على وشك الانتهاء خلال الساعات القادمة.\n\n` +
    `🎟️ كود الخصم المعتمد: ${discountCode}\n` +
    `📌 رقم كود الحجز على البوابة: #${reservationCode}\n\n` +
    `للاحتفاظ بقيمة الخصم وتثبيت مقعدك، يرجى التواصل معنا فوراً أو الرد على هذه الرسالة.`,

  adminQuickFormLink: ({
    studentName = "عزيزنا الطالب",
    specialty = "التخصص المعتمد",
    reservationCode = "1024",
    extractionLink = "",
  }: StudentMessageParams): string =>
    `مرحباً ${studentName} 📋\n` +
    `تم إصدار استمارة حجزك الرسمية برقم كود #${reservationCode} لتخصص (${specialty}).\n\n` +
    `رابط تحميل وطباعة الاستمارة:\n` +
    `🔗 ${extractionLink}\n\n` +
    `يرجى الاحتفاظ بنسخة منها عند زيارة مقر الأكاديمية. بالتوفيق!`,
};

/**
 * نصوص المشاركة على منصات التواصل (Social Sharing)
 */
export const shareMessages = {
  /**
   * رسالة بطاقة القبول القابلة للمشاركة
   */
  registrationCard: ({
    studentName,
    departmentName,
    reservationCode,
    discountCode = DEFAULT_DISCOUNT_CODE,
  }: {
    studentName: string;
    departmentName: string;
    reservationCode: string;
    discountCode?: string;
  }): string =>
    `تم بحمد الله قبولي المبدئي وتأكيد حجز المقعد لدفعة ٢٠٢٦ 🎓✨\n` +
    `الطالب: ${studentName}\n` +
    `التخصص: ${departmentName}\n` +
    `كود تفعيل القبول: ${reservationCode}\n` +
    `كود الخصم المعتمد: ${discountCode}\n` +
    `${PORTAL_NAME}! 🚀`,

  /**
   * رسالة مشاركة الاستمارة الرسمية
   */
  formExtractionCard: ({
    studentId,
    studentName,
    specialty,
    academyName = "الأكاديمية المعتمدة",
    origin = "https://eg-academies.com",
  }: {
    studentId: string;
    studentName: string;
    specialty: string;
    academyName?: string;
    origin?: string;
  }): string =>
    `${PORTAL_NAME} 🏢\n` +
    `• رقم المعاملة: REG-${studentId}\n` +
    `• الاسم: ${studentName}\n` +
    `• التخصص: ${specialty}\n` +
    `• الأكاديمية المستهدفة: ${academyName}\n` +
    `• كود التحقق والباركود: ${origin}/form-extraction?ref=${studentId}`,

  /**
   * مشاركة تخصص دراسي
   */
  departmentShare: (deptName: string, origin = "https://eg-academies.com"): string =>
    `أنا مهتم بالتسجيل في ${deptName} بـ ${PORTAL_NAME}! تخصص متميز جداً ومقاعده محدودة. شاهد التفاصيل وسجل من هنا: ${origin}`,
};

/**
 * نصوص التنبيهات والإشعارات الشائعة (Toasts & Notifications)
 */
export const toastMessages = {
  copySuccess: "تم نسخ نص الرسالة للحافظة بنجاح!",
  copyDiscountSuccess: (code: string) => `تم نسخ كود الخصم (${code}) بنجاح!`,
  copyCardTextSuccess: "تم نسخ نص التهنئة بالكامل وكود الخصم! يمكنك لصقه الآن 📲",
  emptyMessageError: "الرسالة فارغة، يرجى كتابة نص الرسالة أولاً.",
  bookingSavedSuccess: "تم تأكيد طلب الحجز المبدئي بنجاح!",
};
