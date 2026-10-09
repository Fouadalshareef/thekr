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
      mode: Phaser.Scale.RESIZE,
      parent: config.parent ?? 'game-container',
      width: config.width,
      height: config.height,
    },
    scene: [BootScene, MainScene, ZenScene],
  })
}

/**
 * إعادة ضبط تكبير القماش عند تغيّر devicePixelRatio (نقل النافذة بين شاشات
 * بمقاسات مختلفة الكثافة). بدونها يبقى القماش بالدقة القديمة.
 */
export function refreshGameZoom(game: Phaser.Game): void {
  // لا نغيّر zoom عند تبدّل DPI؛ الحفاظ على وحدة الإحداثيات يمنع انزياح اللمس.
  game.scale.setZoom(1)
}
