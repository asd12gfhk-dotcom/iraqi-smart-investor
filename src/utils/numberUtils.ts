/**
 * أداة توحيد وتحويل كافة الأرقام في التطبيق إلى الأرقام الإنجليزية (0123456789)
 */

/**
 * تحويل الأرقام العربية/الفارسية والفواصل الشرقية إلى أرقام إنجليزية وسلسلة عشرية قياسية
 */
export function normalizeEnglishDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/[٫,]/g, '.');
}

/**
 * تنسيق الأرقام باستعمال الأرقام الإنجليزية دائماً (en-US)
 */
export function formatEnglishNumber(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
