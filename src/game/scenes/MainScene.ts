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
import { emitGoldBurst, ensurePixelTexture } from '../objects/ParticleBurst'
import GardenLayer from '../objects/GardenLayer'
import SkyLayer from '../objects/SkyLayer'
import { Events } from '../events'
import { incrementDhikr } from '../../services/DhikrStorage'
import { SEQUENCE_DHIKRS, gameMode, type GameMode } from '../../services/gameMode'
import { recordTodayDhikr, isGameEnabled, isQuranEnabled, areIconsEnabled } from '../../services/SettingsService'
import { hasPendingUpdate } from '../../services/AppVersion'
import { getNextQuote } from '../../services/QuotesDB'

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
    // شريط علوي موحّد: 52×52px مع مسافات ثابتة لتفادي التداخل.
    this.btnGear = this.buildRoundButton(56, 62, 'gear', 0x2563eb, 0x93c5fd, () => {
      window.dispatchEvent(new CustomEvent('open-dashboard'))
    })
    this.btnSliders = this.buildRoundButton(56, 142, 'sliders', 0x7c3aed, 0xc4b5fd, () => this.openModePanel())
    this.btnLeaf = this.buildRoundButton(56, 222, 'leaf', 0x059669, 0x6ee7b7, () => {
      window.dispatchEvent(new CustomEvent('open-garden'))
    })
    this.btnQuran = this.buildRoundButton(56, 302, 'quran', 0xb45309, 0xfcd34d, () => {
      window.dispatchEvent(new CustomEvent('open-quran'))
    })

    // أقصى اليمين العلوي: الإيقاف أعلى عداد الجلسة بفاصل رأسي 25px على الأقل.
    this.buildPauseButton()
    this.buildSessionCounter()
    this.buildComboCounter()
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

  /** زر دائري كرتوني ثلاثي الأبعاد (Juicy Bevel) بإيموجي بارز وضغط يغوص. */
  private buildRoundButton(
    x: number,
    y: number,
    icon: 'gear' | 'sliders' | 'pause' | 'play' | 'leaf' | 'quran',
    color: number,
    _colorHi: number,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y)
    btn.setDepth(2000)
    const r = 33 // تكبير الزر 27% تقريباً من 52 إلى 66px
    // الأيقونة SVG تُكبّر مع الزر، مع منطقة لمس إضافية 14px حولها.
    const svgIcon = this.add.image(0, 0, ({ gear: 'hud-settings', sliders: 'hud-theme', pause: 'hud-pause', play: 'hud-play', leaf: 'hud-farm', quran: 'hud-quran' } as const)[icon])
      .setOrigin(0.5)
      .setDisplaySize(66, 66)
    btn.add(svgIcon)
    btn.setSize(66, 66)
    btn.setInteractive({ useHandCursor: true })
    btn.input!.hitArea = new Phaser.Geom.Circle(0, 0, r + 14)
    btn.input!.hitAreaCallback = Phaser.Geom.Circle.Contains

    /* legacy graphic layers removed
    const ground = this.add.graphics()
    ground.fillStyle(0x000000, 0.32)
    ground.fillCircle(1, lift + 4, r + 5)
    ground.fillStyle(0x000000, 0.18)
    ground.fillCircle(1, lift + 2, r + 10)

    // حافة الزر السفلية (الجسم البارز — بلون أغمق للبروز)
    const side = this.add.graphics()
    side.fillStyle(this.darker(color, 0.55), 1)
    side.fillCircle(0, lift, r + 1)
    side.lineStyle(3, this.darker(color, 0.35), 1)
    side.strokeCircle(0, lift, r + 1)

    // جزء متحرّك (وجه + أيقونة) — يغوص عند الضغط
    const movable = this.add.container(0, 0)

    const face = this.add.graphics()
    // الوجه الزاهي الرئيسي
    face.fillStyle(color, 1)
    face.fillCircle(0, 0, r + 1)
    // تدرّج علوي أنعم (إضافي كتيّار ضوئي)
    face.fillStyle(this.lighter(color, 1.18), 0.6)
    face.fillCircle(0, -2, r - 1)
    // حافة بيضاء ناصعة تحيط بالوجه
    face.lineStyle(4, 0xffffff, 0.95)
    face.strokeCircle(0, 0, r + 1)
    // لمعة علوية كبيرة (Glossy Highlight)
    face.fillStyle(0xffffff, 0.42)
    face.fillEllipse(0, -r * 0.42, r * 1.6, r * 0.6)
    face.fillStyle(0xffffff, 0.18)
    face.fillCircle(-r * 0.4, -r * 0.45, r * 0.5)

    // الأيقونة الإيموجي
    const emojiByIcon: Record<'gear' | 'sliders' | 'pause' | 'play' | 'leaf' | 'quran', string> = {
      gear: '⚙️',
      sliders: '🎚️',
      pause: '⏸️',
      play: '▶️',
      leaf: '🌿',
      quran: '🕌',
    }
    const svgIcon = this.add.image(0, 0, ({ gear: 'hud-settings', sliders: 'hud-theme', pause: 'hud-pause', play: 'hud-play', leaf: 'hud-farm', quran: 'hud-quran' } as const)[icon]).setDisplaySize(52, 52)
    /* legacy emoji removed */
    /* const emojiIcon = this.add
      .text(0, 0, emojiByIcon[icon], {
        fontFamily: 'system-ui, "Segoe UI Emoji", Tahoma, sans-serif',
        fontSize: `${r * 0.85}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5)
    emojiIcon.setShadow(0, 3, '#000000', 5, true, true)

    */

    const press = (down: boolean) => {
      this.tweens.killTweensOf(btn)
      this.tweens.add({ targets: btn, scale: down ? 0.95 : 1, duration: down ? 90 : 110, ease: down ? 'Quad.easeOut' : 'Back.easeOut' })
    }

    // ضغط ناعم على الأيقونة نفسها، من دون طبقات رسومية إضافية
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      press(true)
      onTap()
    })
    const release = () => {
      press(false)
    }
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, release)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, release)
    if (icon === 'pause') this.pauseIcon = svgIcon
    return btn
  }

  /** زر إيقاف/استئناف مؤقت أعلى اليمين. */
  private buildPauseButton(): void {
    this.pauseButton = this.buildRoundButton(
      this.scale.width - 56,
      52,
      'pause',
      0xdc2626,
      0xfca5a5,
      () => this.togglePause(),
    )
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
    this.paused = true
    this.data.set('paused', true)
    this.physics.pause()
    this.pauseIcon?.setTexture('hud-play')
  }

  private resumeFromModal = (): void => {
    this.data.set('paused', this.paused)
    if (!this.paused) this.physics.resume()
  }

  private togglePause(): void {
    this.paused = !this.paused
    this.data.set('paused', this.paused)
    if (this.paused) {
      this.physics.pause()
      this.pauseIcon?.setTexture('hud-play')
    } else {
      this.physics.resume()
      this.pauseIcon?.setTexture('hud-pause')
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
    const panelH = 400
    const card = this.add.container(width / 2, height / 2)
    const lift = 8
    const base = 0x6d28d9 // بنفسجي ملكي
    const sideCol = this.darker(base, 0.5)
    const gfx = this.add.graphics()
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
    const btnH = 60
    const startY = -panelH / 2 + 126

    MODE_OPTIONS.forEach((opt, i) => {
      const yy = startY + i * 76
      const isActive = opt.mode === activeMode
      const bg = this.add.graphics()
      const label = this.add
        .text(0, 0, opt.label, {
          fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)

      const drawBg = (hovered: boolean) => {
        bg.clear()
        const btnColor = isActive ? 0x16a34a : hovered ? 0x64748b : 0x475569
        const btnSide = this.darker(btnColor, 0.5)
        const liftB = 5
        // ظل سفلي
        bg.fillStyle(0x000000, 0.3)
        bg.fillRoundedRect(-btnW / 2, -btnH / 2 + liftB + 2, btnW, btnH, 18)
        // جسم الحافة
        bg.fillStyle(btnSide, 1)
        bg.fillRoundedRect(-btnW / 2, -btnH / 2 + liftB - 1, btnW, btnH, 18)
        // وجه
        bg.fillStyle(btnColor, 1)
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 18)
        // لمعة علوية
        bg.fillStyle(0xffffff, 0.25)
        bg.fillRoundedRect(-btnW / 2 + 6, -btnH / 2 + 5, btnW - 12, btnH / 2, 14)
        // حد أبيض ناصع
        bg.lineStyle(2.5, 0xffffff, 0.85)
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 18)
        // إطار ذهبي للزر النشط
        if (isActive) {
          bg.lineStyle(3, 0xfde047, 1)
          bg.strokeRoundedRect(-btnW / 2 - 2, -btnH / 2 - 2, btnW + 4, btnH + 4, 20)
        }
      }
      drawBg(false)
      if (isActive) label.setColor('#fff7cc')

      const btn = this.add.container(0, yy)
      btn.add([bg, label])
      btn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains)

      // سلسلة تفاعل ناعمة (Hover / Active)
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => drawBg(true))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => drawBg(false))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.tweens.add({ targets: btn, scale: 0.95, y: 2, duration: 70, ease: 'Quad.easeOut' })
        if (opt.mode === 'zen') {
          this.scene.start('ZenScene')
          return
        }
        this.setMode(opt.mode)
      })
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.tweens.add({ targets: btn, scale: 1, y: 0, duration: 100, ease: 'Back.easeOut' })
      })
      card.add(btn)
    })
    this.modePanel.add(card)
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
    if (!this.focusPanel.visible) this.resumeFromModal()
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
        this.setMode('focus', i)
        this.toggleFocusPanel(false)
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
      .text(0, 0, 'إغلاق', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '17px',
        color: '#fee2e2',
      })
      .setOrigin(0.5)
    close.add([closeBg, closeText])
    close.setInteractive(new Phaser.Geom.Rectangle(-70, -18, 140, 36), Phaser.Geom.Rectangle.Contains)
    close.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.toggleFocusPanel(false))
    card.add(close)
  }

  private toggleFocusPanel(show: boolean): void {
    if (show) this.pauseForModal()
    this.modeUIOpen = show
    this.focusPanel.setVisible(show)
    if (show) this.refreshFocusSelection()
    else this.spawnIfEmpty()
  }

  private refreshFocusSelection(): void {
    const selected = gameMode.getFocusIndex()
    this.focusButtons.forEach((item, i) => {
      const isActive = i === selected
      item.draw(isActive ? 0x10b981 : 0x475569)
      item.label.setColor(isActive ? '#ffffff' : '#e2e8f0')
    })
  }

  /** تبديل النمط الحالي مع إغلاق القوائم توليد فوري. */
  private setMode(mode: GameMode, focusIndex?: number): void {
    gameMode.setMode(mode, focusIndex)
    this.closeModePanel()
    this.toggleFocusPanel(false)
    if (mode === 'focus') this.toggleFocusPanel(true)
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
    this.time.delayedCall(NEXT_DELAY, () => this.spawnIfEmpty(), [], this)
  }

  // ------------------------------------------------------------------
  // الجمع والتخزين والتنظيف
  // ------------------------------------------------------------------

  private onDhikrCollected(payload: CollectPayload): void {
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
