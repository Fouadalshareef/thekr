/**
 * Gem — جوهرة بلورية ماسية (Diamond Violet) لذكر: "لَا إِلَٰهَ إِلَّا الله".
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

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
      hitRadius: 40,
      ...override,
    })
  }

  protected getGlowColor(): number {
    return 0xbf5cff // بنفسجي فسفوري متوهج للجوهرة
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // هالة بنفسجية ناعمة
    g.fillStyle(0x8b5cf6, 0.16)
    g.fillCircle(0, 0, 44)

    const top = [
      { x: 0, y: -34 },
      { x: 26, y: 0 },
      { x: 0, y: 0 },
      { x: -26, y: 0 },
    ]
    const bottom = [
      { x: 0, y: 0 },
      { x: 26, y: 0 },
      { x: 0, y: 34 },
      { x: -26, y: 0 },
    ]
    const outline = [
      { x: 0, y: -34 },
      { x: 26, y: 0 },
      { x: 0, y: 34 },
      { x: -26, y: 0 },
    ]

    // النصف العلوي أفتح، والنصف السفلي أغمق (إحساس بصري)
    g.fillStyle(0x8b5cf6, 1)
    g.fillPoints(top, true)
    g.fillStyle(0x7c3aed, 1)
    g.fillPoints(bottom, true)

    // حد خارجي مضيء سميك (4px) أبيض ناصع
    g.lineStyle(4, 0xffffff, 1)
    g.strokePoints(outline, true)

    // خطوط الأوجه
    g.lineStyle(1.5, 0xc4b5fd, 0.9)
    g.lineBetween(-26, 0, 0, -14)
    g.lineBetween(26, 0, 0, -14)
    g.lineBetween(0, -34, 0, 0)

    this.add(g)
  }
}
