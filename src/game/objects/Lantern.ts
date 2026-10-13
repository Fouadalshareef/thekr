/**
 * Lantern — قنديل ياقوتي أحمر (Ruby Red) لذكر: "اللهُ أَكْبَر".
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

const ALLAHU_AKBAR_BUBBLE_TEXTURE = 'bubble-allahu-akbar'
const IMG_SIZE = 83

export default class Lantern extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'allahu-akbar',
      dhikrName: 'اللهُ أَكْبَر',
      dhikrTarget: 34,
      speedBase: 60,
      speedMultiplier: 1,
      wiggleAmp: 16,
      wiggleFreq: 1.4,
      popPitch: 5,
      hitRadius: 42,
      ...override,
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0xff3355 // أحمر فسفوري متوهج للقنديل
  }

  /** الصورة الجاهزة ترسم حدودها بنفسها — لا حلقة حافة بيضاء فوقها. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    const image = this.scene.add.image(0, 0, ALLAHU_AKBAR_BUBBLE_TEXTURE)
    image.setDisplaySize(IMG_SIZE, (IMG_SIZE * image.height) / image.width)
    this.add(image)
  }
}
