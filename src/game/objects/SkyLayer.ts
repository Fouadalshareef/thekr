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
import { getGardenState } from '../../services/GardenService'

export default class SkyLayer extends Phaser.GameObjects.Container {
  private theme: TimeTheme
  private bg!: Phaser.GameObjects.Graphics
  private backgroundImage?: Phaser.GameObjects.Image
  private stars: Phaser.GameObjects.Arc[] = []
  private glow?: Phaser.GameObjects.Graphics

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

    const { width, height } = this.scene.scale
    const hour = new Date().getHours()
    const period: 'dawn' | 'day' | 'sunset' | 'night' = hour >= 5 && hour <= 8 ? 'dawn' : hour >= 9 && hour <= 16 ? 'day' : hour >= 17 && hour <= 19 ? 'sunset' : 'night'

    // 1) خلفية المرحلة الأولى (صحراء) وثانية (عشب أخضر) بحركية بحسب التوقيت المحلي للجهاز:
    //    المرحلة 1 (صحراء): النهار (6:00→17:59): mor.jfif | الليل (18:00→5:59): ni.jfif.
    //    المرحلة 2 (عشب أخضر): النهار (6:00→17:59): green_grass_mor.jfif | الليل (18:00→5:59): green_grass_ni.jfif.
    //    المرحلة الثالثة وما بعدها: خلفية mor.png الثابتة دائماً.
    const stage1 = getGardenState().level <= 1 // المرحلة الأولى (صحراء) حصراً
    const stage2 = getGardenState().level === 2 // المرحلة الثانية (عشب أخضر) حصراً
    const isDaytime = hour >= 6 && hour < 18
    let bgKey: string
    if (stage2) {
      // ملء الشاشة بكامل الأبعاد باستخدام خلفيات عشب أخضر (المرحلة الثانية)
      bgKey = isDaytime ? 'green-grass-mor' : 'green-grass-ni'
    } else if (stage1 && this.scene.textures.exists(isDaytime ? 'bg-mor' : 'bg-ni')) {
      bgKey = isDaytime ? 'bg-mor' : 'bg-ni'
    } else {
      bgKey = 'bg-mor-static'
    }
    if (this.scene.textures.exists(bgKey)) {
      const img = this.scene.textures.get(bgKey).getSourceImage()
      const cover = Math.max(width / img.width, height / img.height)
      this.backgroundImage = this.scene.add.image(width / 2, height / 2, bgKey).setOrigin(0.5).setDisplaySize(img.width * cover, img.height * cover)
      this.add(this.backgroundImage)

      const tint = this.scene.add.graphics()
      // الخلفية الصحراوية الليلية ni.jfif داكنة أصلاً — نُخفف التظليل عليها،
      // بينما mor.jfif (النهار/الغروب) نُظللها كالمعتاد
      if (period === 'night') tint.fillStyle(0x1a237e, bgKey === 'bg-ni' ? 0.18 : 0.48)
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
}

