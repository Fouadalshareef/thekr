/**
 * PhaserGame — نقطة دخول لعبة Phaser.
 * يقوم بإعداد إعدادات المحرك وإضافة مشاهد اللعبة.
 */
import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MainScene from './scenes/MainScene'
import ZenScene from './scenes/ZenScene'
import type { PhaserGameConfig } from './types'

/** نسبة بكسل الجهاز إلى بكسل CSS، محدودة بسقف 3 لمنع تضخيم هائل للأداء. */
export function getDevicePixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.min(Math.max(dpr, 1), 3)
}

/**
 * Phaser 3 sizes its WebGL drawing buffer in CSS pixels by default. On a 3x
 * phone this means the browser enlarges a 390px canvas to 1,170 device pixels.
 * Keep the game coordinate system in CSS pixels (so layout and touch input
 * remain unchanged), but give WebGL a device-pixel backing buffer and a camera
 * viewport that maps it back to those logical coordinates.
 */
function syncHighDpiCanvas(game: Phaser.Game): void {
  const dpr = getDevicePixelRatio()
  const { scale, canvas, renderer } = game
  const width = scale.gameSize.width
  const height = scale.gameSize.height
  const bufferWidth = Math.round(width * dpr)
  const bufferHeight = Math.round(height * dpr)

  scale.baseSize.setSize(bufferWidth, bufferHeight)
  canvas.width = bufferWidth
  canvas.height = bufferHeight
  renderer.resize(bufferWidth, bufferHeight)
  scale.displayScale.set(dpr, dpr)

  // A resize may happen after a scene is already active (rotation, split
  // screen, or moving between displays), so keep its physical viewport in
  // lock-step with the new backing buffer.
  game.scene.getScenes(true).forEach((scene) => configureHighDpiCamera(scene))
}

/** Apply the matching device-pixel viewport to a scene that renders to the shared canvas. */
export function configureHighDpiCamera(scene: Phaser.Scene): void {
  const dpr = getDevicePixelRatio()
  scene.cameras.main.setViewport(0, 0, scene.scale.width * dpr, scene.scale.height * dpr).setZoom(dpr)
}

/**
 * إنشاء وإعادة تشغيل لعبة Phaser كاملة.
 * نمط RESIZE: أبعاد Phaser مطابقة لأبعاد الشاشة الحقيقية بالبكسل —
 * لا يوجد أي تحويل هندسي (Scale Offset) بين موقع اللمس الحقيقي وعناصر اللعبة.
 *
 * دقة العرض (High-DPI):
 * كان القماش يُرسم بمقاس CSS بالبكسل ثم يُكبَّر لعرضه على شاشة 2x/3x،
 * فيخرج الرسم كله مهتّجاً — وهو سبب باهتان الدقة. الحل: zoom = 1/dpr يجعل
 * مخزن بكسل القماش أكبر بعدد مرات devicePixelRatio، بينما يبقى المقاس
 * المنطقي وإحداثيات اللمس كما هي (ScaleManager يضبط input من نفس المقياس).
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
      // pixelArt: false يضمن استخدام ترشيح bilinear ناعم بدل nearest-neighbor.
      pixelArt: false,
      // Keep fractional positions: snapping vector/plastic artwork to texels
      // is visibly jagged when the canvas is downsampled on mobile displays.
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
      mode: Phaser.Scale.RESIZE,
      parent: config.parent ?? 'game-container',
      width: config.width,
      height: config.height,
    },
    callbacks: {
      postBoot: (game) => {
        const sync = () => syncHighDpiCanvas(game)
        sync()
        game.scale.on(Phaser.Scale.Events.RESIZE, () => window.requestAnimationFrame(sync))
      },
    },
    scene: [BootScene, MainScene, ZenScene],
  })
}

/**
 * إعادة ضبط تكبير القماش عند تغيّر devicePixelRatio (نقل النافذة بين شاشات
 * بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // لم نعد نستخدم zoom لتصحيح الدقة، بل نعتمد على scale.resolution
  // هذا يمنع تصغير الواجهة على الشاشات عالية الكثافة.
  game.scale.setZoom(1)
}
