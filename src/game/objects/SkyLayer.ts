/**
 * SkyLayer — طبقة السماء الديناميكية:
 * ترسم خلفية متدرجة حسب الوقت الواقعي (فجر/نهار/غروب/ليل) مع:
 *  - شمس مشرقة نهارية أو هلال ليلي هادئ.
 *  - نجوم تتلألأ في الفجر/الغروب/الليل.
 *  - غيوم قطنية تنجرف ببطء في النهار.
 * يمكن إعادة بنائها تلقائياً عند تغيّر الفترة عبر updateTheme().
 */
import Phaser from 'phaser'
import { getTimeTheme, type TimeTheme } from '../../services/TimeThemeService'

export default class SkyLayer extends Phaser.GameObjects.Container {
  private theme: TimeTheme
  private bg!: Phaser.GameObjects.Graphics
  private backgroundImage?: Phaser.GameObjects.Image
  private stars: Phaser.GameObjects.Arc[] = []
  private glow?: Phaser.GameObjects.Graphics
  private clouds: Phaser.GameObjects.Container[] = []

  constructor(scene: Phaser.Scene, forced?: TimeTheme) {
    super(scene, 0, 0)
    this.setDepth(-20)
    scene.add.existing(this)
    this.theme = forced ?? getTimeTheme()
    this.build()
  }

  /** إعادة تكيّف السماء مع فترة جديدة (تبديل سلس بدون إعادة تشغيل). */
  updateTheme(forced?: TimeTheme): void {
    const next = forced ?? getTimeTheme()
    if (next.period === this.theme.period) return
    this.theme = next
    this.build()
  }

