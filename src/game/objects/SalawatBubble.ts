/**
 * SalawatBubble — فقاعة «اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ»: جسمها الرئيسي الآن
 * صورة مولّدة (salawat.png) بدل الرسم البرمجي. النص العربي مضمّن في الصورة.
 * الألوان: أخضر زمردي ملكي مع توهج ذهبي فخم يطابق الفقاعة الجديدة عالية اللمعان.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

/**
 * مفتاح نسيج فقاعة الصلاة — الصورة المولّدة salawat.png
 * (pi/Bubbles/salawat.png) وحُمِّلت في BootScene قبل هذه المشاهد.
 */
export const SALAWAT_BUBBLE_TEXTURE = 'bubble-salawat'

const IMG_W = 138
const HIT_R = 48

export default class SalawatBubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'salawat',
      dhikrName: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
      dhikrTarget: 10,
      speedBase: 52,
      speedMultiplier: 1,
      wiggleAmp: 14,
      wiggleFreq: 1.0,
      popPitch: 4,
      hitRadius: HIT_R,
      ...override,
      // النص العربي مضمّن في الصورة — تعطيل أي طبقة نصية برمجية فوقها.
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0xfacc15 // ذهبي فخم
  }

  /** حدود الجسم ترسم نفسها — لا حلقة حافة بيضاء إضافية حول الفقاعة. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    // الصورة المولّدة بديل كامل عن الرسم البرمجي — النص مدمج داخلها.
    const img = this.scene.add.image(0, 0, SALAWAT_BUBBLE_TEXTURE)
    img.setDisplaySize(IMG_W, (IMG_W * img.height) / img.width)
    this.add(img)
  }
}
