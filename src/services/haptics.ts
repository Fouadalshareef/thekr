/**
 * haptics.ts — خدمة الاهتزاز (Haptic Feedback).
 * تستدعي navigator.vibrate() للعمل على المتصفحات التي تدعمها وأجهزة أندرويد
 * (عبر WebView الكاباسيتوراحقاً) لإعطاء استجابة لمسية عند كل فرقعة.
 */
import { isVibrationEnabled } from './SettingsService'

/**
 * إرسال اهتزاز قصير ولطيف.
 * @param pattern مدة الاهتزاز بالمللي ثانية أو نمط (الافتراضي 15ms).
 * @returns true إذا كان الاهتزاز مدعوماً وتم إرساله فعلاً.
 */
export function vibrate(pattern: number | number[] = 15): boolean {
  // احترام إعداد إيقاف الاهتزاز (vibrate_enabled !== 'false')
  if (!isVibrationEnabled()) return false
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false
  }
  try {
    navigator.vibrate(pattern)
    return true
  } catch {
    return false
  }
}
