/**
 * MASTER ADMIN SECURITY CONFIGURATION
 * ملف التحكم في كلمات مرور ورموز الحماية للإدارة العليا
 *
 * لتغيير أو إضافة كلمة مرور جديدة لإجراءات الإدارة وتحويل وتعيين السيلز،
 * يمكنك التعديل مباشرة على المصفوفة MASTER_ADMIN_PASSWORDS أدناه.
 */

export const MASTER_ADMIN_PASSWORDS: string[] = [
  "Mm151997",
  "mm151997",
  "admin123",
  "151997",
  "eng2026",
  "mamdouh2026",
  "engmamdouh2026"
];

/**
 * التحقق من صحة رمز الحماية للإدارة
 */
export function isMasterAdminPasswordValid(input: string): boolean {
  if (!input) return false;
  const clean = input.trim();
  const cleanLower = clean.toLowerCase();

  return (
    MASTER_ADMIN_PASSWORDS.includes(clean) ||
    MASTER_ADMIN_PASSWORDS.includes(cleanLower)
  );
}
