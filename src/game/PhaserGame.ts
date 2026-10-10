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
 * ضبط قماش اللعبة بدقة عالية (High-DPI) يدوياً.
 *
 * في وضع RESIZE يتجاهل Phaser الخاصية scale.zoom تماماً (updateScale يعيد
 * ضبط أبعاد القماش لأبعاد الـ viewport)، فنضاعف أبعاد backing store يدوياً
 * بمقدار devicePixelRatio مع إبقاء إحداثيات Phaser منطقية (مطابقة للـ CSS):
 *   - canvas.width/height  = logical * dpr   (بكسلات فيزيائية حادة)
 *   - renderer.width/height = logical * dpr   (مصفوفة الإسقاط/viewport)
 *   - إحداثيات اللمس تبقى 1:1 لأن camera/zoom لا يتغيران.
 */
export function installHighDpiCanvas(game: Phaser.Game): void {
  const apply = (): void => {
    const dpr = getDevicePixelRatio()
    const scale = game.scale
    const renderer = game.renderer as unknown as {
      width: number
      height: number
      resize: (w: number, h: number) => unknown
      gameContext?: CanvasRenderingContext2D
      resetTransform?: () => void
      gl?: WebGLRenderingContext
      width2?: never
    } | null
    if (!renderer) return

    const logicalW = scale.baseSize.width
    const logicalH = scale.baseSize.height
    if (!logicalW || !logicalH) return

    const physW = Math.round(logicalW * dpr)
    const physH = Math.round(logicalH * dpr)
    const canvas = game.canvas
    if (canvas.width !== physW || canvas.height !== physH) {
      // تغيير أبعاد الـ backing store يُعيد ضبط الحالة الافتراضية للسياق،
      // لذلك نعيد تطبيق المقياس (dpr) على سياق Canvas2D مباشرة بعد التغيير.
      canvas.width = physW
      canvas.height = physH
      if (renderer.gameContext && dpr !== 1) {
        renderer.gameContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }
    // مزامنة عرض/ارتفاع المُصيِّر مع الأبعاد الفيزيائية (ضروري لـ WebGL
    // viewport/projection). عند dpr=1 هذا نداء بلا تغيير.
    if (renderer.width !== physW || renderer.height !== physH) {
      renderer.resize(physW, physH)
    }
    // إبقاء سياق Canvas2D مقياساً بمقدار dpr بعد أي resetTransform داخلي.
    if (renderer.gameContext && dpr !== 1) {
      renderer.gameContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  // أول تطبيق بعد اكتمال إقلاع Scale Manager.
  apply()
  // إعادة التطبيق عند كل تغيير حجم (تدوير الجهاز/تغيير النافذة).
  game.scale.on(Phaser.Scale.Events.RESIZE, apply)
}

/** إعادة ضبط الدقة العالية للقماش عند تغيّر devicePixelRatio (نقل النافذة
 * بين شاشات بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // إعادة تطبيق installHighDpiCanvas عبر حدث RESIZE (يُطلق refresh()).
  game.scale.setZoom(1)
}
