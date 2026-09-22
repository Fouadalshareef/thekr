/**
 * MainScene — الشاشة الرئيسية للعبة.
 * تصميم جديد: أيقونات جانبية خفيفة، عداد جلسة، وتوليد فردي متسلسل
 * (فقاعة واحدة فقط تُستبدل عند التفجير، مع أنماط: مترابط/شامل/مخصص/استغفار).
 */
import Phaser from 'phaser'
import confetti from 'canvas-confetti'
import { FloatingObject, type FloatingObjectOptions } from '../objects/FloatingObject'
import Bubble from '../objects/Bubble'
import Balloon from '../objects/Balloon'
import Gem from '../objects/Gem'
import Lantern from '../objects/Lantern'
import SalawatBubble from '../objects/SalawatBubble'
import LaHawlaBubble from '../objects/LaHawlaBubble'
import SubhanallahWaBihamdihBubble from '../objects/SubhanallahWaBihamdihBubble'
import AzkarBubble from '../objects/AzkarBubble'
import { emitGoldBurst, ensurePixelTexture } from '../objects/ParticleBurst'
import GardenLayer from '../objects/GardenLayer'
import SkyLayer from '../objects/SkyLayer'
import { Events } from '../events'
import { incrementDhikr } from '../../services/DhikrStorage'
import { SEQUENCE_DHIKRS, gameMode, type GameMode } from '../../services/gameMode'
import { recordTodayDhikr, isGameEnabled, isQuranEnabled, areIconsEnabled, markAzkarDone } from '../../services/SettingsService'
import { hasPendingUpdate } from '../../services/AppVersion'
import { getNextQuote } from '../../services/QuotesDB'
import {
  BTN_ICON_SIZE,
  BTN_RADIUS,
  BTN_SIZE,
  BTN_SKIN_OFFSET_Y,
  BTN_SKIN_SIZE,
  ICON_THEME,
  getButtonSkinTexture,
  getGlowTexture,
  getShadowTexture,
  themeGlowColor,
  type HudIcon,
} from '../ui/GameButtonSkin'

/** المدة التأخيرية قبل ظهور الجسم التالي بعد تفجير الحالي (بالمللي). */
const NEXT_DELAY = 150

interface CollectPayload {
  id: string
  name: string
  target: number
}

type FloatingClass = new (
  scene: Phaser.Scene,
  x: number,
  y: number,
  override?: Partial<FloatingObjectOptions>,
) => FloatingObject

/** ربط كل ذكر بنوع الجسم العائم الخاص به. */
const CLASS_BY_DHIKR: Record<string, FloatingClass> = {
  subhanallah: Bubble,
  alhamdulillah: Balloon,
  'allahu-akbar': Lantern,
  'la-ilaha-illa-allah': Gem,
  'la-hawla': LaHawlaBubble,
  'subhanallah-wa-bihamdih': SubhanallahWaBihamdihBubble,
  salawat: SalawatBubble,
}

const ALL_CLASSES: FloatingClass[] = [Bubble, Balloon, Gem, Lantern, LaHawlaBubble, SubhanallahWaBihamdihBubble, SalawatBubble]

/** خيارات قائمة اختيار الأنماط (نصوص فقط — بلا إيموجي). */
const MODE_OPTIONS: { mode: GameMode | 'zen'; label: string }[] = [
  { mode: 'sequence', label: 'مترابط' },
  { mode: 'random', label: 'شامل' },
  { mode: 'focus', label: 'تخصيص' },
  { mode: 'morning', label: 'أذكار الصباح' },
  { mode: 'evening', label: 'أذكار المساء' },
  { mode: 'zen', label: 'استغفار' },
]

export default class MainScene extends Phaser.Scene {
  private garden!: GardenLayer
  private sky!: SkyLayer

  /** الأجسام الحية حالياً (بحد أقصى واحد في نفس الوقت). */
  private alive: FloatingObject[] = []

  /** عداد الجلسة الحالية (يبدأ من 0 عند كل فتح للتطبيق، لا يُحفظ). */
  private sessionCount = 0
  /** عدد الفقاعات الملتقطة تباعاً دون تفويت. */
  private comboCount = 0
  private comboText!: Phaser.GameObjects.Text

  private azkarCounterText!: Phaser.GameObjects.Text
  private azkarCounterBg!: Phaser.GameObjects.Graphics

  private paused = false
  private modeUIOpen = false

  /** هل اللعبة مفعّلة حسب الإعدادات (يُقرأ من localStorage). */
  private gameEnabled = true

  // مراجع أيقونات شريط الأدوات (لتطبيق إظهار/إخفاء فوري حسب الإعدادات).
  private btnGear!: Phaser.GameObjects.Container
  private btnSliders!: Phaser.GameObjects.Container
  private btnLeaf!: Phaser.GameObjects.Container
  private btnQuran!: Phaser.GameObjects.Container
  private sessionPill!: Phaser.GameObjects.Graphics
  private sessionLabel!: Phaser.GameObjects.Text

  private sessionText!: Phaser.GameObjects.Text
  private pauseButton!: Phaser.GameObjects.Container
  private pauseIcon!: Phaser.GameObjects.Image
  private updateBadge!: Phaser.GameObjects.Container
  private modePanel!: Phaser.GameObjects.Container
  private modeList!: Phaser.GameObjects.Container
  private modeScrollY = 0
  private modeScrollMax = 0
  private modeScrollThumb?: Phaser.GameObjects.Graphics
  private modeScrollTrackH = 0
  private modeListCenterY = 0
  private modeDragY: number | null = null
  private modeDragStart = 0
  private modeWasDragging = false
  private focusPanel!: Phaser.GameObjects.Container
  private focusButtons: {
    bg: Phaser.GameObjects.Graphics
    label: Phaser.GameObjects.Text
    draw: (c: number) => void
  }[] = []

  // نظام الاستراحة (Rest Banner)
  private restTimerEvent: Phaser.Time.TimerEvent | null = null
  private restBanner: Phaser.GameObjects.Container | null = null
  private restText: Phaser.GameObjects.Text | null = null
  private isResting = false

  constructor() {
    super('MainScene')
  }

  create(): void {
    ensurePixelTexture(this)

    // إعادة ضبط حالة الجلسة والأوضاع عند كل فتح
    this.data.set('paused', false)
    this.sessionCount = 0
    this.comboCount = 0
    this.data.set('combo', 0)
    this.paused = false
    this.modeUIOpen = false

    this.sky = new SkyLayer(this)
    this.garden = new GardenLayer(this)

    this.time.addEvent({
      delay: 60_000,
      loop: true,
      callback: () => this.sky.updateTheme(),
    })

    this.buildHud()
    this.buildModePanel()
    this.buildFocusPanel()
    this.buildUpdateBadge()

    // تطبيق إعدادات تشغيل/إيقاف اللعبة والمصحف والأيقونات عند الإقلاع
    this.gameEnabled = isGameEnabled()
    if (!this.gameEnabled) this.physics.pause()
    this.applyUiSettings()
    window.addEventListener('settings-changed', this.onSettingsChanged)

    // توليد الجسم الأول بعد لحظة قصيرة
    this.time.delayedCall(250, this.spawnIfEmpty, [], this)

    this.events.on(Events.DHIKR_COLLECTED, this.onDhikrCollected, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)

    // إظهار نافذة النصائح في البداية (تظهر مرة واحدة فقط)
    window.dispatchEvent(new CustomEvent('show-advice'))

    // بدء مؤقت الاستراحة
    this.startRestTimer()

    // النوافذ HTML لا توقف المشهد تلقائياً؛ نوقف الفيزياء والحركة لتقليل استهلاك الجهاز.
    window.addEventListener('reader-opened', this.pauseForModal)
    window.addEventListener('reader-closed', this.resumeFromModal)
  }

