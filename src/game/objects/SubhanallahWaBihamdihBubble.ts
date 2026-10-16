/**
 * SubhanallahWaBihamdihBubble — فقاعة «سُبْحَانَ اللَّهِ وَبِحَمْدِهِ»: جسمها الرئيسي الآن
 * صورة مولّدة (albaqiyatalsalihat.png) بدل الرسم البرمجي. النص العربي مضمّن في الصورة.
 * الألوان: فيروزي متوهج يطابق الفقاعة الجديدة عالية اللمعان.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

/**
 * مفتاح نسيج فقاعة «سبحان الله وبحمده» — الصورة المولّدة albaqiyatalsalihat.png
 * (pi/Bubbles/albaqiyatalsalihat.png) وحُمِّلت في BootScene قبل هذه المشاهد.
 */
export const SUBHANALLAH_WA_BIHAMDIH_BUBBLE_TEXTURE = 'bubble-subhanallah-wa-bihamdih'

const IMG_W = 138
const HIT_R = 48

export default class SubhanallahWaBihamdihBubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'subhanallah-wa-bihamdih',
      dhikrName: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      dhikrTarget: 100,
      speedBase: 72,
      speedMultiplier: 1,
      wiggleAmp: 24,
      wiggleFreq: 2.0,
      popPitch: 2,
      hitRadius: HIT_R,
      ...override,
      // النص العربي مضمّن في الصورة — تعطيل أي طبقة نصية برمجية فوقها.
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0x22d3ee // فيروزي متوهج
  }

  /** حدود الجسم ترسم نفسها — لا حلقة حافة بيضاء إضافية حول الفقاعة. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    // الصورة المولّدة بديل كامل عن الرسم البرمجي — النص مدمج داخلها.
    const img = this.scene.add.image(0, 0, SUBHANALLAH_WA_BIHAMDIH_BUBBLE_TEXTURE)
    img.setDisplaySize(IMG_W, (IMG_W * img.height) / img.width)
    this.add(img)
  }
}
