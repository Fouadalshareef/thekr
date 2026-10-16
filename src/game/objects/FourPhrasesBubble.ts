/**
 * FourPhrasesBubble — فقاعة «الباقيات الصالحات»: سبحان الله والحمد لله ولا إله
 * إلا الله والله أكبر. جسمها الرئيسي صورة مولّدة (sobhlaoabhsobal.png) — النص
 * العربي مضمّن في الصورة ثلاثية الأبعاد، لذا تُعرض الصورة فقط دون أي طبقة نصية
 * برمجية فوقها.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

/**
 * مفتاح نسيج فقاعة «الباقيات الصالحات» — الصورة المولّدة sobhlaoabhsobal.png
 * (pi/Bubbles/sobhlaoabhsobal.png) وحُمِّلت في BootScene قبل هذه المشاهد.
 */
export const FOUR_PHRASES_BUBBLE_TEXTURE = 'bubble-four-phrases'

const IMG_W = 142
const HIT_R = 48

export default class FourPhrasesBubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'four-phrases',
      dhikrName: 'البَاقِيَاتُ الصَّالِحَات',
      dhikrTarget: 100,
      speedBase: 60,
      speedMultiplier: 1,
      wiggleAmp: 20,
      wiggleFreq: 1.6,
      popPitch: 1,
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
    const img = this.scene.add.image(0, 0, FOUR_PHRASES_BUBBLE_TEXTURE)
    img.setDisplaySize(IMG_W, (IMG_W * img.height) / img.width)
    this.add(img)
  }
}
