/**
 * UserDataBackup — أداة حفظ بيانات المستخدم ("SaveUserData")
 * تُستدعى قبل أي عملية تحديث/إعادة تحميل لضمان عدم فقدان:
 *  - العدادات الكلية للأذكار (DhikrStorage)
 *  - عدّاد الاستغفار
 *  - إعدادات المستخدم: السرعة، اسم المستخدم، تاريخ البدء، عدّادات اليوم
 *  - بيانات حديقة الحسنات (مشتقة من العدادات الكلية — تُحفظ ضمنياً)
 * كل البيانات تُخزن في localStorage، وهذه الدالة تعيد كتابتها بشكل صريح
 * (round-trip) لضمان تثبيت أحدث حالة قبل أي مسح للكاش أو إعادة تحميل.
 */
import { loadDhikrData, loadIstighfarData, saveDhikrData } from './DhikrStorage'
import { loadSettings } from './SettingsService'

/** إعادة حفظ كل بيانات المستخدم صراحةً في localStorage. */
export function saveUserData(): void {
  try {
    // 1) العدادات الكلية للأذكار (ومنها تُشتق حديقة الحسنات)
    saveDhikrData(loadDhikrData())

    // 2) عدّاد الاستغفار
    localStorage.setItem(
      'albaqiyat-alsalihat:istighfar-data',
      JSON.stringify(loadIstighfarData()),
    )

    // 3) إعدادات المستخدم (السرعة، اسم المستخدم، تاريخ البدء، عدّادات اليوم)
    localStorage.setItem(
      'albaqiyat-alsalihat:settings',
      JSON.stringify(loadSettings()),
    )
  } catch (e) {
    // لا نُفشل عملية التحديث إذا تعذّر الحفظ (وضع خاص/مساحة ممتلئة)
    console.warn('[SaveUserData] فشل حفظ البيانات:', e)
  }
}