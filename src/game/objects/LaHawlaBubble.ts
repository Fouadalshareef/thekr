/**
 * LaHawlaBubble — فقاعة أرجوانية زجاجية (Deep Purple Glassmorphism)
 * لذكر: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ".
 * الألوان: أرجواني عميق زجاجي + هالة ضوانية بنفسجية متدرجة.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

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
    })
  }

  protected getGlowColor(): number {
    return 0xa78bfa // بنفسجي فاتح متوهج
  }

  protected buildBody(): void {
    const g = this.scene.add.graphics()

    // هالة بنفسجية خارجية متدرجة (Glassmorphism base)
    g.fillStyle(0x7c3aed, 0.06)
    g.fillCircle(0, 0, 60)
    g.fillStyle(0x7c3aed, 0.1)
    g.fillCircle(0, 0, 52)
    g.fillStyle(0x8b5cf6, 0.15)
    g.fillCircle(0, 0, 46)

    // جسم الفقاعة الزجاجي (أرجواني عميق شفاف)
    g.fillStyle(0x7c3aed, 0.85)
    g.fillCircle(0, 0, 36)

    // طبقة زجاجية داخلية (تأثير الانكسار)
    g.fillStyle(0x8b5cf6, 0.5)
    g.fillCircle(0, 0, 28)
    g.fillStyle(0xa78bfa, 0.3)
    g.fillCircle(0, 0, 20)
    g.fillStyle(0xc4b5fd, 0.2)
    g.fillCircle(0, 0, 12)

    // درع مربع مائل متدرج في المركز — هوية بصرية مستقلة لذكر لا حول
    const shieldGlow = this.scene.add.graphics()
    shieldGlow.fillStyle(0xc4b5fd, 0.18)
    shieldGlow.fillRoundedRect(-17, -17, 34, 34, 5)
    shieldGlow.setRotation(Math.PI / 4)
    this.add(shieldGlow)
    const shield = this.scene.add.graphics()
    shield.fillStyle(0x4c1d95, 0.95)
    shield.fillRoundedRect(-14, -14, 28, 28, 4)
    shield.setRotation(Math.PI / 4)
    shield.lineStyle(2, 0xe9d5ff, 0.95)
    shield.strokeRoundedRect(-14, -14, 28, 28, 4)
    shield.fillStyle(0xa78bfa, 0.55)
    shield.fillTriangle(-7, -7, 7, -7, 7, 7)
    shield.setRotation(Math.PI / 4)
    this.add(shield)

    // حد زجاجي أبيض شفاف (Glassmorphism edge)
    g.lineStyle(3, 0xffffff, 0.6)
    g.strokeCircle(0, 0, 36)
    g.lineStyle(1, 0xffffff, 0.25)
    g.strokeCircle(0, 0, 38)

    // لمعة زجاجية علوية (انعكاس ضوئي)
    g.fillStyle(0xffffff, 0.7)
    g.fillEllipse(-11, -15, 12, 8)
    g.fillStyle(0xffffff, 0.35)
    g.fillEllipse(-6, -9, 6, 4)
    g.fillStyle(0xffffff, 0.2)
    g.fillEllipse(8, -18, 8, 5)

    // هالة بنفسجية داخلية متوهجة
    g.fillStyle(0xa78bfa, 0.15)
    g.fillCircle(-15, 10, 8)
    g.fillStyle(0xc4b5fd, 0.12)
    g.fillCircle(14, -8, 6)

    this.add(g)

    // هالة بنفسجية نابضة حول الفقاعة
    const purpleHalo = this.scene.add.graphics()
    purpleHalo.fillStyle(0x8b5cf6, 0.2)
    purpleHalo.fillCircle(0, 0, 50)
    purpleHalo.fillStyle(0xa78bfa, 0.1)
    purpleHalo.fillCircle(0, 0, 58)
    this.addAt(purpleHalo, 0)

    this.scene.tweens.add({
      targets: purpleHalo,
      alpha: { from: 0.8, to: 0.3 },
      scale: { from: 1, to: 1.12 },
      yoyo: true,
      repeat: -1,
      duration: 2200,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 800),
    })
  }
}
