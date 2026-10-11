/**
 * PhaserGame — نقطة دخول لعبة Phaser.
 * يقوم بإعداد إعدادات المحرك وإضافة مشاهد اللعبة.
 */
import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MainScene from './scenes/MainScene'
import ZenScene from './scenes/ZenScene'
import type { PhaserGameConfig } from './types'

/** نسبة بكسل الجهاز إلى بكسل CSS، محدودة بسقف 2 (توازن حدّة/أداء). */
export function getDevicePixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.min(Math.max(dpr, 1), 2)
}

/**
 * إنشاء وإعادة تشغيل لعبة Phaser كاملة.
 * نمط RESIZE: أبعاد Phaser مطابقة لأبعاد الشاشة الحقيقية بالبكسل —
 * لا يوجد أي تحويل هندسي (Scale Offset) بين موقع اللمس الحقيقي وعناصر اللعبة.
 *
 * دقة العرض (High-DPI): نُبقي إحداثيات Phaser منطقية ومطابقة للمس، مع
 * تفعيل تنعيم الحواف وترشيح mipmap الخطي للأصول الكبيرة المصغّرة على الجوال.
 */
export function createGame(config: PhaserGameConfig = { width: 480, height: 854 }): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: config.parent ?? 'game-container',
    backgroundColor: '#0f172a',
    render: {
      // توليد سلّم مدرّجات (mipmaps) للنسيج + ترشيح linear بين المستويات.
      // ضروري للأصول الكبيرة المُصغَّرة كثيراً كإطار عدّاد الجلسة
      // (1536×1024 يُعرض بحوالي 150px) بدونه تظهر الحواف مهتّجة.
      mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
      // antialias: يرفع جودة النصوص والحدود المائلة على الشاشات عالية الكثافة.
      antialias: true,
      // pixelArt: false يضمن ترشيحاً خطياً ناعماً للأصول بدلاً من nearest-neighbor.
      pixelArt: false,
      // احتفظ بالمواضع الكسريّة لتفادي اهتزاز/تكسّر الأصول على شاشات الجوال.
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    // نظام الفيزياء (Arcade): مطلوب لتوفّر this.physics داخل المشاهد.
    // بدون هذا الإعداد يكون this.physics === undefined، وأي نداء مثل
    // this.physics.pause() يرمي استثناءً (TypeError). وإذا وقع الاستثناء داخل
    // MainScene.create() — كما يحدث عند تعطيل اللعبة من الإعدادات — يبقى المشهد
    // في حالة CREATING ولا يُرسم إطلاقاً، فتظهر شاشة فارغة تماماً.
    // لا تُنشأ هنا أي أجسام فيزيائية: الحركة تتم عبر tweens/update، والاستخدام
    // الوحيد للفيزياء هو الإيقاف/الاستئناف عند فتح النوافذ أو الإيقاف اليدوي.
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { x: 0, y: 0 } },
    },
    // عزل أحداث الإدخال عن نافذة المتصفح لمنع أي انزياح أو تداخل في إحداثيات اللمس
    input: {
      windowEvents: false,
      // دعم اللمس المتعدد للنقر السريع المتكرر (بصبعين/ثلاثة) بدون فقدان أحداث
      activePointers: 3,
      // إتاحة التقاط أحداث اللمس عبر الطبقات الشفافة بدون اقتطاع
      // (يمنع "قتل" أحداث النصف السفلي بواسطة عناصر شفافة أعلى الشاشة)
      topOnly: false,
    } as Phaser.Types.Core.InputConfig,
    scale: {
      // اجعل مساحة الرسم مطابقة للـ viewport الفعلي بدلاً من احتواء مقاس
      // ثابت داخلها؛ بذلك لا تظهر أشرطة سوداء عند اختلاف نسبة أبعاد الهاتف.
      // ملاحظة مهمة: في وضع RESIZE يتجاهل Phaser الخاصية zoom تماماً (راجع
      // ScaleManager.updateScale) — لذلك تُضبط الدقة العالية يدوياً عبر
      // installHighDpiCanvas() بعد الإقلاع.
      mode: Phaser.Scale.RESIZE,
      parent: config.parent ?? 'game-container',
      width: config.width,
      height: config.height,
      zoom: 1,
    },
    scene: [BootScene, MainScene, ZenScene],
  })
}

