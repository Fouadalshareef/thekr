/**
 * PhaserGame — نقطة دخول لعبة Phaser.
 * يقوم بإعداد إعدادات المحرك وإضافة مشاهد اللعبة.
 */
import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MainScene from './scenes/MainScene'
import ZenScene from './scenes/ZenScene'
import type { PhaserGameConfig } from './types'

/**
 * نسبة بكسل الجهاز إلى بكسل CSS (Device Pixel Ratio) المستخدمة لمخزن الرسم.
 *
 * كانت محدودة بسقف 2 سابقاً، وهذا كان **سبب الضبابية الحقيقي على الجوال**:
 * أغلب الهواتف الحديثة تعمل بـ dpr=3 (أو 3.5)، فكان يُرسم بمخزن 2× ثم يكبّره
 * المتصفح إلى 3× ⇒ حدّة فعلية 2/3 (ضعيفة وتكسّرات على الحواف الرقيقة
 * كالأيقونات وخطوط الشريط). ولهذا كان التكبير اليدوي **يحسّن** الدقة: لأن الكاميرا
 * تُقرّب فيقترب الرسم من كثافة الشاشة الحقيقية.
 *
 * الآن نتبع كثافة الشاشة الحقيقية بسقف 3 (تغطية iPhone/Android الحديثة بحدّة
 * كاملة). السقف يمنع الانفجار على شاشات 4× النادرة جداً (بعض أجهزة Android
 * الرائدة) حيث أربعة أضعاف المساحة = 16× بكسل، وهو إهدار للأداء بلا فائدة
 * بصرية ملموسة على شاشة هاتف.
 */
export const MAX_DEVICE_PIXEL_RATIO = 3

export function getDevicePixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.min(Math.max(dpr, 1), MAX_DEVICE_PIXEL_RATIO)
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
      mode: Phaser.Scale.RESIZE,
      parent: config.parent ?? 'game-container',
      width: config.width,
      height: config.height,
      zoom: 1,
      autoRound: true,
    },
    scene: [BootScene, MainScene, ZenScene],
  })
}

/**
 * خطّاف (hook) لتطبيق الدقة العالية (High-DPI) على شاشات الجوال.
 *
 * خلفية: كانت هناك محاولة سابقة لرفع مخزن الرسم يدوياً إلى «المنطقي × dpr»
 * بتعديل canvas.width/height و renderer.width/height و drawingBufferHeight و
 * defaultScissor و gl.viewport/scissor وتغليف pushScissor. هذا غير مدعوم،
 * وأحدث فشلاً عشوائياً (race) في إنشاء إطار WebGL أثناء الإقلاع —
 * «Framebuffer status: Framebuffer Unsupported» (يُرمى من
 * WebGLFramebufferWrapper.createResource) — فيتوقف حلقة الرسم وتظهر شاشة
 * سوداء لا تختفي على بعض الأجهزة/مشغّلات الرسوميات. كما سبّبت أخطاء
 * TypeScript لتعيينها على خصائص للقراءة فقط/غير موجودة (drawingBufferHeight,
 * defaultScissor).
 *
 * لماذا الدقة الافتراضية باهتة؟ في وضع Phaser.Scale.RESIZE يضبط ScaleManager
 * داخلياً مخزن الرسم مساوياً للحجم المنطقي (CSS) **دون** ضربه في
 * devicePixelRatio (انظر ScaleManager.updateScale: this.canvas.width =
 * styleWidth). النتيجة أن كل ما يُرسم داخل القماش — الشريط العلوي، إطار عدّاد
 * الجلسة، وأيقونات HUD — يُرسم بدقة 1× ثم يكبّره المتصفح إلى 2×/3× فيبدو
 * ناعماً/باهتاً على الجوال.
 *
 * القيد الأساسي: ScaleManager في وضع RESIZE يضبط gameSize = displaySize =
 * parentSize (منطقي)، و canvas.width = displaySize **بلا** ضرب في
 * devicePixelRatio. كما أن كل مُصيّر Phaser يقرأ المصفوفة الإسقاطية من
 * renderer.projectionWidth/Height، وكل الحقول الثلاثة (gameSize والـ viewport
 * والإسقاط) مترابطة في `renderer.resize()`؛ أي فصل قسري بينها يُنتج إما «ربع
 * الشاشة» أو انزياح لمس.
 *
 * لذلك نعتمد الأسلوب الآمن والمعياري: نرفع مخزن الرسم (canvas) والمُصيّر إلى
 * الحجم الفيزيائي (منطقي × dpr) **معاً** وبنفس القيم، فيبقى الـ viewport والإسقاط
 * متطابقين (لا ربع شاشة ولا انزياح لمس)، ثم **نُبعد الكاميرا إلى dpr**
 * (cam.setZoom(dpr)) ليملأ العالم المنطقي كامل المخزن الفيزيائي. هذا يُنتج حدّة
 * حقيقية على شاشات 2×/3×، ونظام الإدخال في Phaser يحوّل إحداثيات اللمس عبر الكاميرا
 * تلقائياً فيبقى اللمس دقيقاً ١٠٠٪.
 *
 * تحذير: لا نلمس gl.viewport/defaultScissor/drawingBufferHeight مباشرةً — فذلك
 * كان يسبّب «Framebuffer Unsupported» عشوائياً أثناء الإقلاع. نستخدم الواجهات
 * العامة فقط: renderer.resize().
 */