  // ------------------------------------------------------------------
  // واجهة HUD الجديدة (أيقونات جانبية)
  // ------------------------------------------------------------------

  private buildHud(): void {
    // شريط جانبي موحّد: أزرار d=74px على مسافات ثابتة (80px) لتفادي التداخل.
    // أزرار الشريط الجانبي الجديدة (نفس المواضع ونفس وظائف النقر السابقة)
    this.btnGear = this.buildRoundButton(56, 62, 'gear', () => {
      window.dispatchEvent(new CustomEvent('open-dashboard'))
    })
    this.btnSliders = this.buildRoundButton(56, 142, 'sliders', () => this.openModePanel())
    this.btnLeaf = this.buildRoundButton(56, 222, 'leaf', () => {
      window.dispatchEvent(new CustomEvent('open-garden'))
    })
    this.btnQuran = this.buildRoundButton(56, 302, 'quran', () => {
      window.dispatchEvent(new CustomEvent('open-quran'))
    })

    // أقصى اليمين العلوي: الإيقاف أعلى عداد الجلسة بفاصل رأسي 25px على الأقل.
    this.buildPauseButton()
    this.buildSessionCounter()
    this.buildComboCounter()
    this.buildAzkarCounter()
  }

  private buildAzkarCounter(): void {
    const { width } = this.scale
    this.azkarCounterBg = this.add.graphics().setDepth(2000).setAlpha(0)
    // خلفية بسيطة معتمة في أعلى المنتصف
    this.azkarCounterBg.fillStyle(0x000000, 0.4)
    this.azkarCounterBg.fillRoundedRect(width / 2 - 90, 15, 180, 40, 20)
    this.azkarCounterBg.lineStyle(2, 0xfcd34d, 0.8)
    this.azkarCounterBg.strokeRoundedRect(width / 2 - 90, 15, 180, 40, 20)

    this.azkarCounterText = this.add
      .text(width / 2, 35, '', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0)
  }

  private updateAzkarCounter(): void {
    const mode = gameMode.getMode()
    if (mode === 'morning' || mode === 'evening') {
      const current = gameMode.getCurrentAzkarNumber()
      const total = gameMode.getTotalAzkar()
      this.azkarCounterText.setText(`المتبقي: ${total - current + 1} / ${total}`)
      this.azkarCounterBg.setAlpha(1)
      this.azkarCounterText.setAlpha(1)
    } else {
      this.azkarCounterBg.setAlpha(0)
      this.azkarCounterText.setAlpha(0)
    }
  }

  /** تطبيق إعدادات إظهار/إخفاء الأيقونات فوراً (اللعبة/المصحف/جميع الأيقونات). */
  private applyUiSettings(): void {
    const icons = areIconsEnabled()
    const quran = isQuranEnabled()
    // جميع الأيقونات
    for (const b of [this.btnGear, this.btnSliders, this.btnLeaf, this.btnQuran]) {
      b?.setVisible(icons)
    }
    // زر المصحف يظهر فقط إذا كانت الأيقونات والمصحف مفعّلين معاً
    this.btnQuran?.setVisible(icons && quran)
    // يمين الشاشة
    this.pauseButton?.setVisible(icons)
    this.sessionPill?.setVisible(icons)
    this.sessionLabel?.setVisible(icons)
    this.sessionText?.setVisible(icons)
    this.comboText?.setVisible(icons)
  }

  /** تشغيل/إيقاف اللعبة فوراً (توليد الأجسام والحركة). */
  private applyGameToggle(): void {
    this.gameEnabled = isGameEnabled()
    if (this.gameEnabled) {
      for (const b of this.alive) b.destroy()
      this.alive = []
      this.physics.resume()
      this.data.set('paused', this.paused)
      this.spawnIfEmpty()
    } else {
      for (const b of this.alive) b.destroy()
      this.alive = []
      this.physics.pause()
    }
  }

  /** معالج تغيّر الإعدادات من لوحة التحكم. */
  private onSettingsChanged = (): void => {
    this.applyUiSettings()
    this.applyGameToggle()
  }

  /**
   * شارة إشعار حمراء نباضة 🔴 في الزاوية العلوية لأيقونة الإعدادات ⚙️
   * تظهر عند وجود تحديث جديد (localStorage: has_update أو حدث app-update-available)
   * وتختفي عند فتح لوحة التحكم (أين يوجد زر "تحديث النسخة الآن").
   */
  private buildUpdateBadge(): void {
    // موضع زر الإعدادات (56, 62) — الشارة في زاويته العلوية اليمنى (r=32)
    const bx = 56 + 26
    const by = 62 - 26

    this.updateBadge = this.add.container(bx, by)
    this.updateBadge.setDepth(2200)
    this.updateBadge.setVisible(false)

    const dot = this.add.graphics()
    dot.fillStyle(0x020617, 0.55)
    dot.fillCircle(1, 2, 15) // ظل ناعم
    dot.fillStyle(0xef4444, 1)
    dot.fillCircle(0, 0, 13)
    dot.lineStyle(2.5, 0xffffff, 0.95)
    dot.strokeCircle(0, 0, 13)
    dot.fillStyle(0xfca5a5, 0.85)
    dot.fillCircle(-4, -4, 4) // لمعة
    this.updateBadge.add(dot)

    const exclaim = this.add
      .text(0, -1, '!', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5)
    this.updateBadge.add(exclaim)

    // نباضة مستمرة لفت الانتباه
    this.tweens.add({
      targets: this.updateBadge,
      scale: { from: 1, to: 1.25 },
      yoyo: true,
      repeat: -1,
      duration: 550,
      ease: 'Sine.easeInOut',
    })

    // إظهار فوري إن كان التحديث معلّقاً من جلسة سابقة
    if (hasPendingUpdate()) this.updateBadge.setVisible(true)

    // إظهار عند كشف تحديث جديد أثناء اللعب
    window.addEventListener('app-update-available', () => {
      this.updateBadge?.setVisible(true)
    })

    // إخفاء عند فتح لوحة التحكم (المستخدم سيتعامل مع التحديث هناك)
    window.addEventListener('open-dashboard', () => {
      this.updateBadge?.setVisible(false)
    })
  }