  /** البناء/إعادة البناء الكامل لطبقة السماء. */
  private build(): void {
    this.removeAll(true)
    this.stars = []
    this.clouds = []

    const { width, height } = this.scene.scale
    const hour = new Date().getHours()
    const period: 'dawn' | 'day' | 'sunset' | 'night' = hour >= 5 && hour <= 8 ? 'dawn' : hour >= 9 && hour <= 16 ? 'day' : hour >= 17 && hour <= 19 ? 'sunset' : 'night'

    // 1) خلفية mor.png ثابتة بالكامل؛ السحاب جزء من الصورة ولا توجد طبقة Parallax فوقها.
    //    — الفجر/النهار/الغروب تستخدم صورة النهار، والليل يستخدم صورة المساء.
    //    في حال عدم توفر الصورة يبقى التدرج اللوني كاحتياط.
    const bgKey = 'bg-mor-static'
    if (this.scene.textures.exists(bgKey)) {
      const img = this.scene.textures.get(bgKey).getSourceImage()
      const cover = Math.max(width / img.width, height / img.height)
      this.backgroundImage = this.scene.add.image(width / 2, height / 2, bgKey).setOrigin(0.5).setDisplaySize(img.width * cover, img.height * cover)
      this.add(this.backgroundImage)

      const tint = this.scene.add.graphics()
      if (period === 'night') tint.fillStyle(0x1a237e, 0.48)
      else if (period === 'sunset') tint.fillStyle(0xff7043, 0.22)
      else if (period === 'dawn') tint.fillStyle(0xffb74d, 0.18)
      else tint.fillStyle(0xffffff, 0)
      tint.fillRect(0, 0, width, height)
      this.add(tint)

      // توهج نبضي علوي لا يحرّك الخلفية أو السحاب المدمج داخلها.
      this.glow = this.scene.add.graphics()
      this.glow.fillStyle(0xffd27d, period === 'night' ? 0.04 : 0.16)
      this.glow.fillCircle(width * 0.78, height * 0.12, Math.min(width, height) * 0.18)
      this.add(this.glow)
      this.scene.tweens.add({ targets: this.glow, alpha: { from: 0.55, to: 1 }, scale: { from: 0.96, to: 1.06 }, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.easeInOut' })
    } else {
      // احتياط: خلفية متدرجة ثلاثية (أعلى/وسط/أسفل)
      this.bg = this.scene.add.graphics()
      this.bg.fillGradientStyle(this.theme.top, this.theme.top, this.theme.middle, this.theme.bottom, 1)
      this.bg.fillRect(0, 0, width, height)
      this.add(this.bg)
    }

    // 2) نجوم تتلألأ
    if (period === 'night') {
      for (let i = 0; i < 90; i++) {
        const x = Phaser.Math.Between(0, width)
        const y = Phaser.Math.Between(0, height * 0.7)
        const alpha = Phaser.Math.FloatBetween(0.2, 1) * this.theme.starAlpha
        if (alpha <= 0.01) continue
        const star = this.scene.add.circle(x, y, Phaser.Math.FloatBetween(0.6, 2), 0xffffff, alpha)
        this.scene.tweens.add({
          targets: star,
          alpha: { from: alpha, to: 0.03 },
          yoyo: true,
          repeat: -1,
          duration: Phaser.Math.Between(1400, 4200),
          delay: Phaser.Math.Between(0, 2000),
        })
        this.stars.push(star)
        this.add(star)
      }
    }

    // السحاب مدمج داخل mor.png ويظل ثابتاً؛ لا نبني أي طبقات سحاب متحركة.
  }

  /**
   * غيوم ناعمة لطيفة كخلفية هادئة:
   *  - ثلاث طبقات Parallax صغيرة وبطيئة وغير متراكمة.
   *  - تُرسَم بتغطية معتمة (Alpha 1 داخل الرسم) وتُضبط الشفافية على الحاوية كلها
   *    حتى لا تظهر دوائر متداخلة شفافة مشوّهة خلفها.
   */
  private buildCloud(width: number, height: number): void {
    // الطبقة البعيدة: صغيرة جداً وبطيئة
    this.spawnCloudLayer(width, {
      sizeScale: 0.45,
      alphaBase: 0.3,
      speedMin: 60000,
      speedMax: 95000,
      yMin: height * 0.04,
      yMax: height * 0.2,
    })
    // الطبقة الوسطى
    this.spawnCloudLayer(width, {
      sizeScale: 0.65,
      alphaBase: 0.42,
      speedMin: 42000,
      speedMax: 68000,
      yMin: height * 0.07,
      yMax: height * 0.28,
    })
    // الطبقة الأمامية: الأكبر نسبياً لكن هادئة
    this.spawnCloudLayer(width, {
      sizeScale: 0.9,
      alphaBase: 0.55,
      speedMin: 28000,
      speedMax: 48000,
      yMin: height * 0.05,
      yMax: height * 0.3,
    })
  }

  /** رسم غيمة ناعمة واحدة (شكل مسطّح نظيف بدون دوائر شفافة متداخلة). */
  private spawnCloudLayer(
    width: number,
    opts: {
      sizeScale: number
      alphaBase: number
      speedMin: number
      speedMax: number
      yMin: number
      yMax: number
    },
  ): void {
    const s = opts.sizeScale
    const y = Phaser.Math.Between(Math.round(opts.yMin), Math.round(opts.yMax))
    const speed = Phaser.Math.Between(opts.speedMin, opts.speedMax)
    const dir = Math.random() > 0.5 ? 1 : -1
    const startX = dir === 1 ? -160 * s : width + 160 * s
    const endX = dir === 1 ? width + 160 * s : -160 * s

    const cloud = this.scene.add.container(startX, y)

    const isDay = this.theme.period === 'day'
    const baseColor = isDay ? 0xffffff : 0xc9d6e8
    const shadeColor = isDay ? 0xd7e3f4 : 0xa8bad2

    // طبقة الظل السفلي (معتمة داخلياً — تشوف فوقها الجسم المعتم فلا تظهر التداخلات)
    const shade = this.scene.add.graphics()
    shade.fillStyle(shadeColor, 1)
    shade.fillCircle(2 * s, 8 * s, 22 * s)
    shade.fillCircle(26 * s, 10 * s, 17 * s)
    shade.fillRoundedRect(-22 * s, 0 * s, 74 * s, 14 * s, 7 * s)

    // جسم الغيمة: قبة ناعمة + قاعدة مستديرة، كلها بلون واحد معتم
    const body = this.scene.add.graphics()
    body.fillStyle(baseColor, 1)
    body.fillCircle(0, 0, 22 * s)
    body.fillCircle(24 * s, -4 * s, 16 * s)
    body.fillCircle(44 * s, 2 * s, 12 * s)
    body.fillRoundedRect(-20 * s, -4 * s, 80 * s, 18 * s, 9 * s)
    // لمعة علوية صغيرة
    body.fillStyle(0xffffff, 1)
    body.fillEllipse(12 * s, -12 * s, 34 * s, 8 * s)

    cloud.add([shade, body])
    // الشفافية النهائية تُطبَّق على الحاوية كاملة (بلا تداخل بين الأشكال)
    cloud.setAlpha(opts.alphaBase)

    this.scene.tweens.add({
      targets: cloud,
      x: endX,
      duration: speed,
      repeat: -1,
      delay: Phaser.Math.Between(0, 12000),
      ease: 'Linear',
      onRepeat: () => {
        cloud.y = Phaser.Math.Between(Math.round(opts.yMin), Math.round(opts.yMax))
        cloud.x = dir === 1 ? -160 * s : width + 160 * s
      },
    })
    this.clouds.push(cloud)
    this.add(cloud)
  }
}