export function installHighDpiCanvas(game: Phaser.Game): void {
  const applyHighDpi = (): void => {
    const renderer = game.renderer as
      | (Phaser.Renderer.WebGL.WebGLRenderer & { resize?: (w: number, h: number) => void })
      | Phaser.Renderer.Canvas.CanvasRenderer
      | undefined
    if (!renderer || typeof renderer.resize !== 'function') return

    // الحجم المنطقي الفعلي للعبة (بالبكسل CSS) من ScaleManager نفسه.
    const logicalW = Math.round(game.scale.displaySize.width || game.scale.width)
    const logicalH = Math.round(game.scale.displaySize.height || game.scale.height)
    const dpr = getDevicePixelRatio()
    const physW = Math.round(logicalW * dpr)
    const physH = Math.round(logicalH * dpr)

    const canvas = game.canvas as HTMLCanvasElement | null
    if (!canvas) return

    // حالة الهدف: مخزن ومُصيّر بالحجم الفيزيائي، وكاميرا المشهد النشط بالحجم
    // الفيزيائي مع zoom=dpr. إن تحققت كلها نخرج فوراً (نداء كل إطار مجاني).
    const dprNow = getDevicePixelRatio()
    const canvasOk = canvas.width === physW && canvas.height === physH &&
      renderer.width === physW && renderer.height === physH
    const camOk = isCameraAtDpr(game, dprNow)
    if (canvasOk && camOk) return

    if (!canvasOk) {
      // 1) حجم CSS = منطقي (التخطيط يبقى مطابقاً للشاشة).
      canvas.style.width = `${logicalW}px`
      canvas.style.height = `${logicalH}px`

      // 2) مخزن الرسم الفيزيائي = المنطقي × dpr.
      canvas.width = physW
      canvas.height = physH

      // 3) الـ viewport والمصفوفة الإسقاطية معاً على الحجم الفيزيائي (نفس ما
      //    يفعله Phaser في Renderer.onResize) — لا «ربع شاشة» ولا انزياح لمس.
      renderer.resize(physW, physH)
    }

    // 4) نُبعد كاميرا المشهد النشط إلى dpr ليملأ العالم المنطقي كامل المخزن
    //    الفيزيائي. (نظام الإدخال يحوّل اللمس عبر الكاميرا تلقائياً.)
    applyCameraDpr(game, dpr)
  }

  // مهم: يجب التطبيق **بعد** أن يُنهي ScaleManager دورته الخاصة.
  // ScaleManager.updateScale() يضبط canvas.width = الحجم المنطقي في نهاية كل
  // refresh، فأي رفع للمخزن داخل مستمع RESIZE نفسه يُلغى فوراً بعده. لذلك
  // نؤجّل التطبيق إلى ما بعد الدورة الحالية (microtask) فيكون آخر من يكتب
  // في canvas.width/height، ويبقى القماش الفيزيائي ثابتاً حتى الـ resize التالي.
  const scheduleHighDpi = (): void => {
    queueMicrotask(applyHighDpi)
  }

  // التطبيق الأول بعد اكتمال الإقلاع، ثم عند كل تغيير حجم/تدوير.
  game.events.once(Phaser.Core.Events.READY, scheduleHighDpi)
  game.scale.on(Phaser.Scale.Events.RESIZE, scheduleHighDpi)

  // الأهم: كل مشهد جديد (BootScene → MainScene → ZenScene) يُنشئ كاميرا جديدة
  // بzoom=1 ومقاس منطقي، فلا يكفي التطبيق عند الإقلاع/الـ resize فقط.
  // لا نعتمد على حدث CREATE لأنه قد يقع قبل ربط المستمع، فنُطبّق في نهاية كل
  // إطار عبر POST_STEP، مع حماية idempotent داخل applyHighDpi (تُخرج مبكراً إن
  // كان المخزن والمُصيّر والكاميرا بالفعل بالحجم الصحيح) — فلا تكلفة تُذكر.
  game.events.on(Phaser.Core.Events.POST_STEP, applyHighDpi)
  scheduleHighDpi()
}

