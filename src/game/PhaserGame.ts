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
      // RESIZE: gameSize = displaySize = حجم الحاوية (منطقي/بكسل CSS).
      // رفع مخزن الرسم للدقة العالية يتم لاحقاً في installHighDpiCanvas عبر
      // canvas.width + renderer.resize + setProjectionMatrix (بلا تغيير gameSize).
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
 * المشكلة: Phaser 3 لا يدعم مخزن رسم بدقة الجهاز (devicePixelRatio) إطلاقاً.
 * في وضع RESIZE يضبط ScaleManager gameSize = displaySize = parentSize (بكسل
 * CSS)، و canvas.width = displaySize **بلا** ضرب في dpr (انظر
 * ScaleManager.updateScale). فكل ما يُرسم داخل القماش — الشريط العلوي، إطار
 * عدّاد الجلسة، أيقونات HUD — يُرسم بدقة 1× ثم يكبّره المتصفح إلى 2×/3× فيبدو
 * ناعماً/باهتاً مع تكسّرات على الحواف الرقيقة.
 *
 * الحل الصحيح (لا يمسّ التخطيط ولا اللمس إطلاقاً):
 *   • gameSize (و scale.width/height) يبقى **منطقياً** (390×844) ⇒ كل إحداثيات
 *     اللعبة وأحجامها المطلقة ومواضع اللمس تبقى كما هي بلا أي تغيير.
 *   • مخزن الرسم الفيزيائي = منطقي × dpr (1170×2532) ⇒ حدّة كاملة.
 *   • الـ viewport (renderer.width/height) فيزيائي ⇒ يغطّي كامل المخزن.
 *   • المصفوفة الإسقاطية = **منطقي** (390×844) ⇒ العالم المنطقي يُرسم ممتداً
 *     على كامل المخزن الفيزيائي (لا «ربع شاشة»)، ووحدة عالم = بكسل CSS واحد.
 *   • الكاميرا تُضبط بحجم **فيزيائي** (1170×2532) مع zoom=1 — وهذا ضروري
 *     لسببين: (أ) CameraManager.render يستدعي pushScissor بمستطيل الكاميرا
 *     فيقصّ الرسم إن كانت أصغر من المخزن؛ (ب) zoom=1 يضمن أن
 *     camera.getWorldPoint (المستخدمة في تحويل اللمس) تُعيد الإحداثي نفسه
 *     بلا قسمة ⇒ لا انزياح لمس.
 *
 * تنبيه (سبب فشل الحلول السابقة):
 *   - cam.setZoom(dpr) مع gameSize منطقي: getWorldPoint تقسم على zoom ⇒ ينزاح
 *     اللمس بمقدار dpr (النقر يعمل بعيداً عن العنصر ×dpr، ويختفي ترس الإعدادات).
 *   - gameSize فيزيائي + zoom=1/dpr: يعمل لكن يتطلب مضاعفة كل الثوابت المطلقة
 *     في المشهد (SIDEBAR_X، أحجام الخطوط، البطاقات...) وهي كثيرة ومخاطرة عالية.
 *   - التعديل المباشر على gl.viewport/defaultScissor/drawingBufferHeight سبّب
 *     فشلاً عشوائياً في إنشاء إطار WebGL («Framebuffer Unsupported»).
 */
