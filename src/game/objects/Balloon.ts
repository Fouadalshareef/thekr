/**
 * Balloon — بالون ذهبي دافئ (Golden Amber) لذكر: "الْحَمْدُ لِلَّه".
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

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
    })
  }

  protected getGlowColor(): number {
    return 0xffe600 // ذهبي فسفوري نيون
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // هالة خارجية
    g.fillStyle(0xf59e0b, 0.14)
    g.fillEllipse(0, -4, 76, 94)

    // جسم البالون
    g.fillStyle(0xf59e0b, 0.92)
    g.fillEllipse(0, -4, 60, 78)
    g.lineStyle(4, 0xffffff, 1)
    g.strokeEllipse(0, -4, 60, 78)

    // لمعة علوية
    g.fillStyle(0xffffff, 0.4)
    g.fillEllipse(-13, -22, 13, 20)

    // العقدة
    g.fillStyle(0xf59e0b, 0.95)
    g.fillTriangle(-8, 34, 8, 34, 0, 46)

    // الخيط المتمايل
    g.lineStyle(2, 0xfcd34d, 1)
    g.beginPath()
    g.moveTo(0, 46)
    g.lineTo(-3, 66)
    g.lineTo(3, 86)
    g.lineTo(-2, 104)
    g.strokePath()

    this.add(g)
  }
}
