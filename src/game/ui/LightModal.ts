/**
 * LightModal — أدوات بناء النوافذ الفاتحة كاملة الشاشة داخل محرك Phaser.
 *
 * ملاحظة معمارية: كل عناصر هذه النوافذ هي GameObjects حقيقية
 * (Container / Graphics / Text / Image) داخل قماش WebGL — لا يوجد أي HTML
 * أو CSS أو DOM هنا إطلاقاً (النوافذ الداكنة القديمة كانت DOM/Tailwind).
 *
 * لوحة الألوان مستخرجة من واجهات DOM الفاتحة في style.css
 * (.focus-dom-modal / .mode-dom-modal) لتبدو النوافذ الجديدة امتداداً بصرياً لها:
 *   خلفية الشاشة: #fcfcfc — البطاقات: #ffffff بحدود #e0eee7
 *   العنوان: #14532d (أخضر داكن) — الأخضر الأساسي: #059669 — النص الخافت: #527267
 */
import Phaser from 'phaser'
import { setRectHitArea } from './hitArea'

/** ألوان النوافذ الفاتحة (أرقام للرسومات Graphics). */
export const LIGHT_COLORS = {
  /** خلفية الشاشة الكاملة (رمادي فاتح جداً). */
  screen: 0xfcfcfc,
  /** وجه البطاقات. */
  surface: 0xffffff,
  /** بطاقة فاتحة بلون زمردي خفيف (العناصر المفتوحة/النشطة). */
  surfaceAlt: 0xf4fdf8,
  /** حدود البطاقات. */
  border: 0xe0eee7,
  /** بطاقة عنصر مقفل. */
  lockedSurface: 0xf3f4f6,
  lockedBorder: 0xe5e7eb,
  /** الأخضر الأساسي (المفاتيح المفعّلة + الأزرار). */
  accent: 0x059669,
  accentDark: 0x047857,
  accentLight: 0xecfdf5,
  accentBorder: 0x10b981,
  /** مسار المفتاح المطفأ. */
  trackOff: 0xd1d5db,
  /** أحمر زر الإغلاق. */
  danger: 0xdc2626,
} as const

/** ألوان النصوص (نصوص web للأشكال النصية). */
export const LIGHT_TEXT = {
  title: '#14532d',
  eyebrow: '#059669',
  body: '#17352b',
  muted: '#527267',
  onAccent: '#ffffff',
  locked: '#9ca3af',
} as const

/** الخط العربي الموحّد لكل نصوص النوافذ. */
export const MODAL_FONT = '"Amiri", "Scheherazade New", "Segoe UI", Tahoma, sans-serif'
/** خط يشمل رموز الإيموجي الملونة (أيقونات عناصر المزرعة) مع بدائل النظام. */
export const EMOJI_FONT =
  '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", "Amiri", "Segoe UI", Tahoma, sans-serif'

/** عمق النوافذ الفاتحة: فوق HUD (2000) والنوافذ الداكنة الاحتياطية (3000/4000). */
export const LIGHT_MODAL_DEPTH = 5000
/** قياس زر الإغلاق (الدائرة الحمراء ×) — مطابق لـ .modal-close-button في الحزمة. */
export const CLOSE_BTN_SIZE = 44
/** ارتفاع شريط العنوان أبيض الخلفية. */
export const MODAL_HEADER_H = 96

/** تخطيط النافذة الفاتحة: الحاوية + حاوية المحتوى + الحدود الرأسية المتاحة. */
export interface LightModalFrame {
  container: Phaser.GameObjects.Container
  /** حاوية المحتوى — يُعيد المستدعي بناء أبنائها (شبكة/صفوف إعدادات). */
  body: Phaser.GameObjects.Container
  width: number
  height: number
  /** أعلى نقطة مسموح للمحتوى أن يبدأ منها (تحت شريط العنوان). */
  bodyTop: number
  /** أدنى نقطة مسموح للمحتوى أن ينتهي عندها. */
  bodyBottom: number
}


