/**
 * FloatingObject — الفئة الأساسية لكل الأجسام العائمة (Bubble, Balloon, Gem, Lantern).
 * توفر: الحركة الصاعدة السلسة + التماوج الجيبي الأفقي + التحكم بسرعة التصاعد،
 * والتفاعل عند الضغط (فرقعة: جزيئات + صوت + اهتزاز + حدث زيادة الرصيد).
 */
import Phaser from 'phaser'
import { playPop } from '../../services/audio'
import { vibrate } from '../../services/haptics'
import { emitGoldBurst } from './ParticleBurst'
import { Events } from '../events'
import { getSpeed } from '../../services/SettingsService'

/** معامل تكبير الأجسام العائمة — 2.0 يعطي حجماً مريحاً للمس دون طغيان على الشاشة. */
const BODY_SCALE = 2.0

export interface FloatingObjectOptions {
  /** معرف الذكر (مثال: "subhanallah"). */
  dhikrId: string
  /** الاسم المعروض للذكر. */
  dhikrName: string
  /** العدد المستهدف لإكمال وِرد الذكر. */
  dhikrTarget: number
  /** السرعة الأساسية للتصاعد بالبكسل/ثانية. */
  speedBase: number
  /** مضاعف السرعة (يتحكم به المولّد عشوائياً أو يدوياً). */
  speedMultiplier: number
  /** سعة التماوج الأفقي. */
  wiggleAmp: number
  /** تردد التماوج (دورة/ثانية). */
  wiggleFreq: number
  /** إزاحة نغمة الصوت عند الفرقعة. */
  popPitch: number
  /** نصف قطر منطقة اللمس. */
  hitRadius: number
}

export abstract class FloatingObject extends Phaser.GameObjects.Container {
  protected readonly opts: FloatingObjectOptions