  /** تفتيح لون (يعيد صيغة 0xRRGGBB). */
  private lighter = (c: number, f = 1.35): number => {
    const r = Math.min(255, Math.round(((c >> 16) & 0xff) * f))
    const g = Math.min(255, Math.round(((c >> 8) & 0xff) * f))
    const b = Math.min(255, Math.round((c & 0xff) * f))
    return (r << 16) | (g << 8) | b
  }

  /** تغميق لون (يعيد صيغة 0xRRGGBB). */
  private darker = (c: number, f = 0.6): number => {
    const r = Math.min(255, Math.round(((c >> 16) & 0xff) * f))
    const g = Math.min(255, Math.round(((c >> 8) & 0xff) * f))
    const b = Math.min(255, Math.round((c & 0xff) * f))
    return (r << 16) | (g << 8) | b
  }

  /**
   * زر دائري مجسّم بأسلوب حزمة الأزرار الجديدة (Game UI Buttons):
   * إطار معدني متدرّج + حافة سفلية داكنة (سماكة 3D) + وجه كحلي + لمعة علوية،
   * مع أيقونة SVG بيضاء ناصعة في الحلقة الداخلية، وظل أرضي ناعم وهالة ملوّنة.
   * (كل القيم البصرية مستخرجة من css/style.css في الحزمة — انظر GameButtonSkin.ts)
   */
  private buildRoundButton(
    x: number,
    y: number,
    icon: HudIcon,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y)
    btn.setDepth(2000)
    const theme = ICON_THEME[icon]

    // ظل أرضي ناعم أسفل الزر (box-shadow: 0 20px 28px -8px rgba(4,9,22,.75))
    const shadow = this.add
      .image(0, BTN_SIZE * 0.42, getShadowTexture(this))
      .setDisplaySize(BTN_SIZE * 1.45, BTN_SIZE * 0.85)
      .setAlpha(0.85)
    btn.add(shadow)

    // هالة توهّج ملوّنة خلف الزر تظهر عند المرور/الضغط (--glow في الحزمة)
    const glow = this.add
      .image(0, 0, getGlowTexture(this, theme))
      .setDisplaySize(BTN_SIZE * 1.75, BTN_SIZE * 1.75)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
    btn.add(glow)

    // جسم الزر: نسيج مرسوم بالـ Canvas بنفس طبقات .gbtn::before و ::after و .ring
    const skin = this.add
      .image(0, BTN_SKIN_OFFSET_Y, getButtonSkinTexture(this, theme))
      .setDisplaySize(BTN_SKIN_SIZE, BTN_SKIN_SIZE)
    btn.add(skin)

    // حلقة الموجة النقرية (@keyframes gbtn-pulse) — تنطلق من الزر عند كل ضغطة
    const pulse = this.add.graphics()
    pulse.lineStyle(2.5, themeGlowColor(theme), 1)
    pulse.strokeCircle(0, 0, BTN_RADIUS)
    pulse.setAlpha(0)
    btn.add(pulse)

    // الأيقونة SVG البيضاء (46% من قطر الزر) — مع منطقة لمس إضافية حول الزر
    const svgIcon = this.add
      .image(0, 0, ({ gear: 'hud-settings', sliders: 'hud-theme', pause: 'hud-pause', play: 'hud-play', leaf: 'hud-farm', quran: 'hud-quran' } as const)[icon])
      .setOrigin(0.5)
      .setDisplaySize(BTN_ICON_SIZE, BTN_ICON_SIZE)
    btn.add(svgIcon)
    if (icon === 'pause') {
      this.pauseIcon = svgIcon
    }
    btn.setSize(BTN_SIZE, BTN_SIZE)
    btn.setInteractive({ useHandCursor: true })
    btn.input!.hitArea = new Phaser.Geom.Circle(0, 0, BTN_RADIUS + 12)
    btn.input!.hitAreaCallback = Phaser.Geom.Circle.Contains

    const baseY = y
    let hovering = false

    // الضغط: نزول فعلي للزر + تقلّص بسيط (.gbtn:active) + موجة نقرية دائرية
    const press = () => {
      this.tweens.killTweensOf(btn)
      this.tweens.add({ targets: btn, y: baseY + 3, scale: 0.955, duration: 90, ease: 'Quad.easeOut' })
      this.tweens.add({ targets: glow, alpha: 1, duration: 140 })
      this.tweens.killTweensOf(pulse)
      pulse.setAlpha(0.65).setScale(0.85)
      this.tweens.add({ targets: pulse, alpha: 0, scale: 1.55, duration: 550, ease: 'Sine.easeOut' })
    }

