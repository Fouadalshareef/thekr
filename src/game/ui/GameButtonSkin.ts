/**
 * GameButtonSkin — توليد نسيج (Texture) أزرار اللعبة الدائرية المجسّمة داخل محرك Phaser.
 *
 * كل القيم البصرية هنا مستخرجة حرفياً من حزمة الأزرار الجديدة (css/style.css):
 *   .gbtn::before → الإطار المعدني بتدرّج رأسي + الحافة الداكنة السفلية (سماكة 3D)
 *   .gbtn::after  → الوجه الكحلي بتدرّج شبه قطري (inset: 9%)
 *   .ring         → الحلقة الداخلية + اللمعة العلوية (Top Specular Highlight)
 *   .ico          → الأيقونة البيضاء بنسبة 46% من قطر الزر
 *   box-shadow    → الظل الأرضي الناعم + هالة التوهّج عند المرور (glow)
 *
 * لأن CSS لا يعمل داخل الـ Canvas، تُرسم نفس الطبقات عبر CanvasRenderingContext2D
 * مرة واحدة لكل نمط لوني (Theme) ثم يُعاد استخدام النسيج المخزّن (Cached Texture).
 */
import Phaser from 'phaser'

/** قطر الزر المنطقي (الجسم المرئي) بالبكسل — يُستخدم في التخطيط ومنطقة اللمس. */
export const BTN_SIZE = 74
/** قياس الأيقونة داخل الزر (46% من القطر في الحزمة، مرفوع قليلاً لوضوح الجوال). */
export const BTN_ICON_SIZE = 38
/** نصف قطر جسم الزر. */
export const BTN_RADIUS = BTN_SIZE / 2
/** سماكة الحافة السفلية: (0 10px 0) من قياس 132px في الحزمة = 7.5% من القطر. */
const THICKNESS_RATIO = 0.075
/** إزاحة الوجه الداخلي: inset: 9% في الحزمة. */
const FACE_INSET_RATIO = 0.09
/** قطر الحلقة الداخلية: 78% من الزر في الحزمة. */
const RING_RATIO = 0.78
/** مضاعف دقة الرسم (حواف حادة على الشاشات عالية الكثافة). */
const RES = 2

/** ضلع مربّع النسيج: قطر الزر + سماكة الحافة السفلية (قياس العرض المطلوب للصورة). */
export const BTN_SKIN_SIZE = BTN_SIZE * (1 + THICKNESS_RATIO)
/** إزاحة النسيج داخل الحاوية حتى يتطابق مركز جسم الزر مع مركز اللمس. */
export const BTN_SKIN_OFFSET_Y = (BTN_SIZE * THICKNESS_RATIO) / 2
/** قياس الظل/الهالة المرجعي (مربّع يُمدّ لاحقاً على شكل بيضاوي ناعم). */
const SOFT_TEXTURE_SIZE = 128

/** كل نمط لوني = مجموعة متغيّرات CSS في الحزمة (.gbtn[data-theme="…"]). */
export interface ButtonTheme {
  rimHi: string
  rim: string
  rimLo: string
  rimShadow: string
  faceHi: string
  face: string
  faceLo: string
  /** لون الهالة عند المرور/الضغط [r, g, b] (--glow في الحزمة). */
  glow: [number, number, number]
}

/** الأنماط الخمسة كما وردت في الحزمة: steel / sunset / leaf / gold / coral. */
export const BUTTON_THEMES = {
  steel: {
    rimHi: '#9fb2ce', rim: '#61748f', rimLo: '#3d4c62', rimShadow: '#1d2735',
    faceHi: '#3a4a63', face: '#222d41', faceLo: '#131b2a',
    glow: [120, 170, 255],
  },
  sunset: {
    rimHi: '#ffc9a3', rim: '#f2814f', rimLo: '#c04a24', rimShadow: '#6d2410',
    faceHi: '#5a3550', face: '#33203a', faceLo: '#1b1122',
    glow: [255, 150, 90],
  },
  leaf: {
    rimHi: '#c8f6a8', rim: '#6dc04a', rimLo: '#3f8a24', rimShadow: '#1f4a12',
    faceHi: '#2c4b3a', face: '#1c3128', faceLo: '#0f1c16',
    glow: [130, 235, 120],
  },
  gold: {
    rimHi: '#ffe7a3', rim: '#e2b34a', rimLo: '#a97a1c', rimShadow: '#5d400a',
    faceHi: '#4a4128', face: '#2c2718', faceLo: '#17140c',
    glow: [255, 215, 120],
  },
  coral: {
    rimHi: '#ffb3c0', rim: '#ef5f7a', rimLo: '#b83450', rimShadow: '#67172c',
    faceHi: '#4d2b3c', face: '#2f1a27', faceLo: '#1a0e16',
    glow: [255, 130, 160],
  },
} satisfies Record<string, ButtonTheme>

