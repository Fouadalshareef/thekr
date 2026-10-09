import Phaser from 'phaser'
import { configureHighDpiCamera } from '../PhaserGame'
import { setSidebarWelcomeActive } from '../../components/Sidebar'
import { setTopHeaderVisible } from '../../components/TopHeader'
// استيراد عبر Vite: يُصدر الصورة باسم مجزّأ ببصمة المحتوى، فلا يصيبها
// كاش قديم من Service Worker عند استبدال الأصل، كما أنه يعمل مع base:'./'.
import SESSION_FRAME_URL from '../../assets/session-frame.png'
import BANNER_URL from '../../assets/rk-banner.png'
// فقاعة «سبحان الله» — الصورة المولّدة pi/Bubbles/sobhanallah.png مُنسوخة
// إلى src/assets/bubbles/ (استيراد Vite المجزّأ ببصمة المحتوى).
import SOBHAN_ALLAH_BUBBLE_URL from '../../assets/bubbles/sobhanallah.png'

/**
 * BootScene — شاشة بدء التجربة.
 * تعرض خلفية متدرجة ونص اللعبة للتأكد من أن محرك Phaser يعمل بدون أخطاء.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    // تحميل صور اللعبة: الأيقونة وخلفيتي النهار/الليل للمرحلة الصحراوية وخلفية عشب أخضر المرحلة الثانية
    this.load.image('game-logo', 'game/logo.jfif')
    this.load.image('bg-mor', 'game/mor.jfif') // احتياط نهاري (المرحلة 1)
    this.load.image('bg-ni', 'game/ni.jfif') // احتياط ليلي (المرحلة 1)
    this.load.image('bg-mor-static', 'game/mor.png') // خلفية الصحراء الثابتة بسحاب مدمج
    // خلفيات المرحلة الثانية (عشب أخضر) - تمييز برمجي واضح
    this.load.image('green-grass-mor', 'game/green_grass_mor.jfif') // خلفية نهار عشب أخضر
    this.load.image('green-grass-ni', 'game/green_grass_ni.jfif') // خلفية ليل عشب أخضر
    // أيقونات أزرار اللعبة الجديدة (SVG أبيض ناصع — حزمة Game UI Buttons)
    // تُرسم فوق أزرار Phaser المجسّمة (انظر GameButtonSkin.ts) — بلا خلفية ولا إطار
    this.load.svg('hud-settings', 'game/icons/settings-gbtn.svg', { width: 256, height: 256 })
    // Pattern / Farm / Quran: صور PNG جاهزة بدل SVG (مصدرها pi/icons)
    this.load.image('hud-theme',  'icons/icon-pattern.png')
    this.load.image('hud-farm',   'icons/icon-farm.png')
    this.load.image('hud-quran',  'icons/icon-quran.png')
    this.load.svg('hud-pause',    'game/icons/pause-gbtn.svg',    { width: 256, height: 256 })
    this.load.svg('hud-play',     'game/icons/play-gbtn.svg',     { width: 256, height: 256 })
    // أيقونة سهم فتح/طي القائمة الجانبية
    this.load.svg('hud-arrow',    'game/icons/arrow-gbtn.svg',    { width: 256, height: 256 })
    // أيقونات النوافذ (تبقى بتصميمها الذهبي السابق)
    this.load.svg('modal-close',  'game/icons/close.svg',    { width: 112, height: 112 })
    this.load.svg('modal-index',  'game/icons/index.svg',    { width: 240, height:  90 })
    // إطار عدّاد الجلسة (لوحة ذهبية + مربّع كريمي داخلي) — src/assets/session-frame.png
    // يُستورد بمسار Vite المجزّأ ليبقى خارج كاش Service Worker القديم.
    this.load.image('session-frame', SESSION_FRAME_URL)
    this.load.image('hud-banner', BANNER_URL)
    // جسم فقاعة «سبحان الله» — صورة مولّدة بخلفية شفافة (بصمة Vite).
    this.load.image('bubble-subhanallah', SOBHAN_ALLAH_BUBBLE_URL)
  }

  create(): void {
    configureHighDpiCamera(this)
    this.createHudTextures()

    // شاشة الترحيب: يُخفى سهم القائمة الجانبية تماماً (يُعاد إظهاره في MainScene).
    setSidebarWelcomeActive(true)
    // إخفاء الشريط العلوي في شاشة الترحيب (يظهر فقط في MainScene).
    setTopHeaderVisible(false)

    // منع أي انزياح في إحداثيات اللمس بين HTML والـ Canvas
    this.scale.refresh()
    const { width, height } = this.scale
    const cx = width / 2

    // 1) خلفية مضيئة بتدرج عاجي وذهبي متناسق مع واجهة اللعبة.
    const background = this.add.graphics()
    background.fillGradientStyle(0xfff8e8, 0xfff8e8, 0xf4dfad, 0xe9c36f, 1)
    background.fillRect(0, 0, width, height)

    // 2) زخارف هندسية ذهبية رقيقة في الخلفية.
    const decor = this.add.graphics()
    decor.lineStyle(1, 0x98702d, 0.1)
    for (let i = 0; i < 12; i++) {
      decor.strokeCircle(cx, height * 0.42, 120 + i * 55)
    }

    // 3) توهج علوي خفيف جداً (بدون أشرطة داكنة علوية/سفلية — تغطية كاملة 100%)
    void 0

    // 4) هالة ضوئية ذهبية ناعمة خلف البطاقة
    const glow = this.add.graphics()
    glow.fillStyle(0xe4b64f, 0.08)
    glow.fillCircle(cx, height * 0.38, 210)
    glow.fillStyle(0xfff6dd, 0.24)
    glow.fillCircle(cx, height * 0.38, 110)

    // 5) بطاقة ترحيب مركزية أنيقة بحواف مائلة (عرض أوسع لاحتواء العنوان)
    const cardW = Math.min(width * 0.92, 440)
    const cardH = 300
    const cardY = height * 0.38
    const cardPadding = 24
    const card = this.add.graphics()
    card.fillStyle(0xfffcf3, 0.96)
    card.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 24)
    card.lineStyle(2.5, 0xb88a37, 0.9)
    card.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 24)
    card.lineStyle(1, 0xd8bd7a, 0.5)
    card.strokeRoundedRect(cx - cardW / 2 + 8, cardY - cardH / 2 + 8, cardW - 16, cardH - 16, 18)

    // 6) البسملة أعلى البطاقة
    const bismillah = this.add
      .text(cx, cardY - cardH / 2 + 40, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Arial, sans-serif',
        fontSize: '24px',
        color: '#765a24',
      })
      .setOrigin(0.5)
      .setAlpha(0)

    // 7) فاصل زخرفي ذهبي (خط + معين) — فاصل مستقل بين البسملة والعنوان
    //    بهوامش رأسية مريحة (≥ 16px) وخطان أبعد عن النقطة المركزية لمنع التداخل
    const dividerY = cardY - 48
    const divider = this.add.graphics()
    divider.lineStyle(1.5, 0xb88a37, 0.72)
    divider.lineBetween(cx - 95, dividerY, cx - 20, dividerY)
    divider.lineBetween(cx + 20, dividerY, cx + 95, dividerY)
    divider.fillStyle(0xc4953c, 0.95)
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
        color: '#193b4e',
        align: 'center',
        wordWrap: { width: cardW - cardPadding * 2, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setShadow(0, 2, 'rgba(91,66,24,0.16)', 5, true, true)
    title.setStroke('#fff7e4', 1.5)

    // 9) رسالة ترحيبية هادئة
    const subtitle = this.add
      .text(cx, cardY + cardH / 2 - 42, 'طمأنينة القلوب بذكر الله', {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Arial, sans-serif',
        fontSize: '24px',
        color: '#3e6268',
      })
      .setOrigin(0.5)
      .setAlpha(0)
    subtitle.setShadow(0, 1, 'rgba(255,255,255,0.75)', 3, true, true)

    // 10) نص "اضغط للبدء" نابض أسفل الشاشة
    const startText = this.add
      .text(cx, height - 110, '« اضغط في أي مكان للبدء »', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '22px',
        color: '#28564d',
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
      this.cameras.main.fadeOut(400, 231, 195, 119)
      this.time.delayedCall(400, () => this.scene.start('MainScene'))
    })

    // تلقائياً بعد 6 ثوانٍ
    this.time.delayedCall(6000, () => {
      if (this.scene.isActive()) {
        this.cameras.main.fadeOut(400, 231, 195, 119)
        this.time.delayedCall(400, () => this.scene.start('MainScene'))
      }
    })
  }

  private createHudTextures(): void {
    // Keep the source artwork on the GPU's linear sampling path as well as the
    // generated mip-ready copies below. This prevents a brief nearest-neighbor
    // frame while Resource/session textures are first displayed.
    for (const key of ['hud-banner', 'session-frame'] as const) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
      }
    }

    const bannerImage = this.textures.get('hud-banner').getSourceImage() as HTMLImageElement
    const bannerWidth = 2048
    const bannerHeight = 1024
    const fittedHeight = Math.round(bannerWidth * (bannerImage.height / bannerImage.width))
    const bannerY = Math.round((bannerHeight - fittedHeight) / 2)
    const bannerTexture = this.textures.createCanvas('hud-banner-mipped', bannerWidth, bannerHeight)
    if (bannerTexture) {
      const context = bannerTexture.getContext()
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(bannerImage, 0, bannerY, bannerWidth, fittedHeight)
      bannerTexture.refresh()
      bannerTexture.add('art', 0, 0, bannerY, bannerWidth, fittedHeight)
      bannerTexture.setFilter(Phaser.Textures.FilterMode.LINEAR)
    }

    const iconKeys = ['hud-theme', 'hud-farm', 'hud-quran'] as const
    for (const key of iconKeys) {
      const source = this.textures.get(key).getSourceImage() as HTMLImageElement
      const texture = this.textures.createCanvas(`${key}-mipped`, 512, 512)
      if (!texture) continue
      const iconContext = texture.getContext()
      iconContext.imageSmoothingEnabled = true
      iconContext.imageSmoothingQuality = 'high'
      iconContext.drawImage(source, 0, 0, 512, 512)
      texture.refresh()
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
    }

    // تطبيق ترشيح LINEAR على أيقونة الإعدادات وأيقونات SVG الأخرى
    // لمنع التشوه عند عرضها بأحجام غير أصلية.
    for (const key of ['hud-settings', 'hud-pause', 'hud-play', 'hud-arrow'] as const) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
      }
    }
  }
}
