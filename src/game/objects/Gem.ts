/**
 * Gem — فقاعة ذكر «لَا إِلَٰهَ إِلَّا الله»: جسمها الرئيسي الآن صورة مولّدة
 * (la_ilaha_illallah.png) بدل الرسم البرمجي. النص العربي مضمّن في الصورة ثلاثية الأبعاد،
 * لذا تُعرض الصورة فقط دون أي طبقة نصية برمجية فوقها.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

/**
 * مفتاح نسيج فقاعة «لا إله إلا الله» — الصورة المولّدة la_ilaha_illallah.png
 * (pi/Bubbles/la_ilaha_illallah.png) وحُمِّلت في BootScene قبل هذه المشاهد.
 */
const LA_ILAHA_ILLALLAH_BUBBLE_TEXTURE = 'bubble-la-ilaha-illa-allah'

const IMG_W = 96

export default class Gem extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'la-ilaha-illa-allah',
      dhikrName: 'لَا إِلَٰهَ إِلَّا الله',
      dhikrTarget: 100,
      speedBase: 68,
      speedMultiplier: 1,
      wiggleAmp: 24,
      wiggleFreq: 2.2,
      popPitch: -2,
      hitRadius: 42,
      ...override,
      // النص العربي مضمّن في الصورة — تعطيل أي طبقة نصية برمجية فوقها.
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0xbf5cff // بنفسجي فسفوري متوهج للجوهرة
  }

  /** حدود الجسم ترسم نفسها — لا حلقة حافة بيضاء إضافية حول الفقاعة. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    // الصورة المولّدة بديل كامل عن الرسم البرمجي — النص مدمج داخلها.
    const img = this.scene.add.image(0, 0, LA_ILAHA_ILLALLAH_BUBBLE_TEXTURE)
    img.setDisplaySize(IMG_W, (IMG_W * img.height) / img.width)
    this.add(img)
  }
}
