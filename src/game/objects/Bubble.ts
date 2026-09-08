/**
 * Bubble — فقاعة مائية زبرجدية (Teal/Cyan) برّاقة لذكر: "سُبْحَانَ الله".
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

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
    })
  }

  protected getGlowColor(): number {
    return 0x18ffff // فسفوري سماوي متوهج
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // هالة خارجية ناعمة
    g.fillStyle(0x00ffff, 0.4)
    g.fillCircle(0, 0, 48)

    // جسم الفقاعة بألوان زاهية جداً
    g.fillStyle(0x06b6d4, 0.95)
    g.fillCircle(0, 0, 32)

    // حد خارجي سميك وواضح (4px الأبيض الناصع كما طُلب)
    g.lineStyle(4, 0xffffff, 1)
    g.strokeCircle(0, 0, 32)

    // قلب مضيء داخلي
    g.fillStyle(0x67e8f9, 0.5)
    g.fillCircle(0, 0, 18)

    // لمعة
    g.fillStyle(0xffffff, 0.9)
    g.fillEllipse(-9, -13, 12, 8)
    g.fillStyle(0xffffff, 0.6)
    g.fillEllipse(-4, -6, 6, 4)

    this.add(g)

    // بريق متلألئ (نجمة تلمع بلا توقف)
    const spark = this.scene.add.graphics()
    this.scene.tweens.add({
      targets: spark,
      alpha: { from: 1, to: 0.15 },
      yoyo: true,
      repeat: -1,
      duration: 700,
      delay: Phaser.Math.Between(0, 600),
    })
    spark.fillStyle(0xfef3c7, 1)
    spark.fillPoints(
      [
        { x: 14, y: -24 },
        { x: 17, y: -21 },
        { x: 14, y: -18 },
        { x: 11, y: -21 },
      ],
      true,
    )
    this.add(spark)
  }
}