/**
 * تفعيل الدقة العالية (High-DPI) بشكل صحيح على شاشات الجوال.
 *
 * الفكرة: نُبقي «عالم» اللعبة منطقياً بالكامل (إحداثيات 390×844، كاميرا منطقية،
 * تكبير أساسه 1، إسقاط ortho منطقي، إحداثيات لمس منطقية) — أي لا يتغيّر أي شيء
 * في كود المشاهد أو التخطيط أو التقريب بإصبعين. ثم نُكبّر «طبقة WebGL» فقط إلى
 * الدقة الفيزيائية للجهاز:
 *   • مخزن الرسم (canvas.width/height)  = المقاس المنطقي × dpr
 *   • مقاس العرض CSS (style)            = المقاس المنطقي (كما هو)
 *   • gl.viewport + gl.scissor          = المقاس الفيزيائي الكامل
 *
 * وبما أن إسقاط ortho يبقى منطقياً (0..390) بينما منفذ العرض فيزيائي (0..780)،
 * فإن العالم المنطقي يُمدّد ليملأ المخزن الفيزيائي بالكامل بتكبير dpr ⇒ رسم
 * حادّ بلا تهتّؤ (بلا الأشرطة السوداء أو «ربع الشاشة»).
 *
 * سبب مشكلة «ربع الشاشة» السابقة: في وضع RESIZE يدفع Phaser مقصّ (scissor)
 * الكاميرا كل إطار بمقاسها المنطقي (390×844). إذا كبّرنا المخزن إلى فيزيائي
 * دون تعديل ذلك المقصّ، يُقتطع الرسم على الربع السفلي الأيسر. الحل هنا هو
 * تغليف pushScissor ليضرب أبعاده في dpr، فيبقى المقصّ مطابقاً للمخزن الفيزيائي.
 *
 * لا نفعل شيئاً في مُصيّر Canvas (بلا gl) — هناك يتكفّل المتصفح بالترشيح.
 */
export function installHighDpiCanvas(game: Phaser.Game): void {
  const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer | undefined
  const gl = renderer && 'gl' in renderer ? (renderer as unknown as { gl?: WebGLRenderingContext }).gl : undefined
  if (!renderer || !gl) return

  // نضبط مقصّ الكاميرا (وسائر المقصّات كالأقنعة) ليطابق المخزن الفيزيائي:
  // نضرب الإحداثيات في dpr ونمرّر drawingBufferHeight الفيزيائي.
  const originalPushScissor = renderer.pushScissor.bind(renderer)
  renderer.pushScissor = function pushScissorHiDpi(
    x: number,
    y: number,
    width: number,
    height: number,
    drawingBufferHeight?: number,
  ): number[] {
    const dpr = getDevicePixelRatio()
    return originalPushScissor(
      x * dpr,
      y * dpr,
      width * dpr,
      height * dpr,
      drawingBufferHeight ?? renderer.drawingBufferHeight,
    )
  }

  const apply = (): void => {
    const dpr = getDevicePixelRatio()
    if (dpr <= 1) return

    // المقاس المنطقي (CSS) الذي يحسب به Phaser العالم واللمس.
    const cssW = game.scale.gameSize.width
    const cssH = game.scale.gameSize.height
    if (!cssW || !cssH) return

    const physW = Math.round(cssW * dpr)
    const physH = Math.round(cssH * dpr)

    // 1) مخزن الرسم فيزيائي، أما مقاس العرض CSS فيبقى منطقياً.
    if (game.canvas.width !== physW) game.canvas.width = physW
    if (game.canvas.height !== physH) game.canvas.height = physH
    game.canvas.style.width = `${cssW}px`
    game.canvas.style.height = `${cssH}px`

    // 2) دفتر المُصيّر وحدوده الافتراضية بالقياس الفيزيائي.
    renderer.width = physW
    renderer.height = physH
    renderer.drawingBufferHeight = gl.drawingBufferHeight
    renderer.defaultScissor = [0, 0, physW, physH]

    // 3) الإسقاط يبقى منطقياً (تمّ ضبطه داخل renderer.resize باستخدام baseSize)،
    //    لكن منفذ العرض والمقصّ يغطّيان المخزن الفيزيائي بالكامل.
    gl.viewport(0, 0, physW, physH)
    gl.scissor(0, 0, physW, physH)
    renderer.currentScissor = renderer.defaultScissor
  }

  // نُعيد التطبيق بعد أي تغيير حجم يُجريه Phaser نفسه (تدوير، تغيّر نافذة،
  // أو تغيّر devicePixelRatio). الحدث يأتي من renderer.resize في نهاية onResize،
  // فنكون دائماً «آخر من يلمس» حالة WebGL ⇒ مستقل عن ترتيب المعالجات.
  renderer.on(Phaser.Renderer.Events.RESIZE, apply)
  apply()
}

/** إعادة ضبط الدقة العالية للقماش عند تغيّر devicePixelRatio (نقل النافذة
 * بين شاشات بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // إعادة تطبيق installHighDpiCanvas عبر حدث RESIZE (يُطلق refresh()).
  game.scale.setZoom(1)
}
