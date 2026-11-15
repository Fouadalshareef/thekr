/**
 * gameMode.ts — إدارة أنماط الذكر:
 *  - مترابط (Sequence): سلسلة الباقيات الصالحات مرتبة ومرقّمة.
 *  - شامل (Random/Free): جميع الأذكار عشوائياً بدون ترتيب.
 *  - مخصص (Focus): ذكر واحد يختاره المستخدم.
 *  - أذكار الصباح (Morning): سلسلة أذكار الصباح بالتتابع.
 *  - أذكار المساء (Evening): سلسلة أذكار المساء بالتتابع.
 */

import { MORNING_AZKAR, EVENING_AZKAR, type AzkarItem } from './AzkarDB'

export type GameMode = 'sequence' | 'random' | 'focus' | 'morning' | 'evening'

export interface DhikrDef {
  id: string
  name: string
  target: number
}

export interface ComprehensiveDhikrCategory {
  id: string
  title: string
  items: readonly DhikrDef[]
}

/** الأذكار الأساسية في النمط المترابط وقائمة التخصيص. */
export const SEQUENCE_DHIKRS: readonly DhikrDef[] = [
  { id: 'subhanallah', name: 'سُبْحَانَ الله', target: 33 },
  { id: 'alhamdulillah', name: 'الْحَمْدُ لِلَّه', target: 33 },
  { id: 'allahu-akbar', name: 'اللهُ أَكْبَر', target: 34 },
  { id: 'la-ilaha-illa-allah', name: 'لا إله إلا الله، وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير', target: 100 },
  { id: 'la-hawla', name: 'لا حول ولا قوة إلا بالله', target: 100 },
  { id: 'subhanallah-wa-bihamdih', name: 'سبحان الله وبحمده، سبحان الله العظيم', target: 100 },
  { id: 'astaghfirullah-al-azim', name: 'أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه', target: 100 },
  { id: 'four-phrases', name: 'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر', target: 100 },
  { id: 'salawat', name: 'اللهم صلِّ وسلم على نبينا محمد', target: 10 },
]

export interface DhikrVirtue {
  recommended: number
  hadith: string
}

/** نصوص الفضائل المأثورة التي تظهر قبل بدء التكرار. */
export const DHIKR_VIRTUES: Record<string, DhikrVirtue> = {
  subhanallah: { recommended: 33, hadith: 'قال رسول الله ﷺ: «من قال سبحان الله وبحمده في يوم مائة مرة حُطَّت خطاياه وإن كانت مثل زبد البحر» — رواه البخاري ومسلم.' },
  alhamdulillah: { recommended: 33, hadith: 'قال رسول الله ﷺ: «والحمد لله تملأ الميزان» — رواه مسلم.' },
  'allahu-akbar': { recommended: 34, hadith: 'قال رسول الله ﷺ: «أحب الكلام إلى الله أربع: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر» — رواه مسلم.' },
  'la-ilaha-illa-allah': { recommended: 100, hadith: 'قال رسول الله ﷺ: «من قال لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، في يوم مائة مرة، كانت له عدل عشر رقاب، وكُتبت له مائة حسنة، ومُحيت عنه مائة سيئة، وكانت له حرزاً من الشيطان يومه ذلك حتى يمسي» — رواه البخاري ومسلم.' },
  'la-hawla': { recommended: 100, hadith: 'قال رسول الله ﷺ: «أكثروا من قول لا حول ولا قوة إلا بالله، فإنها كنز من كنوز الجنة» — رواه أحمد.' },
  'subhanallah-wa-bihamdih': { recommended: 100, hadith: 'قال رسول الله ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم» — رواه البخاري ومسلم.' },
  'astaghfirullah-al-azim': { recommended: 100, hadith: 'قال رسول الله ﷺ: «من لزم الاستغفار جعل الله له من كل هم فرجاً، ومن كل ضيق مخرجاً، ورزقه من حيث لا يحتسب» — رواه أبو داود.' },
  'four-phrases': { recommended: 100, hadith: 'قال رسول الله ﷺ: «لأن أقول سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر، أحب إلي مما طلعت عليه الشمس» — رواه مسلم.' },
  salawat: { recommended: 10, hadith: 'قال رسول الله ﷺ: «من صلى عليَّ واحدة صلى الله عليه بها عشراً» — رواه مسلم.' },
}