    // الإفلات: قفزة مرنة ممتعة (.gbtn.is-clicked / @keyframes gbtn-pop)
    const release = () => {
      this.tweens.killTweensOf(btn)
      this.tweens.add({
        targets: btn,
        y: baseY - 5,
        scale: 1.06,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: btn, y: baseY, scale: 1, duration: 160, ease: 'Back.easeOut' })
        },
      })
      this.tweens.killTweensOf(glow)
      this.tweens.add({ targets: glow, alpha: hovering ? 1 : 0, duration: 220 })
    }

    // النقر يُنفّذ نفس الوظيفة البرمجية السابقة لكل زر، من دون طبقات رسومية إضافية
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      press()
      onTap()
    })
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, release)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      hovering = false
      release()
    })
    // المرور (Hover): رفع الزر + هالة ملوّنة — `.gbtn:hover` في الحزمة
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      hovering = true
      this.tweens.killTweensOf(glow)
      this.tweens.add({ targets: glow, alpha: 1, duration: 220 })
    })
    return btn
  }

  /** زر إيقاف/استئناف مؤقت أعلى اليمين (بنفس نمط الأزرار الجديدة). */
  private buildPauseButton(): void {
    this.pauseButton = this.buildRoundButton(
      this.scale.width - 56,
      52,
      'pause',
      () => this.togglePause(),
    )
    this.pauseButton.setScrollFactor(0)
    this.refreshPauseIcon()
  }

  /** تحديث ايقونة الايقاف مع الحفاظ على الحجم بعد التبديل. */
  private refreshPauseIcon(): void {
    if (!this.pauseIcon) return
    this.pauseIcon.setTexture(this.paused ? 'hud-play' : 'hud-pause')
    this.pauseIcon.setDisplaySize(BTN_ICON_SIZE, BTN_ICON_SIZE)
  }

  /** عداد الجلسة الحالية أسفل زر الإيقاف — مُدمج وأنيق مع إطار ذهبي رفيع. */
  private buildComboCounter(): void {
    this.comboText = this.add.text(this.scale.width / 2, 82, '', {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fde68a',
      stroke: '#172554',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2000).setAlpha(0)
  }

  private updateCombo(): void {
    if (this.comboCount < 3) {
      this.comboText.setAlpha(0)
      return
    }
    const encouragement = this.comboCount >= 50 ? 'الذكر المتواصل ✨' : this.comboCount >= 20 ? 'رائع! ✨' : 'ممتاز! 🌟'
    this.comboText.setText(`${encouragement}  ×${this.comboCount}`).setAlpha(1)
    this.tweens.add({ targets: this.comboText, scale: { from: 1.2, to: 1 }, duration: 220, ease: 'Back.easeOut' })
  }

  /** عداد الجلسة الحالية — بطاقة كرتونية بارزة (3D Bevel). */
  private buildSessionCounter(): void {
    const x = this.scale.width - 56
    const w = 92
    const h = 96
    const topY = 129
    const lift = 5
    const base = 0x0ea5e9 // أزرق كريستالي
    const sideCol = this.darker(base, 0.55)

    // ظل أرضي ساقط
    this.sessionPill = this.add.graphics()
    this.sessionPill.fillStyle(0x000000, 0.3)
    this.sessionPill.fillRoundedRect(x - w / 2, topY + lift + 3, w, h, 20)
    // جسم الحافة (لون أغمق)
    this.sessionPill.fillStyle(sideCol, 1)
    this.sessionPill.fillRoundedRect(x - w / 2, topY + lift - 2, w, h, 20)
    // الوجه الزاهي
    this.sessionPill.fillStyle(base, 1)
    this.sessionPill.fillRoundedRect(x - w / 2, topY, w, h, 20)
    // لمعة علوية عريضة
    this.sessionPill.fillStyle(0xffffff, 0.28)
    this.sessionPill.fillRoundedRect(x - w / 2 + 7, topY + 5, w - 14, 26, 13)
    // حد أبيض ناصع
    this.sessionPill.lineStyle(3, 0xffffff, 0.92)
    this.sessionPill.strokeRoundedRect(x - w / 2, topY, w, h, 20)
    this.sessionPill.setDepth(1999)

    this.sessionLabel = this.add
      .text(x, topY + 22, 'الجلسة', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setShadow(0, 1, 'rgba(0,0,0,0.5)', 2, true, true)

    this.sessionText = this.add
      .text(x, 193, '0', {
        fontFamily: 'Consolas, monospace',
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5)
      .setDepth(2000)
    this.sessionText.setShadow(0, 2, 'rgba(0,0,0,0.7)', 5, true, true)
  }

  private pauseForModal = (): void => {
    // إيقاف مؤقت للنوافذ فقط؛ لا نغيّر حالة الزر اليدوية حتى لا تبقى اللعبة عالقة.
    this.physics.pause()
    this.alive.forEach((bubble) => bubble.setBubbleInteractive(false))
  }

  private resumeFromModal = (): void => {
    if (!this.paused && this.gameEnabled) {
      this.physics.resume()
      this.alive.forEach((bubble) => bubble.setBubbleInteractive(true))
      // إن خرجت الفقاعة أعلى الشاشة أثناء فتح النافذة (مجدولة ولم تُولّد)، ولّد التالية الآن
      this.spawnIfEmpty()
    }
  }

  private togglePause(): void {
    this.paused = !this.paused
    this.data.set('paused', this.paused)
    if (this.paused) {
      this.physics.pause()
      this.refreshPauseIcon()
      this.alive.forEach((bubble) => bubble.setBubbleInteractive(false))
    } else {
      this.physics.resume()
      this.refreshPauseIcon()
      this.alive.forEach((bubble) => bubble.setBubbleInteractive(true))
      // إصلاح: إن خرجت الفقاعة أعلى الشاشة وتمت جدولتها أثناء الإيقاف،
      // فإن spawnIfEmpty رُفض بسبب paused وبقيت الشاشة فارغة — ولّدها الآن عند الاستئناف
      this.spawnIfEmpty()
    }
  }

  // ------------------------------------------------------------------
  // قائمة اختيار الأنماط (منبثقة)
  // ------------------------------------------------------------------

  private buildModePanel(): void {
    const { width, height } = this.scale
    this.modePanel = this.add.container(0, 0)
    this.modePanel.setDepth(2000)
    this.modePanel.setVisible(false)

    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
    dim.setOrigin(0)
    dim.setInteractive()
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.closeModePanel()
      this.spawnIfEmpty()
    })
    this.modePanel.add(dim)

    // نافذة عريضة مريحة (~90% من عرض الشاشة) — بطاقة كرتونية بارزة
    const panelW = Math.min(width * 0.9, 480)
    // الارتفاع محدود بنسبة من الشاشة — كافٍ لعرض الأزرار كلها بلا تمرير
    const panelH = Math.min(520, Math.max(400, height * 0.62))
    const card = this.add.container(width / 2, height / 2)
    // إعادة ضبط حالة التمرير عند كل بناء (تُبنى اللوحة مرة واحدة عند create)
    this.modeScrollY = 0
    this.modeScrollMax = 0
    this.modeScrollThumb = undefined
    this.modeListCenterY = 0
    const base = 0x172554 // كحلي زجاجي هادئ
    const gfx = this.add.graphics()
    // بطاقة زجاجية ناعمة بلا حواف سوداء أو ظل ثقيل.
    gfx.fillStyle(base, 0.88)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 30)
    gfx.fillStyle(0x60a5fa, 0.16)
    gfx.fillRoundedRect(-panelW / 2 + 2, -panelH / 2 + 2, panelW - 4, 92, 28)
    gfx.lineStyle(1.5, 0xbfdbfe, 0.65)
    gfx.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 30)
    gfx.lineStyle(1, 0xffffff, 0.16)
    gfx.strokeRoundedRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW - 16, panelH - 16, 24)
    /* legacy card drawing removed
    // ظل أرضي ساقط
    gfx.fillStyle(0x000000, 0.4)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2 + lift + 2, panelW, panelH, 28)
    // جسم الحافة (لون أغمق)
    gfx.fillStyle(sideCol, 1)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2 + lift - 2, panelW, panelH, 28)
    // الوجه
    gfx.fillStyle(base, 1)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 28)
    // تدرّج علوي ناعم
    gfx.fillStyle(this.lighter(base, 1.15), 0.55)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 90, 28)
    // لمعة علوية عريضة
    gfx.fillStyle(0xffffff, 0.18)
    gfx.fillRoundedRect(-panelW / 2 + 10, -panelH / 2 + 10, panelW - 20, 40, 18)
    // حد أبيض ناصع
    gfx.lineStyle(3, 0xffffff, 0.9)
    gfx.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 28)
    */
    card.add(gfx)

    const title = this.add
      .text(0, -panelH / 2 + 52, 'اختر النمط', {
        fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5)
    card.add(title)

    const activeMode = gameMode.getMode()
    const btnW = panelW - 56
    const btnH = 50
    const GAP = 8 // مسافة نسبية ثابتة بين الأزرار — لا تتغير عند التفاعل
    const STEP = btnH + GAP

    // ── حاوية قائمة الأزرار القابلة للتمرير (داخل البطاقة، أسفل العنوان) ──
    const listTop = -panelH / 2 + 96
    const listBottom = panelH / 2 - 20
    const listH = Math.max(120, listBottom - listTop)
    this.modeListCenterY = (listTop + listBottom) / 2
    this.modeScrollTrackH = listH
    this.modeList = this.add.container(0, this.modeListCenterY)

    // حجم المحتوى: نحسبه الآن لنعرف إن كنا نحتاج تمريراً أصلاً
    const contentH = MODE_OPTIONS.length * btnH + (MODE_OPTIONS.length - 1) * GAP
    this.modeScrollMax = Math.max(0, contentH - listH)

    // قناع قصّ: يُطبَّق فقط عند وجود تمرير فعلي، وبإحداثيات عالمية على جذر
    // المشهد (وليس داخل الحاوية) لتجنّب خلل الأقنعة داخل الحاويات في Phaser.
    if (this.modeScrollMax > 0) {
      const maskShape = this.add.graphics()
      maskShape.fillStyle(0xffffff, 1)
      maskShape.fillRect(
        width / 2 - btnW / 2 - 12,
        height / 2 + this.modeListCenterY - listH / 2,
        btnW + 24,
        listH,
      )
      const mask = new Phaser.Display.Masks.GeometryMask(this, maskShape)
      maskShape.setVisible(false)
      this.modeList.setMask(mask)
    }

    // شريط تمرير شفاف بسيط (Minimalist) على حافة القائمة
    const trackX = btnW / 2 + 6
    const scrollbar = this.add.graphics()
    scrollbar.fillStyle(0xffffff, 0.12)
    scrollbar.fillRoundedRect(trackX - 3, this.modeListCenterY - listH / 2, 6, listH, 3)
    this.modeScrollThumb = this.add.graphics()

    type ModeBtn = { root: Phaser.GameObjects.Container; baseY: number }
    const modeButtons: ModeBtn[] = []

    MODE_OPTIONS.forEach((opt, idx) => {
      const isActive = opt.mode === activeMode
      // الإحداثي الأساسي ثابت: gap ثابت 12px — لا يتغير أبداً عند التفاعل
      const baseY = -((MODE_OPTIONS.length - 1) * STEP) / 2 + idx * STEP
      const bg = this.add.graphics()
      const glow = this.add.graphics()
      const label = this.add
        .text(0, 0, isActive ? `❀ ${opt.label}` : opt.label, {
          fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)

      const drawBg = (hovered: boolean): void => {
        bg.clear()
        glow.clear()
        if (isActive) {
          glow.fillStyle(0x2ecc71, 0.35)
          glow.fillRoundedRect(-btnW / 2 - 4, -btnH / 2 - 4, btnW + 8, btnH + 8, 20)
          bg.fillStyle(0x1e8e4f, 1)
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16)
          bg.fillStyle(hovered ? 0x35d37f : 0x2ecc71, 1)
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - 10, 12)
          bg.fillStyle(0xffffff, 0.16)
          bg.fillRoundedRect(-btnW / 2 + 6, -btnH / 2 + 5, btnW - 12, btnH / 2 - 4, 10)
          bg.lineStyle(1.5, 0xffd700, 0.6)
          bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16)
        } else {
          const idle = hovered ? 0x64748b : 0x475569
          bg.fillStyle(idle, 0.82)
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 20)
          bg.fillStyle(0xffffff, hovered ? 0.14 : 0.08)
          bg.fillRoundedRect(-btnW / 2 + 5, -btnH / 2 + 4, btnW - 10, btnH / 2, 14)
          bg.lineStyle(1.5, 0x94a3b8, 0.65)
          bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 20)
        }
      }
      drawBg(false)

      const btn = this.add.container(0, baseY)
      btn.add([glow, bg, label])
      btn.setData('baseY', baseY)
      btn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2 - 10, -btnH / 2 - 8, btnW + 20, btnH + 16), Phaser.Geom.Rectangle.Contains)

      // سلسلة تفاعل ناعمة (Hover / Active) — scale فقط، المواضع baseY ثابتة
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => drawBg(true))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => drawBg(false))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        if (this.modeWasDragging) return
        this.tweens.killTweensOf(btn)
        this.tweens.add({ targets: btn, scale: 0.95, duration: 70, ease: 'Quad.easeOut' })
        if (opt.mode === 'zen') {
          this.scene.start('ZenScene')
          return
        }
        this.setMode(opt.mode)
      })
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.tweens.killTweensOf(btn)
        this.tweens.add({ targets: btn, scale: 1, duration: 100, ease: 'Back.easeOut' })
      })
      this.modeList.add(btn)
      modeButtons.push({ root: btn, baseY })
    })

    // (حجم المحتوى وmodeScrollMax حُسبا سابقاً قبل القناع)

    card.add([this.modeList, scrollbar])
    if (this.modeScrollThumb) card.add(this.modeScrollThumb)
    this.applyModeScroll()

    // عجلة الفأرة للتمرير (سطح المكتب)
    this.input.off('wheel', this.handleModeWheel, this)
    this.input.on('wheel', this.handleModeWheel, this)

    // السحب العمودي للتمرير (لمس/فأرة): مستمعات على مستوى المشهد —
    // تعمل مع الأزرار لأنها لا تحجب أحداثها، وتُثبّت المواضع baseY.
    this.modeWasDragging = false
    this.input.off('pointerdown', this.handleModeDragDown, this)
    this.input.off('pointermove', this.handleModeDragMove, this)
    this.input.off('pointerup', this.handleModeDragUp, this)
    this.input.on('pointerdown', this.handleModeDragDown, this)
    this.input.on('pointermove', this.handleModeDragMove, this)
    this.input.on('pointerup', this.handleModeDragUp, this)
    this.modePanel.add(card)
  }

  /** هل بدأ السحب داخل منطقة قائمة الأنماط؟ */
  private isPointerInModeList(p: Phaser.Input.Pointer): boolean {
    if (!this.modeUIOpen || !this.modePanel.visible || this.modeScrollMax <= 0) return false
    const cx = this.scale.width / 2
    const cy = this.scale.height / 2
    const lx = p.x - cx
    const ly = p.y - cy
    const listTop = this.modeListCenterY - this.modeScrollTrackH / 2
    const listBottom = this.modeListCenterY + this.modeScrollTrackH / 2
    return Math.abs(lx) < 220 && ly > listTop - 10 && ly < listBottom + 10
  }

  private handleModeDragDown = (p: Phaser.Input.Pointer): void => {
    if (!this.isPointerInModeList(p)) {
      this.modeDragY = null
      return
    }
    this.modeDragY = p.y
    this.modeDragStart = this.modeScrollY
    this.modeWasDragging = false
  }

  private handleModeDragMove = (p: Phaser.Input.Pointer): void => {
    if (this.modeDragY === null || !p.isDown) return
    const dy = p.y - this.modeDragY
    if (!this.modeWasDragging && Math.abs(dy) > 8) this.modeWasDragging = true
    if (this.modeWasDragging) this.setModeScroll(this.modeDragStart - dy)
  }

  private handleModeDragUp = (): void => {
    this.modeDragY = null
    // تُصفَّر عند الإغلاق/الفتح التالي عبر closeModePanel/openModePanel
    this.time.delayedCall(50, () => {
      this.modeWasDragging = false
    })
  }

  private handleModeWheel = (_p: Phaser.Input.Pointer, _objs: unknown[], _dx: number, dy: number): void => {
    if (!this.modeUIOpen || !this.modePanel.visible || this.modeScrollMax <= 0) return
    this.setModeScroll(this.modeScrollY + dy * 0.6)
  }

  private setModeScroll(v: number): void {
    this.modeScrollY = Phaser.Math.Clamp(v, 0, this.modeScrollMax)
    this.applyModeScroll()
  }

  private applyModeScroll(): void {
    if (!this.modeList) return
    this.modeList.each((child: Phaser.GameObjects.GameObject) => {
      const c = child as Phaser.GameObjects.Container
      const baseY = (c.getData('baseY') as number | undefined) ?? 0
      c.y = baseY - this.modeScrollY
    })
    const thumb = this.modeScrollThumb
    if (!thumb) return
    thumb.clear()
    if (this.modeScrollMax <= 0) return
    const trackH = this.modeScrollTrackH
    const minH = 28
    const h = Math.max(minH, (trackH / (trackH + this.modeScrollMax)) * trackH)
    const y0 = this.modeListCenterY - trackH / 2 + (this.modeScrollY / this.modeScrollMax) * (trackH - h)
    thumb.fillStyle(0xffffff, 0.35)
    thumb.fillRoundedRect(186, y0, 6, h, 3)
  }

  private openModePanel(): void {
    // فتح اللوحة لا يعتمد على حالة إيقاف اللعبة؛ لوحة النمط نفسها يجب أن تبقى قابلة للتفاعل.
    this.modeUIOpen = true
    this.modePanel.setVisible(true)
    this.modePanel.setDepth(3000)
    this.pauseForModal()
  }

  private closeModePanel(): void {
    this.modeUIOpen = false
    this.modePanel.setVisible(false)
    if (this.focusPanel.visible) return
    if (!this.paused) {
      this.resumeFromModal()
    } else {
      // حتى مع الإيقاف اليدوي: جدول محاولة توليد ستُنفَّذ تلقائياً عند الاستئناف
      // (حلقة إعادة المحاولة في scheduleNext تضمن عدم فقدان الفقاعة).
      this.scheduleNext()
    }
  }

  // ------------------------------------------------------------------
  // لوحة اختيار الذكر للنمط المخصص
  // ------------------------------------------------------------------

  private buildFocusPanel(): void {
    this.focusPanel = this.add.container(this.scale.width / 2, this.scale.height / 2)
    this.focusPanel.setDepth(3000)
    this.focusPanel.setVisible(false)

    // خلفية معتمة
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(-this.scale.width / 2, -this.scale.height / 2, this.scale.width, this.scale.height)
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(-this.scale.width / 2, -this.scale.height / 2, this.scale.width, this.scale.height),
      Phaser.Geom.Rectangle.Contains,
    )
    overlay.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.toggleFocusPanel(false))
    this.focusPanel.add(overlay)

    // بطاقة مركزية
    const itemCount = SEQUENCE_DHIKRS.length
    const itemHeight = 44
    const listHeight = itemCount * itemHeight
    const cardHeight = listHeight + 140
    const startY = -(listHeight / 2) + 10

    const card = this.add.container(0, 0)
    const lift = 7
    const base = 0x059669 // أخضر زمردي
    const sideCol = this.darker(base, 0.55)
    const cardBg = this.add.graphics()
    // ظل أرضي
    cardBg.fillStyle(0x000000, 0.4)
    cardBg.fillRoundedRect(-180, -cardHeight / 2 + lift + 2, 360, cardHeight, 20)
    // جسم الحافة
    cardBg.fillStyle(sideCol, 1)
    cardBg.fillRoundedRect(-180, -cardHeight / 2 + lift - 2, 360, cardHeight, 20)
    // وجه
    cardBg.fillStyle(base, 1)
    cardBg.fillRoundedRect(-180, -cardHeight / 2, 360, cardHeight, 20)
    // تدرّج علوي
    cardBg.fillStyle(this.lighter(base, 1.12), 0.5)
    cardBg.fillRoundedRect(-180, -cardHeight / 2, 360, 60, 20)
    // لمعة علوية
    cardBg.fillStyle(0xffffff, 0.16)
    cardBg.fillRoundedRect(-172, -cardHeight / 2 + 8, 344, 30, 14)
    // حد أبيض ناصع
    cardBg.lineStyle(3, 0xffffff, 0.88)
    cardBg.strokeRoundedRect(-180, -cardHeight / 2, 360, cardHeight, 20)
    card.add(cardBg)

    const title = this.add
      .text(0, -cardHeight / 2 + 30, 'اختر ذكراً واحداً للتكرار', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5)
    card.add(title)

    this.focusPanel.add(card)

    SEQUENCE_DHIKRS.forEach((dhikr, i) => {
      const y = startY + i * itemHeight
      const bg = this.add.graphics()
      const drawItem = (c: number) => {
        const sideI = this.darker(c, 0.5)
        const liftB = 4
        bg.clear()
        bg.fillStyle(0x000000, 0.3)
        bg.fillRoundedRect(-150, -18 + liftB + 2, 300, 36, 14)
        bg.fillStyle(sideI, 1)
        bg.fillRoundedRect(-150, -18 + liftB - 1, 300, 36, 14)
        bg.fillStyle(c, 1)
        bg.fillRoundedRect(-150, -18, 300, 36, 14)
        bg.fillStyle(0xffffff, 0.22)
        bg.fillRoundedRect(-145, -14, 290, 15, 11)
        bg.lineStyle(2, 0xffffff, 0.8)
        bg.strokeRoundedRect(-150, -18, 300, 36, 14)
      }
      drawItem(0x475569)
      const label = this.add
        .text(0, 0, `${i + 1}. ${dhikr.name} (${dhikr.target})`, {
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '17px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)
      const btn = this.add.container(0, y)
      btn.add([bg, label])
      btn.setInteractive(new Phaser.Geom.Rectangle(-150, -18, 300, 36), Phaser.Geom.Rectangle.Contains)
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.tweens.add({ targets: btn, scale: 0.96, duration: 60, ease: 'Quad.easeOut' })
        gameMode.setMode('focus', i)
        this.closeModePanel()
        this.toggleFocusPanel(false)
        this.updateAzkarCounter()
      })
      card.add(btn)
      this.focusButtons.push({ bg, label, draw: drawItem })
    })

    // زر الإغلاق
    const closeY = startY + (SEQUENCE_DHIKRS.length) * itemHeight + 15
    const close = this.add.container(0, closeY)
    const closeBg = this.add.graphics()
    const closeSide = this.darker(0xdc2626, 0.55)
    closeBg.fillStyle(0x000000, 0.3)
    closeBg.fillRoundedRect(-70, -18 + 6, 140, 36, 18)
    closeBg.fillStyle(closeSide, 1)
    closeBg.fillRoundedRect(-70, -18 + 5, 140, 36, 18)
    closeBg.fillStyle(0xdc2626, 1)
    closeBg.fillRoundedRect(-70, -18, 140, 36, 18)
    closeBg.fillStyle(0xffffff, 0.25)
    closeBg.fillRoundedRect(-65, -14, 130, 15, 12)
    closeBg.lineStyle(2.5, 0xffffff, 0.9)
    closeBg.strokeRoundedRect(-70, -18, 140, 36, 18)
    const closeText = this.add
      .text(0, 0, 'رجوع', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '17px',
        color: '#fee2e2',
      })
      .setOrigin(0.5)
    close.add([closeBg, closeText])
    close.setInteractive(new Phaser.Geom.Rectangle(-70, -18, 140, 36), Phaser.Geom.Rectangle.Contains)
    close.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.toggleFocusPanel(false)
      this.openModePanel()
    })
    card.add(close)
  }

  private toggleFocusPanel(show: boolean): void {
    this.focusPanel.setVisible(show)
    if (show) {
        this.refreshFocusSelection()
    } else if (!this.modeUIOpen) {
        this.spawnIfEmpty()
    }
  }

  private refreshFocusSelection(): void {
    const selected = gameMode.getFocusIndex()
    this.focusButtons.forEach((item, i) => {
      const isActive = i === selected
      item.draw(isActive ? 0x10b981 : 0x475569)
      item.label.setColor(isActive ? '#ffffff' : '#e2e8f0')
    })
  }

  /** تبديل النمط الحالي. */
  private setMode(mode: GameMode, focusIndex?: number): void {
    if (mode === 'focus') {
      // إخفاء اللوحة الرئيسية للأنماط بدون استئناف اللعبة
      this.modePanel.setVisible(false)
      // إظهار لوحة التخصيص
      this.toggleFocusPanel(true)
    } else {
      gameMode.setMode(mode, focusIndex)
      this.closeModePanel()
      this.toggleFocusPanel(false)
      this.updateAzkarCounter()
    }
  }

  // ------------------------------------------------------------------
  // التوليد الفردي المتسلسل
  // ------------------------------------------------------------------

  /** توليد التالي فقط إذا كانت الشاشة فارغة وغير مفتوحة النوافذ. */
  private spawnIfEmpty(): void {
    if (!this.gameEnabled) return
    if (this.paused || this.modeUIOpen) return
    if (this.alive.length > 0) return
    this.spawnOne()
  }

  private spawnOne(): void {
    const { width, height } = this.scale
    const mode = gameMode.getMode()
    const margin = 70

    if (mode === 'morning' || mode === 'evening') {
      const azkarItem = gameMode.getCurrentAzkar()
      if (!azkarItem) return

      const cx = width / 2
      const cy = height / 2 - 40 // التمركز في منتصف الشاشة مع إزاحة خفيفة لأعلى

      const bubble = new AzkarBubble(this, cx, cy, azkarItem)
      this.add.existing(bubble)
      
      // نتتبعه مثل باقي الكائنات لكي نعرف متى ينتهي
      this.alive.push(bubble as unknown as FloatingObject)
      bubble.once(Phaser.GameObjects.Events.DESTROY, () => {
        const i = this.alive.indexOf(bubble as unknown as FloatingObject)
        if (i >= 0) this.alive.splice(i, 1)
        this.scheduleNext()
      })
      return
    }

    let id: string | undefined
    if (mode === 'random') {
      const pool = SEQUENCE_DHIKRS.map((d) => d.id)
      id = pool[Phaser.Math.Between(0, pool.length - 1)]
    } else {
      id = gameMode.getCurrentDhikr()?.id
    }
    if (!id) return

    const def = SEQUENCE_DHIKRS.find((d) => d.id === id)
    const Klass = CLASS_BY_DHIKR[id] ?? ALL_CLASSES[Phaser.Math.Between(0, ALL_CLASSES.length - 1)]
    const x = Phaser.Math.Between(margin, width - margin)
    const y = height + 80
    const body = new Klass(this, x, y, {
      dhikrId: id,
      dhikrName: def?.name ?? id,
      dhikrTarget: def?.target ?? 100,
    })
    this.add.existing(body)
    this.trackAlive(body)
  }

  /** تتبع الكائن الحي مع توليد التالي عند تدميره. */
  private trackAlive(body: FloatingObject): void {
    this.alive.push(body)
    body.once(Phaser.GameObjects.Events.DESTROY, () => {
      const i = this.alive.indexOf(body)
      if (i >= 0) this.alive.splice(i, 1)
      // إن لم تُجمع (خرجت أعلى الشاشة) تُصفّر السلسلة وتُولّد التالية
      if (!body.getData('collected')) {
        this.comboCount = 0
        this.data.set('combo', 0)
        this.comboText?.setAlpha(0)
        this.scheduleNext()
      }
    })
  }

  private scheduleNext(): void {
    this.time.delayedCall(NEXT_DELAY, () => {
      // إن كان التوليد محظوراً مؤقتاً (إيقاف/نافذة مفتوحة) أعد المحاولة بدل فقدان الفقاعة
      if (this.paused || this.modeUIOpen) {
        this.scheduleNext()
        return
      }
      this.spawnIfEmpty()
    }, [], this)
  }

  // ------------------------------------------------------------------
  // الجمع والتخزين والتنظيف
  // ------------------------------------------------------------------

  private onDhikrCollected(payload: CollectPayload): void {
    const mode = gameMode.getMode()
    
    // إذا كان النمط صباح/مساء نعالجه بشكل منفصل:
    if (mode === 'morning' || mode === 'evening') {
      const { allDone } = gameMode.onAzkarTapped()
      this.updateAzkarCounter()
      
      // المؤثرات
      this.sessionCount += 1
      this.sessionText.setText(`${this.sessionCount}`)
      
      if (allDone) {
        // اكتملت جميع الأذكار — حفظ الإنجاز اليومي (علامة ✔ في لوحة التحكم) + رسالة التهنئة
        markAzkarDone(mode)
        this.time.delayedCall(500, () => this.showAzkarCompleteMessage(mode))
      }
      return
    }

    const current = gameMode.getCurrentDhikr()
    const id = payload.id || current?.id
    if (!id) return

    // عداد الجلسة الحالية (يبدأ من 0 لكل شاشة، لا يُحفظ في المخزن)
    this.sessionCount += 1
    this.comboCount += 1
    this.data.set('combo', this.comboCount)
    this.updateCombo()
    this.sessionText.setText(`${this.sessionCount}`)

    const dhikr =
      current && current.id === id
        ? current
        : SEQUENCE_DHIKRS.find((d) => d.id === id) ?? { id, name: id, target: 100 }

    incrementDhikr(id, dhikr.name, dhikr.target)
    recordTodayDhikr(id)
    this.garden.refresh()

    // تقدم ورد الجلسة في النمط المترابط
    const { completed } = gameMode.onCollected(id)
    if (completed && gameMode.getMode() === 'sequence') {
      gameMode.advanceSequence()
    }

    // احتفال خفيف
    emitGoldBurst(this, this.scale.width / 2, this.scale.height / 2)
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, scalar: 0.7, ticks: 100 })

    // توليد التالية بعد فرقعة الحالية
    this.scheduleNext()
  }

  private showAzkarCompleteMessage(mode: string): void {
    const { width, height } = this.scale
    const title = mode === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'
    const msg = this.add.container(width / 2, height / 2).setDepth(4000).setAlpha(0)
    
    const bg = this.add.graphics()
    bg.fillStyle(0x0f172a, 0.95)
    bg.fillRoundedRect(-160, -100, 320, 200, 24)
    bg.lineStyle(3, 0xfcd34d, 1)
    bg.strokeRoundedRect(-160, -100, 320, 200, 24)
    
    const txt1 = this.add.text(0, -30, `اكتملت ${title}`, {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#34d399'
    }).setOrigin(0.5)
    
    const txt2 = this.add.text(0, 20, 'تقبل الله طاعتكم', {
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '22px',
      color: '#fef3c7'
    }).setOrigin(0.5)
    
    const hint = this.add.text(0, 70, '« اضغط للعودة »', {
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px',
      color: '#94a3b8'
    }).setOrigin(0.5)
    
    msg.add([bg, txt1, txt2, hint])
    
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } })
    
    this.tweens.add({ targets: msg, alpha: 1, scale: { from: 0.8, to: 1 }, duration: 400, ease: 'Back.easeOut' })
    
    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(3999).setInteractive()
    blocker.once('pointerdown', () => {
      msg.destroy()
      blocker.destroy()
      // العودة لنمط التسلسل بعد الانتهاء
      this.setMode('sequence')
    })
  }

  private cleanup(): void {
    if (this.restTimerEvent) this.restTimerEvent.destroy()
    this.restBanner?.destroy(true)
    this.restBanner = null
    const restBlocker = this.data.get('restBlocker') as Phaser.GameObjects.Rectangle | undefined
    restBlocker?.destroy()
    this.data.remove('restBlocker')
    window.removeEventListener('reader-opened', this.pauseForModal)
    window.removeEventListener('reader-closed', this.resumeFromModal)
    window.removeEventListener('settings-changed', this.onSettingsChanged)
    for (const b of this.alive) b.destroy()
    this.alive = []
    this.events.off(Events.DHIKR_COLLECTED, this.onDhikrCollected, this)
  }

  // ------------------------------------------------------------------
  // نظام لوحة الاستراحة (5 دقائق)
  // ------------------------------------------------------------------

  private startRestTimer(): void {
    if (this.restTimerEvent) this.restTimerEvent.destroy()
    this.restTimerEvent = this.time.addEvent({
      delay: 5 * 60 * 1000, // 5 دقائق
      callback: this.showRestBanner,
      callbackScope: this,
    })
  }

  private buildRestBanner(): void {
    const { width, height } = this.scale
    this.restBanner = this.add.container(width / 2, height + 300)
    this.restBanner.setDepth(4000)

    // خيوط التعليق
    const graphics = this.add.graphics()
    graphics.lineStyle(2, 0xd1d5db, 0.8)
    graphics.lineBetween(-120, -120, -120, -400) // يسار
    graphics.lineBetween(120, -120, 120, -400)  // يمين

    // لوحة زجاجية/خشبية لطيفة
    graphics.fillStyle(0x0f172a, 0.95)
    graphics.fillRoundedRect(-160, -140, 320, 260, 20)
    graphics.lineStyle(2, 0x10b981, 0.7)
    graphics.strokeRoundedRect(-160, -140, 320, 260, 20)

    // دبابيس التثبيت
    graphics.fillStyle(0xfcd34d, 1)
    graphics.fillCircle(-120, -120, 6)
    graphics.fillCircle(120, -120, 6)

    this.restBanner.add(graphics)

    // عنوان اللوحة
    const title = this.add.text(0, -90, '🌿 استراحة 🌿', {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#34d399',
    }).setOrigin(0.5)
    this.restBanner.add(title)

    // نص الآية أو الحديث
    this.restText = this.add.text(0, 10, '', {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontSize: '21px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: 280, useAdvancedWrap: true },
      lineSpacing: 8
    }).setOrigin(0.5)
    this.restBanner.add(this.restText)

    // نص توجيهي بالأسفل
    const hint = this.add.text(0, 100, '« اضغط للمتابعة »', {
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px',
      color: '#94a3b8',
    }).setOrigin(0.5)
    this.restBanner.add(hint)
  }

  private showRestBanner(): void {
    // عدم العرض إذا كان المستخدم يتصفح القوائم بالفعل أو اللعبة متوقفة يدوياً
    if (this.isResting || this.modeUIOpen || this.paused) {
      // نعيد المحاولة بعد 10 ثوانٍ إذا كان مشغولاً
      if (this.restTimerEvent) this.restTimerEvent.destroy()
      this.restTimerEvent = this.time.addEvent({
        delay: 10000,
        callback: this.showRestBanner,
        callbackScope: this,
      })
      return
    }

    this.isResting = true
    this.data.set('restActive', true)

    if (!this.restBanner) this.buildRestBanner()
    // إظهار الحاوية كاملة (البطاقة وخيوطها معاً) بعد إخفائها عند الإغلاق
    this.restBanner?.setVisible(true)
    if (this.restText) this.restText.setText(getNextQuote())

    const { height } = this.scale

    // تجميد صعود الفقاعات عبر تفعيل الوقف الداخلي بدون تغيير this.paused
    this.data.set('paused', true)

    // طبقة شفافة تغطي الشاشة لمنع تفجير الفقاعات واصطياد اللمسة للإخفاء
    if (!this.data.get('restBlocker')) {
      const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.4)
      blocker.setOrigin(0).setDepth(3999).setInteractive()
      blocker.on('pointerdown', () => this.hideRestBanner())
      this.data.set('restBlocker', blocker)
    } else {
      const blocker = this.data.get('restBlocker') as Phaser.GameObjects.Rectangle
      blocker.setVisible(true).setInteractive()
    }

    // حركة الدخول المعلقة المرتدة
    this.tweens.add({
      targets: this.restBanner,
      y: height / 2,
      duration: 1200,
      ease: 'Back.easeOut',
    })
  }

  private hideRestBanner(): void {
    if (!this.isResting) return

    const blocker = this.data.get('restBlocker') as Phaser.GameObjects.Rectangle
    if (blocker) {
      blocker.setVisible(false)
      blocker.disableInteractive()
    }

    const { height } = this.scale
    this.tweens.add({
      targets: this.restBanner,
      y: height + 300,
      duration: 800,
      ease: 'Back.easeIn',
      onComplete: () => {
        // إخفاء الحاوية كاملة بعد انتهاء الحركة؛ يمنع بقاء خيوط التعليق خارج البطاقة
        this.restBanner?.setVisible(false)
        this.isResting = false
        this.data.set('restActive', false)
        // استعادة حالة الإيقاف الأصلية للعبة
        this.data.set('paused', this.paused)
        // بدء المؤقت من جديد
        this.startRestTimer()
      }
    })
  }
}
