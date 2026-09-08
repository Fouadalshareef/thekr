/**
 * SalawatBubble — فقاعة ملكية زمردية فخمة مع توهج ذهبي للصلاة الإبراهيمية.
 * الألوان: أخضر زمردي ملكي + توهج ذهبي فخم + دوائر ناعمة محيطة.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

export default class SalawatBubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'salawat',
      dhikrName: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
      dhikrTarget: 10,
      speedBase: 52,
      speedMultiplier: 1,
      wiggleAmp: 14,
      wiggleFreq: 1.0,
      popPitch: 4,
      hitRadius: 44,
      ...override,
    })
  }

  protected getGlowColor(): number {
    return 0xfacc15 // ذهبي فخم
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // دوائر ناعمة محيطة (هالات متعددة متدرجة)
    g.fillStyle(0x10b981, 0.08)
    g.fillCircle(0, 0, 62)
    g.fillStyle(0x10b981, 0.12)
    g.fillCircle(0, 0, 54)
    g.fillStyle(0x34d399, 0.18)
    g.fillCircle(0, 0, 48)

    // الحلقة الذهبية الخارجية الفخمة
    g.lineStyle(3, 0xfacc15, 0.7)
    g.strokeCircle(0, 0, 44)
    g.lineStyle(1.5, 0xfde68a, 0.4)
    g.strokeCircle(0, 0, 47)

    // جسم الفقاعة الرئيسي (أخضر زمردي ملكي)
    g.fillStyle(0x10b981, 0.92)
    g.fillCircle(0, 0, 36)

    // تدرج زمردي داخلي (أخضر أفتح في المركز)
    g.fillStyle(0x34d399, 0.6)
    g.fillCircle(0, 0, 26)
    g.fillStyle(0x6ee7b7, 0.35)
    g.fillCircle(0, 0, 16)

    // نجمة ثمانية/زهرة إسلامية في المركز — رمز مميز للصلاة الإبراهيمية
    const starGlow = this.scene.add.graphics()
    starGlow.fillStyle(0xfacc15, 0.22)
    starGlow.fillCircle(0, 0, 19)
    this.add(starGlow)
    const star = this.scene.add.graphics()
    const starPoints: Phaser.Geom.Point[] = []
    for (let i = 0; i < 16; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 8
      const radius = i % 2 === 0 ? 17 : 8
      starPoints.push(new Phaser.Geom.Point(Math.cos(angle) * radius, Math.sin(angle) * radius))
    }
    star.fillStyle(0x166534, 0.98)
    star.fillPoints(starPoints, true)
    star.lineStyle(2, 0xfde68a, 0.95)
    star.strokePoints(starPoints, true)
    star.fillStyle(0xfacc15, 0.7)
    star.fillCircle(0, 0, 4)
    this.add(star)

    // حد خارجي أبيض ناصع
    g.lineStyle(4, 0xffffff, 1)
    g.strokeCircle(0, 0, 36)

    // توهج ذهبي داخلي (نقاط ذهبية صغيرة)
    g.fillStyle(0xfacc15, 0.8)
    g.fillCircle(-18, -18, 4)
    g.fillStyle(0xfde68a, 0.6)
    g.fillCircle(20, -12, 3)
    g.fillStyle(0xfacc15, 0.5)
    g.fillCircle(-10, 20, 3)
    g.fillStyle(0xfde68a, 0.7)
    g.fillCircle(15, 16, 2.5)

    // لمعة علوية بيضاء
    g.fillStyle(0xffffff, 0.85)
    g.fillEllipse(-10, -14, 10, 7)
    g.fillStyle(0xffffff, 0.5)
    g.fillEllipse(-5, -8, 5, 3)

    this.add(g)

    // حلقة ذهبية نابضة
    const goldRing = this.scene.add.graphics()
    goldRing.lineStyle(2, 0xfacc15, 0.5)
    goldRing.strokeCircle(0, 0, 44)
    this.add(goldRing)
    this.scene.tweens.add({
      targets: goldRing,
      alpha: { from: 0.6, to: 0.1 },
      scale: { from: 1, to: 1.15 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    })
  }
}