export function installHighDpiCanvas(game: Phaser.Game): void {
  const applyHighDpi = (): void => {
    const renderer = game.renderer as
      | (Phaser.Renderer.WebGL.WebGLRenderer & { resize?: (w: number, h: number) => void })
      | Phaser.Renderer.Canvas.CanvasRenderer
      | undefined
    if (!renderer || typeof renderer.resize !== 'function') return

    const dpr = getDevicePixelRatio()
    // الحجم المنطقي (CSS) — مرجع اللعبة كله (gameSize يبقى عليه).
    const logicalW = Math.max(1, Math.round(game.scale.width))
    const logicalH = Math.max(1, Math.round(game.scale.height))
    const physW = Math.round(logicalW * dpr)
    const physH = Math.round(logicalH * dpr)

    const canvas = game.canvas as HTMLCanvasElement | null
    if (!canvas) return

    const canvasOk = canvas.width === physW && canvas.height === physH &&
      renderer.width === physW && renderer.height === physH
    const camOk = isCameraAtPhysical(game, physW, physH)
    if (canvasOk && camOk) return

    if (!canvasOk) {
      // 1) حجم القماش CSS = منطقي (التخطيط البصري مطابق للشاشة).
      canvas.style.width = `${logicalW}px`
      canvas.style.height = `${logicalH}px`
      // 2) مخزن الرسم الفيزيائي = المنطقي × dpr.
      canvas.width = physW
      canvas.height = physH
      // 3) viewport = الحجم الفيزيائي (يغطّي كامل المخزن) + إسقاطه الفيزيائي
      //    مؤقتاً (سنعيده لمنطقي في الخطوة التالية).
      renderer.resize(physW, physH)
      // 4) الإسقاط = الحجم المنطقي ⇒ العالم يُرسم ممتداً على كامل المخزن،
      //    ووحدة عالم واحدة = بكسل CSS واحد.
      ;(renderer as { setProjectionMatrix?: (w: number, h: number) => void })
        .setProjectionMatrix?.(logicalW, logicalH)
    }

    // 5) كاميرا كل مشهد نشط بحجم فيزيائي وzoom=1 (سيزر كامل + لمس سليم).
    applyCameraPhysical(game, physW, physH)
  }

  // التطبيق الأول بعد اكتمال الإقلاع، ثم عند كل تغيير حجم/تدوير، ثم كل إطار
  // (لأن كل مشهد جديد يُنشئ كاميرا/مقياساً جديدين). الفحص idempotent رخيص.
  const scheduleHighDpi = (): void => {
    queueMicrotask(applyHighDpi)
  }
  game.events.once(Phaser.Core.Events.READY, scheduleHighDpi)
  game.scale.on(Phaser.Scale.Events.RESIZE, scheduleHighDpi)
  game.events.on(Phaser.Core.Events.POST_STEP, applyHighDpi)
  scheduleHighDpi()
}

/**
 * ضبط كاميرا كل مشهد نشط بحجم **فيزيائي** مع zoom=1.
 *
 * لماذا؟
 *   • الحجم الفيزيائي يجعل مستطيل الكاميرا يغطّي كامل مخزن الرسم، فلا يقصّ
 *     CameraManager.pushScissor الرسم على ربع الشاشة.
 *   • zoom=1 يضمن أن camera.getWorldPoint (المستخدمة في تحويل لمس الشاشة إلى
 *     إحداثيات عالمية) تُعيد الإحداثي نفسه بلا قسمة ⇒ لا انزياح لمس إطلاقاً.
 *
 * ملاحظة: scroll يبقى صفراً لأن الإسقاط المنطقي (المضبوط في installHighDpiCanvas)
 * يجعل الإحداثي العالمي x يُرسم عند البكسل x×dpr داخل المخزن = x بكسل CSS.
 */
function applyCameraPhysical(game: Phaser.Game, physW: number, physH: number): void {
  // لا نُصفّر تقريب المستخدم اليدوي (pinch) أثناء إيماءته.
  const pinch = game.registry.get('hdpi-pinch-active') === true
  for (const scene of game.scene.getScenes(true)) {
    const cam = (scene as Phaser.Scene).cameras?.main
    if (!cam) continue
    if (cam.width !== physW || cam.height !== physH) cam.setSize(physW, physH)
    if (pinch) continue
    if (Math.abs(cam.zoom - 1) > 0.0001) cam.setZoom(1)
    if (cam.scrollX !== 0 || cam.scrollY !== 0) cam.setScroll(0, 0)
  }
}

/** هل كاميرا كل مشهد نشط بحجم فيزيائي وzoom=1 وscroll صفري؟ */
function isCameraAtPhysical(game: Phaser.Game, physW: number, physH: number): boolean {
  if (game.registry.get('hdpi-pinch-active') === true) return true
  const scenes = game.scene.getScenes(true)
  if (scenes.length === 0) return true
  for (const scene of scenes) {
    const cam = (scene as Phaser.Scene).cameras?.main
    if (!cam) continue
    if (
      cam.width !== physW ||
      cam.height !== physH ||
      Math.abs(cam.zoom - 1) > 0.0001 ||
      Math.abs(cam.scrollX) > 0.5 ||
      Math.abs(cam.scrollY) > 0.5
    ) {
      return false
    }
  }
  return true
}

/** القيمة الأساسية لتكبير الكاميرا (1 = بلا تكبير).
 *  الدقة العالية تأتي من مخزن الرسم الفيزيائي، لا من تكبير الكاميرا. */
export function getBaseCameraZoom(): number {
  return 1
}

/** إعادة ضبط الدقة العالية للقماش عند تغيّر devicePixelRatio (نقل النافذة
 * بين شاشات بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // إعادة تطبيق الدقة العالية عبر حدث RESIZE (يُطلق refresh()).
  game.scale.refresh()
}
