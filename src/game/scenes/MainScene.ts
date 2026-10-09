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
import { SEQUENCE_DHIKRS, FOCUS_OPTIONS, DHIKR_VIRTUES, gameMode, type GameMode } from '../../services/gameMode'
import { recordTodayDhikr, isGameEnabled, markAzkarDone } from '../../services/SettingsService'
import { getTotalGoodDeeds, getGardenState } from '../../services/GardenService'
import { hasPendingUpdate } from '../../services/AppVersion'
import { getNextQuote } from '../../services/QuotesDB'
import {
  BTN_ICON_SIZE,
  BTN_SIZE,
  BTN_SKIN_OFFSET_Y,
  BTN_SKIN_SIZE,
  BTN_TOUCH_PADDING,
  ICON_THEME,
  getButtonSkinTexture,
  getGlowTexture,
  getShadowTexture,
  themeGlowColor,
  type HudIcon,
} from '../ui/GameButtonSkin'
import { setCircleHitArea } from '../ui/hitArea'
import {
  DEPTH_HUD,
  DEPTH_MODAL,
  DEPTH_MODAL_BLOCKER,
  DEPTH_CARD,
  DEPTH_SESSION_COUNTER,
} from '../ui/depths'
import {
  refreshSidebarVisibility,
  resetSidebarModals,
  setSidebarModalOpen,
  setSidebarWelcomeActive,
} from '../../components/Sidebar'
import { setTopHeaderPaused, setTopHeaderVisible, refreshTopHeader } from '../../components/TopHeader'
import { isFarmModalOpen, showFarmModal } from '../../components/FarmModal'
import { isSettingsPanelOpen, showSettingsPanel } from '../../components/SettingsPanel'

/** المدة التأخيرية قبل ظهور الجسم التالي بعد تفجير الحالي (بالمللي). */
const NEXT_DELAY = 150

/** اسم مشهد الترحيب — يُستخدم لإخفاء سهم القائمة الجانبية أثناء عرضه. */
const WELCOME_SCENE = 'BootScene'
/** موضع عمود الأزرار الجانبية أفقياً (كل الأزرار على نفس الخط الرأسي). */
const SIDEBAR_X = 42
/** قطر الحاضنة/الحاوية الثابتة (46px) — width/height/flex-shrink/position/overflow. */
const SIDE_CRADLE_SIZE = 46
/**
 * قياس الأيقونة داخل الحاضنة: تملأ الحاوية بالكامل (width/height: 100%).
 * الصور مربّعة 256×256 ⇒ العرض = الارتفاع ⇒ مكافئ تماماً لـ object-fit: contain
 * (بلا تشويه وبلا مساحة فارغة داخل القرص).
 */