/** جوامع الذكر والأدعية النبوية المتاحة للقراءة والاختيار في النمط المخصص فقط. */
export const COMPREHENSIVE_DHIKR_CATEGORIES: readonly ComprehensiveDhikrCategory[] = [
  {
    id: 'comprehensive-dhikr',
    title: 'جوامع الذكر',
    items: [
      {
        id: 'comprehensive-subhanallah',
        name: 'سبحان الله وبحمده، عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته',
        target: 3,
      },
      {
        id: 'comprehensive-tasbih-count',
        name: 'سبحان الله عدد ما خلق في السماء، وسبحان الله عدد ما خلق في الأرض، وسبحان الله عدد ما بين ذلك، وسبحان الله عدد ما هو خالق، والله أكبر مثل ذلك، والحمد لله مثل ذلك، ولا حول ولا قوة إلا بالله مثل ذلك',
        target: 1,
      },
    ],
  },
  {
    id: 'comprehensive-prophetic-supplications',
    title: 'جوامع الأدعية النبوية',
    items: [
      {
        id: 'sayyid-al-istighfar',
        name: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي، إنه لا يغفر الذنوب إلا أنت',
        target: 1,
      },
      {
        id: 'comprehensive-dunya-akhirah',
        name: 'اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، واجعل الحياة زيادةً لي في كل خيرٍ، واجعل الموت راحةً لي من كل شرٍّ',
        target: 1,
      },
      {
        id: 'comprehensive-good-and-evil',
        name: 'اللهم إني أسألك من الخير كله، عاجله وآجله، ما علمتُ منه وما لم أعلَم، وأعوذ بك من الشر كله، عاجله وآجله، ما علمتُ منه وما لم أعلَم',
        target: 1,
      },
      {
        id: 'refuge-from-weakness',
        name: 'اللهم إني أعوذ بك من العجز والكسل والجبن والهرم والبخل، وأعوذ بك من عذاب القبر، ومن فتنة المحيا والممات',
        target: 1,
      },
      {
        id: 'forgiveness-mercy-wellbeing',
        name: 'اللهم اغفر لي وارحمني وعافني وارزقني',
        target: 1,
      },
      {
        id: 'comprehensive-prayer-for-good',
        name: 'اللهم إني أسألك من الخير كله عاجله وآجله، ما علمتُ منه وما لم أعلم.. وأعوذ بك من الشر كله عاجله وآجله، ما علمتُ منه وما لم أعلم.. وأسألك الجنة وما قرّب إليها من قول أو عمل.. وأعوذ بك من النار وما قرّب إليها من قول أو عمل.. وأسألك مما سألك به عبدك ونبيك محمد ﷺ.. وأعوذ بك مما تعوذ منه عبدك ونبيك محمد ﷺ.. وما قضيتَ لي من قضاء؛ فاجعل عاقبته رشدا',
        target: 1,
      },
    ],
  },
]

/** خيارات النمط المخصص؛ الأذكار الجامعة لا تدخل في النمطين المترابط أو الشامل. */
export const FOCUS_OPTIONS: readonly DhikrDef[] = [
  ...SEQUENCE_DHIKRS,
  ...COMPREHENSIVE_DHIKR_CATEGORIES.flatMap((category) => category.items),
]

class GameModeManager {
  private mode: GameMode = 'sequence'
  private sequenceIndex = 0
  private focusIndex = 0
  /** عدّادات الجلسة الحالية لكل ذكر (يُصفَّر عند تغيير النمط أو الانتقال). */
  private counts: Record<string, number> = {}

