/**
 * AppUpdateActions — إجراءات تحديث التطبيق (بلا أي DOM).
 *
 * نُقلت هذه الإجراءات من لوحة التحكم القديمة (components/DashboardModal.ts)
 * إلى خدمة مستقلة كي تبقى متاحة من نافذة الإعدادات الجديدة المرسومة داخل
 * Phaser (Canvas) دون أي اعتماد على HTML/CSS.
 */
import { APP_VERSION, HAS_UPDATE_KEY, LAST_SEEN_VERSION_KEY } from './AppVersion'
import { saveUserData } from './UserDataBackup'

/** رسائل الحالة المعروضة داخل النافذة أثناء التحديث. */
export const UPDATE_STATUS = {
  working: 'جارٍ حفظ بياناتك ومسح الكاش وإعادة التشغيل...',
  failed: 'تعذّر إكمال التحديث — أعد المحاولة بعد التأكد من الاتصال.',
} as const

/**
 * تنفيذ التحديث الفوري:
 *  1) حفظ كل بيانات المستخدم (العدّادات، الاستغفار، الإعدادات).
 *  2) مسح جميع الكاشات.
 *  3) إرسال SKIP_WAITING لأي Service Worker في الانتظار/التثبيت.
 *  4) تسجيل الإصدار الجديد وإزالة شارة التحديث.
 *  5) إعادة تحميل التطبيق ليعمل بالنسخة الجديدة.
 *
 * @param onStatus دالة اختيارية لعرض رسالة الحالة في الواجهة.
 */
export async function forceAppUpdate(onStatus?: (message: string) => void): Promise<void> {
  onStatus?.(UPDATE_STATUS.working)
  try {
    // 1) حفظ بيانات المستخدم قبل أي شيء (منع أي فقدان للعدّادات)
    saveUserData()

    // 2) مسح جميع الكاشات
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    // 3) تفعيل الـ Service Worker الجديد فوراً إن وُجد
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    } else if (reg?.installing) {
      reg.installing.postMessage({ type: 'SKIP_WAITING' })
    }

    // 4) تسجيل الإصدار الجديد وإزالة شارة التحديث
    localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION)
    localStorage.removeItem(HAS_UPDATE_KEY)
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {})
  } catch (error) {
    console.warn('[forceAppUpdate] فشل جزء من خطوات التحديث:', error)
  }

  // 5) إعادة التحميل القسرية لضمان تشغيل النسخة الجديدة
  setTimeout(() => window.location.reload(), 700)
}
