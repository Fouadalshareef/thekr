/**
 * DhikrStorage — إدارة حفظ رصيد الأذكار في localStorage.
 * يوفر واجهة موحّدة لقراءة وكتابة بيانات عدّاد الأذكار.
 */

const STORAGE_KEY = 'albaqiyat-alsalihat:dhikr-data'

/** بنية البيانات المحفوظة لكل ذكر. */
export interface DhikrEntry {
  /** معرف الذكر (مثال: "subhanallah"). */
  id: string
  /** اسم الذكر (مثال: "سُبْحَانَ الله"). */
  name: string
  /** عدد مرات الذكر المطلوبة لإكمال الوِرد. */
  target: number
  /** عدد مرات الذكر المنجزة حتى الآن. */
  count: number
}

export interface DhikrData {
  /** قائمة الأذكار مع التقدم. */
  entries: DhikrEntry[]
  /** إجمالي الأذكار المنجزة على الإطلاق. */
  totalCount: number
  /** تاريخ آخر جلسة استخدام (ISO). */
  lastActive: string
}

const DEFAULT_DATA: DhikrData = {
  entries: [],
  totalCount: 0,
  lastActive: new Date().toISOString(),
}

/** قراءة بيانات الأذكار المحفوظة (مثال: لقراءة الرصيد عند تشغيل التطبيق). */
export function loadDhikrData(): DhikrData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA }
    const parsed = JSON.parse(raw) as Partial<DhikrData>
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      totalCount: typeof parsed.totalCount === 'number' ? parsed.totalCount : 0,
      lastActive: typeof parsed.lastActive === 'string' ? parsed.lastActive : DEFAULT_DATA.lastActive,
    }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

/** حفظ بيانات الأذكار في localStorage. */
export function saveDhikrData(data: DhikrData): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, lastActive: new Date().toISOString() }),
  )
}

/** إضافة/تحديث تقدم ذكر معيّن وإرجاع البيانات المحدّثة. */
export function setDhikrCount(id: string, name: string, target: number, count: number): DhikrData {
  const data = loadDhikrData()
  const index = data.entries.findIndex((e) => e.id === id)
  const prev = index >= 0 ? data.entries[index].count : 0

  if (index >= 0) {
    data.entries[index] = { id, name, target, count }
  } else {
    data.entries.push({ id, name, target, count })
  }

  if (count > prev) {
    data.totalCount += count - prev
  }
  saveDhikrData(data)
  return data
}

/** إعادة تعيين عدّاد ذكر معيّن. */
export function resetDhikr(id: string): DhikrData {
  const data = loadDhikrData()
  const entry = data.entries.find((e) => e.id === id)
  if (entry) {
    data.totalCount -= entry.count
    entry.count = 0
    saveDhikrData(data)
  }
  return data
}

/**
 * زيادة عدّاد ذكر معيّن بمقدار 1 (يُستدعى عند كل فرقعة جسم).
 * إن لم يكن الذكر مسجلاً بعد، يُضاف بذهاب تلقائياً.
 */
export function incrementDhikr(id: string, name: string, target: number): DhikrData {
  const data = loadDhikrData()
  const index = data.entries.findIndex((e) => e.id === id)

  if (index >= 0) {
    data.entries[index].count += 1
  } else {
    data.entries.push({ id, name, target, count: 1 })
  }
  data.totalCount += 1
  saveDhikrData(data)
  return data
}

/* ------------------------------------------------------------------ */
/* الاستغفار (التسجيل المستقل تماماً عن باقي الأذكار)                  */
/* ------------------------------------------------------------------ */

const ISTIGHFAR_KEY = 'albaqiyat-alsalihat:istighfar-data'

export interface IstighfarData {
  /** عدد مرات الاستغفار في اليوم الحالي فقط. */
  count: number
  lastActive: string
  /** اليوم المحلي الذي ينتمي إليه count. */
  day: string
  /** تفاصيل الأيام المحفوظة ضمن آخر 30 يوماً. */
  dailyCounts: Record<string, number>
  /** إجمالي الأيام الأقدم، مجمّعاً حسب الشهر YYYY-MM. */
  monthlyCounts: Record<string, number>
  /** الإجمالي التراكمي مدى الحياة. */
  totalCount: number
}

function localDayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayOffsetKey(offset: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - offset)
  return localDayKey(date)
}

function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeCounts(value: unknown, keyPattern: RegExp): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, number> = {}
  for (const [key, count] of Object.entries(value)) {
    if (keyPattern.test(key) && Number.isSafeInteger(count) && count >= 0) {
      result[key] = count
    }
  }
  return result
}

