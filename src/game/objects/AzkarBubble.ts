/**
 * AzkarBubble.ts — بطاقة تتابعية لأذكار الصباح والمساء.
 * تعرض النص الكامل للذكر مع مؤشر التكرار المطلوب.
 * لا تتحرك عمودياً — تجلس مستقرة في وسط الشاشة.
 * عند النقر تُحصى مرة واحدة وتُشعِل حدث DHIKR_COLLECTED.
 */
import Phaser from 'phaser'
import { playPop } from '../../services/audio'
import { vibrate } from '../../services/haptics'
import { emitGoldBurst } from './ParticleBurst'
import { Events } from '../events'
import type { AzkarItem } from '../../services/AzkarDB'

export default class AzkarBubble extends Phaser.GameObjects.Container {
  private popped = false
  private item: AzkarItem
  private countRemaining: number
  private counterLabel!: Phaser.GameObjects.Text
  private readonly cardW = 300
  private readonly cardH = 220

  constructor(scene: Phaser.Scene, x: number, y: number, item: AzkarItem) {
    super(scene, x, y)
    this.item = item
    this.countRemaining = item.count
    this.setDepth(1500)
    this.buildCard()
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.cardW / 2 - 10, -this.cardH / 2 - 10, this.cardW + 20, this.cardH + 20),
      Phaser.Geom.Rectangle.Contains,
    )
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.handleTap, this)
    // ظهور ناعم
    this.setAlpha(0)
    this.setScale(0.85)
    scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 380,
      ease: 'Back.easeOut',
    })
  }

  /** هل يُعدّ هذا الجسم "مجموعاً" في تتبع alive؟ — دائماً false لأنه يتحكم بنفسه. */
  getData(key: string): unknown {
    if (key === 'collected') return this._collected
    return super.getData(key)
  }
  private _collected = false

  private buildCard(): void {
    const { cardW, cardH } = this
    const g = this.scene.add.graphics()

    // ظل
    g.fillStyle(0x000000, 0.35)
    g.fillRoundedRect(-cardW / 2 + 4, -cardH / 2 + 6, cardW, cardH, 22)

    // خلفية البطاقة (أزرق ليلي عميق متدرج)
    g.fillStyle(0x0f2057, 0.97)
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22)

    // لمعة علوية
    g.fillStyle(0x3b82f6, 0.22)
    g.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH * 0.38, 18)

    // حد ذهبي
    g.lineStyle(2.5, 0xfbbf24, 0.9)
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22)

    // حد داخلي أبيض ناعم
    g.lineStyle(1, 0xffffff, 0.18)
    g.strokeRoundedRect(-cardW / 2 + 7, -cardH / 2 + 7, cardW - 14, cardH - 14, 17)

    this.add(g)

    // نص الذكر
    const label = this.scene.add
      .text(0, -22, this.item.text, {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f0f9ff',
        align: 'center',
        wordWrap: { width: cardW - 28, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0.5)
    label.setShadow(0, 1, 'rgba(0,0,0,0.8)', 3, true, true)
    this.add(label)

    // عداد المرات المتبقية
    this.counterLabel = this.scene.add
      .text(0, cardH / 2 - 28, this.getCounterText(), {
        fontFamily: 'Consolas, "Segoe UI", monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fbbf24',
        align: 'center',
      })
      .setOrigin(0.5)
    this.add(this.counterLabel)

    // مؤشر "اضغط"
    const hint = this.scene.add
      .text(0, cardH / 2 + 14, '« اضغط لإتمام الذكر »', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '13px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
    this.add(hint)

    // نبض خفيف
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.025 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    })
  }

  private getCounterText(): string {
    if (this.item.count === 1) return '× مرة واحدة'
    return `× ${this.countRemaining} / ${this.item.count}`
  }

  private handleTap(): void {
    if (this.scene.data.get('paused') === true) return
    if (this.popped || !this.active) return

    // اهتزاز وصوت
    playPop({ pitch: 0.3, volume: 0.8 })
    vibrate(12)

    // جزيئات
    emitGoldBurst(this.scene, this.x, this.y)

    // إشعار الجمع
    this._collected = true
    this.scene.events.emit(Events.DHIKR_COLLECTED, {
      id: this.item.id,
      name: this.item.text,
      target: this.item.count,
    })

    this.countRemaining -= 1
    if (this.countRemaining > 0) {
      // تحديث العداد فقط
      this.counterLabel.setText(this.getCounterText())
      // نبضة لإشعار المستخدم
      this.scene.tweens.add({
        targets: this,
        scale: { from: 1.06, to: 1 },
        duration: 180,
        ease: 'Back.easeOut',
      })
      this._collected = false
    } else {
      // اكتمل هذا الذكر — تلاشٍ ثم تدمير
      this.popped = true
      this.disableInteractive()
      this.scene.tweens.add({
        targets: this,
        scale: 1.2,
        alpha: 0,
        duration: 250,
        ease: 'Quad.easeOut',
        onComplete: () => this.destroy(),
      })
    }
  }
}
