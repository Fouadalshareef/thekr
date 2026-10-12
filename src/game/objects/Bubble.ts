/**
 * Bubble — فقاعة «سُبْحَانَ الله»: جسمها الرئيسي الآن صورة مولّدة
 * (sobhanallah.png) بدل الرسم البرمجي. النص مضمّن في الصورة.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

/**
 * مفتاح نسيج فقاعة «سبحان الله» — الصورة المولّدة sobhanallah.png
 * (pi/Bubbles/sobhanallah.png) وحُمِّلت في BootScene قبل هذه المشاهد.
 */
export const SUBHANALLAH_BUBBLE_TEXTURE = 'bubble-subhanallah'

const IMG_W = 83

export default class Bubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'subhanallah',
      dhikrName: 'سُبْحَانَ الله',
      dhikrTarget: 33,
      speedBase: 78,
      speedMultiplier: 1,
      wiggleAmp: 22,
      wiggleFreq: 1.8,
      popPitch: 0,
      hitRadius: 40,
      ...override,
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0x18ffff // فسفوري سماوي متوهج
  }

  /** حدود الصورة الجاهزة تكفي — لا حاجة لحلقة الحافة البيضاء فوقها. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    const img = this.scene.add.image(0, 0, SUBHANALLAH_BUBBLE_TEXTURE)
    img.setDisplaySize(IMG_W, (IMG_W * img.height) / img.width)
    this.add(img)
  }
}
