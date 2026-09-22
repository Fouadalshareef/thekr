/**
 * AzkarBubble.ts — بطاقة تتابعية لأذكار الصباح والمساء.
 * تعرض النص الكامل للذكر مع مؤشر التكرار المطلوب.
 * لا تتحرك عمودياً — تجلس مستقرة في وسط الشاشة.
 * عند النقر تُحصى مرة واحدة وتُشعِل حدث DHIKR_COLLECTED.
 */
import Phaser from 'phaser'
import { playDhikrSound } from '../../services/audio'
import { vibrate } from '../../services/haptics'
import { emitGoldBurst } from './ParticleBurst'
import { Events } from '../events'
import type { AzkarItem } from '../../services/AzkarDB'

export default class AzkarBubble extends Phaser.GameObjects.Container {
  private popped = false
  private item: AzkarItem
  private countRemaining: number
  private counterLabel!: Phaser.GameObjects.Text
  private cardW!: number
  private cardH!: number

  constructor(scene: Phaser.Scene, x: number, y: number, item: AzkarItem) {
    super(scene, x, y)
    this.item = item
    this.countRemaining = item.count
    // في المقدمة فوق الأزرار الجانبية (HUD depth ≈ 2000) — مكافئ z-index: 1000+
    this.setDepth(2500)
    // بطاقة أكبر: 90% من عرض الشاشة بحد أقصى 420px (لافتة الأذكار مكبّرة وواضحة)
    const { width, height } = scene.scale
    this.cardW = Math.min(420, width * 0.9)
    this.cardH = Math.min(280, height * 0.36)
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

  /**
   * تعطيل/تفعيل التفاعل مع البطاقة (يُستخدم عند فتح النوافذ المنبثقة).
   * ضرورية لأن MainScene تستدعيها على كل الأجسام الحية أثناء الإيقاف المؤقت.
   */
  public setBubbleInteractive(enabled: boolean): void {
    if (enabled) {
      this.setInteractive(
        new Phaser.Geom.Rectangle(-this.cardW / 2 - 10, -this.cardH / 2 - 10, this.cardW + 20, this.cardH + 20),
        Phaser.Geom.Rectangle.Contains,
      )
    } else {
      this.disableInteractive()
    }
  }

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

    // نص الذكر (خط مكبّر: 1.35rem ≈ 22px، غامق، بتباعد أسطر مريح 1.8)
    const label = this.scene.add
      .text(0, -18, this.item.text, {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#f0f9ff',
        align: 'center',
        wordWrap: { width: cardW - 36, useAdvancedWrap: true },
        lineSpacing: 14,
      })
      .setOrigin(0.5, 0.5)
    label.setShadow(0, 1, 'rgba(0,0,0,0.8)', 3, true, true)
    this.add(label)

    // عداد المرات المتبقية
    this.counterLabel = this.scene.add
      .text(0, cardH / 2 - 34, this.getCounterText(), {
        fontFamily: 'Consolas, "Segoe UI", monospace',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fbbf24',
        align: 'center',
      })
      .setOrigin(0.5)
    this.add(this.counterLabel)

    // مؤشر "اضغط"
    const hint = this.scene.add
      .text(0, cardH / 2 + 16, '« اضغط لإتمام الذكر »', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
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

    // اهتزاز وصوت (صوت الذكر الحقيقي إن وُجد ملف له، وإلا المؤثر الناعم)
    playDhikrSound(`${this.item.id}\n${this.item.text}`, { pitch: 0.3, volume: 0.8 })
    vibrate(12)

    // جزيئات
    emitGoldBurst(this.scene, this.x, this.y)

    // إشعار الجمع
    this.setData('collected', true)
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
      this.setData('collected', false)
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
