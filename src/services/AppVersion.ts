/**
 * AppVersion — مصدر واحد لرقم إصدار التطبيق وسجل التحديثات (Changelog)
 * ومفاتيح localStorage الخاصة بحالة التحديث.
 */

/** الإصدار الحالي للتطبيق (يُحدَّث يدوياً مع كل إصدار جديد). */
export const APP_VERSION = '1.0.5'

/** مفاتيح localStorage لحالة التحديث. */
export const HAS_UPDATE_KEY = 'has_update'
export const LAST_SEEN_VERSION_KEY = 'last_seen_version'

/** عناصر "ما الجديد" للإصدار الحالي. */
export const CHANGELOG: string[] = [
  '🔍 دقة عالية حقيقية على شاشات الجوال: الأيقونات والشريط العلوي وحاوية الجلسة أصبحت حادة بلا تكسّرات',
  '📱 دعم كامل لكثافة شاشة الجهاز (حتى 3×) بدل الاكتفاء بـ 2×',
  '🔄 تحديث فوري للتطبيق مع استبدال Service Worker دون انتظار',
  '✨ رموز هندسية فريدة لفقاعات الصلاة الإبراهيمية ولا حول والتسبيح',
  '🧵 إصلاح خيوط بطاقة الاستراحة وإخفاؤها مع اللوحة بالكامل',
  '👆 إصلاح دقيق للّمس: النقر على أي عنصر يعمل مباشرةً في مكانه الصحيح',
  '⚙️ إصلاح اختفاء زر الإعدادات من الشريط العلوي',
  '🚀 زيادة سرعة ظهور الأذكار: اندفاع فوري عند الظهور لسهولة النقر المتكرر',
  '🎨 تحسين الواجهة والسحب ومنع تمرير الصفحة أثناء اللعب',
]

/** هل توجد نسخة جديدة في انتظار التثبيت؟ */
export function hasPendingUpdate(): boolean {
  try {
    return localStorage.getItem(HAS_UPDATE_KEY) === 'true'
  } catch {
    return false
  }
}

/** هل المستخدم لم يشاهد نافذة "ما الجديد" لهذا الإصدار بعد؟ */
export function isChangelogPending(): boolean {
  let lastSeen: string | null = null
  try {
    lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY)
  } catch {
    lastSeen = null
  }
  return lastSeen !== APP_VERSION
}