/**
 * بناء الهيكل الأساسي لنافذة فاتحة كاملة الشاشة:
 *  1) خلفية فاتحة (#fcfcfc) تغطي الشاشة وتلتقط كل اللمس (بلا إغلاق عند اللمس).
 *  2) شريط عنوان أبيض مع خط فاصل + العنوان في الوسط بخط أخضر داكن.
 *  3) زر إغلاق دائري أحمر (×) في الزاوية العلوية اليسرى.
 *  4) حاوية محتوى فارغة يبنيها المستدعي داخل الحدود المُعادة.
 */
export function buildLightModalFrame(
  scene: Phaser.Scene,
  title: string,
  subtitle: string,
  onClose: () => void,
): LightModalFrame {
  const width = scene.scale.width
  const height = scene.scale.height
  const container = scene.add.container(0, 0).setDepth(LIGHT_MODAL_DEPTH).setVisible(false)

  // 1) الخلفية الفاتحة: تحجب اللعب وتمنع وصول اللمس لعناصر المشهد تحتها.
  const backdrop = scene.add.graphics()
  backdrop.fillStyle(LIGHT_COLORS.screen, 1)
  backdrop.fillRect(0, 0, width, height)
  backdrop.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  )
  container.add(backdrop)

  // 2) شريط العنوان + خط فاصل سفلي رفيع.
  const header = scene.add.graphics()
  header.fillStyle(LIGHT_COLORS.surface, 1)
  header.fillRect(0, 0, width, MODAL_HEADER_H)
  header.lineStyle(2, LIGHT_COLORS.border, 1)
  header.lineBetween(0, MODAL_HEADER_H, width, MODAL_HEADER_H)
  container.add(header)

  const titleY = subtitle ? MODAL_HEADER_H / 2 - 12 : MODAL_HEADER_H / 2
  container.add(
    scene.add
      .text(width / 2, titleY, title, {
        fontFamily: MODAL_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: LIGHT_TEXT.title,
      })
      .setOrigin(0.5),
  )
  if (subtitle) {
    container.add(
      scene.add
        .text(width / 2, MODAL_HEADER_H / 2 + 20, subtitle, {
          fontFamily: MODAL_FONT,
          fontSize: '15px',
          color: LIGHT_TEXT.muted,
        })
        .setOrigin(0.5),
    )
  }

  // 3) زر الإغلاق الأحمر أعلى اليسار (كما في واجهات DOM الفاتحة).
  container.add(buildCloseButton(scene, CLOSE_BTN_SIZE / 2 + 14, MODAL_HEADER_H / 2, onClose))

  // 4) حاوية المحتوى (إحداثياتها مطلقة لأنها في 0,0).
  const body = scene.add.container(0, 0)
  container.add(body)

  return {
    container,
    body,
    width,
    height,
    bodyTop: MODAL_HEADER_H + 14,
    bodyBottom: height - 14,
  }
}

/**
 * زر إغلاق دائري أحمر: يستخدم نسيج close.svg (دائرة حمراء + × بيضاء) المحمَّل
 * في BootScene، مع بديل مرسوم بالكامل إن لم يوجد النسيج.
 * القياس صريح دائماً عبر setDisplaySize — لا اعتماد على دقة النسيج الأصلية.
 */
