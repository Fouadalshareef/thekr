/**
 * SubhanallahWaBihamdihBubble — فقاعة فيروزية زاهية (Cyan / Turquoise Gradient)
 * لذكر: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ".
 * الألوان: فيروزي متدرج + خطوط بيضاء ناصعة + توهج ضوائي مائي.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

export default class SubhanallahWaBihamdihBubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'subhanallah-wa-bihamdih',
      dhikrName: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      dhikrTarget: 100,
      speedBase: 72,
      speedMultiplier: 1,
      wiggleAmp: 24,
      wiggleFreq: 2.0,
      popPitch: 2,
      hitRadius: 42,
      ...override,
    })
  }

  protected getGlowColor(): number {
    return 0x22d3ee // فيروزي متوهج
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // هالة مائية خارجية متدرجة
    g.fillStyle(0x06b6d4, 0.08)
    g.fillCircle(0, 0, 58)
    g.fillStyle(0x06b6d4, 0.14)
    g.fillCircle(0, 0, 50)
    g.fillStyle(0x0891b2, 0.2)
    g.fillCircle(0, 0, 44)

    // جسم الفقاعة الفيروزية الأساسية
    g.fillStyle(0x06b6d4, 0.92)
    g.fillCircle(0, 0, 36)

    // تدرج فيروزي داخلي (أغمق للخارج، أفتح للداخل)
    g.fillStyle(0x0891b2, 0.6)
    g.fillCircle(0, 0, 30)
    g.fillStyle(0x22d3ee, 0.45)
    g.fillCircle(0, 0, 22)
    g.fillStyle(0x67e8f9, 0.3)
    g.fillCircle(0, 0, 14)

    // قطرة ماء/هلال ناصع في المركز — رمز فيروزي ناعم للتسبيح
    const dropGlow = this.scene.add.graphics()
    dropGlow.fillStyle(0xecfeff, 0.18)
    dropGlow.fillEllipse(0, 4, 25, 32)
    this.add(dropGlow)
    const drop = this.scene.add.graphics()
    drop.fillStyle(0x99f6e4, 0.9)
    drop.beginPath()
    drop.moveTo(0, -16)
    drop.lineTo(12, 2)
    drop.arc(0, 2, 12, 0, Math.PI, false)
    drop.arc(0, 2, 12, Math.PI, Math.PI * 2, false)
    drop.closePath()
    drop.fillPath()
    drop.lineStyle(2, 0xecfeff, 0.95)
    drop.strokePath()
    // هلال صغير داخل القطرة لتمييز الرمز بصرياً
    drop.fillStyle(0x0e7490, 0.75)
    drop.fillCircle(2, 1, 7)
    drop.fillStyle(0x99f6e4, 1)
    drop.fillCircle(6, -2, 7)
    this.add(drop)

    // خطوط بيضاء ناصعة (أشعة مائية)
    g.lineStyle(2, 0xffffff, 0.7)
    g.lineBetween(0, -36, 0, -28)
    g.lineBetween(0, 28, 0, 36)
    g.lineBetween(-36, 0, -28, 0)
    g.lineBetween(28, 0, 36, 0)

    // خطوط بيضاء قطرية ناصعة
    g.lineStyle(1.5, 0xffffff, 0.5)
    g.lineBetween(-25, -25, -20, -20)
    g.lineBetween(25, -25, 20, -20)
    g.lineBetween(-25, 25, -20, 20)
    g.lineBetween(25, 25, 20, 20)

    // حد خارجي أبيض ناصع
    g.lineStyle(4, 0xffffff, 1)
    g.strokeCircle(0, 0, 36)

    // لمعة مائية علوية
    g.fillStyle(0xffffff, 0.9)
    g.fillEllipse(-10, -14, 11, 7)
    g.fillStyle(0xffffff, 0.5)
    g.fillEllipse(-5, -8, 6, 4)
    g.fillStyle(0xecfeff, 0.35)
    g.fillEllipse(8, -18, 7, 5)

    this.add(g)

    // توهج مائي ناسب يدور ببطء
    const waterGlow = this.scene.add.graphics()
    waterGlow.fillStyle(0x22d3ee, 0.15)
    waterGlow.fillCircle(0, 0, 48)
    waterGlow.fillStyle(0x67e8f9, 0.08)
    waterGlow.fillCircle(0, 0, 56)
    this.addAt(waterGlow, 0)

    this.scene.tweens.add({
      targets: waterGlow,
      alpha: { from: 0.7, to: 0.25 },
      scale: { from: 1, to: 1.1 },
      yoyo: true,
      repeat: -1,
      duration: 1600,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 700),
    })
  }
}
