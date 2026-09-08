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
  private pauseIcon!: Phaser.GameObjects.Text
  private updateBadge!: Phaser.GameObjects.Container
  private modePanel!: Phaser.GameObjects.Container
  private focusPanel!: Phaser.GameObjects.Container
  private focusButtons: {
    bg: Phaser.GameObjects.Graphics
    label: Phaser.GameObjects.Text
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
    // أقصى اليسار العلوي: الإعدادات، الأنماط، ثم الحديقة
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

    // أقصى اليمين العلوي: إيقاف مؤقت + عداد الجلسة
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

  /** زر دائري زجاجي (Glassmorphism) أنيق مع ظل متناسق وإيموجي بدلاً من الرسم المتجهي. */
  private buildRoundButton(
    x: number,
    y: number,
    icon: 'gear' | 'sliders' | 'pause' | 'play' | 'leaf' | 'quran',
    color: number,
    colorHi: number,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y)
    btn.setDepth(2000)
    const r = 32 // زجاجي دائري أنيق 64px

    const bg = this.add.graphics()
    // ظل ناعم تحت الزر
    bg.fillStyle(0x020617, 0.38)
    bg.fillCircle(2, 5, r + 3)
    // جسم زجاجي شفاف (Glassmorphism)
    bg.fillStyle(color, 0.30)
    bg.fillCircle(0, 0, r)
    bg.fillStyle(0xffffff, 0.07)
    bg.fillCircle(0, 0, r)
    // حد زجاجي فاتح
    bg.lineStyle(2, colorHi, 0.85)
    bg.strokeCircle(0, 0, r)
    // لمعة علوية زجاجية
    bg.fillStyle(0xffffff, 0.18)
    bg.fillEllipse(0, -r * 0.38, r * 1.3, r * 0.5)
    // حلقة داخلية رفيعة
    bg.lineStyle(1, 0xffffff, 0.3)
    bg.strokeCircle(0, 0, r - 5)

    // الأيقونة الإيموجي (بدلاً من الرسم المتجهي)
    const emojiByIcon: Record<'gear' | 'sliders' | 'pause' | 'play' | 'leaf' | 'quran', string> = {
      gear: '⚙️',
      sliders: '🎚️',
      pause: '⏸️',
      play: '▶️',
      leaf: '🌿',
      quran: '🕌',
    }
    const emojiIcon = this.add
      .text(0, 1, emojiByIcon[icon], {
        fontFamily: 'system-ui, "Segoe UI Emoji", Tahoma, sans-serif',
        fontSize: `${r * 0.85}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5)
    btn.add([bg, emojiIcon])
    btn.setSize(r * 2 + 12, r * 2 + 12)
    // دائرة ضغط مركزية موسّعة
    btn.setInteractive(new Phaser.Geom.Circle(0, 0, r + 16), Phaser.Geom.Circle.Contains)

    // تأثير انضغاط بصري ناعم عند اللمس
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.tweens.killTweensOf(btn)
      this.tweens.add({ targets: btn, scale: 0.95, duration: 70, ease: 'Quad.easeOut' })
      onTap()
    })
    const release = () => {
      this.tweens.killTweensOf(btn)
      this.tweens.add({ targets: btn, scale: 1, duration: 90, ease: 'Quad.easeOut' })
    }
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, release)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, release)
    if (icon === 'pause') this.pauseIcon = emojiIcon
    return btn
  }

  /** زر إيقاف/استئناف مؤقت أعلى اليمين. */
  private buildPauseButton(): void {
    this.pauseButton = this.buildRoundButton(
      this.scale.width - 56,
      62,
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

  /** عداد الجلسة الحالية أسفل زر الإيقاف — مُدمج وأنيق مع إطار ذهبي رفيع. */
  private buildSessionCounter(): void {
    const x = this.scale.width - 56
    // إطار خلفية داكن (Pill) مضغوط
    this.sessionPill = this.add.graphics()
    this.sessionPill.fillStyle(0x0f172a, 0.68)
    this.sessionPill.fillRoundedRect(x - 42, 110, 84, 90, 14)
    this.sessionPill.lineStyle(1.5, 0xffd166, 0.5)
    this.sessionPill.strokeRoundedRect(x - 42, 110, 84, 90, 14)
    this.sessionPill.setDepth(1999)

    this.sessionLabel = this.add
      .text(x, 127, 'الجلسة', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setShadow(0, 1, 'rgba(0,0,0,0.6)', 3, true, true)

    this.sessionText = this.add
      .text(x, 170, '0', {
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
    this.data.set('paused', true)
    this.physics.pause()
  }

  private resumeFromModal = (): void => {
    this.data.set('paused', this.paused)
    this.physics.resume()
  }

  private togglePause(): void {
    this.paused = !this.paused
    this.data.set('paused', this.paused)
    this.pauseIcon?.setText(this.paused ? '▶️' : '⏸️')
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

    // نافذة عريضة مريحة (~90% من عرض الشاشة)
    const panelW = Math.min(width * 0.9, 480)
    const panelH = 400
    const card = this.add.container(width / 2, height / 2)
    const gfx = this.add.graphics()
    gfx.fillStyle(0x0b1220, 0.97)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26)
    gfx.lineStyle(2, 0x8b5cf6, 0.9)
    gfx.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26)
    gfx.lineStyle(1, 0xffffff, 0.1)
    gfx.strokeRoundedRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW - 16, panelH - 16, 20)
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
        bg.fillStyle(hovered ? 0x334155 : 0x1e293b, 1)
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16)
        bg.lineStyle(2, isActive ? 0xfacc15 : hovered ? 0xa78bfa : 0x334155, 1)
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16)
        if (hovered) {
          bg.fillStyle(0xffffff, 0.06)
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH / 2, 16)
        }
      }
      drawBg(false)
      if (isActive) label.setColor('#fde047')

      const btn = this.add.container(0, yy)
      btn.add([bg, label])
      btn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains)

      // سلسلة تفاعل ناعمة (Hover / Active)
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => drawBg(true))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => drawBg(false))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.tweens.add({ targets: btn, scale: 0.96, duration: 60, ease: 'Quad.easeOut' })
        if (opt.mode === 'zen') {
          this.scene.start('ZenScene')
          return
        }
        this.setMode(opt.mode)
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
    const cardBg = this.add.graphics()
    cardBg.fillStyle(0x0f172a, 0.95)
    cardBg.fillRoundedRect(-180, -cardHeight / 2, 360, cardHeight, 20)
    cardBg.lineStyle(2, 0x10b981, 0.5)
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
      bg.fillStyle(0x1e293b, 1)
      bg.fillRoundedRect(-150, -18, 300, 36, 12)
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
        this.setMode('focus', i)
        this.toggleFocusPanel(false)
      })
      card.add(btn)
      this.focusButtons.push({ bg, label })
    })

    // زر الإغلاق
    const closeY = startY + (SEQUENCE_DHIKRS.length) * itemHeight + 15
    const close = this.add.container(0, closeY)
    const closeBg = this.add.graphics()
    closeBg.fillStyle(0xdc2626, 0.9)
    closeBg.fillRoundedRect(-70, -18, 140, 36, 18)
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
      item.bg.clear()
      item.bg.fillStyle(isActive ? 0x10b981 : 0x1e293b, 1)
      item.bg.fillRoundedRect(-150, -18, 300, 36, 12)
      item.label.setColor(isActive ? '#052e16' : '#e2e8f0')
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