const SIDE_ICON_SIZE = SIDE_CRADLE_SIZE
/** أبعاد بطاقة الاسم أسفل كل أيقونة — موحّدة تماماً لكل الأيقونات. */
const SIDE_BADGE_W = 58
const SIDE_BADGE_H = 18
/** تداخل بطاقة الاسم مع أسفل الحاضنة الدائرية (margin-top: -8px في المواصفة). */
const SIDE_BADGE_GAP = -8

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
  private azkarCloseButton!: Phaser.GameObjects.Container

  private paused = false
  private modeUIOpen = false

  /** هل اللعبة مفعّلة حسب الإعدادات (يُقرأ من localStorage). */
  private gameEnabled = true

  // مراجع أيقونات شريط الأدوات (لتطبيق إظهار/إخفاء فوري حسب الإعدادات).
  private btnSliders!: Phaser.GameObjects.Container
  private btnLeaf!: Phaser.GameObjects.Container
  private btnQuran!: Phaser.GameObjects.Container
  /**
   * القائمة الجانبية ثابتة الظاهرة دائماً: لا سهم طي/فتح ولا زر يخفيها.
   * (حُذف حقل sideMenuOpen لأن الرؤية صارت دائمة بلا حالة.)
   */
  /** إطار عدّاد الجلسة: صورة `session-frame`، أو Graphics كبديل احتياطي. */
  private sessionPill!: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics
  /** شريط تقدم الورد في النمط المخصص (0/33 … 33/33). */
  private focusBarBg!: Phaser.GameObjects.Graphics
  private focusBarFill!: Phaser.GameObjects.Rectangle
  private focusBarText!: Phaser.GameObjects.Text
  /** هل نافذة الاحتفال بالورد مفتوحة حالياً (منع التكرار أثناء العرض). */
  private focusCelebrationOpen = false
  /** مرجع مستمع reader-closed المُضاف في create() لإزالته في cleanup(). */
  private _onReaderClosed?: () => void


  private sessionText!: Phaser.GameObjects.Text
  private headerSettingsButton!: Phaser.GameObjects.Container
  private headerSettingsIcon!: Phaser.GameObjects.Image
  private sidebarPauseButton!: Phaser.GameObjects.Container
  private sidebarPauseIcon!: Phaser.GameObjects.Image
  private topBanner!: Phaser.GameObjects.Image
  private headerLevelText!: Phaser.GameObjects.Text
  private headerLevelValueText!: Phaser.GameObjects.Text
  private headerCountText!: Phaser.GameObjects.Text
  private headerCountLabel!: Phaser.GameObjects.Text
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
  private modeButtons: {
    mode: GameMode
    draw: (active: boolean, hovered: boolean) => void
    label: Phaser.GameObjects.Text
  }[] = []
  private focusPanel!: Phaser.GameObjects.Container
  private focusButtons: {
    bg: Phaser.GameObjects.Graphics
    label: Phaser.GameObjects.Text
    draw: (c: number) => void
  }[] = []
  private focusDom?: HTMLElement
  /** نافذة "اختر النمط" الفاتحة كاملة الشاشة (DOM) — بديل اللوحة الداكنة داخل المشهد. */
  private modeDom?: HTMLElement

  // نافذتا «المزرعة» و«الإعدادات» الفاتحتان أصبحتا مكوّنين DOM
  // (components/FarmModal.ts و components/SettingsPanel.ts) يستمعان إلى
  // 'open-garden' و 'open-settings' مباشرة، فلا حاويات Phaser لهما.

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
    document.body.classList.add('phaser-hud-active')

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
    // أصول HUD ذات mipmaps حقيقية تُصغّر بترشيح خطي ناعم وواضح.
    ;(['hud-theme-mipped', 'hud-farm-mipped', 'hud-quran-mipped'] as const).forEach((k) => {
      if (this.textures.exists(k))
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR)
    })
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
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutTopHud, this)
    window.addEventListener('settings-changed', this.refreshCanvasHeader)
    window.addEventListener('dhikr-counted', this.refreshCanvasHeader)

    // إظهار نافذة النصائح في البداية (تظهر مرة واحدة فقط)
    window.dispatchEvent(new CustomEvent('show-advice'))

    // بدء مؤقت الاستراحة
    this.startRestTimer()

    // النوافذ HTML لا توقف المشهد تلقائياً؛ نوقف الفيزياء والحركة ونخفي HUD DOM.
    window.addEventListener('reader-opened', this.onReaderOpened)
    window.addEventListener('reader-closed', this.resumeFromModal)

    // واجهة اللعبة جاهزة: يُعاد إظهار سهم القائمة الجانبية (كان مخفياً في شاشة الترحيب).
    setSidebarWelcomeActive(false)
    // إظهار الشريط العلوي (كان مخفياً في شاشة الترحيب).
    setTopHeaderVisible(true)
    refreshTopHeader()

    // إصلاح: عند إغلاق نافذة المزرعة/الإعدادات نُزيل حالتها من الـ Sidebar
    // حتى تعود الأيقونات الجانبية ظاهرة دون الحاجة لإعادة تشغيل المشهد.
    const onReaderClosed = (): void => {
      setSidebarModalOpen('farm', isFarmModalOpen())
      setSidebarModalOpen('settings', isSettingsPanelOpen())
      refreshSidebarVisibility()
      // لا يظهر الهيدر إلا بعد إغلاق النافذة والعودة إلى اللعب.
      if (this.scene.isActive('MainScene') && !isFarmModalOpen() && !isSettingsPanelOpen()) {
        setTopHeaderVisible(true)
        refreshTopHeader()
      }
    }
    window.addEventListener('reader-closed', onReaderClosed)
    // نحتفظ بالمرجع لإزالته في cleanup()
    this._onReaderClosed = onReaderClosed


    // أحداث فتح النوافذ من شريط الأيقونات (DOM → Phaser):
    //   open-mode-panel → نافذة اختيار النمط (أيقونة «النمط»)
    //   open-garden     → نافذة «مزرعة الحسنات» (أيقونة «المزرعة»)
    //   open-settings   → نافذة «الإعدادات» (أيقونة الإعدادات)
    window.addEventListener('open-mode-panel', this.onOpenModePanel)
    window.addEventListener('open-garden', this.onOpenGarden)
    window.addEventListener('open-settings', this.onOpenSettings)
    // زر الإيقاف في TopHeader: المشهد هو مصدر الحقيقة، فنتولى التبديل ونحدّث الشريط.
    window.addEventListener('header-pause-toggle', this.onHeaderPauseToggle)
  }

  /** زر الإيقاف في الشريط العلوي: نفس منطق togglePause لكن مع مزامنة الشريط. */
  private onHeaderPauseToggle = (): void => {
    this.togglePause()
    setTopHeaderPaused(this.paused)
  }

  /* ------------------------------------------------------------------ */
  /* فتح النوافذ من شريط الأيقونات الجانبي (DOM)                          */
  /* ------------------------------------------------------------------ */

  /** أيقونة «النمط»: تفتح نافذة اختيار النمط الفاتحة. */
  private onOpenModePanel = (): void => {
    setTopHeaderVisible(false)
    this.openModePanel()
  }

  /**
   * أيقونة «المزرعة»: تفتح نافذة مزرعة الحسنات (DOM في components/FarmModal).
   * المكوّن نفسه يستمع للحدث 'open-garden'؛ هنا نكتفئ بإغلاق أي نافذة أخرى
   * وإيقاف الفيزياء عبر pauseForModal (النافذة تُطلق reader-closed عند إغلاقها).
   */
  private onOpenGarden = (): void => {
    // الفتح يتم صراحةً من MainScene لضمان أن مكوّن DOM موجود فوق الـ canvas.
    showFarmModal()
    setSidebarModalOpen('farm', true)
    setTopHeaderVisible(false)
    this.pauseForModal()
    this.applyUiSettings()
  }

  /** أيقونة «الإعدادات»: تفتح نافذة الإعدادات (DOM في components/SettingsPanel). */
  private onOpenSettings = (): void => {
    // الفتح يتم صراحةً من MainScene لضمان أن مكوّن DOM موجود فوق الـ canvas.
    showSettingsPanel()
    setSidebarModalOpen('settings', true)
    setTopHeaderVisible(false)
    this.pauseForModal()
    this.applyUiSettings()
  }

  // ------------------------------------------------------------------
  // واجهة HUD الجديدة (أيقونات جانبية)
  // ------------------------------------------------------------------

  private buildHud(): void {
    this.buildTopBanner()
    this.buildHeaderSettingsButton()
    this.layoutTopHud()
    this.buildSessionCounter()
    this.buildComboCounter()
    this.buildAzkarCounter()
    this.buildFocusBar()
    this.buildCanvasSidebar()
  }

  private buildTopBanner(): void {
    this.topBanner = this.add.image(this.scale.width / 2, 4, 'hud-banner-mipped', 'art')
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_HUD)

    const textStyle = {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontStyle: 'bold',
      color: '#4a2306',
      align: 'center' as const,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
    }
    this.headerLevelText = this.add.text(0, 0, 'المستوى', { ...textStyle, fontSize: '15px' }).setOrigin(0.5).setDepth(DEPTH_HUD + 1)
    this.headerLevelValueText = this.add.text(0, 0, '', { ...textStyle, fontSize: '21px' }).setOrigin(0.5).setDepth(DEPTH_HUD + 1)
    this.headerCountLabel = this.add.text(0, 0, 'إجمالي الأذكار', { ...textStyle, fontSize: '13px' }).setOrigin(1, 0.5).setDepth(DEPTH_HUD + 1)
    this.headerCountText = this.add.text(0, 0, '', {
      ...textStyle,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '24px',
    }).setOrigin(0, 0.5).setDepth(DEPTH_HUD + 1)
    this.refreshCanvasHeader()
  }

  private layoutTopHud(): void {
    if (!this.topBanner) return
    const bannerWidth = Math.min(window.innerWidth * 0.94, 520)
    const bannerHeight = bannerWidth / 3
    const bannerLeft = (this.scale.width - bannerWidth) / 2
    const bannerTop = 4
    this.topBanner.setPosition(this.scale.width / 2, bannerTop).setDisplaySize(bannerWidth, bannerHeight)

    const leftCenterX = bannerLeft + bannerWidth * 0.1252
    const leftCenterY = bannerTop + bannerHeight * 0.4744
    this.headerLevelText.setPosition(leftCenterX, leftCenterY - 12)
    this.headerLevelValueText.setPosition(leftCenterX, leftCenterY + 9)
    this.layoutHeaderCount(bannerLeft, bannerWidth, bannerTop + bannerHeight * 0.4993)

    const pauseSize = Math.min(48, bannerWidth * 0.105)
    this.headerSettingsButton.setPosition(bannerLeft + bannerWidth * 0.9006, bannerTop + bannerHeight * 0.4896)
    this.headerSettingsButton.setSize(pauseSize * 1.5, pauseSize * 1.5)
    this.headerSettingsIcon.setDisplaySize(pauseSize, pauseSize)
    this.headerSettingsButton.input!.hitArea.setTo(-pauseSize * 0.75, -pauseSize * 0.75, pauseSize * 1.5, pauseSize * 1.5)
    this.layoutCanvasSidebar(bannerTop + bannerHeight + 38)
  }

  private layoutHeaderCount(bannerLeft: number, bannerWidth: number, y: number): void {
    const centerX = bannerLeft + bannerWidth * 0.564
    const gap = Math.max(3, bannerWidth * 0.01)
    const safeWidth = bannerWidth * (0.733 - 0.395)
    const labelWidth = this.headerCountLabel.width
    const countWidth = this.headerCountText.width
    const scale = Math.min(1, (safeWidth - gap) / (labelWidth + countWidth))
    const groupWidth = (labelWidth + countWidth) * scale + gap

    this.headerCountLabel.setScale(scale, 1)
    this.headerCountText.setScale(scale, 1)
    this.headerCountText.setPosition(centerX - groupWidth / 2, y)
    this.headerCountLabel.setPosition(centerX + groupWidth / 2, y)
  }

  private layoutCanvasSidebar(top: number): void {
    const step = Math.max(82, Math.min(98, this.scale.height * 0.105))
    for (const [index, button] of [this.btnSliders, this.btnLeaf, this.btnQuran, this.sidebarPauseButton].entries()) {
      button?.setPosition(42, top + index * step)
      button?.setData('homeY', top + index * step)
    }
    this.pinUpdateBadge()
  }

  private refreshCanvasHeader = (): void => {
    this.headerLevelValueText?.setText(String(getGardenState().level))
    this.headerCountText?.setText(String(getTotalGoodDeeds()))
    if (this.topBanner) {
      const bannerWidth = Math.min(window.innerWidth * 0.94, 520)
      const bannerHeight = bannerWidth / 3
      this.layoutHeaderCount(
        (this.scale.width - bannerWidth) / 2,
        bannerWidth,
        4 + bannerHeight * 0.4993,
      )
    }
  }

  private buildCanvasSidebar(): void {
    const top = 4 + Math.min(window.innerWidth * 0.94, 520) / 3 + 38
    const step = Math.max(82, Math.min(98, this.scale.height * 0.105))
    const sideButton = (
      texture: string,
      label: string,
      y: number,
      action: () => void,
      onIconCreated?: (icon: Phaser.GameObjects.Image) => void,
    ): Phaser.GameObjects.Container => {
      const button = this.add.container(42, y).setDepth(DEPTH_HUD + 2)
      const image = this.add.image(0, 0, `${texture}-mipped`).setDisplaySize(54, 54)
      onIconCreated?.(image)
      const badge = this.add.graphics()
      badge.fillStyle(0xd97706, 1)
      badge.fillRoundedRect(-39, 30, 78, 28, 7)
      badge.lineStyle(2, 0xffffff, 1)
      badge.strokeRoundedRect(-39, 30, 78, 28, 7)
      const caption = this.add.text(0, 44, label, {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        resolution: Math.min(window.devicePixelRatio || 1, 3),
      }).setOrigin(0.5)
      caption.setShadow(0, 1, 'rgba(0,0,0,0.8)', 2, false, true)
      button.add([image, badge, caption])
      button.setSize(80, 60)
      button.setInteractive(new Phaser.Geom.Rectangle(-40, -27, 80, 60), Phaser.Geom.Rectangle.Contains)
      button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, action)
      return button
    }

    this.btnSliders = sideButton('hud-theme', 'النمط', top, () => this.onOpenModePanel())
    this.btnLeaf = sideButton('hud-farm', 'المزرعة', top + step, () => this.onOpenGarden())
    this.btnQuran = sideButton('hud-quran', 'المصحف', top + step * 2, () => window.dispatchEvent(new CustomEvent('open-quran')))
    this.sidebarPauseButton = sideButton(
      'hud-pause',
      'إيقاف',
      top + step * 3,
      this.onHeaderPauseToggle,
      (icon) => { this.sidebarPauseIcon = icon },
    )
    this.refreshPauseIcon()
    this.setSideMenuVisible(true, true)
  }

  /**
   * إظهار أيقونات القائمة الجانبية في مواضعها النهائية.
   * القائمة ثابتة الظهور دائماً: الدالة لم تبقَ تُخفي شيئاً، وتبقى لتفادي
   * تغيير المواضع أثناء فتح/إغلاق النوافذ (خاصة ثبات شارة التحديث).
   */
  private setSideMenuVisible(_open: boolean, instant = false): void {
    for (const btn of [this.btnLeaf, this.btnQuran, this.sidebarPauseButton]) {
      if (!btn) continue
      btn.setVisible(true).setAlpha(1).setScale(1)
      if (instant) {
        const homeY: number = btn.getData('homeY') ?? btn.y
        btn.setPosition(SIDEBAR_X, homeY)
      }
    }
    if (instant) this.pinUpdateBadge()
  }

  /** تثبيت شارة التحديث على زاوية زر الإعدادات (تتحرك مع القائمة). */
  private pinUpdateBadge(): void {
    if (!this.updateBadge || !this.headerSettingsButton) return
    this.updateBadge.setPosition(this.headerSettingsButton.x + 26, this.headerSettingsButton.y - 26)
  }

  private buildAzkarCounter(): void {
    const { width } = this.scale
    this.azkarCounterBg = this.add.graphics().setDepth(2000).setAlpha(0)
    // خلفية بسيطة معتمة أسفل الشريط العلوي (y=15 كان يتعارض مع هيدر Royal Kingdom)
    const AZKAR_TOP = 118
    this.azkarCounterBg.fillStyle(0x000000, 0.4)
    this.azkarCounterBg.fillRoundedRect(width / 2 - 90, AZKAR_TOP, 180, 40, 20)
    this.azkarCounterBg.lineStyle(2, 0xfcd34d, 0.8)
    this.azkarCounterBg.strokeRoundedRect(width / 2 - 90, AZKAR_TOP, 180, 40, 20)

    this.azkarCounterText = this.add
      .text(width / 2, AZKAR_TOP + 20, '', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0)

    this.azkarCloseButton = this.add.container(width / 2, 187).setDepth(2002).setVisible(false)
    const closeBg = this.add.graphics()
    closeBg.fillStyle(0x1e293b, 1)
    closeBg.fillRoundedRect(-78, -20, 156, 40, 8)
    closeBg.lineStyle(1.5, 0x64748b, 1)
    closeBg.strokeRoundedRect(-78, -20, 156, 40, 8)
    const closeLabel = this.add.text(0, 0, 'إغلاق الأذكار', {
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)
    this.azkarCloseButton.add([closeBg, closeLabel])
    this.azkarCloseButton.setInteractive(new Phaser.Geom.Rectangle(-78, -20, 156, 40), Phaser.Geom.Rectangle.Contains)
    this.azkarCloseButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.closeAzkarMode())
  }

  /** عرض شريط الورد أو إخفاؤه. */
  private setFocusBarVisible(visible: boolean): void {
    this.focusBarBg?.setVisible(visible)
    this.focusBarFill?.setVisible(visible)
    this.focusBarText?.setVisible(visible)
  }

  /**
   * شريط تقدم الورد في النمط المخصص: شريط طاقة علوي شبيه بألعاب الموبايل،
   * يعرض العدّاد الموصى به (0/33 → 33/33) ويمتلئ من اليمين نحو اليسار.
   */
  private buildFocusBar(): void {
    const { width } = this.scale
    const w = 210
    const h = 24
    const y = 34
    const x = width / 2 - w / 2
    this.focusBarBg = this.add.graphics().setDepth(2000)
    this.focusBarBg.fillStyle(0x022c22, 0.92)
    this.focusBarBg.fillRoundedRect(x, y - h / 2, w, h, 12)
    this.focusBarBg.lineStyle(2, 0x34d399, 0.95)
    this.focusBarBg.strokeRoundedRect(x, y - h / 2, w, h, 12)

    // قناة التعبئة: مستطيل يتمدّد بالعرض من الحافة اليمنى (نقطة الأصل يميناً)
    this.focusBarFill = this.add
      .rectangle(x + w - 3, y, 0, h - 6, 0x10b981, 1)
      .setOrigin(1, 0.5)
      .setDepth(2001)

    this.focusBarText = this.add
      .text(width / 2, y, '0 / 0', {
        fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ecfdf5',
      })
      .setOrigin(0.5)
      .setDepth(2002)
    this.focusBarText.setShadow(0, 1, 'rgba(0,0,0,0.65)', 3, true, true)

    this.setFocusBarVisible(false)
  }

  /** تحديث شريط الورد — يظهر في النمط المخصص فقط ويتقدم بسلاسة مع كل تكرار. */
  private updateFocusBar(animate = true): void {
    const dhikr = gameMode.getMode() === 'focus' ? gameMode.getCurrentDhikr() : null
    if (!dhikr || this.focusCelebrationOpen) {
      this.setFocusBarVisible(false)
      this.updateDomFocusBar(false)
      return
    }
    // الشريط ضمن Canvas الأصلي مخفي (y=34 يتعارض مع الهيدر الجديد)
    this.setFocusBarVisible(false)
    // نستخدم شريط DOM تحت الهيدر Royal Kingdom بدلاً منه
    const target = Math.max(1, dhikr.target)
    const count = Math.min(target, gameMode.getCount(dhikr.id))
    this.updateDomFocusBar(true, count, target, animate)
  }

  /**
   * شريط تقدم DOM يظهر مباشرة تحت هيدر Royal Kingdom (position:fixed top:70px).
   * يُنشأ مرة واحدة ويُحدَّث بـ CSS width بدل Phaser tweens.
   */
  private updateDomFocusBar(visible: boolean, count = 0, target = 1, animate = true): void {
    let bar = document.getElementById('rk-focus-bar-dom')
    if (!bar) {
      bar = document.createElement('div')
      bar.id = 'rk-focus-bar-dom'
      bar.innerHTML = `
        <div class="rk-focus-bar-track">
          <div class="rk-focus-bar-fill" id="rk-focus-bar-fill" style="width:0%;transition:${animate ? 'width 0.28s cubic-bezier(0.25,0.8,0.25,1)' : 'none'}"></div>
          <div class="rk-focus-bar-label" id="rk-focus-bar-label">0 / 0</div>
        </div>
      `
      document.body.appendChild(bar)
    }
    // صنف على<body> يقود تبديل الشريط العلوي وإزاحة الشريط الجانبي.
    // عند تفعيله: يختفي شريط Resource.png ويُحلّ محلّه شريط التقدّم.
    document.body.classList.toggle('rk-focus-bar-open', visible)
    // الشريط العلوي (Resource.png) يتولّى الإخفاء بنفسه عبر CSS، فلا نحتاج هنا
    // أي نداء لـsetTopHeaderVisible — لأن ذلك يمرّ عبر قاعدة الرؤية المشتركة
    // التي قد تُخفيه أصلاً أثناء فتح نافذة.
    if (!visible) {
      bar.classList.remove('visible')
      return
    }
    bar.classList.add('visible')
    const fill = document.getElementById('rk-focus-bar-fill')
    const label = document.getElementById('rk-focus-bar-label')
    if (fill) {
      if (!animate) fill.style.transition = 'none'
      else fill.style.transition = 'width 0.28s cubic-bezier(0.25,0.8,0.25,1)'
      fill.style.width = `${(count / target) * 100}%`
    }
    if (label) label.textContent = `${count} / ${target}`
  }


  private updateAzkarCounter(): void {
    const mode = gameMode.getMode()
    if (mode === 'morning' || mode === 'evening') {
      const current = gameMode.getCurrentAzkarNumber()
      const total = gameMode.getTotalAzkar()
      this.azkarCounterText.setText(`المتبقي: ${total - current + 1} / ${total}`)
      this.azkarCounterBg.setAlpha(1)
      this.azkarCounterText.setAlpha(1)
      this.azkarCloseButton.setVisible(true)
    } else {
      this.azkarCounterBg.setAlpha(0)
      this.azkarCounterText.setAlpha(0)
      this.azkarCloseButton.setVisible(false)
    }
    // شريط الورد يعمل في النمط المخصص فقط (يُخفى في بقية الأنماط)
    this.updateFocusBar()

  }

  /** الخروج من أذكار الصباح/المساء يلغي التقدم الجزئي ويعيد النمط المترابط. */
  private closeAzkarMode(): void {
    const mode = gameMode.getMode()
    if (mode !== 'morning' && mode !== 'evening') return
    for (const body of [...this.alive]) body.destroy()
    this.alive = []
    gameMode.setMode('sequence')
    this.updateAzkarCounter()
    this.spawnIfEmpty()
  }

  /**
   * تطبيق الإعدادات على عناصر الواجهة داخل المشهد.
   *
   * ملاحظة مهمة: أيقونات الشريط الجانبي ومفتاح المصحف أصبحا **ثابتين الظاهرة
   * دائماً** (طلب المستخدم) — لا يوجد anymore مفتاح إخفائها، لأن لوحة الإعدادات
   * الجديدة لا تعرض مفتاحاً للمصحف ولا للشريط. لذلك لا نقرأ areIconsEnabled
   * ولا isQuranEnabled هنا anymore. مفتاح زر الإيقاف انتقل إلى TopHeader.
   */
  private applyUiSettings(): void {
    this.btnSliders?.setVisible(true).setAlpha(1).setScale(1)
    for (const b of [this.btnLeaf, this.btnQuran, this.sidebarPauseButton]) {
      b?.setVisible(true)
    }
    // عناصر الجلسة تبقى ظاهرة كما هي.
    this.headerSettingsButton?.setVisible(true)
    this.sessionPill?.setVisible(true)
    this.sessionText?.setVisible(true)
    this.comboText?.setVisible(true)

    // ------------------------------------------------------------------
    // إصلاح «السهم الباقي ظاهراً»: رؤية سهم القائمة الجانبية (DOM)
    // ------------------------------------------------------------------
    // 1) يُخفى السهم تماماً أثناء شاشة الترحيب (WELCOME_SCENE).
    // 2) يُخفى عند فتح أي نافذة: المزرعة، الإعدادات، الأنماط، التخصيص،
    //    النصائح، المصحف، الاحتفالات، والاستراحة.
    // نُعيد تثبيت حالة النوافذ من واقع الرؤية الفعلية للحاويات (idempotent)
    // حتى تبقى الحالة صحيحة مهما تغيّر ترتيب الفتح/الإغلاق.
    setSidebarWelcomeActive(this.scene.isActive(WELCOME_SCENE))
    // نافذتا المزرعة/الإعدادات عناصر DOM الآن: نقرأ حالة الإخفاء من صنف hidden.
    setSidebarModalOpen('farm', isFarmModalOpen())
    setSidebarModalOpen('settings', isSettingsPanelOpen())
    setSidebarModalOpen('mode-panel', this.modeUIOpen)
    setSidebarModalOpen(
      'focus-panel',
      this.focusDom ? !this.focusDom.classList.contains('hidden') : false,
    )
    setSidebarModalOpen('celebration', this.focusCelebrationOpen)
    setSidebarModalOpen('rest', this.isResting)
    refreshSidebarVisibility()
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
    if (!this.headerSettingsButton) return;
    const bx = this.headerSettingsButton.x + 26
    const by = this.headerSettingsButton.y - 26

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

  /**
   * زر دائري مجسّم بأسلوب حزمة الأزرار الجديدة (Game UI Buttons):
   * إطار معدني متدرّج + حافة سفلية داكنة (سماكة 3D) + وجه كحلي + لمعة علوية،
   * مع أيقونة SVG بيضاء ناصعة في الحلقة الداخلية، وظل أرضي ناعم وهالة ملوّنة.
   * (كل القيم البصرية مستخرجة من css/style.css في الحزمة — انظر GameButtonSkin.ts)
   */
  protected buildRoundButton(
    x: number,
    y: number,
    icon: HudIcon,
    onTap: () => void,
    opts: { size?: number; label?: string; bare?: boolean } = {},
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y)
    btn.setDepth(2000)
    const theme = ICON_THEME[icon]
    // كل المقاييس الداخلية مشتقّة من حجم الزر المطلوب بنسبة ثابتة (46 للأيقونات الجانبية).
    const size = opts.size ?? BTN_SIZE
    const ratio = size / BTN_SIZE
    const radius = size / 2
    const iconSize = BTN_ICON_SIZE * ratio
    const skinSize = BTN_SKIN_SIZE * ratio
    const skinOffsetY = BTN_SKIN_OFFSET_Y * ratio

    // أيقونات PNG ثلاثية الأبعاد: تُعرض مباشرة بخلفية شفافة بلا أي إطار/دائرة
    // زجاجية أو ظل دائري (opts.bare) — لأن الصورة نفسها هي الأيقونة الكاملة.
    const bare = opts.bare === true

    let glow: Phaser.GameObjects.Image | null = null
    let pulse: Phaser.GameObjects.Graphics | null = null

    if (!bare) {
      // ظل أرضي ناعم أسفل الزر (box-shadow: 0 20px 28px -8px rgba(4,9,22,.75))
      const shadow = this.add
        .image(0, size * 0.42, getShadowTexture(this))
        .setDisplaySize(size * 1.45, size * 0.85)
        .setAlpha(0.85)
      btn.add(shadow)

      // هالة توهّج ملوّنة خلف الزر تظهر عند المرور/الضغط (--glow في الحزمة)
      glow = this.add
        .image(0, 0, getGlowTexture(this, theme))
        .setDisplaySize(size * 1.75, size * 1.75)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
      btn.add(glow)

      // جسم الزر: نسيج مرسوم بالـ Canvas بنفس طبقات .gbtn::before و ::after و .ring
      const skin = this.add
        .image(0, skinOffsetY, getButtonSkinTexture(this, theme))
        .setDisplaySize(skinSize, skinSize)
      btn.add(skin)

      // حلقة الموجة النقرية (@keyframes gbtn-pulse) — تنطلق من الزر عند كل ضغطة
      pulse = this.add.graphics()
      pulse.lineStyle(2.5, themeGlowColor(theme), 1)
      pulse.strokeCircle(0, 0, radius)
      pulse.setAlpha(0)
      btn.add(pulse)
    }

    // الحاضنة الدائرية المجسّمة (Game-Style Circle Container) للأيقونات المجرّدة:
    // قرص أزرق بتدرّج شعاعي + حدّ ذهبي 2px + ظل سفلي ولمعة داخلية علوية.
    // الغرض: حماية حواف الصورة ومنع "انحسار" الأيقونة على خلفية التطبيق.
    if (bare) {
      const cradleR = SIDE_CRADLE_SIZE / 2
      const cradle = this.add.graphics()
      // ظل أسفل القرص (box-shadow: 0 4px 6px rgba(0,0,0,.4))
      cradle.fillStyle(0x000000, 0.4)
      cradle.fillCircle(0, 4, cradleR)
      // تدرّج شعاعي محاكى: مركز فاتح (#3b82f6 عند 30%/30%) ← حافة غامقة (#1d4ed8)
      const STEPS = 14
      for (let i = STEPS; i >= 1; i--) {
        const t = i / STEPS
        const rr = cradleR * t
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0x3b82f6),
          Phaser.Display.Color.ValueToColor(0x1d4ed8),
          100,
          Math.round(t * 100),
        )
        cradle.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1)
        cradle.fillCircle(0, 0, rr)
      }
      // لمعة داخلية علوية (inset 0 2px 2px rgba(255,255,255,.5)) — بيضاوية فاتحة
      cradle.fillStyle(0xffffff, 0.5)
      cradle.fillEllipse(-cradleR * 0.18, -cradleR * 0.42, cradleR * 0.95, cradleR * 0.42)
      cradle.fillStyle(0xffffff, 0.22)
      cradle.fillEllipse(0, -cradleR * 0.1, cradleR * 1.3, cradleR * 1.1)
      // حدّ ذهبي بارز 2px (border: 2px solid #fbbf24)
      cradle.lineStyle(2, 0xfbbf24, 1)
      cradle.strokeCircle(0, 0, cradleR)
      btn.add(cradle)
    }

    // الأيقونة: صورة PNG ثلاثية الأبعاد (38px) داخل الحاضنة، أو SVG للإطارات القديمة
    const displayIconSize = bare ? SIDE_ICON_SIZE : iconSize
    const svgIcon = this.add
      .image(0, 0, ({ gear: 'hud-settings', sliders: 'hud-theme', pause: 'hud-pause', play: 'hud-play', leaf: 'hud-farm', quran: 'hud-quran', arrow: 'hud-arrow' } as const)[icon])
      .setOrigin(0.5)
      // object-fit: contain مكافئ — العرض والارتفاع بنفس القياس ⇒ بلا تشويه
      .setDisplaySize(displayIconSize, displayIconSize)
    btn.add(svgIcon)
    // بطاقة الاسم أسفل الأيقونة (Label Badge): مستطيل موحّد الأبعاد لكل الأيقونات،
    // بتدرّج ذهبي/برتقالي دافئ عالي التباين، وحدّ أبيض سميك، ونص أبيض عريض مظلّل.
    if (opts.label) {
      // بطاقة الاسم تتداخل مع أسفل الحاضنة (-8px) لتبدو كقطعة واحدة متماسكة
      const badgeTop = (bare ? SIDE_CRADLE_SIZE / 2 : radius) + SIDE_BADGE_GAP
      const badge = this.add.graphics()
      // ظل أسفل البطاقة (box-shadow: 0 2px 4px rgba(0,0,0,.3))
      badge.fillStyle(0x000000, 0.3)
      badge.fillRoundedRect(-SIDE_BADGE_W / 2, badgeTop + 2, SIDE_BADGE_W, SIDE_BADGE_H, 6)
      // تدرّج عمودي محاكى: الجزء العلوي أفتح (#f59e0b) والسفلي أغمق (#d97706)
      badge.fillStyle(0xf59e0b, 1)
      badge.fillRoundedRect(-SIDE_BADGE_W / 2, badgeTop, SIDE_BADGE_W, SIDE_BADGE_H / 2, 6)
      badge.fillStyle(0xd97706, 1)
      badge.fillRect(-SIDE_BADGE_W / 2, badgeTop + SIDE_BADGE_H / 2 - 1, SIDE_BADGE_W, SIDE_BADGE_H / 2 + 1)
      badge.fillStyle(0xd97706, 1)
      badge.fillRoundedRect(-SIDE_BADGE_W / 2, badgeTop + SIDE_BADGE_H - 8, SIDE_BADGE_W, 8, 4)
      // حدّ أبيض سميك (1.5px) يرفع التباين ويصل بين الدالة والبطاقة كقطعة واحدة
      badge.lineStyle(1.5, 0xffffff, 1)
      badge.strokeRoundedRect(-SIDE_BADGE_W / 2, badgeTop, SIDE_BADGE_W, SIDE_BADGE_H, 6)
      btn.add(badge)

      const badgeText = this.add
        .text(0, badgeTop + SIDE_BADGE_H / 2, opts.label, {
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '12px',
          fontStyle: '900',
          color: '#ffffff',
        })
        .setOrigin(0.5)
      // ظل نصّي أسود (text-shadow: 0 1px 2px rgba(0,0,0,.8)) لضمان الوضوح
      badgeText.setShadow(0, 1, 'rgba(0,0,0,0.8)', 2, false, true)
      btn.add(badgeText)
    }

    // لا يوجد فرع 'arrow' anymore: حُذف سهم طي/فتح القائمة الجانبية بالكامل،
    // إذ أصبحت أيقونات الشريط الجانبية ظاهرة دائماً.
    // منطقة النقر تغطي كامل الدائرة 100%: الحجم = قطر الجسم المرئي، والتوسيط
    // على مركز اللمس الحقيقي عبر setCircleHitArea (يُصحّح إزاحة displayOrigin
    // التي كانت تُزيح الدائرة (0,0) للأعلى فلا يستجيب إلا الجزء العلوي).
    // ملاحظة Phaser/Canvas: لا توجد عناصر <button>/SVG/DOM هنا، فلا حاجة لـ
    // pointer-events — أطفال الحاوية لا يعترضون اللمس أبداً، والقرار كله لمنطقة
    // اللمس هذه. لا توجد أي طبقة Overlay فوق الأزرار بعمق 2000.
    btn.setSize(size, bare ? SIDE_CRADLE_SIZE : size)
    // الأيقونات المجرّدة داخل حاضنة دائرية ⇒ منطقة لمس دائرية تغطّي القرص كاملاً
    if (bare) {
      setCircleHitArea(btn, SIDE_CRADLE_SIZE / 2 + BTN_TOUCH_PADDING, true)
    } else {
      setCircleHitArea(btn, radius + BTN_TOUCH_PADDING, true)
    }

    const baseY = y
    let hovering = false

    /**
     * إعادة القياس الطبيعي لأيقونة الزر — بلا أي استدعاء لـ setScale إطلاقاً.
     *
     * سبب الخلل السابق: أيقونات SVG تُحمَّل بدقة 256×256 ثم تُعرض بقياس 38px
     * عبر setDisplaySize (scale الفعلي ≈ 0.15). أي استدعاء لـ setScale(1) كان
     * يُعيدها إلى حجم النسيج الأصلي (256px) فتبدو ضخمة ومشوّهة — وهو تحديداً
     * سبب تشوّه أيقونة الإيقاف/التشغيل عند الضغط.
     */
    const resetIconSize = (): void => {
      svgIcon.setDisplaySize(displayIconSize, displayIconSize)
    }
    // يُخزَّن القياس المستهدف على الحاوية لأي إعادة ضبط لاحقة (تبديل النيسج مثلاً).
    btn.setData('iconDisplaySize', displayIconSize)

    /**
     * إعادة الحالة البصرية إلى الوضع الطبيعي حتماً.
     * السبب: عند فتح نافذة (النمط/التخصيص) أثناء الضغط، لا يصل PointerUp/Out
     * إلى الزر ⇒ كان يبقى محتجزاً على تكبير Hover (1.08) أو تصغير الضغط (0.95)
     * بشكل دائم. هذه الدالة تُستدعى عند الإفلات وعبر مؤقّت أمان بعد كل نقرة.
     */
    const normalize = (): void => {
      this.tweens.killTweensOf(btn)
      this.tweens.killTweensOf(svgIcon)
      btn.setPosition(btn.x, baseY).setScale(1)
      resetIconSize()
      if (glow) this.tweens.add({ targets: glow, alpha: hovering ? 1 : 0, duration: 220 })
    }

    // الضغط: نزول خفيف للزر + تقلّص لحظي (0.95) — تأثير لحظي فقط بلا أي بقاء
    const press = (): void => {
      this.tweens.killTweensOf(btn)
      this.tweens.killTweensOf(svgIcon)
      this.tweens.add({ targets: btn, y: baseY + 3, scale: 0.95, duration: 100, ease: 'Quad.easeOut' })
      if (glow) this.tweens.add({ targets: glow, alpha: 1, duration: 140 })
      if (pulse) {
        this.tweens.killTweensOf(pulse)
        pulse.setAlpha(0.65).setScale(0.85)
        this.tweens.add({ targets: pulse, alpha: 0, scale: 1.55, duration: 550, ease: 'Sine.easeOut' })
      } else {
        // بلا حلقة نقرية (أيقونة مجرّدة): نومض الصورة نفسها بالقياس الصريح
        // (displayWidth/displayHeight) وليس بـ scale — لتبقى الأيقونة مضبوطة الحجم.
        this.tweens.add({
          targets: svgIcon,
          displayWidth: displayIconSize * 0.88,
          displayHeight: displayIconSize * 0.88,
          duration: 100,
          ease: 'Quad.easeOut',
        })
      }
    }

    // الإفلات: إعادة فورية إلى الحجم الطبيعي بلا مرحلة bounce وسيطة (1.04)
    // السبب: إن فتحت النافذةُ الجديدة قبل انتهاء التويين، كانت onComplete لا تُستدعى
    // فيبقى الزر محتجزاً عند scale:1.04 — الحل: normalize() مباشرة بلا تأخير.
    const release = (): void => {
      this.tweens.killTweensOf(btn)
      this.tweens.killTweensOf(svgIcon)
      btn.setPosition(btn.x, baseY).setScale(1)
      resetIconSize()
      if (glow) {
        this.tweens.killTweensOf(glow)
        this.tweens.add({ targets: glow, alpha: hovering ? 1 : 0, duration: 220 })
      }
    }

    // النقر يُنفّذ نفس الوظيفة البرمجية السابقة لكل زر، من دون طبقات رسومية إضافية
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      press()
      onTap()
      // مؤقّت أمان: إن أخفت النافذةُ الجديدة الزر أو ابتلعت الحدث، نُعيد التطبيع سريعاً
      this.time.delayedCall(180, normalize)
    })
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, release)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      hovering = false
      release()
    })
    // المرور (Hover): لا يغيّر حجم الأيقونة أبداً — فقط الهالة الملوّنة، منعاً للالتصاق التكبير
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      hovering = true
      if (glow) {
        this.tweens.killTweensOf(glow)
        this.tweens.add({ targets: glow, alpha: 1, duration: 220 })
      }
    })
    return btn
  }

  /** زر الإعدادات داخل الخانة اليمنى للشريط العلوي. */
  private buildHeaderSettingsButton(): void {
    this.headerSettingsButton = this.add.container(0, 0).setDepth(DEPTH_HUD + 2)
    this.headerSettingsIcon = this.add.image(0, 0, 'hud-settings').setTint(0x4a2306)
    this.headerSettingsButton.add(this.headerSettingsIcon)
    this.headerSettingsButton.setSize(56, 56)
    this.headerSettingsButton.setInteractive(new Phaser.Geom.Rectangle(-28, -28, 56, 56), Phaser.Geom.Rectangle.Contains)
    this.headerSettingsButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onOpenSettings)
    this.headerSettingsButton.setScrollFactor(0)
  }

  /** تبديل رمز الإيقاف والتشغيل في الموضع الجانبي. */
  private refreshPauseIcon(): void {
    if (!this.sidebarPauseIcon) return
    this.sidebarPauseIcon.setTexture(this.paused ? 'hud-play' : 'hud-pause')
    this.sidebarPauseIcon.setDisplaySize(54, 54)
    const label = this.sidebarPauseButton?.list[2] as Phaser.GameObjects.Text | undefined
    label?.setText(this.paused ? 'استئناف' : 'إيقاف')
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
    }).setOrigin(0.5).setDepth(DEPTH_HUD).setAlpha(0)
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

  /**
   * عدّاد الجلسة — إطار معدني جاهز (src/assets/session-frame.png) بدل الرسم البرمجي.
   *
    * الأصل 1024×1024 (مربّع، POT — أنظر أدناه): لوحة «الجلسة» الذهبية علوياً،
   * وتحتها المربّع الكريمي الفاتح الذي يُوضع فيه الرقم. نُحجم الإطار إلى عرض
  * 160..190px (مناسب للهاتف)، فنُعيد حساب موضع الرقم كنسبة من أبعاد الإطار
   * لا كإحداث ثابت، حتى يبقى داخل المربّع مهما تغيّر الحجم.
   */
  private buildSessionCounter(): void {
    // الأصل مربّع 1024×1024 ⇒ frameH = frameW.
    const frameW = Math.round(Math.min(190, Math.max(160, this.scale.width * 0.42)))
    const frameH = frameW
    // البطاقة مثبّتة أعلى اليمين، أسفل الشريط العلوي مباشرة.
    // الشريط عرضه min(94vw, 520px) وارتفاعه = ثلثه ⇒ نحسب أسفله بدل ثابت.
    const bannerW = Math.min(window.innerWidth * 0.94, 520)
    const bannerBottom = 4 + bannerW / 3
    const x = this.scale.width - Math.round(frameW * 0.62)
    const topY = Math.round(bannerBottom + 10)
    // مركز المربّع الكريمي الداخلي كنسبة من ارتفاع الإطار (0.684)
    const innerY = 0.684
    const hasFrame = this.textures.exists('session-frame')

    // سبب الباهتان والدقة المنخفضة كان جذرين:
    // 1) نستخدم أصل pi/session.png بدقة 1536×1024، مقصوصاً إلى إطار مربع
    //    عالي الدقة 1024×1024؛ لا نكبّر النسخة القديمة 512px.
    // 2) القماش كان يُرسم بدقة CSS بلا devicePixelRatio ⇒ نصف دقة الشاشة.
    //    الحل في PhaserGame: render.mipmapFilter + scale.zoom = 1/dpr.
    // الترشيح يبقى LINEAR (نعومة) لا NEAREST (المستخدم لأيقونات HUD الصغيرة)،
    // وتحته mipmapFilter من إعدادات المحرك يتولّى اختيار مستوى التصغير المناسب.
    if (hasFrame) {
      this.textures.get('session-frame').setFilter(Phaser.Textures.FilterMode.LINEAR)
    }

    if (hasFrame) {
      this.sessionPill = this.add
        .image(x, topY, 'session-frame')
        .setOrigin(0.5, 0)
        .setDisplaySize(frameW, frameH)
        .setDepth(DEPTH_SESSION_COUNTER)
    } else {
      // بديل احتياطي: بطاقة زرقاء مرسومة، لو فشل تحميل الأصل.
      this.sessionPill = this.add.graphics().setDepth(DEPTH_SESSION_COUNTER)
      this.sessionPill.fillStyle(0x0ea5e9, 1)
      this.sessionPill.fillRoundedRect(x - frameW / 2, topY, frameW, frameH, 16)
      this.sessionPill.lineStyle(3, 0xffffff, 0.9)
      this.sessionPill.strokeRoundedRect(x - frameW / 2, topY, frameW, frameH, 16)
    }

    // كلمة «الجلسة» مطبوعة داخل صورة الإطار نفسه، فلا ننشئ لها نصاً برمجياً.

    // الرقم داخل المربّع الكريمي، متمركز تماماً: حجم نسبي لحجم الإطار
    // (يبقى مقروءاً من الهاتف إلى الحاسوب) + ظل فاتح يرفع التباين.
    this.sessionText = this.add
      .text(x, topY + frameH * innerY, '0', {
        fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
        fontSize: `${Math.round(frameH * 0.2)}px`,
        fontStyle: 'bold',
        color: '#4A2C0A',
        align: 'center',
        resolution: Math.min(window.devicePixelRatio || 1, 3),
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_SESSION_COUNTER + 1)
    this.sessionText.setShadow(0, 1, 'rgba(255,255,255,0.9)', 4, true, true)
  }

  private onReaderOpened = (): void => {
    setTopHeaderVisible(false)
    this.updateDomFocusBar(false)
    this.pauseForModal()
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
    // تصفير مراجع الأزرار قبل أي بناء: عند العودة من مشهد آخر (نمط الاستغفار)
    // يبقى الحقل محفوظاً من التشغيل السابق ويشير إلى نصوص مُدمَّرة،
    // فتنهار refreshModeSelection على canvas=null وتتعطّل create() بالكامل.
    this.modeButtons = []

    // الواجهة الداكنة القديمة تُبقى احتياطاً، لكن المستخدم يرى الآن نافذة DOM الفاتحة.
    const { width, height } = this.scale
    this.modePanel = this.add.container(0, 0)
    this.modePanel.setDepth(DEPTH_MODAL)
    this.modePanel.setVisible(false)

    const dim = this.add.rectangle(0, 0, width, height, 0x020617, 0.72)
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
    // لا تتجاوز البطاقة مساحة العرض المتاحة في المتصفح أو الهاتف.
    const panelH = Math.max(220, Math.min(520, height - 24))
    const card = this.add.container(width / 2, height / 2)
    // إعادة ضبط حالة التمرير عند كل بناء (تُبنى اللوحة مرة واحدة عند create)
    this.modeScrollY = 0
    this.modeScrollMax = 0
    this.modeScrollThumb = undefined
    this.modeListCenterY = 0
    const base = 0x0f172a // كحلي مصمت عالي التباين
    const gfx = this.add.graphics()
    // بطاقة مصمتة: بلا شفافية أو لمعان زجاجي.
    gfx.fillStyle(base, 1)
    gfx.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8)
    gfx.lineStyle(2, 0x475569, 1)
    gfx.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8)
    gfx.lineStyle(1, 0x334155, 1)
    gfx.lineBetween(-panelW / 2 + 24, -panelH / 2 + 84, panelW / 2 - 24, -panelH / 2 + 84)
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
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5)
    card.add(title)

    const activeMode = gameMode.getMode()
    const btnW = panelW - 48
    const btnH = 48
    const GAP = 10
    const STEP = btnH + GAP

    // ── حاوية قائمة الأزرار القابلة للتمرير (داخل البطاقة، أسفل العنوان) ──
    const listTop = -panelH / 2 + 96
    const listBottom = panelH / 2 - 20
    // مساحة التمرير لا تتجاوز 70% من ارتفاع نافذة العرض.
    const listH = Math.max(80, Math.min(listBottom - listTop, height * 0.7))
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

    this.modeButtons = []

    MODE_OPTIONS.forEach((opt, idx) => {
      // الإحداثي الأساسي ثابت: gap ثابت 12px — لا يتغير أبداً عند التفاعل
      const baseY = -((MODE_OPTIONS.length - 1) * STEP) / 2 + idx * STEP
      const bg = this.add.graphics()
      const label = this.add
        .text(0, 0, opt.label, {
          fontFamily: '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)

      const drawBg = (active: boolean, hovered: boolean): void => {
        bg.clear()
        if (active) {
          bg.fillStyle(hovered ? 0x059669 : 0x10b981, 1)
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8)
        } else {
          bg.fillStyle(hovered ? 0x334155 : 0x1e293b, 1)
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8)
        }
      }
      const isMode = opt.mode !== 'zen'
      const isActive = isMode && opt.mode === activeMode
      drawBg(isActive, false)
      label.setColor(isActive ? '#ffffff' : '#e2e8f0')

      const btn = this.add.container(0, baseY)
      btn.add([bg, label])
      btn.setData('baseY', baseY)
      btn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2 - 10, -btnH / 2 - 8, btnW + 20, btnH + 16), Phaser.Geom.Rectangle.Contains)

      // سلسلة تفاعل ناعمة (Hover / Active) — scale فقط، المواضع baseY ثابتة
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => drawBg(isMode && opt.mode === gameMode.getMode(), true))
      btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => drawBg(isMode && opt.mode === gameMode.getMode(), false))
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
      if (opt.mode !== 'zen') this.modeButtons.push({ mode: opt.mode, draw: drawBg, label })
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

    // نافذة DOM تُبنى أخيراً: عندها تكون modeButtons مليئة بنصوص حية،
    // فتعمل refreshModeSelection بدون أن تمسّ نصوصاً مُدمَّرة من تشغيل سابق.
    this.buildModeDom()
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

  /** وصف مختصر لكل نمط يظهر داخل البطاقة البيضاء. */
  private static readonly MODE_HINTS: Record<string, string> = {
    sequence: 'يتنقّل تلقائياً بين الأذكار الموصى بها ورداً بعد ورد.',
    random: 'أذكار متنوعة عشوائياً تُبقي الجلسة حيّة ومتنوعة.',
    focus: 'تختار ذكراً واحداً وتكرره مع شريط تقدم للورد.',
    morning: 'أذكار الصباح كاملة بالترتيب مع عدّاد.',
    evening: 'أذكار المساء كاملة بالترتيب مع عدّاد.',
    zen: 'جلسة استغفار هادئة لشاشة استرخاء كاملة.',
  }

  /**
   * نافذة "اختر النمط": واجهة DOM فاتحة كاملة الشاشة (100vw × 100dvh) مطابقة
   * لنافذة التخصيص — بطاقات بيضاء بظلال خفيفة والنمط الحالي بخلفية زمردية.
   */
  private buildModeDom(): void {
    const root = document.createElement('section')
    root.className = 'mode-dom-modal hidden'
    root.setAttribute('aria-label', 'اختر النمط')
    root.innerHTML =
      '<div class="mode-dom-content" dir="rtl"><header class="mode-dom-header"><div><p class="mode-dom-eyebrow">الأنماط</p><h2>اختر النمط</h2><p>اختر أسلوب اللعب المناسب لحالتك الآن.</p></div><button class="mode-dom-close" type="button" aria-label="إغلاق">×</button></header><div class="mode-dom-list"></div></div>'
    const list = root.querySelector('.mode-dom-list') as HTMLElement
    MODE_OPTIONS.forEach((opt) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'mode-dom-card'
      card.dataset.mode = opt.mode
      card.innerHTML = `<strong>${opt.label}</strong><small>${MainScene.MODE_HINTS[opt.mode] ?? ''}</small>`
      card.addEventListener('click', () => {
        if (opt.mode === 'zen') {
          this.closeModePanel()
          this.scene.start('ZenScene')
          return
        }
        this.setMode(opt.mode)
      })
      list.appendChild(card)
    })
    root.querySelector('.mode-dom-close')?.addEventListener('click', () => this.closeModePanel())
    document.body.appendChild(root)
    this.modeDom = root
    this.refreshModeSelection()
  }

  private openModePanel(): void {
    // فتح النافذة الفاتحة كاملة الشاشة (DOM) بدل اللوحة الداكنة.
    this.modeUIOpen = true
    this.modeDom?.classList.remove('hidden')
    this.refreshModeSelection()
    // إخفاء سهم القائمة الجانبية + إيقاف اللعب مؤقتاً أثناء عرض النافذة.
    setSidebarModalOpen('mode-panel', true)
    this.pauseForModal()
    this.applyUiSettings()
  }

  /** يطبّق النمط النشط الحالي على بطاقات النافذة الفاتحة. */
  private refreshModeSelection(): void {
    const activeMode = gameMode.getMode()
    this.modeDom?.querySelectorAll<HTMLElement>('.mode-dom-card').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.mode === activeMode)
    })
    this.modeButtons.forEach(({ mode, draw, label }) => {
      // حماية: قد يكون النص مُدمَّراً إذا نُسِي تصفير الحقل — نتخطّاه بدل
      // أن يرمي استثناءً داخل create() فتتوقف GameObjects خاصة بتحديث النمط.
      if (!label || !label.scene) return
      const active = mode === activeMode
      draw(active, false)
      label.setColor(active ? '#ffffff' : '#e2e8f0')
    })
  }

  private closeModePanel(): void {
    this.modeUIOpen = false
    this.modeDom?.classList.add('hidden')
    this.modePanel.setVisible(false)
    // إغلاق نافذة الأنماط: إعادة إظهار سهم القائمة الجانبية (إن لم تبقَ نافذة أخرى).
    setSidebarModalOpen('mode-panel', false)
    setTopHeaderVisible(true)
    this.applyUiSettings()
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
    this.buildFocusDom()
    this.focusPanel = this.add.container(this.scale.width / 2, this.scale.height / 2)
    this.focusPanel.setDepth(DEPTH_MODAL)
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
    const itemHeight = 56
    const listHeight = itemCount * itemHeight
    const cardHeight = listHeight + 140
    const startY = -(listHeight / 2) + 10

    const card = this.add.container(0, 0)
    const cardBg = this.add.graphics()
    // بطاقة مصمتة مطابقة لنافذة اختيار النمط.
    cardBg.fillStyle(0x0f172a, 1)
    cardBg.fillRoundedRect(-180, -cardHeight / 2, 360, cardHeight, 8)
    cardBg.lineStyle(2, 0x475569, 1)
    cardBg.strokeRoundedRect(-180, -cardHeight / 2, 360, cardHeight, 8)
    card.add(cardBg)

    const title = this.add
      .text(0, -cardHeight / 2 + 30, 'اختر ذكراً واحداً للتكرار', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '24px',
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
        bg.clear()
        bg.fillStyle(c, 1)
        bg.fillRoundedRect(-150, -24, 300, 48, 8)
      }
      drawItem(0x1e293b)
      const label = this.add
        .text(0, 0, `${i + 1}. ${dhikr.name} (${dhikr.target})`, {
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '18px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)
      const btn = this.add.container(0, y)
      btn.add([bg, label])
      btn.setInteractive(new Phaser.Geom.Rectangle(-150, -24, 300, 48), Phaser.Geom.Rectangle.Contains)
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
    const closeY = startY + (SEQUENCE_DHIKRS.length) * itemHeight + 8
    const close = this.add.container(0, closeY)
    const closeBg = this.add.graphics()
    closeBg.fillStyle(0x1e293b, 1)
    closeBg.fillRoundedRect(-150, -24, 300, 48, 8)
    const closeText = this.add
      .text(0, 0, 'رجوع', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
    close.add([closeBg, closeText])
    close.setInteractive(new Phaser.Geom.Rectangle(-150, -24, 300, 48), Phaser.Geom.Rectangle.Contains)
    close.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.toggleFocusPanel(false)
      this.openModePanel()
    })
    card.add(close)
  }

  private buildFocusDom(): void {
    const root = document.createElement('section')
    root.className = 'focus-dom-modal hidden'
    root.setAttribute('aria-label', 'اختيار الذكر')
    root.innerHTML = '<div class="focus-dom-content" dir="rtl"><header class="focus-dom-header"><div><p class="focus-dom-eyebrow">التخصيص</p><h2>اختر ذكراً للتكرار</h2><p>اختر الذكر لعرض فضله والبدء بهدوء.</p></div><button class="focus-dom-close" type="button" aria-label="إغلاق">×</button></header><div class="focus-dom-list"></div></div>'
    const list = root.querySelector('.focus-dom-list') as HTMLElement
    FOCUS_OPTIONS.forEach((dhikr, index) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'focus-dom-card'
      card.innerHTML = `<span class="focus-dom-number">${index + 1}</span><span class="focus-dom-text"><span class="focus-dom-name">${dhikr.name}</span><span class="focus-dom-count">${dhikr.target} مرة</span></span>`
      card.addEventListener('click', () => this.showDhikrVirtue(root, index))
      list.appendChild(card)
    })
    root.querySelector('.focus-dom-close')?.addEventListener('click', () => {
      this.toggleFocusPanel(false)
      this.closeModePanel()
    })
    document.body.appendChild(root)
    this.focusDom = root
  }

  private showDhikrVirtue(root: HTMLElement, index: number): void {
    const dhikr = FOCUS_OPTIONS[index]
    const virtue = DHIKR_VIRTUES[dhikr.id]
    const content = root.querySelector('.focus-dom-content') as HTMLElement
    content.innerHTML = `<button class="focus-dom-back" type="button">‹ العودة إلى القائمة</button><article class="virtue-card" dir="rtl"><p class="focus-dom-eyebrow">فضل الذكر</p><h2>${dhikr.name}</h2><div class="virtue-target">الورد الموصى به: <strong>${virtue.recommended} مرة</strong></div><blockquote>${virtue.hadith}</blockquote><button class="focus-dom-start" type="button">ابدأ الذكر</button></article>`
    content.querySelector('.focus-dom-back')?.addEventListener('click', () => this.buildFocusDomView(root))
    content.querySelector('.focus-dom-start')?.addEventListener('click', () => {
      // اختيار الذكر أولاً، ثم إغلاق اللوحات واستئناف المحرك والتوليد صراحةً.
      gameMode.setMode('focus', index)
      this.closeModePanel()
      this.toggleFocusPanel(false)
      this.physics.resume()
      this.updateAzkarCounter()
      this.spawnIfEmpty()
    })
  }

  private buildFocusDomView(root: HTMLElement): void {
    root.querySelector('.focus-dom-content')?.remove()
    const content = document.createElement('div')
    content.className = 'focus-dom-content'
    content.dir = 'rtl'
    content.innerHTML = '<header class="focus-dom-header"><div><p class="focus-dom-eyebrow">التخصيص</p><h2>اختر ذكراً للتكرار</h2><p>اختر الذكر لعرض فضله والبدء بهدوء.</p></div><button class="focus-dom-close" type="button" aria-label="إغلاق">×</button></header><div class="focus-dom-list"></div>'
    const list = content.querySelector('.focus-dom-list') as HTMLElement
    FOCUS_OPTIONS.forEach((dhikr, index) => {
      const card = document.createElement('button')
      card.type = 'button'; card.className = 'focus-dom-card'
      card.innerHTML = `<span class="focus-dom-number">${index + 1}</span><span class="focus-dom-text"><span class="focus-dom-name">${dhikr.name}</span><span class="focus-dom-count">${dhikr.target} مرة</span></span>`
      card.addEventListener('click', () => this.showDhikrVirtue(root, index)); list.appendChild(card)
    })
    content.querySelector('.focus-dom-close')?.addEventListener('click', () => {
      this.toggleFocusPanel(false)
      this.closeModePanel()
    })
    root.appendChild(content); this.focusDom = root
  }

  private toggleFocusPanel(show: boolean): void {
    this.focusDom?.classList.toggle('hidden', !show)
    this.focusPanel?.setVisible(false)
    // إخفاء سهم القائمة الجانبية أثناء عرض نافذة تخصيص الذكر.
    setSidebarModalOpen('focus-panel', show)
    if (show) {
      this.focusDom?.classList.remove('hidden')
      if (!this.focusDom?.querySelector('.virtue-card')) this.buildFocusDomView(this.focusDom!)
      this.refreshFocusSelection()
    } else if (!this.modeUIOpen) this.spawnIfEmpty()
    this.applyUiSettings()
  }

  private refreshFocusSelection(): void {
    const selected = gameMode.getFocusIndex()
    this.focusButtons.forEach((item, i) => {
      const isActive = i === selected
      item.draw(isActive ? 0x10b981 : 0x1e293b)
      item.label.setColor(isActive ? '#ffffff' : '#e2e8f0')
    })
  }

  /** تبديل النمط الحالي. */
  private setMode(mode: GameMode, focusIndex?: number): void {
    if (mode === 'focus') {
      // إخفاء النافذة الرئيسية للأنماط بدون استئناف اللعبة
      this.modeDom?.classList.add('hidden')
      this.modePanel.setVisible(false)
      // إظهار لوحة التخصيص
      this.toggleFocusPanel(true)
    } else {
      gameMode.setMode(mode, focusIndex)
      this.refreshModeSelection()
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
      // الشريط العلوي: النمط الصباحي/المسائي يُنقص العدّاد المحلياً، فنحدّثه.
      window.dispatchEvent(new CustomEvent('dhikr-counted'))
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
    // الشريط العلوي: تحدّث العدّاد الإجمالي فور كل ذكر.
    window.dispatchEvent(new CustomEvent('dhikr-counted'))

    // تقدم ورد الجلسة: النمط المترابط ينتقل للذكر التالي، ونمط التخصص يحتفل بالورد
    const { completed } = gameMode.onCollected(id)
    if (completed && mode === 'sequence') {
      gameMode.advanceSequence()
    }
    this.updateFocusBar()
    const focusDone = completed && mode === 'focus' && !this.focusCelebrationOpen

    // احتفال خفيف
    emitGoldBurst(this, this.scale.width / 2, this.scale.height / 2)
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, scalar: 0.7, ticks: 100 })

    // اكتمال الورد في النمط المخصص: نافذة احتفال + سؤال المتابعة
    if (focusDone && current) {
      this.time.delayedCall(260, () => this.showFocusCelebration(dhikr))
    }

    // توليد التالية بعد فرقعة الحالية
    this.scheduleNext()
  }

  // ------------------------------------------------------------------
  // نافذة الاحتفال بالورد + تدفق المتابعة (نمط التخصيص)
  // ------------------------------------------------------------------

  /** زر نصي داخل بطاقة الاحتفال بحدود ذهبية ونص أبيض. */
  private createCelebrationButton(
    label: string,
    y: number,
    width: number,
    fill: number,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(0, y)
    const bg = this.add.graphics()
    bg.fillStyle(fill, 1)
    bg.fillRoundedRect(-width / 2, -22, width, 44, 12)
    bg.lineStyle(2, 0xfcd34d, 0.95)
    bg.strokeRoundedRect(-width / 2, -22, width, 44, 12)
    btn.add(bg)
    btn.add(
      this.add
        .text(0, 0, label, {
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5),
    )
    btn.setSize(width, 44)
    btn.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -22, width, 44), Phaser.Geom.Rectangle.Contains)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.tweens.add({ targets: btn, scale: 0.95, duration: 70, yoyo: true, ease: 'Quad.easeOut' })
    })
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onTap)
    return btn
  }

  /** نافذة الاحتفال: تهنئة بإكمال الورد، ثم سؤال "الاستمرار أم ذكر آخر؟". */
  private showFocusCelebration(dhikr: { name: string; target: number }): void {
    const { width, height } = this.scale
    this.focusCelebrationOpen = true
    this.setFocusBarVisible(false)
    this.physics.pause()
    // القائمة الجانبية ثابتة الظهور — لا داعي لإخفائها أثناء الاحتفال.
    setSidebarModalOpen('celebration', true)
    this.applyUiSettings()

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x022c22, 0.78)
      .setOrigin(0)
      .setDepth(DEPTH_MODAL_BLOCKER)
      .setInteractive()
    const card = this.add.container(width / 2, height / 2).setDepth(DEPTH_CARD).setAlpha(0)

    const bg = this.add.graphics()
    bg.fillStyle(0x0f2a1e, 0.97)
    bg.fillRoundedRect(-165, -150, 330, 300, 22)
    bg.lineStyle(3, 0x34d399, 1)
    bg.strokeRoundedRect(-165, -150, 330, 300, 22)
    card.add(bg)

    card.add(
      this.add
        .text(0, -104, 'ما شاء الله', {
          fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
          fontSize: '30px',
          fontStyle: 'bold',
          color: '#34d399',
        })
        .setOrigin(0.5),
    )
    card.add(
      this.add
        .text(0, -56, `أكملت ورد: ${dhikr.name}`, {
          fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
          fontSize: '20px',
          color: '#ecfdf5',
          align: 'center',
          wordWrap: { width: 290 },
        })
        .setOrigin(0.5),
    )
    card.add(
      this.add
        .text(0, -8, `${dhikr.target} / ${dhikr.target} مرة`, {
          fontFamily: 'Consolas, monospace',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#fcd34d',
        })
        .setOrigin(0.5),
    )
    card.add(
      this.add
        .text(0, 34, 'تقبّل الله منك', {
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '17px',
          color: '#a7f3d0',
        })
        .setOrigin(0.5),
    )

    const next = this.createCelebrationButton('متابعة', 104, 190, 0x059669, () => {
      card.destroy()
      this.showFocusNextStep(dhikr, blocker)
    })
    card.add(next)

    this.data.set('celebrationCard', card)
    this.tweens.add({ targets: card, alpha: 1, scale: { from: 0.85, to: 1 }, duration: 320, ease: 'Back.easeOut' })
    confetti({ particleCount: 140, spread: 110, origin: { y: 0.5 } })
  }

  /** الخطوة الثانية: هل يُكمل نفس الذكر أم يعود لاختيار ذكر آخر؟ */
  private showFocusNextStep(
    dhikr: { name: string; target: number },
    blocker: Phaser.GameObjects.Rectangle,
  ): void {
    const { width, height } = this.scale
    const card = this.add.container(width / 2, height / 2).setDepth(DEPTH_CARD).setAlpha(0)

    const bg = this.add.graphics()
    bg.fillStyle(0x0f2a1e, 0.97)
    bg.fillRoundedRect(-165, -130, 330, 260, 22)
    bg.lineStyle(3, 0xfbbf24, 1)
    bg.strokeRoundedRect(-165, -130, 330, 260, 22)
    card.add(bg)

    card.add(
      this.add
        .text(0, -74, 'هل تريد الاستمرار على نفس الذكر؟', {
          fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fcd34d',
          align: 'center',
          wordWrap: { width: 280 },
        })
        .setOrigin(0.5),
    )
    card.add(
      this.add
        .text(0, -26, `الاستمرار يعيد العدّاد إلى 0/${dhikr.target}`, {
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '15px',
          color: '#a7f3d0',
          align: 'center',
          wordWrap: { width: 280 },
        })
        .setOrigin(0.5),
    )

    // 1) الاستمرار: تصفير العدّاد ومتابعة نفس الذكر
    const keep = this.createCelebrationButton('نعم، واصل الذكر', 22, 240, 0x059669, () => {
      gameMode.resetCounts()
      this.closeFocusCelebration(blocker, card)
      this.updateFocusBar()
    })
    card.add(keep)

    // 2) عودة: إغلاق الذكر وفتح واجهة "التخصيص - اختر ذكراً للتكرار"
    const back = this.createCelebrationButton('اختيار ذكر آخر', 84, 240, 0x7c2d12, () => {
      gameMode.setMode('sequence')
      this.closeFocusCelebration(blocker, card)
      this.updateAzkarCounter()
      this.toggleFocusPanel(true)
    })
    card.add(back)

    this.tweens.add({ targets: card, alpha: 1, scale: { from: 0.85, to: 1 }, duration: 300, ease: 'Back.easeOut' })
  }

  /** إغلاق نافذة الاحتفال واستئناف اللعب. */
  private closeFocusCelebration(
    blocker: Phaser.GameObjects.Rectangle,
    card: Phaser.GameObjects.Container,
  ): void {
    blocker.destroy()
    card.destroy()
    this.data.remove('celebrationCard')
    this.focusCelebrationOpen = false
    setSidebarModalOpen('celebration', false)
    this.physics.resume()
    this.spawnIfEmpty()
    this.applyUiSettings()
  }

  private showAzkarCompleteMessage(mode: string): void {
    const { width, height } = this.scale
    const title = mode === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'
    const msg = this.add.container(width / 2, height / 2).setDepth(DEPTH_CARD).setAlpha(0)

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

    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(DEPTH_MODAL_BLOCKER).setInteractive()
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
    window.removeEventListener('reader-opened', this.onReaderOpened)
    window.removeEventListener('reader-closed', this.resumeFromModal)
    if (this._onReaderClosed) window.removeEventListener('reader-closed', this._onReaderClosed)
    window.removeEventListener('settings-changed', this.onSettingsChanged)
    window.removeEventListener('settings-changed', this.refreshCanvasHeader)
    window.removeEventListener('dhikr-counted', this.refreshCanvasHeader)
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutTopHud, this)
    // إزالة مستمعات فتح النوافذ من شريط الأيقونات (DOM).
    window.removeEventListener('open-mode-panel', this.onOpenModePanel)
    window.removeEventListener('open-garden', this.onOpenGarden)
    window.removeEventListener('open-settings', this.onOpenSettings)
    // النوافذ الفاتحة صارت عناصر DOM في main.ts وتُخفى بنفسها عند الإغلاق،
    // فكفاية تفريغ حالتها في لوحة المفاتيح الجانبية.
    // تصفير كل حالات النوافذ: المشهد المُغلق قد يترك مفتاحاً معلّقاً
    // (مثل «mode-panel» عند فتح نمط الاستغفار)، فيمنع ظهور واجهة اللعب لاحقاً.
    resetSidebarModals()
    // إخفاء الشريط العلوي عند مغادرة المشهد الرئيسي.
    setTopHeaderVisible(false)
    document.body.classList.remove('phaser-hud-active')
    // إخفاء شريط تقدم الورد DOM عند مغادرة المشهد.
    document.getElementById('rk-focus-bar-dom')?.classList.remove('visible')
    // إزالة صنف الإزاحة من body وإلا تسرّب إلى المشاهد الأخرى (Zen/Boot).
    document.body.classList.remove('rk-focus-bar-open')

    for (const b of this.alive) b.destroy()
    this.alive = []
    this.events.off(Events.DHIKR_COLLECTED, this.onDhikrCollected, this)
    window.removeEventListener('header-pause-toggle', this.onHeaderPauseToggle)
    this.modeDom?.remove()
    this.modeDom = undefined
    this.focusDom?.remove()
    this.focusDom = undefined
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
    this.restBanner.setDepth(DEPTH_CARD) // في المقدمة فوق كل العناصر (فوق DEPTH_MODAL)

    // بطاقة الاستراحة: عرض 90% من الشاشة بحد أقصى 420px وارتفاع مريح
    const cardW = Math.min(420, width * 0.9)
    const cardH = Math.min(320, height * 0.42)
    const pinY = -cardH / 2 + 24 // دبابيس التثبيت أعلى البطاقة
    const pinX = cardW / 2 - 40

    // خيوط التعليق: تمتد من أعلى الشاشة تماماً (top: 0) حتى الدبابيس
    // بلا أي فراغ علوي — الحاوية في وسط الشاشة، فأعلى نقطة = -(height / 2)
    // نرسم أعلى من ذلك قليلاً (هامش 40px) لتغطية مرحلة حركة الدخول المرتدة.
    const ropeTop = -(height / 2 + 40)
    const graphics = this.add.graphics()
    graphics.lineStyle(2, 0xd1d5db, 0.8)
    graphics.lineBetween(-pinX, pinY, -pinX, ropeTop) // يسار
    graphics.lineBetween(pinX, pinY, pinX, ropeTop)  // يمين

    // حلقتان ذهبيتان أعلى البطاقة تتصل بهما الحبال
    graphics.lineStyle(3, 0xfcd34d, 0.95)
    graphics.strokeCircle(-pinX, pinY, 9)
    graphics.strokeCircle(pinX, pinY, 9)

    // لوحة زجاجية/خشبية لطيفة (بطاقة أكبر وأوضح)
    graphics.fillStyle(0x0f172a, 0.95)
    graphics.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20)
    graphics.lineStyle(2, 0x10b981, 0.7)
    graphics.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20)

    // دبابيس التثبيت
    graphics.fillStyle(0xfcd34d, 1)
    graphics.fillCircle(-pinX, pinY, 6)
    graphics.fillCircle(pinX, pinY, 6)

    this.restBanner.add(graphics)

    // عنوان اللوحة (خط كبير واضح)
    const title = this.add.text(0, -cardH / 2 + 48, '🌿 استراحة 🌿', {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#34d399',
      align: 'center',
    }).setOrigin(0.5)
    this.restBanner.add(title)

    // نص الآية أو الحديث (خط مكبّر: 1.35rem ≈ 22px مع تباعد أسطر مريح)
    this.restText = this.add.text(0, 0, '', {
      fontFamily: '"Amiri", "Segoe UI", Tahoma, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: cardW - 48, useAdvancedWrap: true },
      lineSpacing: 12,
    }).setOrigin(0.5)
    this.restBanner.add(this.restText)

    // نص توجيهي بالأسفل
    const hint = this.add.text(0, cardH / 2 - 34, '« اضغط للمتابعة »', {
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      color: '#94a3b8',
      align: 'center',
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
    // بطاقة استراحة معلّقة كاملة الشاشة: يُخفى سهم القائمة الجانبية أثناءها.
    setSidebarModalOpen('rest', true)
    this.applyUiSettings()

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
      blocker.setOrigin(0).setDepth(DEPTH_MODAL_BLOCKER).setInteractive()
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
        // إعادة إظهار سهم القائمة الجانبية (إن لم تبقَ نافذة أخرى مفتوحة)
        setSidebarModalOpen('rest', false)
        this.applyUiSettings()
        // بدء المؤقت من جديد
        this.startRestTimer()
      }
    })
  }
}
