/**
 * Balloon — بالون ذهبي دافئ (Golden Amber) لذكر: "الْحَمْدُ لِلَّه".
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

const ALHAMDULILLAH_BUBBLE_TEXTURE = 'bubble-alhamdulillah'
const IMG_SIZE = 83

export default class Balloon extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'alhamdulillah',
      dhikrName: 'الْحَمْدُ لِلَّه',
      dhikrTarget: 33,
      speedBase: 55,
      speedMultiplier: 1,
      wiggleAmp: 18,
      wiggleFreq: 1.2,
      popPitch: 3,
      hitRadius: 42,
      ...override,
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0xffe600 // ذهبي فسفوري نيون
  }

  /** الصورة الجاهزة ترسم حدودها بنفسها — لا حلقة حافة بيضاء فوقها. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    const image = this.scene.add.image(0, 0, ALHAMDULILLAH_BUBBLE_TEXTURE)
    image.setDisplaySize(IMG_SIZE, (IMG_SIZE * image.height) / image.width)
    this.add(image)
  }
}
