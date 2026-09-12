import Phaser from 'phaser'

/**
 * BootScene — شاشة بدء التجربة.
 * تعرض خلفية متدرجة ونص اللعبة للتأكد من أن محرك Phaser يعمل بدون أخطاء.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    // تحميل صور اللعبة: الأيقونة وخلفيتي النهار/الليل للمرحلة الصحراوية
    this.load.image('game-logo', 'game/logo.jfif')
    this.load.image('bg-mor', 'game/mor.jfif') // احتياط نهاري
    this.load.image('bg-ni', 'game/ni.jfif') // احتياط ليلي
    this.load.image('bg-mor-static', 'game/mor.png') // خلفية الصحراء الثابتة بسحاب مدمج
    // أصول SVG شفافة عالية الجودة لأزرار HUD (تُحوّل Phaser داخلياً إلى Textures).
    // تحميل الأيقونات بدقة مضاعفة (×2) لضمان حدّة عالية عند التوسيع على شاشات Retina/HD
    this.load.svg('hud-settings', 'game/icons/settings-v2.svg', { width: 128, height: 128 })
    this.load.svg('hud-theme',    'game/icons/theme-v2.svg',    { width: 128, height: 128 })
    this.load.svg('hud-farm',     'game/icons/farm-v2.svg',     { width: 128, height: 128 })
    this.load.svg('hud-quran',    'game/icons/quran-v2.svg',    { width: 128, height: 128 })
    this.load.svg('hud-pause',    'game/icons/pause-v2.svg',    { width: 128, height: 128 })
    this.load.svg('hud-play',     'game/icons/play-v2.svg',     { width: 128, height: 128 })
    this.load.svg('modal-close',  'game/icons/close.svg',    { width: 112, height: 112 })
    this.load.svg('modal-index',  'game/icons/index.svg',    { width: 240, height:  90 })
  }

  create(): void {
    // منع أي انزياح في إحداثيات اللمس بين HTML والـ Canvas
    this.scale.refresh()
    const { width, height } = this.scale
    const cx = width / 2

    // 1) خلفية فاخرة: تدرج عميق (أزرق ليلي → زمردي داكن) بدل الأخضر الصريح
    const background = this.add.graphics()
    background.fillGradientStyle(0x02150f, 0x02150f, 0x062e22, 0x010a14, 1)
    background.fillRect(0, 0, width, height)

    // 2) زخارف هندسية دقيقة (أقواس متحدة المركز شفافة جداً — إحساس فاخر هادئ)
    const decor = this.add.graphics()
    decor.lineStyle(1, 0x34d399, 0.07)
    for (let i = 0; i < 12; i++) {
      decor.strokeCircle(cx, height * 0.42, 120 + i * 55)
    }

    // 3) vignette داكن على الأطراف لتركيز النظر في المنتصف
    const vignette = this.add.graphics()
    vignette.fillStyle(0x000000, 0.22)
    vignette.fillRect(0, 0, width, height * 0.08)
    vignette.fillRect(0, height * 0.92, width, height * 0.08)

    // 4) هالة ضوئية ذهبية ناعمة خلف البطاقة
    const glow = this.add.graphics()
    glow.fillStyle(0xfacc15, 0.04)
    glow.fillCircle(cx, height * 0.38, 210)
    glow.fillStyle(0xfacc15, 0.08)
    glow.fillCircle(cx, height * 0.38, 110)

    // 5) بطاقة ترحيب مركزية أنيقة بحواف مائلة (عرض أوسع لاحتواء العنوان)
    const cardW = Math.min(width * 0.92, 440)
    const cardH = 300
    const cardY = height * 0.38
    const cardPadding = 24
    const card = this.add.graphics()
    card.fillStyle(0x0a1f18, 0.92)
    card.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 24)
    card.lineStyle(2, 0xfacc15, 0.55)
    card.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 24)
    card.lineStyle(1, 0xffffff, 0.12)
    card.strokeRoundedRect(cx - cardW / 2 + 8, cardY - cardH / 2 + 8, cardW - 16, cardH - 16, 18)

    // 6) البسملة أعلى البطاقة
    const bismillah = this.add
      .text(cx, cardY - cardH / 2 + 40, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Arial, sans-serif',
        fontSize: '24px',
        color: '#d1fae5',
      })
      .setOrigin(0.5)
      .setAlpha(0)

    // 7) فاصل زخرفي ذهبي (خط + معين) — فاصل مستقل بين البسملة والعنوان
    //    بهوامش رأسية مريحة (≥ 16px) وخطان أبعد عن النقطة المركزية لمنع التداخل
    const dividerY = cardY - 48
    const divider = this.add.graphics()
    divider.lineStyle(1.5, 0xfacc15, 0.6)
    divider.lineBetween(cx - 95, dividerY, cx - 20, dividerY)
    divider.lineBetween(cx + 20, dividerY, cx + 95, dividerY)
    divider.fillStyle(0xfacc15, 0.9)
    divider.fillPoints(
      [
        { x: cx, y: dividerY - 7 },
        { x: cx + 7, y: dividerY },
        { x: cx, y: dividerY + 7 },
        { x: cx - 7, y: dividerY },
      ],
      true,
    )

    // 8) عنوان التطبيق بخط عربي فاخر وتأثير ذهبي (حجم متجاوب مع لفظ تلقائي)
    const titleFontSize = Math.min(Math.max(Math.floor(cardW * 0.1), 28), 48)
    const title = this.add
      .text(cx, cardY + 8, 'الباقيات الصالحات', {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Arial, sans-serif',
        fontSize: `${titleFontSize}px`,
        fontStyle: 'bold',
        color: '#fef08a',
        align: 'center',
        wordWrap: { width: cardW - cardPadding * 2, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setShadow(0, 4, 'rgba(0,0,0,0.6)', 12, true, true)
    title.setStroke('#713f12', 3)

    // 9) رسالة ترحيبية هادئة
    const subtitle = this.add
      .text(cx, cardY + cardH / 2 - 42, 'طمأنينة القلوب بذكر الله', {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Arial, sans-serif',
        fontSize: '24px',
        color: '#a7f3d0',
      })
      .setOrigin(0.5)
      .setAlpha(0)
    subtitle.setShadow(0, 2, 'rgba(0,0,0,0.5)', 4, true, true)

    // 10) نص "اضغط للبدء" نابض أسفل الشاشة
    const startText = this.add
      .text(cx, height - 110, '« اضغط في أي مكان للبدء »', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '22px',
        color: '#6ee7b7',
      })
      .setOrigin(0.5)
      .setAlpha(0)

    // حركات دخول متسلسلة راقية (Fade In متدرج + طفو خفيف)
    this.tweens.add({ targets: bismillah, alpha: 1, y: '-=8', duration: 1100, ease: 'Power2' })
    this.tweens.add({ targets: title, y: '-=6', alpha: 1, duration: 1400, delay: 400, ease: 'Power3' })
    this.tweens.add({ targets: subtitle, alpha: 1, y: '-=6', duration: 1200, delay: 900, ease: 'Power3' })
    this.tweens.add({
      targets: startText,
      alpha: { from: 0.2, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 1200,
      delay: 1600,
      ease: 'Sine.easeInOut',
    })

    // الانتقال إلى شاشة اللعب: بالضغط مع تأثير انتقال ناعم
    this.input.once('pointerdown', () => {
      this.cameras.main.fadeOut(400, 2, 21, 15)
      this.time.delayedCall(400, () => this.scene.start('MainScene'))
    })

    // تلقائياً بعد 6 ثوانٍ
    this.time.delayedCall(6000, () => {
      if (this.scene.isActive()) {
        this.cameras.main.fadeOut(400, 2, 21, 15)
        this.time.delayedCall(400, () => this.scene.start('MainScene'))
      }
    })
  }
}
