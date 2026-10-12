/**
 * LaHawlaBubble — فقاعة أرجوانية زجاجية (Deep Purple Glassmorphism)
 * لذكر: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ".
 * الألوان: أرجواني عميق زجاجي + هالة ضوانية بنفسجية متدرجة.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

const HAWQALA_BUBBLE_TEXTURE = 'bubble-la-hawla'
const IMG_SIZE = 110

export default class LaHawlaBubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'la-hawla',
      dhikrName: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
      dhikrTarget: 100,
      speedBase: 64,
      speedMultiplier: 1,
      wiggleAmp: 20,
      wiggleFreq: 1.6,
      popPitch: -3,
      hitRadius: 42,
      ...override,
      showTextOverlays: false,
    })
  }

  protected getGlowColor(): number {
    return 0xa78bfa // بنفسجي فاتح متوهج
  }

  protected buildBody(): void {
    const image = this.scene.add.image(0, 0, HAWQALA_BUBBLE_TEXTURE)
    image.setDisplaySize(IMG_SIZE, (IMG_SIZE * image.height) / image.width)
    this.add(image)
  }
}