  // --- أذكار الصباح والمساء ---
  /** الفهرس الحالي في سلسلة أذكار الصباح/المساء. */
  private azkarIndex = 0
  /** سلسلة الأذكار النشطة (صباح أو مساء). */
  private azkarList: readonly AzkarItem[] = []
  /** عدد مرات الإنجاز للذكر الحالي. */
  private azkarCurrentCount = 0

  getMode(): GameMode {
    return this.mode
  }

  /** تغيير النمط (مع فهرس اختياري للذكر المخصص) وتصفير عدّادات الجلسة. */
  setMode(mode: GameMode, focusIndex?: number): void {
    this.mode = mode
    if (mode === 'focus' && focusIndex !== undefined) {
      this.focusIndex = focusIndex % FOCUS_OPTIONS.length
    }
    // تهيئة سلسلة الأذكار
    if (mode === 'morning') {
      this.azkarList = MORNING_AZKAR
      this.azkarIndex = 0
      this.azkarCurrentCount = 0
    } else if (mode === 'evening') {
      this.azkarList = EVENING_AZKAR
      this.azkarIndex = 0
      this.azkarCurrentCount = 0
    } else {
      this.azkarList = []
      this.azkarIndex = 0
      this.azkarCurrentCount = 0
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
    if (this.mode === 'morning' || this.mode === 'evening') {
      const item = this.getCurrentAzkar()
      if (!item) return null
      return { id: item.id, name: item.text, target: item.count }
    }
    return SEQUENCE_DHIKRS[this.sequenceIndex]
  }

  // ============ أذكار الصباح / المساء ============

  /** الذكر الحالي في سلسلة أذكار الصباح/المساء. */
  getCurrentAzkar(): AzkarItem | null {
    if (this.azkarList.length === 0) return null
    if (this.azkarIndex >= this.azkarList.length) return null
    return this.azkarList[this.azkarIndex]
  }

  /** العدد الإجمالي للأذكار في السلسلة الحالية. */
  getTotalAzkar(): number {
    return this.azkarList.length
  }

  /** رقم الذكر الحالي (1-based). */
  getCurrentAzkarNumber(): number {
    return this.azkarIndex + 1
  }

  /** هل اكتملت جميع الأذكار؟ */
  isAzkarCompleted(): boolean {
    return this.azkarIndex >= this.azkarList.length
  }

  /** عدد المرات المُنجزة للذكر الحالي في هذه الجلسة. */
  getAzkarCurrentCount(): number {
    return this.azkarCurrentCount
  }

  /**
   * تسجيل نقرة على ذكر الصباح/المساء.
   * @returns allDone=true إذا اكتملت جميع الأذكار.
   */
  onAzkarTapped(): { stepDone: boolean; allDone: boolean } {
    const item = this.getCurrentAzkar()
    if (!item) return { stepDone: false, allDone: true }
    this.azkarCurrentCount += 1
    if (this.azkarCurrentCount >= item.count) {
      this.azkarIndex += 1
      this.azkarCurrentCount = 0
      const allDone = this.azkarIndex >= this.azkarList.length
      return { stepDone: true, allDone }
    }
    return { stepDone: false, allDone: false }
  }

  // ============ النمط المترابط والعام ============

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
    if (current && this.counts[current.id] >= current.target) {
      if (this.mode === 'sequence' || this.mode === 'focus') return { completed: true }
    }
    return { completed: false }
  }

  /** تصفير عدّادات الجلسة الحالية (يُستخدم عند إعادة بدء الورد بعد الاحتفال). */
  resetCounts(): void {
    this.counts = {}
  }

  /** الانتقال للذكر التالي في سلسلة النمط المترابط (مع إعادة الدوران). */
  advanceSequence(): void {
    this.sequenceIndex = (this.sequenceIndex + 1) % SEQUENCE_DHIKRS.length
    this.counts = {}
  }
}

/** كائن إدارة الأنماط الوحيد (Singleton) المشترك بين المشاهد. */
export const gameMode = new GameModeManager()