export function buildCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onTap: () => void,
  size = CLOSE_BTN_SIZE,
): Phaser.GameObjects.Container {
  const btn = scene.add.container(x, y)
  const shadow = scene.add.graphics()
  shadow.fillStyle(0x000000, 0.1)
  shadow.fillCircle(0, 3, size / 2 + 2)
  btn.add(shadow)

  if (scene.textures.exists('modal-close')) {
    btn.add(scene.add.image(0, 0, 'modal-close').setDisplaySize(size, size))
  } else {
    const fallback = scene.add.graphics()
    fallback.fillStyle(LIGHT_COLORS.danger, 1)
    fallback.fillCircle(0, 0, size / 2)
    fallback.lineStyle(2, 0xff8a80, 0.7)
    fallback.strokeCircle(0, 0, size / 2 - 2)
    btn.add(fallback)
    btn.add(
      scene.add
        .text(0, 0, '✕', {
          fontFamily: MODAL_FONT,
          fontSize: `${Math.round(size * 0.6)}px`,
          color: '#ffffff',
        })
        .setOrigin(0.5),
    )
  }

  // منطقة لمس مريحة (أكبر من الزر نفسه) مع تأثير ضغط لحظي.
  // ملاحظة: تُضيف Phaser قيمة displayOrigin إلى الإحداثيات المحلية عند فحص اللمس،
  // لذا نستخدم setRectHitArea (المُوسّطة على displayOrigin) لا مستطيلاً على (0,0).
  const hit = size + 16
  btn.setSize(hit, hit)
  setRectHitArea(btn, hit, hit, 0, true)
  btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
    scene.tweens.add({ targets: btn, scale: 0.9, duration: 70, yoyo: true, ease: 'Quad.easeOut' })
  })
  btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onTap)
  return btn
}

/** عنوان قسم داخل المحتوى (أخضر زمردي) — مُحاذى لليمين في سياق RTL. */
export function buildSectionTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: MODAL_FONT,
      fontSize: '17px',
      fontStyle: 'bold',
      color: LIGHT_TEXT.eyebrow,
    })
    .setOrigin(1, 0.5)
}

/** نص تلميح/معلومة صغيرة (رمادي مخضرّ) — مُحاذى لليمين. */
export function buildHint(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: MODAL_FONT,
      fontSize: '13px',
      color: LIGHT_TEXT.muted,
    })
    .setOrigin(1, 0.5)
}


/** خيارات رسم بطاقة فاتحة. */
export interface CardStyle {
  fill?: number
  border?: number
  radius?: number
  strokeWidth?: number
  /** ظل ناعم أسفل البطاقة (0 4px 14px rgba(31,91,65,.09) من الحزمة). */
  shadow?: boolean
}

/**
 * رسم بطاقة فاتحة (مستطيل بحواف دائرية + ظل ناعم + حدّ رفيع) داخل Graphics.
 * الإحداثيات نسبية للحاوية التي تحتوي هذا الـ Graphics.
 */
export function drawCard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  style: CardStyle = {},
): void {
  const radius = style.radius ?? 14
  const fill = style.fill ?? LIGHT_COLORS.surface
  const border = style.border ?? LIGHT_COLORS.border
  const strokeWidth = style.strokeWidth ?? 1.5
  if (style.shadow !== false) {
    g.fillStyle(0x1f5b41, 0.09)
    g.fillRoundedRect(x, y + 4, w, h, radius)
  }
  g.fillStyle(fill, 1)
  g.fillRoundedRect(x, y, w, h, radius)
  g.lineStyle(strokeWidth, border, 1)
  g.strokeRoundedRect(x, y, w, h, radius)
}

/**
 * رسم مفتاح تشغيل/إيقاف (Track + Knob) بحالة معيّنة.
 * المفعّل أخضر والمقبض ينزلق إلى اليسار، والمطفأ رمادي والمقبض يميناً
 * (اتجاه RTL: «مطفأ» يميناً و«مفعّل» يساراً كما في الواجهات العربية).
 */
export function drawToggleSwitch(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  on: boolean,
  enabled = true,
): void {
  const r = h / 2
  g.clear()
  const track = !enabled ? 0xe5e7eb : on ? LIGHT_COLORS.accent : LIGHT_COLORS.trackOff
  g.fillStyle(track, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r)
  const knobR = r - 3
  const knobX = on ? -w / 2 + r : w / 2 - r
  g.fillStyle(0x000000, 0.14)
  g.fillCircle(knobX, 2, knobR)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(knobX, 0, knobR)
  g.lineStyle(1, 0x000000, 0.06)
  g.strokeCircle(knobX, 0, knobR)
}

/** قياسات مفتاح التشغيل الموحّد (Track 54×30). */
export const TOGGLE_W = 54
export const TOGGLE_H = 30

