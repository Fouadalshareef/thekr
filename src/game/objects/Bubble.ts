/**
 * Bubble — فقاعة «سُبْحَانَ الله»: جسمها الرئيسي الآن صورة مولّدة
 * (sobhanallah.png — فقاعة زجاجية زرقاء مع رذاذ وخلفية شفافة) بدل الرسم
 * البرمجي، مع بقاء النص واللمس والفرقعة كما هي (FloatingObject).
 * احتياطي: إن غاب النسيج يُعاد الرسم البرمجي القديم.
 */
import Phaser from 'phaser'
import { FloatingObject, type FloatingObjectOptions } from './FloatingObject'

/**
 * مفتاح نسيج فقاعة «سبحان الله» — الصورة المولّدة sobhanallah.png
 * (pi/Bubbles/sobhanallah.png) مُنسوخة إلى src/assets/bubbles/ واستُوردت
 * عبر Vite باسم مجزّأ، وحُمِّلت في BootScene قبل هذه المشاهد.
 */
export const SUBHANALLAH_BUBBLE_TEXTURE = 'bubble-subhanallah'

/** أبعاد الأصل 1157×1359: الكرة داخله ≈77% من العرض، مركزها الرأسي ≈57.8%. */
const IMG_W = 83
const IMG_H = (83 * 1359) / 1157
const SPHERE_CENTER_Y_FRAC = 0.578

export default class Bubble extends FloatingObject {
  constructor(scene: Phaser.Scene, x: number, y: number, override?: Partial<FloatingObjectOptions>) {
    super(scene, x, y, {
      dhikrId: 'subhanallah',
      dhikrName: 'سُبْحَانَ الله',
      dhikrTarget: 33,
      speedBase: 78,
      speedMultiplier: 1,
      wiggleAmp: 22,
      wiggleFreq: 1.8,
      popPitch: 0,
      hitRadius: 40,
      ...override,
    })
  }

  protected getGlowColor(): number {
    return 0x18ffff // فسفوري سماوي متوهج
  }

  /** حدود الصورة الجاهزة تكفي — لا حاجة لحلقة الحافة البيضاء فوقها. */
  protected showEdgeRing(): boolean {
    return false
  }

  protected buildBody(): void {
    // الجسم الرئيسي = صورة الفقاعة المولّدة (فقاعة زجاجية زرقاء مع رذاذ).
    if (this.scene.textures.exists(SUBHANALLAH_BUBBLE_TEXTURE)) {
      const img = this.scene.add.image(0, 0, SUBHANALLAH_BUBBLE_TEXTURE)
      // الحجم: قطر الكرة داخل الصورة ليقابُر قطر الجسم القديم (64 وحدة محلياً).
      img.setDisplaySize(IMG_W, IMG_H)
      // محاذاة مركز الكرة (57.8% من ارتفاع الصورة) على مركز الحاوية (0,0)
      // حتى يجلس نص الذكر في قلب الكرة لا في منتصف الصورة الإطارية.
      img.y = -(SPHERE_CENTER_Y_FRAC - 0.5) * IMG_H
      this.add(img)

      // بريق متلألئ فوق الصورة (نفس زخرفة الرسم القديم)
      const spark = this.scene.add.graphics()
      this.scene.tweens.add({
        targets: spark,
        alpha: { from: 1, to: 0.15 },
        yoyo: true,
        repeat: -1,
        duration: 700,
        delay: Phaser.Math.Between(0, 600),
      })
      spark.fillStyle(0xfef3c7, 1)
      spark.fillPoints(
        [
          { x: 14, y: -24 },
          { x: 17, y: -21 },
          { x: 14, y: -18 },
          { x: 11, y: -21 },
        ],
        true,
      )
      this.add(spark)
      return
    }

    // احتياط: الرسم البرمجي القديم إن تعذّر النسيج (فشل تحميل الصورة).
    const g = this.scene.add.graphics()

    // هالة خارجية ناعمة
    g.fillStyle(0x00ffff, 0.4)
    g.fillCircle(0, 0, 48)

    // جسم الفقاعة بألوان زاهية جداً
    g.fillStyle(0x06b6d4, 0.95)
    g.fillCircle(0, 0, 32)

    // حد خارجي سميك وواضح (4px الأبيض الناصع كما طُلب)
    g.lineStyle(4, 0xffffff, 1)
    g.strokeCircle(0, 0, 32)

    // قلب مضيء داخلي
    g.fillStyle(0x67e8f9, 0.5)
    g.fillCircle(0, 0, 18)

    // لمعة
    g.fillStyle(0xffffff, 0.9)
    g.fillEllipse(-9, -13, 12, 8)
    g.fillStyle(0xffffff, 0.6)
    g.fillEllipse(-4, -6, 6, 4)

    this.add(g)
  }
}
