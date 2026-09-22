/**
 * hitArea.ts — ضبط مناطق اللمس (Hit Areas) بشكل صحيح داخل Phaser.
 *
 * ⚠ ملاحظة جوهرية — سبب الخلل «النقر لا يعمل إلا في أعلى العنصر»:
 * عند فحص اللمس تُضيف Phaser قيمة displayOrigin للعنصر إلى الإحداثيات المحلية
 * قبل اختبار منطقة اللمس (InputManager.pointWithinHitArea: x += displayOriginX).
 * وبما أن الحاويات (Container) تُعيد displayOrigin = العرض/2 والارتفاع/2، فإن أي
 * دائرة تُبنى على النقطة (0,0) تنزاح فعلياً للأعلى واليسار بمقدار نصف العرض
 * والارتفاع (37px لزر بقطر 74px) — فيبقى الجزء السفلي/الأيمن (بل والمركز نفسه)
 * غير قابل للنقر، ويعمل فقط الجزء العلوي الأيسر من الشكل.
 *
 * الحل: بناء منطقة اللمس مُوسّطة على displayOriginX/displayOriginY (مركز العنصر
 * الحقيقي)، مع قيمة نصف قطر تغطي كامل الشكل المرئي — فتعمل الاستجابة من أي زاوية.
 */
import Phaser from 'phaser'

/** العناصر التي تُضبط لها مناطق اللمس (كلها حاويات في هذا المشروع). */
type HitTarget = Phaser.GameObjects.Container

/**
 * دائرة لمس مُوسّطة على مركز العنصر.
 * @param target حاوية العنصر (زر / فقاعة)
 * @param radius نصف قطر منطقة اللمس بالوحدات المحلية للعنصر
 * @param useHandCursor إظهار مؤشر اليد على سطح المكتب
 */
export function setCircleHitArea(target: HitTarget, radius: number, useHandCursor = false): void {
  const area = new Phaser.Geom.Circle(target.displayOriginX, target.displayOriginY, radius)
  applyHitArea(target, area, useHandCursor)
}

/**
 * منطقة لمس مستطيلة مُوسّطة على مركز العنصر (للبطاقات والأزرار المستطيلة).
 * @param padding هامش إضافي حول الأبعاد المعطاة
 */
export function setRectHitArea(
  target: HitTarget,
  width: number,
  height: number,
  padding = 0,
  useHandCursor = false,
): void {
  const w = width + padding * 2
  const h = height + padding * 2
  const area = new Phaser.Geom.Rectangle(target.displayOriginX - w / 2, target.displayOriginY - h / 2, w, h)
  applyHitArea(target, area, useHandCursor)
}

/** تثبيت منطقة اللمس والتحقق من التمرير عبر العنصر نفسه (بلا اعتراض الطبقات الداخلية). */
function applyHitArea(
  target: HitTarget,
  area: Phaser.Geom.Circle | Phaser.Geom.Rectangle,
  useHandCursor: boolean,
): void {
  const callback = area instanceof Phaser.Geom.Circle ? Phaser.Geom.Circle.Contains : Phaser.Geom.Rectangle.Contains

  // setInteractive تُنشئ منطقة من الأبعاد تلقائياً — نستبدلها بالمنطقة المحسوبة
  target.setInteractive(area, callback)

  const input = target.input
  if (!input) return
  input.hitArea = area
  input.hitAreaCallback = callback
  // مؤشر اليد على سطح المكتب: الخاصية الصحيحة في Phaser هي cursor فقط
  // (لا توجد خاصية useHandCursor على InteractiveObject).
  input.cursor = useHandCursor ? 'pointer' : ''
}