  private readonly startX: number
  private phase: number
  private popped = false
    /** هل الجسم ما يزال في مرحلة الاندفاع الأولي السريع بعد الظهور؟ */
  private burst = true
  private comboGlow: Phaser.GameObjects.Graphics | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, options: FloatingObjectOptions) {
    super(scene, x, y)

    this.opts = options
    this.startX = x
    this.phase = Phaser.Math.FloatBetween(0, Math.PI * 2)

    // تكبير واضح للجسم ليسهل لمسه
    this.setScale(BODY_SCALE)

    // رفع العمق لضمان تلقي أحداث اللمس قبل الخلفيات والطبقات الزخرفية
    this.setDepth(1500)

    // بيانات التعريف (تُستخدم للفحص الآلي والتنظيف)
    this.setData('dhikrId', options.dhikrId)
    this.setData('dhikrName', options.dhikrName)

    // رسم الشكل الخاص بكل نوع
    this.buildBody()
    this.buildComboVisual()

    // إضاءة Glow ناعمة خلف الجسم لإبرازه في الشاشة
    this.buildGlow(options.hitRadius)
    // نص تشجيعي فوق الفقاعة عند وجود كومبو فعّال
    const combo = Number(scene.data.get('combo') || 0)
    if (combo >= 10 && (combo % 10 === 0 || combo >= 20)) {
      this.add(scene.add.text(0, -options.hitRadius - 22, combo >= 50 ? 'الذكر المتواصل ✨' : 'ممتاز! 🌟', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fef3c7',
      }).setOrigin(0.5).setDepth(2))
    }

    // نص الذكر في منتصف الجسم — خط عربي رشيق مع ظل ناعم
    const label = scene.add
      .text(0, 0, options.dhikrName, {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 115, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0.5)
    label.setShadow(0, 1, 'rgba(0,0,0,0.7)', 4, true, true)
    label.setStroke('#0a0f1e', 2)
    this.add(label)

    // منطقة لمس دائرية مركزة 100% على مركز المجسم:
    // الإحداثيات المحلية للدائرة تُضرب في scale (2.6) عند تحويل Phaser لها لإحداثيات دولية،
    // لذلك نقسم على BODY_SCALE للحصول على المقياس المحلي الصحيح المطابق للجسم المرئي.
    // نُضيف هامش 12px مقسوماً على BODY_SCALE أيضاً لزيادة مساحة اللمس الفعلية.
    const localHitR = options.hitRadius / BODY_SCALE + 12
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, localHitR),
      Phaser.Geom.Circle.Contains,
    )
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.handlePointerDown, this)

    // اندفاع أولي سريع: الوصول إلى ربع ارتفاع الشاشة خلال 175ms ثم الانتقال للسرعة العادية
    this.startSpawnBurst()

    // الحركة عبر حلقة التحديث؛ وتسجيل الخروج عند التدمير
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this)
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.scene) this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this)
    })
  }

  /** يرسم كل نوع شكله الخاص داخل هذا الأسلوب. */
  protected abstract buildBody(): void

  /**
   * اندفاع الظهور السريع: Tween ينقل الجسم فوراً إلى ربع ارتفاع الشاشة
   * (75% من الأسفل) خلال 175ms، ثم الانتقال الناعم إلى السرعة العادية
   * المحسوبة من شريط التحكم — لسهولة النقر المكرر السريع بدون انتظار.
   */
  private startSpawnBurst(): void {
    const quarterY = this.scene.scale.height * 0.75
    // تجاهل الاندفاع إذا وُلد الجسم أعلى من نقطة الربع أصلاً
    if (this.y <= quarterY) {
      this.burst = false
      return
    }
    this.scene.tweens.add({
      targets: this,
      y: quarterY,
      duration: 175,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.burst = false
      },
    })
  }

  /** هالة إضافية للفقاعات التالية عند بلوغ كومبو 10 أو 20 أو 50. */
  private buildComboVisual(): void {
    const combo = Number(this.scene.data.get('combo') || 0)
    const milestone = combo >= 50 ? 50 : combo >= 20 ? 20 : combo >= 10 ? 10 : 0
    if (!milestone) return
    const color = milestone >= 50 ? 0xfde68a : milestone >= 20 ? 0xc4b5fd : 0x67e8f9
    const glow = this.scene.add.graphics()
    glow.fillStyle(color, 0.16)
    glow.fillCircle(0, 0, this.opts.hitRadius * 1.35)
    glow.lineStyle(3, color, 0.9)
    glow.strokeCircle(0, 0, this.opts.hitRadius * 1.22)
    this.addAt(glow, 0)
    this.comboGlow = glow
    this.scene.tweens.add({ targets: glow, alpha: { from: 0.45, to: 1 }, scale: { from: 0.92, to: 1.12 }, yoyo: true, repeat: -1, duration: 480, ease: 'Sine.easeInOut' })
    this.scene.add.particles(this.x, this.y, 'pixel-glow', { speed: { min: 30, max: 85 }, angle: { min: 0, max: 360 }, lifespan: 650, scale: { start: 0.28, end: 0 }, tint: color, quantity: 1, frequency: 180, blendMode: 'ADD' }).setDepth(1499)
  }

  /** هالة توهج ناعمة خلف الجسم لإبرازه بصرياً — تُرسم بعد buildBody. */
  protected buildGlow(hitRadius: number): void {
    const glowColor = this.getGlowColor()
    const glow = this.scene.add.graphics()
    // طبقتان من التوهج: داخلية كثيفة وخارجية شفيفة
    glow.fillStyle(glowColor, 0.30)
    glow.fillCircle(0, 0, hitRadius * 0.85)
    glow.fillStyle(glowColor, 0.12)
    glow.fillCircle(0, 0, hitRadius * 1.25)
    // إضافة الـ glow كأول طبقة (أسفل الجميع داخل الـ Container)
    this.addAt(glow, 0)

    // حلقة بيضاء رفيعة أنيقة حول حافة الجسم
    const outline = this.scene.add.graphics()
    outline.lineStyle(3, 0xffffff, 0.88)
    outline.strokeCircle(0, 0, hitRadius * 1.0)
    outline.lineStyle(1, 0xffffff, 0.35)
    outline.strokeCircle(0, 0, hitRadius * 1.1)
    this.addAt(outline, 1)

    // نبض خفيف ناعم للهالة
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.9, to: 0.4 },
      scale: { from: 1, to: 1.1 },
      yoyo: true,
      repeat: -1,
      duration: 2000,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 900),
    })
  }

  /** لون هالة الإضاءة — كل نوع يستطيع تجاوزه؛ الافتراضي أخضر فسفوري زاهٍ جداً. */
  protected getGlowColor(): number {
    return 0x39ff14 // فسفوري نيون صريح لتمييز التغيير فوراً
  }

  private onUpdate(_time: number, delta: number): void {
    if (!this.active) return
    if (this.scene.data.get('paused') === true) return
    // أثناء الاندفاع الأولي يتحكم الـ Tween بالحركة رأسياً — نتركه يعمل فقط
    if (this.burst) return
    const dt = delta / 1000

    // تصاعد سلس نحو الأعلى
    this.y -= this.opts.speedBase * getSpeed() * dt

    // تماوج أفقي جيبي
    this.phase += this.opts.wiggleFreq * dt
    this.x = this.startX + Math.sin(this.phase * Math.PI * 2) * this.opts.wiggleAmp
    this.rotation = Math.sin(this.phase * Math.PI * 2) * 0.05

    // تنظيف: تدمير أي جسم خرج من أعلى الشاشة
    if (this.y < -this.opts.hitRadius * 3) {
      this.destroy()
    }
  }

  private handlePointerDown(): void {
    if (this.popped || !this.active) return
    this.popped = true
    this.setData('collected', true)
    this.disableInteractive()

    // 1) جزيئات ذهبية متطايرة
    emitGoldBurst(this.scene, this.x, this.y)

    // 2) صوت الفرقعة الناعم
    playPop({ pitch: this.opts.popPitch, volume: 0.9 })

    // 3) اهتزاز خفيف
    vibrate(15)

    // 4) حدث زيادة الرصيد للذكر المحدد
    this.scene.events.emit(Events.DHIKR_COLLECTED, {
      id: this.opts.dhikrId,
      name: this.opts.dhikrName,
      target: this.opts.dhikrTarget,
    })

    // اختفاء فوري ناعم (تكبير خفيف + تلاشي ثم تدمير)
    this.scene.tweens.add({
      targets: this,
      scale: BODY_SCALE * 1.35,
      alpha: 0,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    })
  }
}
