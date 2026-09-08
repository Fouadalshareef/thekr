/**
 * TimeThemeService — نظام الأجواء الزمنية الواقعية:
 * يحسب فترة اليوم من ساعة الجهاز ويعيد ألوان الخلفية والمؤثرات المناسبة:
 *  - الفجر/الشروق (5-7): تدرجات وردية وسماوية دافئة.
 *  - النهار (7-17): سماء زرقاء صافية مع شمس وغيوم.
 *  - الغروب (17-19): تدرجات أرجوانية/برتقالية مع شفق.
 *  - الليل (19-5): سماء كحلية مع نجوم وقمر.
 */

export type TimePeriod = 'dawn' | 'day' | 'sunset' | 'night'

export interface TimeTheme {
  period: TimePeriod
  /** اسم الفترة بالعربية (للعرض). */
  label: string
  /** لون أعلى التدرج. */
  top: number
  /** لون منتصف التدرج. */
  middle: number
  /** لون أسفل التدرج. */
  bottom: number
  /** لون الإضاءة/التوهج العام. */
  glow: number
  /** إظهار الشمس. */
  sun: boolean
  /** إظهار القمر. */
  moon: boolean
  /** إظهار النجوم. */
  stars: boolean
  /** إظهار الغيوم. */
  clouds: boolean
  /** شدة النجوم (0..1). */
  starAlpha: number
}

const THEMES: Record<TimePeriod, TimeTheme> = {
  dawn: {
    period: 'dawn',
    label: 'الفجر',
    top: 0x7c3aed,
    middle: 0xf472b6,
    bottom: 0xfdba74,
    glow: 0xfecdd3,
    sun: true,
    moon: false,
    stars: true,
    clouds: true,
    starAlpha: 0.35,
  },
  day: {
    period: 'day',
    label: 'النهار',
    top: 0x0ea5e9,
    middle: 0x38bdf8,
    bottom: 0x7dd3fc,
    glow: 0xfde68a,
    sun: true,
    moon: false,
    stars: false,
    clouds: true,
    starAlpha: 0,
  },
  sunset: {
    period: 'sunset',
    label: 'الغروب',
    top: 0x4c1d95,
    middle: 0xc026d3,
    bottom: 0xfb923c,
    glow: 0xfdba74,
    sun: true,
    moon: false,
    stars: true,
    clouds: true,
    starAlpha: 0.25,
  },
  night: {
    period: 'night',
    label: 'الليل',
    top: 0x0b1120,
    middle: 0x1e1b4b,
    bottom: 0x312e81,
    glow: 0xc4b5fd,
    sun: false,
    moon: true,
    stars: true,
    clouds: false,
    starAlpha: 0.9,
  },
}

/** تحديد الفترة من الساعة (0-23). */
export function getPeriod(hour: number = new Date().getHours()): TimePeriod {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19) return 'sunset'
  return 'night'
}

/** ثيم الوقت الحالي لجهاز المستخدم. */
export function getTimeTheme(hour: number = new Date().getHours()): TimeTheme {
  return THEMES[getPeriod(hour)]
}

/** ثيم الفترة المطلوبة (يُستخدم لفرض طابع ليلي في ZenScene). */
export function getThemeFor(period: TimePeriod): TimeTheme {
  return THEMES[period]
}