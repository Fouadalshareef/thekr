/**
 * Lantern — قنديل ياقوتي أحمر (Ruby Red) لذكر: "اللهُ أَكْبَر".
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

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
    })
  }

  protected getGlowColor(): number {
    return 0xff3355 // أحمر فسفوري متوهج للقنديل
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // هالة حمراء ناعمة
    g.fillStyle(0xef4444, 0.15)
    g.fillCircle(0, -2, 46)

    // جسم القنديل
    g.fillStyle(0xef4444, 0.95)
    g.fillRoundedRect(-24, -38, 48, 68, 18)
    g.lineStyle(4, 0xffffff, 1)
    g.strokeRoundedRect(-24, -38, 48, 68, 18)

    // ضوء داخلي
    g.fillStyle(0xfca5a5, 0.5)
    g.fillCircle(0, 0, 15)

    // الغطاء العلوي
    g.fillStyle(0xdc2626, 1)
    g.fillRoundedRect(-20, -56, 40, 14, 6)

    // القاعدة السفلية
    g.fillRect(-16, 32, 32, 6)

    // شرّابة صغيرة
    g.lineStyle(2, 0xfda4af, 1)
    g.beginPath()
    g.moveTo(0, 38)
    g.lineTo(-2, 50)
    g.lineTo(2, 62)
    g.strokePath()
    g.fillStyle(0xfca5a5, 1)
    g.fillCircle(0, 64, 3)

    // حلقة تعليق علوية مضيئة
    g.lineStyle(3, 0xfecdd3, 0.9)
    g.strokeCircle(0, -62, 6)

    this.add(g)
  }
}
