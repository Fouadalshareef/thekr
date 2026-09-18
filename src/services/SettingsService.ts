/**
 * SettingsService — إعدادات المستخدم والإحصائيات اليومية:
 *  - سرعة تصاعد الأجسام (0.5 بطيء/تأملي → 2 سريع/تحفيزي).
 *  - اسم المستخدم.
 *  - تاريخ بدء الاستخدام.
 *  - عدّادات اليوم لكل ذكر (بما في ذلك الاستغفار) تُصفَّر تلقائياً كل يوم جديد.
 */

const SETTINGS_KEY = 'albaqiyat-alsalihat:settings'

export interface DailyStats {
  /** عدّادات اليوم حسب معرف الذكر (مثال: subhanallah → 12). */
  counts: Record<string, number>
  /** التاريخ (YYYY-MM-DD) الذي تنتمي إليه العدّادات. */
  day: string
}

export interface SettingsData {
  speed: number
  username: string
  startDate: string
  stats: DailyStats
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_SETTINGS: SettingsData = {
  speed: 1,
  username: '',
  startDate: new Date().toISOString(),
  stats: { counts: {}, day: todayKey() },
}

export function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return structuredClone(DEFAULT_SETTINGS)
    const parsed = JSON.parse(raw) as Partial<SettingsData>
    const stats: DailyStats =
      parsed.stats && parsed.stats.day === todayKey()
        ? { counts: parsed.stats.counts ?? {}, day: parsed.stats.day }
        : { counts: {}, day: todayKey() }
    return {
      speed: typeof parsed.speed === 'number' ? parsed.speed : 1,
      username: typeof parsed.username === 'string' ? parsed.username : '',
      startDate:
        typeof parsed.startDate === 'string' ? parsed.startDate : DEFAULT_SETTINGS.startDate,
      stats,
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

function save(data: SettingsData): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
}

/** السرعة الحالية (مضاعف: 0.5 → 2). */
export function getSpeed(): number {
  return loadSettings().speed
}

/** تعديل السرعة وحفظها. */
export function setSpeed(speed: number): void {
  const data = loadSettings()
  data.speed = Math.min(2, Math.max(0.5, speed))
  save(data)
}

/** اسم المستخدم الحالي (أو قيمة افتراضية). */
export function getUsername(): string {
  return loadSettings().username || 'ضيف الكريم'
}

/** تعديل اسم المستخدم. */
export function setUsername(name: string): void {
  const data = loadSettings()
  data.username = name.trim()
  save(data)
}

/** تاريخ بدء استخدام التطبيق (ISO). */
export function getStartDate(): string {
  return loadSettings().startDate
}

/** عدّادات اليوم الحالي. */
export function getTodayStats(): Record<string, number> {
  return loadSettings().stats.counts
}

/** تسجيل ذكر واحد في عدّادات اليوم. */
export function recordTodayDhikr(id: string): void {
  const data = loadSettings()
  data.stats.counts[id] = (data.stats.counts[id] ?? 0) + 1
  data.stats.day = todayKey()
  save(data)
}

/* ------------------------------------------------------------------ */
/* تفضيلات الصوت والاهتزاز (localStorage: sound_enabled / vibrate_enabled) */
/* ------------------------------------------------------------------ */

const SOUND_KEY = 'sound_enabled'
const VIBRATE_KEY = 'vibrate_enabled'

/** هل أصوات الفقاعات مفعّلة؟ (الافتراضي: مفعّلة) */
export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false'
  } catch {
    return true
  }
}

/** تفعيل/كتم أصوات الفقاعات. */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false')
  } catch {
    /* تجاهل */
  }
}

/** هل الاهتزاز عند النقر مفعّل؟ (الافتراضي: مفعّل) */
export function isVibrationEnabled(): boolean {
  try {
    return localStorage.getItem(VIBRATE_KEY) !== 'false'
  } catch {
    return true
  }
}

/** تفعيل/إيقاف الاهتزاز عند النقر. */
export function setVibrationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VIBRATE_KEY, enabled ? 'true' : 'false')
  } catch {
    /* تجاهل */
  }
}

/* ------------------------------------------------------------------ */
/* تفضيلات تشغيل/إيقاف اللعبة والمصحف والأيقونات (localStorage)         */
/* ------------------------------------------------------------------ */

const GAME_KEY = 'game_enabled'
const QURAN_KEY = 'quran_enabled'
const ICONS_KEY = 'icons_enabled'

/** هل اللعبة (توليد الفقاعات بالحركة) مفعّلة؟ (الافتراضي: مفعّلة) */
export function isGameEnabled(): boolean {
  try {
    return localStorage.getItem(GAME_KEY) !== 'false'
  } catch {
    return true
  }
}

/** تفعيل/إيقاف اللعبة (توليد الأجسام والحركة). */
export function setGameEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(GAME_KEY, enabled ? 'true' : 'false')
  } catch {
    /* تجاهل */
  }
}

/** هل زر/نافذة المصحف الشريف مفعّلة؟ (الافتراضي: مفعّلة) */
export function isQuranEnabled(): boolean {
  try {
    return localStorage.getItem(QURAN_KEY) !== 'false'
  } catch {
    return true
  }
}

/** تفعيل/إيقاف أيقونة ونافذة المصحف الشريف. */
export function setQuranEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(QURAN_KEY, enabled ? 'true' : 'false')
  } catch {
    /* تجاهل */
  }
}

/** هل جميع أيقونات شريط الأدوات مفعّلة؟ (الافتراضي: مفعّلة — محفوظ للتوافق) */
export function areIconsEnabled(): boolean {
  try {
    return localStorage.getItem(ICONS_KEY) !== 'false'
  } catch {
    return true
  }
}

/** تفعيل/إيقاف جميع أيقونات شريط الأدوات (محفوظ للتوافق). */
export function setIconsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ICONS_KEY, enabled ? 'true' : 'false')
  } catch {
    /* تجاهل */
  }
}

/* ------------------------------------------------------------------ */
/* إنجاز أذكار الصباح/المساء اليومية (علامة ✔ في لوحة التحكم)          */
/* ------------------------------------------------------------------ */

const MORNING_DONE_KEY = 'azkar_completed_morning'
const EVENING_DONE_KEY = 'azkar_completed_evening'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** تعليم أذكار الصباح أو المساء كمنجزة اليوم (تُستدعى عند اكتمالها في اللعب). */
export function markAzkarDone(kind: 'morning' | 'evening'): void {
  try {
    localStorage.setItem(kind === 'morning' ? MORNING_DONE_KEY : EVENING_DONE_KEY, todayStr())
  } catch {
    /* تجاهل */
  }
}

/** هل أُنجزت أذكار الصباح اليوم؟ */
export function isMorningDoneToday(): boolean {
  try {
    return localStorage.getItem(MORNING_DONE_KEY) === todayStr()
  } catch {
    return false
  }
}

/** هل أُنجزت أذكار المساء اليوم؟ */
export function isEveningDoneToday(): boolean {
  try {
    return localStorage.getItem(EVENING_DONE_KEY) === todayStr()
  } catch {
    return false
  }
}