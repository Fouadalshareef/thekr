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
      // ملاحظة: في وضع RESIZE يتجاهل Phaser الخاصية zoom تماماً (راجع
      // ScaleManager.updateScale)، وهو كذلك يتكفّل بمقاس مخزن الرسم (backing
      // store) ومزامنة المُصيّر والكاميرا وإحداثيات اللمس. لا نعدّل أي شيء
      // يدوياً (انظر installHighDpiCanvas).
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
 * خطّاف (hook) لتطبيق الدقة العالية (High-DPI) على شاشات الجوال.
 *
 * قرار تصميمي: نترك قماش Phaser بإدارة ScaleManager الذاتية بالكامل (وضع
 * RESIZE)، ولا نلمس أي حالة داخلية للمُصيّر.
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
 * الحدّة على الشاشات عالية الكثافة تأتي الآن من:
 *   • خيار antialias: true + mipmapFilter: 'LINEAR_MIPMAP_LINEAR' في createGame،
 *   • ترشيح المتصفح الخطي عند تكبير القماش.
 * وهذا يحفظ تزامن المخزن والمُصيّر والكاميرا وإحداثيات اللمس، فلا شاشة سوداء.
 *
 * تبقى الدالة موجودة (معتمدة من main.ts) كي تُتيح لاحقاً أي معالجة آمنة عبر
 * واجهات ScaleManager العامة فقط.
 */
export function installHighDpiCanvas(_game: Phaser.Game): void {
  // لا شيء مقصود: وضع RESIZE يتكفّل بإدارة القماش.
  // أي تعديل يدوي على حالة المُصيّر (canvas.width, renderer.width/height,
  // drawingBufferHeight, defaultScissor, gl.viewport/scissor) يسبّب فشلاً
  // عشوائياً في إنشاء إطار WebGL أثناء الإقلاع
  // («Framebuffer status: Framebuffer Unsupported») فيتوقف حلقة الرسم وتظهر
  // شاشة سوداء. لذلك نترك Phaser يدير كل شيء.
}

/** إعادة ضبط الدقة العالية للقماش عند تغيّر devicePixelRatio (نقل النافذة
 * بين شاشات بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // إعادة تطبيق installHighDpiCanvas عبر حدث RESIZE (يُطلق refresh()).
  game.scale.setZoom(1)
}
