/**
 * SettingsModal — نافذة «الإعدادات» الفاتحة كاملة الشاشة (Phaser Containers).
 *
 * بديل كامل لواجهة DOM الداكنة القديمة (components/DashboardModal.ts):
 *  - Phaser.GameObjects.Container بعمق 5000 فوق كل عناصر المشهد (بلا أي HTML/CSS).
 *  - خلفية فاتحة كاملة الشاشة + عنوان مركزي أخضر داكن + زر إغلاق أحمر (×) أعلى اليسار.
 *  - شريط سرعة التصاعد (0.5 تأملي ← 2 تحفيزي) قابل للسحب/النقر، ومعطّل في نمط الاستغفار.
 *  - مفاتيح تشغيل/إيقاف: الصوت، الاهتزاز، نافذة المصحف، أيقونات الشريط الجانبي.
 *  - سطر تحديث النسخة (يظهر عند وجود تحديث معلّق فقط) + معلومات الإصدار والإحصاءات.
 *
 * كل مفتاح/شريط تفاعلي عبر setInteractive مع مناطق لمس مريحة للموبايل.
 */
import Phaser from 'phaser'
import {
  areIconsEnabled,
  getSpeed,
  isQuranEnabled,
  isSoundEnabled,
  isVibrationEnabled,
  setIconsEnabled,
  setQuranEnabled,
  setSoundEnabled,
  setSpeed,
  setVibrationEnabled,
} from '../../services/SettingsService'
import { getGardenState } from '../../services/GardenService'
import { vibrate } from '../../services/haptics'
import { APP_VERSION, hasPendingUpdate } from '../../services/AppVersion'
import { UPDATE_STATUS, forceAppUpdate } from '../../services/AppUpdateActions'
import { setRectHitArea } from './hitArea'
import {
  LIGHT_COLORS,
  LIGHT_TEXT,
  MODAL_FONT,
  TOGGLE_H,
  TOGGLE_W,
  buildLightModalFrame,
  drawCard,
  drawToggleSwitch,
  type LightModalFrame,
} from './LightModal'

/** أقل/أعلى سرعة للتصاعد — مطابق لـ SettingsService/setSpeed. */
const SPEED_MIN = 0.5
const SPEED_MAX = 2
const SPEED_STEP = 0.1

/** حالة نمط الاستغفار الهادئ (ZenScene) — تُعطّل شريط السرعة. */
let zenMode = false
/** النافذة الحيّة حالياً (لتحديث شريط السرعة فوراً عند تبديل النمط). */
let liveModal: SettingsModal | null = null

/**
 * تفعيل/إيقاف وضع التعطيل أثناء نمط الاستغفار الهادئ.
 * تُستدعى من ZenScene عند الدخول والخروج.
 */
export function setZenMode(active: boolean): void {
  zenMode = active
  liveModal?.refresh()
}

export class SettingsModal {
  /** الحاوية الجذرية للنافذة (تُخفى/تُظهر كوحدة واحدة). */
  container: Phaser.GameObjects.Container