export type ButtonThemeKey = keyof typeof BUTTON_THEMES

/** أيقونات شريط الأدوات الجانبي. */
export type HudIcon = 'gear' | 'sliders' | 'leaf' | 'quran' | 'pause' | 'play'

/** ربط كل أيقونة بنمطها اللوني (نفس توزيع الحزمة: الإعدادات/الترس = steel …). */
export const ICON_THEME: Record<HudIcon, ButtonThemeKey> = {
  gear: 'steel',
  sliders: 'sunset',
  leaf: 'leaf',
  quran: 'gold',
  pause: 'coral',
  play: 'coral',
}

/** لون الهالة كرقم 0xRRGGBB (لرسومات Phaser). */
export function themeGlowColor(theme: ButtonThemeKey): number {
  const [r, g, b] = BUTTON_THEMES[theme].glow
  return (r << 16) | (g << 8) | b
}

const skinKey = (theme: ButtonThemeKey) => `gbtn-skin-${theme}`
const glowKey = (theme: ButtonThemeKey) => `gbtn-glow-${theme}`
const SHADOW_KEY = 'gbtn-shadow'

/**
 * نسيج جسم الزر — يُنشأ مرة واحدة لكل نمط ثم يُخزَّن في مدير الأنسیجة ويُعاد استخدامه.
 */
export function getButtonSkinTexture(scene: Phaser.Scene, theme: ButtonThemeKey): string {
  const key = skinKey(theme)
  if (!scene.textures.exists(key)) {
    const canvas = scene.textures.createCanvas(key, Math.round(BTN_SKIN_SIZE * RES), Math.round(BTN_SKIN_SIZE * RES))
    if (canvas) {
      drawSkin(canvas.getContext(), BTN_SKIN_SIZE * RES, BUTTON_THEMES[theme])
      canvas.refresh()
    }
  }
  return key
}

/** نسيج الهالة الملوّنة (تُعرض خلف الزر وتظهر عند المرور/الضغط — مقابل --glow في CSS). */
export function getGlowTexture(scene: Phaser.Scene, theme: ButtonThemeKey): string {
  const key = glowKey(theme)
  if (!scene.textures.exists(key)) {
    const canvas = scene.textures.createCanvas(key, SOFT_TEXTURE_SIZE, SOFT_TEXTURE_SIZE)
    if (canvas) {
      const g = canvas.getContext()
      const [r, gr, b] = BUTTON_THEMES[theme].glow
      const half = SOFT_TEXTURE_SIZE / 2
      const grad = g.createRadialGradient(half, half, 0, half, half, half)
      grad.addColorStop(0, `rgba(${r}, ${gr}, ${b}, 0.55)`)
      grad.addColorStop(0.55, `rgba(${r}, ${gr}, ${b}, 0.22)`)
      grad.addColorStop(1, `rgba(${r}, ${gr}, ${b}, 0)`)
      g.fillStyle = grad
      g.fillRect(0, 0, SOFT_TEXTURE_SIZE, SOFT_TEXTURE_SIZE)
      canvas.refresh()
    }
  }
  return key
}

/** نسيج الظل الأرضي الناعم (يُمدّ بيضاوياً أسفل الزر — مقابل box-shadow الداكن). */
export function getShadowTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(SHADOW_KEY)) {
    const canvas = scene.textures.createCanvas(SHADOW_KEY, SOFT_TEXTURE_SIZE, SOFT_TEXTURE_SIZE)
    if (canvas) {
      const g = canvas.getContext()
      const half = SOFT_TEXTURE_SIZE / 2
      const grad = g.createRadialGradient(half, half, 0, half, half, half)
      grad.addColorStop(0, 'rgba(4, 9, 22, 0.85)')
      grad.addColorStop(0.6, 'rgba(4, 9, 22, 0.35)')
      grad.addColorStop(1, 'rgba(4, 9, 22, 0)')
      g.fillStyle = grad
      g.fillRect(0, 0, SOFT_TEXTURE_SIZE, SOFT_TEXTURE_SIZE)
      canvas.refresh()
    }
  }
  return SHADOW_KEY
}

// ------------------------------------------------------------------
// الرسم (Canvas 2D) — ترجمة طبقات CSS إلى تعليمات رسم مباشرة
// ------------------------------------------------------------------

