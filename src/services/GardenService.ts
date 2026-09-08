/**
 * GardenService — حديقة الحسنات الديناميكية:
 * يحسب مستوى الحديقة من إجمالي الأذكار التراكمي (المخزن في DhikrStorage)
 * ويعيد قائمة العناصر المفتوحة (زهرة، شجرة، عصافير، ألوان خلفية...).
 */
import { loadDhikrData, getIstighfarCount } from './DhikrStorage'

/** كل 500 ذكر يفتح عنصراً جديداً. */
export const DHIKRS_PER_ELEMENT = 500

/** أنواع عناصر الحديقة بالترتيب (كل عنصر يُفتح عند بلوغ عتبته). */
export interface GardenElementDef {
  id: string
  name: string
  /** عتبة الفتح: إجمالي الأذكار المطلوب. */
  threshold: number
}

export const GARDEN_ELEMENTS: readonly GardenElementDef[] = [
  { id: 'grass', name: 'عشب أخضر', threshold: 0 },
  { id: 'flower-red', name: 'زهرة حمراء', threshold: 500 },
  { id: 'flower-yellow', name: 'زهرة ذهبية', threshold: 1000 },
  { id: 'bush', name: 'شجيرة مزهرية', threshold: 1500 },
  { id: 'tree', name: 'شجرة مثمرة', threshold: 2000 },
  { id: 'bird', name: 'عصفوران', threshold: 2500 },
  { id: 'fountain', name: 'نافورة نورانية', threshold: 3000 },
  { id: 'butterflies', name: 'فراشات ملونة', threshold: 3500 },
  { id: 'rainbow', name: 'قوس قزح', threshold: 4000 },
]

export interface GardenState {
  /** إجمالي الأذكار (بما في ذلك الاستغفار). */
  total: number
  /** مستوى الحديقة (عدد العناصر المفتوحة). */
  level: number
  /** العناصر المفتوحة. */
  unlocked: GardenElementDef[]
  /** العنصر التالي وعتبته (إن وُجد). */
  next: GardenElementDef | null
  /** التقدم نحو العنصر التالي (0..1). */
  progress: number
}

/** حساب إجمالي الأذكار التراكمي (أذكار + استغفار) من المخزن. */
export function getTotalGoodDeeds(): number {
  const data = loadDhikrData()
  const istighfar = getIstighfarCount()
  return data.totalCount + istighfar
}

/** حالة الحديقة الكاملة بناءً على الرصيد المخزن. */
export function getGardenState(): GardenState {
  const total = getTotalGoodDeeds()
  const unlocked = GARDEN_ELEMENTS.filter((e) => total >= e.threshold)
  const level = unlocked.length
  const next = GARDEN_ELEMENTS.find((e) => total < e.threshold) ?? null
  const prevThreshold = level > 0 ? unlocked[level - 1].threshold : 0
  const progress =
    next && next.threshold > prevThreshold
      ? Math.min((total - prevThreshold) / (next.threshold - prevThreshold), 1)
      : 1
  return { total, level, unlocked, next, progress }
}

/** قائمة معرفات العناصر المفتوحة فقط (لرسمها في المشهد). */
export function getUnlockedIds(): string[] {
  return getGardenState().unlocked.map((e) => e.id)
}