function saveIstighfarData(data: IstighfarData): void {
  localStorage.setItem(ISTIGHFAR_KEY, JSON.stringify(data))
}

/** قراءة البيانات مع تصفير اليوم وترحيل التفاصيل الأقدم إلى مجاميع شهرية. */
export function loadIstighfarData(): IstighfarData {
  const raw = localStorage.getItem(ISTIGHFAR_KEY)
  if (!raw) {
    return {
      count: 0,
      lastActive: new Date().toISOString(),
      day: localDayKey(),
      dailyCounts: {},
      monthlyCounts: {},
      totalCount: 0,
    }
  }

  let parsed: Partial<IstighfarData>
  try {
    parsed = JSON.parse(raw) as Partial<IstighfarData>
  } catch {
    return {
      count: 0,
      lastActive: new Date().toISOString(),
      day: localDayKey(),
      dailyCounts: {},
      monthlyCounts: {},
      totalCount: 0,
    }
  }

  const today = localDayKey()
  const hasDailyHistory = parsed.dailyCounts !== undefined
  const hasMonthlyHistory = parsed.monthlyCounts !== undefined
  const isLegacyData = !hasDailyHistory && !hasMonthlyHistory
  const dailyCounts = normalizeCounts(parsed.dailyCounts, /^\d{4}-\d{2}-\d{2}$/)
  const monthlyCounts = normalizeCounts(parsed.monthlyCounts, /^\d{4}-\d{2}$/)
  const storedDay = typeof parsed.day === 'string' && isDayKey(parsed.day) ? parsed.day : ''
  const storedCount =
    typeof parsed.count === 'number' && Number.isSafeInteger(parsed.count) && parsed.count > 0
      ? parsed.count
      : 0

  if (!isLegacyData && storedDay && storedDay <= today && dailyCounts[storedDay] === undefined) {
    dailyCounts[storedDay] = storedCount
  }

  const oldestDailyDay = dayOffsetKey(29)
  for (const [day, count] of Object.entries(dailyCounts)) {
    if (day < oldestDailyDay) {
      const month = day.slice(0, 7)
      monthlyCounts[month] = (monthlyCounts[month] ?? 0) + count
      delete dailyCounts[day]
    }
  }

  const historyTotal =
    Object.values(dailyCounts).reduce((sum, count) => sum + count, 0) +
    Object.values(monthlyCounts).reduce((sum, count) => sum + count, 0)
  const totalCount = Math.max(
    typeof parsed.totalCount === 'number' && Number.isSafeInteger(parsed.totalCount)
      ? parsed.totalCount
      : 0,
    isLegacyData ? storedCount : 0,
    historyTotal,
  )
  const data: IstighfarData = {
    count: dailyCounts[today] ?? 0,
    lastActive:
      typeof parsed.lastActive === 'string' ? parsed.lastActive : new Date().toISOString(),
    day: today,
    dailyCounts,
    monthlyCounts,
    totalCount,
  }

  const normalized = JSON.stringify(data)
  if (normalized !== raw) localStorage.setItem(ISTIGHFAR_KEY, normalized)
  return data
}

/** زيادة عدّاد الاستغفار بمقدار 1 وإرجاع القيمة الجديدة. */
export function incrementIstighfar(): number {
  const data = loadIstighfarData()
  data.count += 1
  data.dailyCounts[data.day] = data.count
  data.totalCount += 1
  data.lastActive = new Date().toISOString()
  saveIstighfarData(data)
  return data.count
}

/** قراءة عدّاد الاستغفار الحالي فقط. */
export function getIstighfarCount(): number {
  return loadIstighfarData().count
}

/** قراءة إجمالي الاستغفار التراكمي مدى الحياة. */
export function getIstighfarTotalCount(): number {
  return loadIstighfarData().totalCount
}

export interface IstighfarArchive {
  totalCount: number
  daily: { date: string; count: number }[]
  monthly: { month: string; count: number }[]
}

/** سجل آخر 30 يوماً (بما فيها الأيام الصفرية) والمجاميع الشهرية الأقدم. */
export function getIstighfarArchive(): IstighfarArchive {
  const data = loadIstighfarData()
  const daily = Array.from({ length: 30 }, (_, offset) => {
    const date = dayOffsetKey(offset)
    return { date, count: data.dailyCounts[date] ?? 0 }
  })
  const monthly = Object.entries(data.monthlyCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
  return { totalCount: data.totalCount, daily, monthly }
}
