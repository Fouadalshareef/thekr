/**
 * gameMode.ts — إدارة أنماط الذكر:
 *  - مترابط (Sequence): سلسلة الباقيات الصالحات مرتبة ومرقّمة.
 *  - شامل (Random/Free): جميع الأذكار عشوائياً بدون ترتيب.
 *  - مخصص (Focus): ذكر واحد يختاره المستخدم.
 */

export type GameMode = 'sequence' | 'random' | 'focus'

export interface DhikrDef {
  id: string
  name: string
  target: number
}

/** سلسلة الأذكار في النمط المترابط ("الباقيات الصالحات"). */
export const SEQUENCE_DHIKRS: readonly DhikrDef[] = [
  { id: 'subhanallah', name: 'سُبْحَانَ الله', target: 33 },
  { id: 'alhamdulillah', name: 'الْحَمْدُ لِلَّه', target: 33 },
  { id: 'allahu-akbar', name: 'اللهُ أَكْبَر', target: 34 },
  { id: 'la-ilaha-illa-allah', name: 'لَا إِلَٰهَ إِلَّا الله', target: 100 },
  { id: 'la-hawla', name: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100 },
  { id: 'subhanallah-wa-bihamdih', name: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 100 },
  { id: 'salawat', name: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ...', target: 10 },
]

/** خيارات النمط المخصص (نفس قائمة السلسلة). */
export const FOCUS_OPTIONS: readonly DhikrDef[] = SEQUENCE_DHIKRS

class GameModeManager {
  private mode: GameMode = 'sequence'
  private sequenceIndex = 0
  private focusIndex = 0
  /** عدّادات الجلسة الحالية لكل ذكر (يُصفَّر عند تغيير النمط أو الانتقال). */
  private counts: Record<string, number> = {}

  getMode(): GameMode {
    return this.mode
  }

  /** تغيير النمط (مع فهرس اختياري للذكر المخصص) وتصفير عدّادات الجلسة. */
  setMode(mode: GameMode, focusIndex?: number): void {
    this.mode = mode
    if (mode === 'focus' && focusIndex !== undefined) {
      this.focusIndex = focusIndex % FOCUS_OPTIONS.length
    }
    this.counts = {}
  }

  setFocusIndex(index: number): void {
    this.focusIndex = index % FOCUS_OPTIONS.length
    this.counts = {}
  }

  getFocusIndex(): number {
    return this.focusIndex
  }

  getSequenceIndex(): number {
    return this.sequenceIndex
  }

  /** الذكر الحالي وفق النمط (يُرجع null في النمط الشامل). */
  getCurrentDhikr(): DhikrDef | null {
    if (this.mode === 'random') return null
    if (this.mode === 'focus') return FOCUS_OPTIONS[this.focusIndex]
    return SEQUENCE_DHIKRS[this.sequenceIndex]
  }

  /** عدّاد الجلسة الحالية لذكر معيّن. */
  getCount(id: string): number {
    return this.counts[id] ?? 0
  }

  /** مجموع فرقعات الجلسة الحالية. */
  getTotalCount(): number {
    return Object.values(this.counts).reduce((sum, n) => sum + n, 0)
  }

  /**
   * تسجيل فرقعة ذكر في الجلسة الحالية.
   * @returns completed=true إذا اكتمل وِرد النمط المترابط ويستوجب انتقالاً.
   */
  onCollected(id: string): { completed: boolean } {
    this.counts[id] = (this.counts[id] ?? 0) + 1
    const current = this.getCurrentDhikr()
    if (this.mode === 'sequence' && current && this.counts[current.id] >= current.target) {
      return { completed: true }
    }
    return { completed: false }
  }

  /** الانتقال للذكر التالي في سلسلة النمط المترابط (مع إعادة الدوران). */
  advanceSequence(): void {
    this.sequenceIndex = (this.sequenceIndex + 1) % SEQUENCE_DHIKRS.length
    this.counts = {}
  }
}

/** كائن إدارة الأنماط الوحيد (Singleton) المشترك بين المشاهد. */
export const gameMode = new GameModeManager()