/** رسم جسم الزر كاملاً. `size` = ضلع المربّع بالبكسل الفعلي للنسيج. */
function drawSkin(g: CanvasRenderingContext2D, size: number, theme: ButtonTheme): void {
  g.clearRect(0, 0, size, size)

  // المربّع أطول من الزر بمقدار سماكة الحافة السفلية
  const r = size / (2 * (1 + THICKNESS_RATIO))
  const thickness = r * 2 * THICKNESS_RATIO
  const cx = size / 2
  const cy = r // مركز جسم الزر داخل النسيج
  const faceR = r * (1 - FACE_INSET_RATIO)
  const ringR = r * RING_RATIO

  // 1) الحافة السفلية الصلبة = سماكة الزر المجسّمة (0 10px 0 var(--rim-shadow))
  circle(g, cx, cy + thickness, r)
  g.fillStyle = theme.rimShadow
  g.fill()

  // 2) الإطار المعدني: تدرّج رأسي rim-hi → rim (46%) → rim-lo
  const rimGrad = g.createLinearGradient(0, cy - r, 0, cy + r)
  rimGrad.addColorStop(0, theme.rimHi)
  rimGrad.addColorStop(0.46, theme.rim)
  rimGrad.addColorStop(1, theme.rimLo)
  circle(g, cx, cy, r)
  g.fillStyle = rimGrad
  g.fill()

  // 2أ) لمعة الإطار العلوية الداخلية (inset 0 3px 2px rgba(255,255,255,.55))
  g.save()
  circle(g, cx, cy, r)
  g.clip()
  const rimShine = g.createLinearGradient(0, cy - r, 0, cy - r + r * 0.3)
  rimShine.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
  rimShine.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = rimShine
  g.fillRect(cx - r, cy - r, r * 2, r * 0.32)
  g.restore()

  // 3) الوجه الكحلي: تدرّج شعاعي من الأعلى (face-hi → face → face-lo)
  const faceGrad = g.createRadialGradient(cx, cy - faceR * 0.76, 0, cx, cy - faceR * 0.76, faceR * 2.2)
  faceGrad.addColorStop(0, theme.faceHi)
  faceGrad.addColorStop(0.46, theme.face)
  faceGrad.addColorStop(1, theme.faceLo)
  circle(g, cx, cy, faceR)
  g.fillStyle = faceGrad
  g.fill()

  // 3أ) ظلال داخلية للوجه: قتامة أعلى (inset 0 4px 10px) + إضاءة سفلية خفيفة
  g.save()
  circle(g, cx, cy, faceR)
  g.clip()
  const innerDark = g.createLinearGradient(0, cy - faceR, 0, cy - faceR * 0.35)
  innerDark.addColorStop(0, 'rgba(0, 0, 0, 0.5)')
  innerDark.addColorStop(1, 'rgba(0, 0, 0, 0)')
  g.fillStyle = innerDark
  g.fillRect(cx - faceR, cy - faceR, faceR * 2, faceR * 0.7)

  const innerLight = g.createLinearGradient(0, cy + faceR * 0.5, 0, cy + faceR)
  innerLight.addColorStop(0, 'rgba(255, 255, 255, 0)')
  innerLight.addColorStop(1, 'rgba(255, 255, 255, 0.06)')
  g.fillStyle = innerLight
  g.fillRect(cx - faceR, cy + faceR * 0.45, faceR * 2, faceR * 0.6)
  g.restore()

  // 4) الحلقة الداخلية (.ring): قتامة أعلى + إضاءة أسفل مع حدّ رقيق
  const ringBg = g.createLinearGradient(0, cy - ringR, 0, cy + ringR)
  ringBg.addColorStop(0, 'rgba(0, 0, 0, 0.28)')
  ringBg.addColorStop(1, 'rgba(255, 255, 255, 0.05)')
  circle(g, cx, cy, ringR)
  g.fillStyle = ringBg
  g.fill()

  const ringEdge = g.createLinearGradient(0, cy - ringR, 0, cy + ringR)
  ringEdge.addColorStop(0, 'rgba(255, 255, 255, 0.20)')
  ringEdge.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
  circle(g, cx, cy, ringR * 0.985)
  g.lineWidth = size * 0.0075
  g.strokeStyle = ringEdge
  g.stroke()

  // 5) اللمعة العلوية (Top Specular Highlight) داخل الحلقة
  g.save()
  circle(g, cx, cy, ringR)
  g.clip()
  const spec = g.createLinearGradient(0, cy - ringR * 1.12, 0, cy + ringR * 0.26)
  spec.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
  spec.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = spec
  g.beginPath()
  g.ellipse(cx, cy - ringR * 0.66, ringR * 0.8, ringR * 0.46, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** مسار دائرة كامل (يُستخدم قبل fill/stroke مباشرة). */
function circle(g: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  g.beginPath()
  g.arc(x, y, radius, 0, Math.PI * 2)
}