  private readonly scene: Phaser.Scene
  private frame: LightModalFrame
  private readonly onClose: () => void

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene
    this.onClose = onClose
    this.frame = buildLightModalFrame(
      scene,
      'الإعدادات',
      'السرعة والصوت والاهتزاز وإظهار الأيقونات',
      () => this.onClose(),
    )
    this.container = this.frame.container
    liveModal = this
    this.refresh()
  }

  /** إظهار النافذة (مع إعادة بناء المحتوى بأحدث الإعدادات). */
  show(): void {
    this.rebuildIfResized()
    this.refresh()
    this.container.setVisible(true)
  }

  /** إخفاء النافذة. */
  hide(): void {
    this.container.setVisible(false)
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible)
  }

  get visible(): boolean {
    return this.container.visible
  }

  /** تدمير النافذة وكل عناصرها (يُستدعى عند إغلاق المشهد). */
  destroy(): void {
    if (liveModal === this) liveModal = null
    this.container.destroy(true)
  }

  /**
   * إعادة بناء هيكل النافذة إذا تغيّرت أبعاد الشاشة (تدوير الجهاز مثلاً)
   * لأن الخلفية وشريط العنوان يُرسمان بقياس الشاشة الحالي وقت البناء.
   */
  private rebuildIfResized(): void {
    if (this.frame.width === this.scene.scale.width && this.frame.height === this.scene.scale.height) {
      return
    }
    const wasVisible = this.container.visible
    this.container.destroy(true)
    this.frame = buildLightModalFrame(
      this.scene,
      'الإعدادات',
      'السرعة والصوت والاهتزاز وإظهار الأيقونات',
      () => this.onClose(),
    )
    this.container = this.frame.container
    this.container.setVisible(wasVisible)
  }

  /** إعادة بناء محتوى النافذة من الإعدادات المخزّنة حالياً. */
  refresh(): void {
    const { body, width, bodyTop, bodyBottom } = this.frame
    body.removeAll(true)

    const inset = 16
    const contentW = Math.min(width - inset * 2, 460)
    const cx = width / 2
    const left = cx - contentW / 2
    const gap = 12
    const sliderH = 106
    const toggleH = 68
    const footerH = 28
    const hasUpdate = hasPendingUpdate()

    // عدد الصفوف وارتفاعها: تُصغَّر نسبياً على الشاشات القصيرة مع حد أدنى للقراءة.
    const rowCount = hasUpdate ? 6 : 5
    const rawH = sliderH + toggleH * (rowCount - 1) + gap * (rowCount - 1)
    const factor = Phaser.Math.Clamp((bodyBottom - bodyTop - footerH) / rawH, 0.8, 1)
    const sH = Math.max(88, sliderH * factor)
    const tH = Math.max(56, toggleH * factor)

    let y = bodyTop
    this.addSpeedRow(left, y, contentW, sH)
    y += sH + gap

    this.addToggleRow(left, y, contentW, tH, 'الأصوات', 'أصوات الفقاعات عند جمع الذكر', isSoundEnabled, setSoundEnabled)
    y += tH + gap
    this.addToggleRow(left, y, contentW, tH, 'الاهتزاز عند النقر', 'اهتزاز خفيف مع كل ذكر', isVibrationEnabled, setVibrationEnabled)
    y += tH + gap
    this.addToggleRow(left, y, contentW, tH, 'نافذة المصحف', 'إظهار أيقونة المصحف الشريف وفتحه', isQuranEnabled, setQuranEnabled)
    y += tH + gap
    this.addToggleRow(left, y, contentW, tH, 'أيقونات الشريط الجانبي', 'إظهار سهم القائمة وأيقوناتها', areIconsEnabled, setIconsEnabled)
    y += tH + gap

    if (hasUpdate) {
      this.addUpdateRow(left, y, contentW, tH)
    }

    // معلومات الإصدار والإحصاءات في أسفل النافذة.
    const garden = getGardenState()
    body.add(
      this.scene.add
        .text(
          cx,
          bodyBottom - footerH / 2,
          `الإصدار v${APP_VERSION} • إجمالي الأذكار: ${garden.total} • مستوى المزرعة: ${garden.level}`,
          { fontFamily: MODAL_FONT, fontSize: '13px', color: LIGHT_TEXT.muted },
        )
        .setOrigin(0.5),
    )
  }

  /**
   * صف سرعة التصاعد: شريط تمرير (نقر أو سحب) + قيمة رقمية بعُشر واحد.
   * اتجاه RTL: «تأملي» (0.5×) على اليمين و«تحفيزي» (2×) على اليسار،
   * والتعبئة تنمو من اليمين نحو اليسار. يُعطَّل بالكامل أثناء نمط الاستغفار.
   */
  private addSpeedRow(left: number, top: number, w: number, h: number): void {
    const row = this.scene.add.container(left + w / 2, top + h / 2)
    const bg = this.scene.add.graphics()
    drawCard(bg, -w / 2, -h / 2, w, h, { fill: LIGHT_COLORS.surface, border: LIGHT_COLORS.border })
    row.add(bg)

    const inset = 16
    const disabled = zenMode
    row.setAlpha(disabled ? 0.62 : 1)

    row.add(
      this.scene.add
        .text(w / 2 - inset, -h / 2 + 26, 'سرعة التصاعد', {
          fontFamily: MODAL_FONT,
          fontSize: '18px',
          fontStyle: 'bold',
          color: LIGHT_TEXT.body,
        })
        .setOrigin(1, 0.5),
    )
    const valueText = this.scene.add
      .text(-w / 2 + inset, -h / 2 + 26, `${getSpeed().toFixed(1)}×`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '17px',
        fontStyle: 'bold',
        color: LIGHT_TEXT.eyebrow,
      })
      .setOrigin(0, 0.5)
    row.add(valueText)

    const trackW = w - inset * 2
    const trackY = 6
    const track = this.scene.add.graphics()
    track.fillStyle(LIGHT_COLORS.trackOff, 1)
    track.fillRoundedRect(-trackW / 2, trackY - 4, trackW, 8, 4)
    row.add(track)

    const fill = this.scene.add
      .rectangle(trackW / 2, trackY, 4, 8, LIGHT_COLORS.accentBorder, 1)
      .setOrigin(1, 0.5)
    row.add(fill)

    const knob = this.scene.add.graphics()
    row.add(knob)

    const slow = this.scene.add
      .text(w / 2 - inset, h / 2 - 20, 'تأملي', {
        fontFamily: MODAL_FONT,
        fontSize: '13px',
        color: LIGHT_TEXT.muted,
      })
      .setOrigin(1, 0.5)
      .setVisible(!disabled)
    const fast = this.scene.add
      .text(-w / 2 + inset, h / 2 - 20, 'تحفيزي', {
        fontFamily: MODAL_FONT,
        fontSize: '13px',
        color: LIGHT_TEXT.muted,
      })
      .setOrigin(0, 0.5)
      .setVisible(!disabled)
    const note = this.scene.add
      .text(0, h / 2 - 20, 'التعديل معطّل أثناء نمط الاستغفار الهادئ', {
        fontFamily: MODAL_FONT,
        fontSize: '13px',
        color: '#b45309',
      })
      .setOrigin(0.5)
      .setVisible(disabled)
    row.add([slow, fast, note])

    /** حفظ القيمة الجديدة ورسم الحالة (الرقم + التعبئة + المقبض). */
    const applyValue = (raw: number): void => {
      const clamped = Phaser.Math.Clamp(raw, SPEED_MIN, SPEED_MAX)
      // تقريب لخطوة الشريط (0.1) مع إزالة ضجيج الفواصل العشرية العائمة.
      const snapped = Math.round(Math.round(clamped / SPEED_STEP) * SPEED_STEP * 10) / 10
      setSpeed(snapped)
      valueText.setText(`${snapped.toFixed(1)}×`)
      const t = (snapped - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)
      const knobX = trackW / 2 - trackW * t
      fill.displayWidth = Math.max(4, trackW / 2 - knobX + 2)
      knob.clear()
      knob.fillStyle(0x000000, 0.16)
      knob.fillCircle(knobX, trackY + 2, 12)
      knob.fillStyle(0xffffff, 1)
      knob.fillCircle(knobX, trackY, 11)
      knob.lineStyle(3, LIGHT_COLORS.accent, 1)
      knob.strokeCircle(knobX, trackY, 11)
    }
    applyValue(getSpeed())

    // منطقة اللمس: نقر يحدّد القيمة مباشرة، والسحب يتابع حركة الإصبع.
    if (!disabled) {
      const zone = this.scene.add.container(0, trackY)
      // مستطيل شبه شفاف (0.1% عتامة) يضمن أن الحاوية قابلة للفحص/الرسم مع إبقاء
      // مساحة لمس مريحة (46px) للمسار الرقيق نفسه.
      const zoneBg = this.scene.add.graphics()
      zoneBg.fillStyle(0xffffff, 0.001)
      zoneBg.fillRect(-trackW / 2, -23, trackW, 46)
      zone.add(zoneBg)
      zone.setSize(trackW, 46)
      setRectHitArea(zone, trackW, 46, 0, true)
      row.add(zone)

      const setFromPointer = (pointer: Phaser.Input.Pointer): void => {
        const localX = Phaser.Math.Clamp(pointer.x - row.x, -trackW / 2, trackW / 2)
        // RTL: الحافة اليمنى = أدنى سرعة (تأملي) والحافة اليسرى = أعلى سرعة (تحفيزي).
        const t = (trackW / 2 - localX) / trackW
        applyValue(SPEED_MIN + t * (SPEED_MAX - SPEED_MIN))
      }
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
        setFromPointer(pointer)
        void vibrate(10)
      })
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) return
        setFromPointer(pointer)
      })
    }

    this.frame.body.add(row)
  }


  /**
   * صف مفتاح تشغيل/إيقاف: العنوان + وصف صغير على اليمين والمفتاح على اليسار.
   * الصف كامل قابل للنقر (منطقة لمس كبيرة مريحة للموبايل).
   */
  private addToggleRow(
    left: number,
    top: number,
    w: number,
    h: number,
    label: string,
    hint: string,
    read: () => boolean,
    save: (value: boolean) => void,
  ): void {
    const row = this.scene.add.container(left + w / 2, top + h / 2)
    const bg = this.scene.add.graphics()
    drawCard(bg, -w / 2, -h / 2, w, h, { fill: LIGHT_COLORS.surface, border: LIGHT_COLORS.border })
    row.add(bg)

    const inset = 16
    row.add(
      this.scene.add
        .text(w / 2 - inset, -h * 0.15, label, {
          fontFamily: MODAL_FONT,
          fontSize: '18px',
          fontStyle: 'bold',
          color: LIGHT_TEXT.body,
        })
        .setOrigin(1, 0.5),
    )
    row.add(
      this.scene.add
        .text(w / 2 - inset, h * 0.21, hint, {
          fontFamily: MODAL_FONT,
          fontSize: '13px',
          color: LIGHT_TEXT.muted,
        })
        .setOrigin(1, 0.5),
    )

    const sw = this.scene.add.graphics()
    sw.setPosition(-w / 2 + inset + TOGGLE_W / 2, 0)
    drawToggleSwitch(sw, TOGGLE_W, TOGGLE_H, read())
    row.add(sw)

    row.setSize(w, h)
    setRectHitArea(row, w, h, 0, true)
    row.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.tweens.add({ targets: row, scale: 0.985, duration: 60, yoyo: true, ease: 'Quad.easeOut' })
    })
    row.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const next = !read()
      save(next)
      drawToggleSwitch(sw, TOGGLE_W, TOGGLE_H, next)
      void vibrate(12)
      // إبلاغ المشهد لتطبيق الإعداد فوراً (إظهار/إخفاء الأيقونات مثلاً).
      window.dispatchEvent(new CustomEvent('settings-changed'))
    })

    this.frame.body.add(row)
  }

  /**
   * صف تحديث النسخة — يظهر فقط عند وجود تحديث معلّق (localStorage: has_update).
   * يعرض زراً أخضر ينفّذ التحديث الفوري (حفظ البيانات + مسح الكاش + إعادة التحميل).
   */
  private addUpdateRow(left: number, top: number, w: number, h: number): void {
    const row = this.scene.add.container(left + w / 2, top + h / 2)
    const bg = this.scene.add.graphics()
    drawCard(bg, -w / 2, -h / 2, w, h, { fill: 0xfff7f7, border: 0xfecaca })
    row.add(bg)

    const inset = 16
    row.add(
      this.scene.add
        .text(w / 2 - inset, -h * 0.17, 'تحديث النسخة الآن', {
          fontFamily: MODAL_FONT,
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#b91c1c',
        })
        .setOrigin(1, 0.5),
    )
    const hintText = this.scene.add
      .text(w / 2 - inset, h * 0.2, `يتوفر إصدار أحدث (الحالي v${APP_VERSION})`, {
        fontFamily: MODAL_FONT,
        fontSize: '13px',
        color: LIGHT_TEXT.muted,
      })
      .setOrigin(1, 0.5)
    row.add(hintText)

    const btnW = 104
    const btnH = 40
    const btn = this.scene.add.container(-w / 2 + inset + btnW / 2, 0)
    const btnBg = this.scene.add.graphics()
    drawCard(btnBg, -btnW / 2, -btnH / 2, btnW, btnH, {
      fill: LIGHT_COLORS.accent,
      border: LIGHT_COLORS.accentDark,
      radius: 12,
      shadow: false,
    })
    btn.add(btnBg)
    btn.add(
      this.scene.add
        .text(0, 0, 'تحديث', {
          fontFamily: MODAL_FONT,
          fontSize: '17px',
          fontStyle: 'bold',
          color: LIGHT_TEXT.onAccent,
        })
        .setOrigin(0.5),
    )
    btn.setSize(btnW, btnH)
    setRectHitArea(btn, btnW, btnH, 4, true)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.tweens.add({ targets: btn, scale: 0.94, duration: 70, yoyo: true, ease: 'Quad.easeOut' })
    })
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      hintText.setColor('#047857').setText(UPDATE_STATUS.working)
      void forceAppUpdate((message) => hintText.setText(message))
    })
    row.add(btn)

    this.frame.body.add(row)
  }
}

