/**
 * GardenLayer — طبقة حديقة الحسنات داخل مشهد Phaser:
 * ترسم العناصر المفتوحة (عشب، زهور، شجيرات، شجرة، عصافير، نافورة، فراشات، قوس قزح)
 * بأسلوب زاهٍ في طبقة خلفية (Depth منخفض) خلف الأجسام العائمة، مع حركة خفيفة حية.
 */
import Phaser from 'phaser'
import { getUnlockedIds, getGardenState } from '../../services/GardenService'

export default class GardenLayer extends Phaser.GameObjects.Container {
  private unlocked: string[] = []

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0)
    this.setDepth(-10)
    scene.add.existing(this)
    this.refresh()
  }

  /** إعادة بناء الحديقة من الرصيد المخزن (تُستدعى عند زيادة الأذكار). */
  refresh(): void {
    const unlocked = getUnlockedIds()
    if (JSON.stringify(unlocked) === JSON.stringify(this.unlocked)) return
    this.unlocked = unlocked
    this.removeAll(true)

    const { width, height } = this.scene.scale
    const groundY = height - 40

    if (unlocked.includes('rainbow')) this.buildRainbow(width, groundY)
    if (unlocked.includes('grass')) this.buildGrass(width, groundY)
    if (unlocked.includes('fountain')) this.buildFountain(width / 2, groundY - 6)
    if (unlocked.includes('tree')) this.buildTree(width - 110, groundY - 4)
    if (unlocked.includes('bush')) this.buildBush(110, groundY - 4)
    if (unlocked.includes('flower-red')) this.buildFlowers(width, groundY, 'flower-red')
    if (unlocked.includes('flower-yellow')) this.buildFlowers(width, groundY, 'flower-yellow')
    if (unlocked.includes('bird')) this.buildBirds(width, height)
    if (unlocked.includes('butterflies')) this.buildButterflies(width, groundY)
  }

  /** تلال عشبية طبيعية جذابة: أرضية سفلية بتدرج أخضر زاهٍ وحواف دائرية. */
  private buildGrass(width: number, groundY: number): void {
    const g = this.scene.add.graphics()
    const base = this.scene.scale.height

    // 1) طبقة ظلال سفلية تعطي عمقاً (تدرج داكن نحو الأسفل)
    const groundG = this.scene.add.graphics()
    groundG.fillGradientStyle(0x166534, 0x166534, 0x14532d, 0x14532d, 1)
    groundG.fillRect(-20, groundY, width + 40, base - groundY + 10)
    this.add(groundG)

    // 2) تلّ عشبي رئيسي مرتفع بحواف دائرية ناعمة
    g.fillStyle(0x16a34a, 1)
    g.fillEllipse(width * 0.5, groundY - 6, width * 0.55, 96)

    // 3) تلّان جانبيان متداخلان يمنحان العمق الطبيعي
    g.fillStyle(0x22c55e, 1)
    g.fillEllipse(width * 0.16, groundY + 10, width * 0.4, 84)
    g.fillEllipse(width * 0.85, groundY + 10, width * 0.42, 88)

    // 4) تدرّج أخضر فاتح فوقية لإشراقة زاهية
    g.fillStyle(0x4ade80, 1)
    g.fillEllipse(width * 0.32, groundY - 14, width * 0.34, 60)
    g.fillEllipse(width * 0.7, groundY - 12, width * 0.3, 56)

    // 5) خصلات عشب منتصبة عبر الأرض
    g.fillStyle(0x86efac, 1)
    for (let x = 12; x < width; x += 42) {
      const h = Phaser.Math.Between(12, 22)
      const tipX = x + (Phaser.Math.Between(0, 6) - 3)
      g.fillTriangle(x, groundY + 16, tipX, groundY - h, x + 8, groundY + 16)
    }
    this.add(g)
  }

  /** زهور ملونة موزعة على العشب. */
  private buildFlowers(width: number, groundY: number, kind: string): void {
    const color = kind === 'flower-red' ? 0xf43f5e : 0xfbbf24
    const positions =
      kind === 'flower-red'
        ? [0.12, 0.3, 0.55, 0.78, 0.92]
        : [0.2, 0.42, 0.66, 0.86]
    positions.forEach((fx, i) => {
      const x = width * fx
      const y = groundY + 18 + (i % 2) * 14
      const flower = this.scene.add.container(x, y)
      const g = this.scene.add.graphics()
      // ساق
      g.lineStyle(3, 0x16a34a, 1)
      g.lineBetween(0, 0, 0, 26)
      // بتلات
      g.fillStyle(color, 1)
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2
        g.fillCircle(Math.cos(a) * 8, -8 + Math.sin(a) * 8, 6)
      }
      g.fillStyle(0xfde68a, 1)
      g.fillCircle(0, -8, 4.5)
      flower.add(g)
      // تمايل خفيف
      this.scene.tweens.add({
        targets: flower,
        angle: { from: -4, to: 4 },
        yoyo: true,
        repeat: -1,
        duration: 1400 + i * 180,
        ease: 'Sine.easeInOut',
      })
      this.add(flower)
    })
  }

  /** شجيرة مزهرية. */
  private buildBush(x: number, y: number): void {
    const g = this.scene.add.graphics()
    g.fillStyle(0x15803d, 1)
    g.fillCircle(0, 0, 26)
    g.fillCircle(-20, 8, 20)
    g.fillCircle(20, 8, 20)
    g.fillStyle(0x22c55e, 1)
    g.fillCircle(0, -6, 18)
    // زهور صغيرة
    const dots = [
      [-14, -4],
      [4, -14],
      [14, 2],
      [-2, 6],
    ]
    g.fillStyle(0xf9a8d4, 1)
    dots.forEach(([dx, dy]) => g.fillCircle(dx, dy, 3.5))
    g.fillStyle(0xfde68a, 1)
    dots.forEach(([dx, dy]) => g.fillCircle(dx, dy, 1.4))
    const bush = this.scene.add.container(x, y, [g])
    this.scene.tweens.add({
      targets: bush,
      scaleX: { from: 1, to: 1.04 },
      scaleY: { from: 1, to: 0.97 },
      yoyo: true,
      repeat: -1,
      duration: 2200,
      ease: 'Sine.easeInOut',
    })
    this.add(bush)
  }

  /** شجرة مثمرة. */
  private buildTree(x: number, y: number): void {
    const g = this.scene.add.graphics()
    // الجذع
    g.fillStyle(0x92400e, 1)
    g.fillRoundedRect(-8, -46, 16, 50, 6)
    // الأوراق
    g.fillStyle(0x166534, 1)
    g.fillCircle(0, -66, 34)
    g.fillCircle(-26, -50, 24)
    g.fillCircle(26, -50, 24)
    g.fillStyle(0x22c55e, 1)
    g.fillCircle(0, -72, 24)
    // ثمار ذهبية
    g.fillStyle(0xfbbf24, 1)
    ;[
      [-14, -60],
      [10, -74],
      [20, -48],
      [-4, -46],
    ].forEach(([dx, dy]) => g.fillCircle(dx, dy, 5))
    const tree = this.scene.add.container(x, y, [g])
    this.scene.tweens.add({
      targets: tree,
      angle: { from: -1.5, to: 1.5 },
      yoyo: true,
      repeat: -1,
      duration: 2600,
      ease: 'Sine.easeInOut',
    })
    this.add(tree)
  }

  /** عصفوران يطيران أفقياً. */
  private buildBirds(width: number, height: number): void {
    const colors = [0x38bdf8, 0xf472b6]
    colors.forEach((color, i) => {
      const bird = this.scene.add.container(-40, height * (0.22 + i * 0.1))
      const g = this.scene.add.graphics()
      g.fillStyle(color, 1)
      g.fillEllipse(0, 0, 22, 12)
      g.fillCircle(9, -4, 5.5)
      g.fillStyle(0x0f172a, 1)
      g.fillCircle(11, -5, 1.4)
      g.fillStyle(0xfbbf24, 1)
      g.fillTriangle(13, -4, 18, -2.5, 13, -1.5)
      bird.add(g)
      const dir = i === 0 ? 1 : -1
      bird.setScale(dir, 1)
      this.scene.tweens.add({
        targets: bird,
        x: dir === 1 ? width + 40 : -40,
        duration: 16000 + i * 5000,
        repeat: -1,
        delay: i * 4000,
        onRepeat: () => {
          bird.y = height * Phaser.Math.FloatBetween(0.16, 0.34)
        },
      })
      // رفرفة (تذبذب رأسي خفيف)
      this.scene.tweens.add({
        targets: bird,
        y: '-=14',
        yoyo: true,
        repeat: -1,
        duration: 700,
        ease: 'Sine.easeInOut',
      })
      this.add(bird)
    })
  }

  /** نافورة نورانية مركزية. */
  private buildFountain(x: number, y: number): void {
    const g = this.scene.add.graphics()
    g.fillStyle(0x0ea5e9, 0.9)
    g.fillEllipse(0, 0, 90, 22)
    g.lineStyle(3, 0xbae6fd, 1)
    g.strokeEllipse(0, 0, 90, 22)
    g.fillStyle(0x64748b, 1)
    g.fillRoundedRect(-6, -26, 12, 26, 4)
    const jet = this.scene.add.graphics()
    jet.fillStyle(0x7dd3fc, 0.85)
    jet.fillCircle(0, -34, 5)
    const container = this.scene.add.container(x, y, [g, jet])
    this.scene.tweens.add({
      targets: jet,
      y: -18,
      alpha: { from: 1, to: 0.15 },
      scaleX: 2.4,
      scaleY: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeOut',
    })
    this.add(container)
  }

  /** فراشات ملونة تتحرك عشوائياً. */
  private buildButterflies(width: number, groundY: number): void {
    const colors = [0xf59e0b, 0xa78bfa, 0x34d399]
    colors.forEach((color, i) => {
      const bf = this.scene.add.container(width * (0.25 + i * 0.25), groundY - 90 - i * 40)
      const g = this.scene.add.graphics()
      g.fillStyle(color, 1)
      g.fillEllipse(-6, 0, 12, 9)
      g.fillEllipse(6, 0, 12, 9)
      g.fillStyle(0x1f2937, 1)
      g.fillRoundedRect(-1.5, -5, 3, 10, 1.5)
      bf.add(g)
      this.scene.tweens.add({
        targets: bf,
        x: `+=${Phaser.Math.Between(-120, 120)}`,
        y: `+=${Phaser.Math.Between(-50, 50)}`,
        yoyo: true,
        repeat: -1,
        duration: 3200 + i * 900,
        ease: 'Sine.easeInOut',
      })
      this.add(bf)
    })
  }

  /** قوس قزح شفاف في الخلفية. */
  private buildRainbow(width: number, groundY: number): void {
    const g = this.scene.add.graphics()
    const colors = [0xf87171, 0xfbbf24, 0x4ade80, 0x38bdf8, 0xa78bfa]
    const cx = width / 2
    const cy = groundY + 20
    colors.forEach((color, i) => {
      g.lineStyle(7, color, 0.28)
      g.strokeCircle(cx, cy, 300 - i * 8)
    })
    this.add(g)
  }

  /** حالة الحديقة الحالية (للعرض في لوحة التحكم). */
  getGardenInfo(): { level: number; total: number; progress: number } {
    const s = getGardenState()
    return { level: s.level, total: s.total, progress: s.progress }
  }
}