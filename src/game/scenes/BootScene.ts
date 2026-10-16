import Phaser from 'phaser'
import { setSidebarWelcomeActive } from '../../components/Sidebar'
import { setTopHeaderVisible } from '../../components/TopHeader'
// استيراد عبر Vite: يُصدر الصورة باسم مجزّأ ببصمة المحتوى، فلا يصيبها
// كاش قديم من Service Worker عند استبدال الأصل، كما أنه يعمل مع base:'./'.
import SESSION_FRAME_URL from '../../assets/session-frame.png'
import BANNER_URL from '../../assets/rk-banner.png'
import BEGIN_SPLASH_URL from '../../assets/begin.png'
// صور فقاعات الأذكار (استيراد Vite المجزّأ ببصمة المحتوى).
import SOBHAN_ALLAH_BUBBLE_URL from '../../../pi/Bubbles/sobhanallah.png'
import ALHAMDULILLAH_BUBBLE_URL from '../../../pi/Bubbles/alhamdulillah.png'
import ALLAHU_AKBAR_BUBBLE_URL from '../../../pi/Bubbles/allahu_akbar.png'
import HAWQALA_BUBBLE_URL from '../../../pi/Bubbles/hawqala.png'
// فقاعات الأذكار الطويلة (النص مضمّن في الصورة ثلاثية الأبعاد):
//   albaqiyatalsalihat.png   -> «سبحان الله وبحمده سبحان الله العظيم»
//   salawat.png              -> «اللهم صل على نبينا محمد»
//   la_ilaha_illallah.png    -> «لا إله إلا الله وحده لا شريك له...»
//   sobhlaoabhsobal.png      -> «سبحان الله والحمد لله ولا إله إلا الله والله أكبر»
import ALBAQIYAT_ALSALIHAT_BUBBLE_URL from '../../../pi/Bubbles/albaqiyatalsalihat.png'
import SALAWAT_BUBBLE_URL from '../../../pi/Bubbles/salawat.png'
import LA_ILAHA_ILLALLAH_BUBBLE_URL from '../../../pi/Bubbles/la_ilaha_illallah.png'
import SOBHLAOABHSOBAL_BUBBLE_URL from '../../../pi/Bubbles/sobhlaoabhsobal.png'

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
    this.load.image('splash-begin', BEGIN_SPLASH_URL)
    // صور فقاعات الأذكار — تُحمّل من أصول PNG مباشرةً مع بصمة Vite.
    this.load.image('bubble-subhanallah', SOBHAN_ALLAH_BUBBLE_URL)
    this.load.image('bubble-alhamdulillah', ALHAMDULILLAH_BUBBLE_URL)
    this.load.image('bubble-allahu-akbar', ALLAHU_AKBAR_BUBBLE_URL)
    this.load.image('bubble-la-hawla', HAWQALA_BUBBLE_URL)
    // فقاعات الأذكار الطويلة — النص مضمّن داخل الصورة ثلاثية الأبعاد.
    this.load.image('bubble-subhanallah-wa-bihamdih', ALBAQIYAT_ALSALIHAT_BUBBLE_URL)
    this.load.image('bubble-salawat', SALAWAT_BUBBLE_URL)
    this.load.image('bubble-la-ilaha-illa-allah', LA_ILAHA_ILLALLAH_BUBBLE_URL)
    this.load.image('bubble-four-phrases', SOBHLAOABHSOBAL_BUBBLE_URL)
  }

  create(): void {
    for (const key of [
      'bubble-subhanallah',
      'bubble-alhamdulillah',
      'bubble-allahu-akbar',
      'bubble-la-hawla',
      'bubble-subhanallah-wa-bihamdih',
      'bubble-salawat',
      'bubble-la-ilaha-illa-allah',
      'bubble-four-phrases',
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
      this.createBubbleWhiteSilhouette(key)
    }

    this.createHudTextures()

    // شاشة الترحيب: يُخفى سهم القائمة الجانبية تماماً (يُعاد إظهاره في MainScene).
    setSidebarWelcomeActive(true)
    // إخفاء الشريط العلوي في شاشة الترحيب (يظهر فقط في MainScene).
    setTopHeaderVisible(false)

    // منع أي انزياح في إحداثيات اللمس بين HTML والـ Canvas
    this.scale.refresh()
    const { width, height } = this.scale
    const cx = width / 2
    // 1) صورة واجهة البداية begin.png بكامل حجم الشاشة 100% بدلاً من الواجهة القديمة
    const splashImg = this.add.image(cx, height / 2, 'splash-begin')
    // تغطية الشاشة بالكامل (Full Screen Cover)
    const scaleX = width / splashImg.width
    const scaleY = height / splashImg.height
    const fullCoverScale = Math.max(scaleX, scaleY)
    splashImg.setScale(fullCoverScale)
    splashImg.setAlpha(0)

    // حركة ظهور ناعمة للصورة
    this.tweens.add({ targets: splashImg, alpha: 1, duration: 800, ease: 'Power2' })

    // الانتقال إلى شاشة اللعب: بالضغط في أي مكان مع تأثير انتقال ناعم
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

  /**
   * يبني نسخة بيضاء صلبة («سيلويت») من صورة الفقاعة: نفس قناة الشفافية تماماً
   * مع تحويل كل لمعان إلى أبيض ناصع. تُرسم هذه النسخة خلف صورة الفقاعة فتغلق
   * الفراغات الداخلية والثقوب الناتجة عن شفافية الخط العربي، **دون أن تتجاوز
   * حدود العنصر ولو ببكسل واحد** — لأنها مشتقّة من ألفا الصورة نفسها لا من شكل
   * هندسي تقريبي (دائرة/كبسولة) كان يتضخم 17–63% خارج الحدود.
   *
   * النسيج الناتج يُحفظ باسم `${key}-white` ويستهلكه FloatingObject.addWhiteBacking.
   */
  private createBubbleWhiteSilhouette(key: string): void {
    const whiteKey = `${key}-white`
    if (this.textures.exists(whiteKey)) return

    const texture = this.textures.get(key)
    if (!texture || texture.key === '__MISSING') return

    // مصدر الصورة: قد يكون HTMLImageElement أو HTMLCanvasElement
    const source = texture.getSourceImage() as CanvasImageSource & { width: number; height: number }
    const w = source.width
    const h = source.height
    if (!w || !h) return

    const canvas = this.textures.createCanvas(whiteKey, w, h)
    if (!canvas) return
    const ctx = canvas.getContext()
    if (!ctx) return

    // 1) نسخ ألفا الصورة كما هي (ونسخ الألوان مؤقتاً؛ سيُستبدل كلها بالأبيض)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(source, 0, 0)

    // 2) تبييض كل البكسلات المرئية مع الحفاظ على ألفا الأصلي بدقة.
    //    نغيّر RGB إلى أبيض فقط — ألفا كل بكسل يبقى كما هو تماماً،
    //    فتظل حواف الفقاعة ناعمة ولا تتجاوز حدودها البصرية ولو ببكسل.
    const image = ctx.getImageData(0, 0, w, h)
    const data = image.data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue   // شفاف كلياً → تجاهل
      data[i]     = 255                  // R
      data[i + 1] = 255                  // G
      data[i + 2] = 255                  // B
      // ألفا: لا تعديل — يبقى كما في الأصل
    }
    ctx.putImageData(image, 0, 0)

    canvas.refresh()
    canvas.setFilter(Phaser.Textures.FilterMode.LINEAR)
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
