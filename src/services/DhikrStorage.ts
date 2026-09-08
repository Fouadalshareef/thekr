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
  count: number
  lastActive: string
}

/** قراءة بيانات الاستغفار المحفوظة. */
export function loadIstighfarData(): IstighfarData {
  try {
    const raw = localStorage.getItem(ISTIGHFAR_KEY)
    if (!raw) return { count: 0, lastActive: new Date().toISOString() }
    const parsed = JSON.parse(raw) as Partial<IstighfarData>
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      lastActive:
        typeof parsed.lastActive === 'string'
          ? parsed.lastActive
          : new Date().toISOString(),
    }
  } catch {
    return { count: 0, lastActive: new Date().toISOString() }
  }
}

/** زيادة عدّاد الاستغفار بمقدار 1 وإرجاع القيمة الجديدة. */
export function incrementIstighfar(): number {
  const data = loadIstighfarData()
  const next = data.count + 1
  localStorage.setItem(
    ISTIGHFAR_KEY,
    JSON.stringify({ count: next, lastActive: new Date().toISOString() }),
  )
  return next
}

/** قراءة عدّاد الاستغفار الحالي فقط. */
export function getIstighfarCount(): number {
  return loadIstighfarData().count
}