/**
 * إبعاد كاميرا كل مشهد نشط إلى dpr حتى يملأ العالم المنطقي (0..logical)
 * كامل المخزن الفيزيائي (0..logical×dpr).
 *
 * يُستدعى من installHighDpiCanvas عند الإقلاع/الـ resize. الكاميرا مضبوطة أصلاً
 * على zoom=1 (ومعها التقريب بإصبعين يبدل من 1 حتى 2.5) — نضرب في dpr ليبقى
 * «zoom=1» للمستخدم مكافئاً للملء الكامل للشاشة. لا تُشغَّل هذه الدالة إلا إذا
 * لم يكن المستخدم في حالة تقريب (zoom مضبوط على قيمة القاعدة).
 */
function applyCameraDpr(game: Phaser.Game, dpr: number): void {
  // "القاعدة" المسجَّلة = تكبير المستخدم اليدوي فوق الـ dpr (1 = لا تقريب).
  const userZoom = game.registry.get('hdpi-user-zoom')
  const pinchActive = typeof userZoom === 'number' && userZoom > 1.0001
  game.registry.set('hdpi-dpr', dpr)
  // الحجم المنطقي للعالم (بكسل CSS) — مرجع ثابت لا يعتمد على حالة الكاميرا.
  const logicalW = Math.round(game.scale.displaySize.width || game.scale.width)
  const logicalH = Math.round(game.scale.displaySize.height || game.scale.height)
  for (const scene of game.scene.getScenes(true)) {
    const cam = (scene as Phaser.Scene).cameras?.main
    if (!cam) continue
    // مقاس الكاميرا = الحجم الفيزيائي للمخزن، مع zoom=dpr ⇒ المساحة المرئية
    // بالوحدات العالمية = فيزيائي/dpr = منطقي = العالم كامل بالضبط.
    cam.setSize(Math.round(logicalW * dpr), Math.round(logicalH * dpr))
    cam.centerOn(logicalW / 2, logicalH / 2)
    // إن كان المستخدم مُكبّراً يدوياً لا نُصفّر تقريبه؛ نُحدّث فقط عند غياب التقريب.
    if (!pinchActive) cam.setZoom(dpr)
  }
}

/** هل كاميرا المشهد النشط مضبوطة أصلاً على الحجم الفيزيائي مع zoom=dpr؟ */
function isCameraAtDpr(game: Phaser.Game, dpr: number): boolean {
  const logicalW = Math.round(game.scale.displaySize.width || game.scale.width)
  const logicalH = Math.round(game.scale.displaySize.height || game.scale.height)
  const scenes = game.scene.getScenes(true)
  if (scenes.length === 0) return true
  for (const scene of scenes) {
    const cam = (scene as Phaser.Scene).cameras?.main
    if (!cam) continue
    if (
      cam.width !== Math.round(logicalW * dpr) ||
      cam.height !== Math.round(logicalH * dpr) ||
      Math.abs(cam.zoom - dpr) > 0.0001
    ) {
      return false
    }
  }
  return true
}

/** القيمة الأساسية لتكبير الكاميرا (devicePixelRatio) — يستعملها نظام التقريب
 *  ليجعل zoom=1 للمستخدم مكافئاً للملء الكامل مع المخزن الفيزيائي. */
export function getBaseCameraZoom(): number {
  const dpr = getDevicePixelRatio()
  return dpr
}

/** إعادة ضبط الدقة العالية للقماش عند تغيّر devicePixelRatio (نقل النافذة
 * بين شاشات بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // إعادة تطبيق الدقة العالية عبر حدث RESIZE (يُطلق refresh()).
  game.scale.refresh()
}
