/**
 * ZenScene — مشهد الاستغفار التأملي الهادئ:
 * خلفية ليلية داكنة مع نجوم خافتة، هالة زجاجية مركزية نورية،
 * عدّاد استغفار مستقل، وزر "رجوع" للعودة للمشهد الرئيسي.
 */
import Phaser from 'phaser'
import { playZenTone } from '../../services/audio'
import { vibrate } from '../../services/haptics'
import { getIstighfarCount, incrementIstighfar } from '../../services/DhikrStorage'
import { recordTodayDhikr } from '../../services/SettingsService'
import { setZenMode } from '../../components/DashboardModal'
import SkyLayer from '../objects/SkyLayer'
import { getThemeFor } from '../../services/TimeThemeService'

export default class ZenScene extends Phaser.Scene {
  private halo!: Phaser.GameObjects.Container
  private flashRing!: Phaser.GameObjects.Graphics
  private counterText!: Phaser.GameObjects.Text

  constructor() {
    super('ZenScene')
  }

  create(): void {
    const { width, height } = this.scale

    // تعطيل شريط السرعة في لوحة التحكم أثناء نمط Zen
    setZenMode(true)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setZenMode(false))

    // 1) سماء ليلية دائمة (نجوم + قمر نابض من خدمة الوقت) للحفاظ على السكينة
    new SkyLayer(this, getThemeFor('night'))

    // 2) الهالة الزجاجية المركزية
    this.buildHalo()

    // 3) عدّاد الاستغفار أعلى الشاشة (ذهبي عريض واضح)
    this.counterText = this.add
      .text(width / 2, 132, '', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
    this.counterText.setShadow(0, 3, 'rgba(0,0,0,0.65)', 5, true, true)
    this.counterText.setStroke('#0b1026', 4)
    this.counterText.setDepth(100)
    this.refreshCounter()

    // 4) زر "رجوع" أعلى الشاشة
    this.buildBackButton()

    // 5) تلميح سفلي
    this.add
      .text(width / 2, height - 60, 'المس الهالة بهدوء للتسبيح…', {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '18px',
        color: '#a5b4fc',
      })
      .setOrigin(0.5)
  }
  /** بناء الهالة الزجاجية المركزية مع حلقات مضيئة. */
  private buildHalo(): void {
    const { width, height } = this.scale
    this.halo = this.add.container(width / 2, height / 2)
    const g = this.add.graphics()
    g.fillStyle(0xffffff, 0.12)
    g.fillCircle(0, 0, 90)
    g.lineStyle(3, 0xc4b5fd, 0.9)
    g.strokeCircle(0, 0, 90)
    g.lineStyle(1, 0xffffff, 0.3)
    g.strokeCircle(0, 0, 115)
    g.lineStyle(1, 0xc4b5fd, 0.2)
    g.strokeCircle(0, 0, 140)
    this.halo.add(g)

    // إطار حلقة الوميض عند اللمس
    this.flashRing = this.add.graphics()
    this.halo.add(this.flashRing)

    // نبض خفيف دائم (مقياس الهالة)
    this.tweens.add({
      targets: this.halo,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // تفاعل اللمس — التسبيح عند لمس الهالة
    const hitArea = new Phaser.Geom.Circle(0, 0, 150)
    this.halo.setInteractive(hitArea, Phaser.Geom.Circle.Contains)

    this.halo.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.onHaloTouch(pointer)
    })
  }

  /** معالجة لمسة الهالة: تسبيح، اهتزاز، نغمة، وميض، دوران. */
  private onHaloTouch(pointer: Phaser.Input.Pointer): void {
    incrementIstighfar()
    recordTodayDhikr('istighfar')
    this.refreshCounter()
    void playZenTone()
    void vibrate(20)

    // ومضة عند نقطة اللمس (الموضع محلي داخل الهالة)
    const local = this.halo.getLocalPoint(pointer.x, pointer.y)
    this.ringFlash(local.x, local.y)

    // دوران خفيف ذهابًا وعودة
    const start = this.halo.rotation
    this.tweens.add({
      targets: this.halo,
      rotation: start + 0.1,
      duration: 230,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.halo,
          rotation: start,
          duration: 320,
          ease: 'Sine.easeInOut',
        })
      },
    })
  }

  /** ومضة دائرية متوسعة عند نقطة اللمس. */
  private ringFlash(x: number, y: number): void {
    const circle = new Phaser.Geom.Circle(x, y, 8)
    this.flashRing.lineStyle(4, 0xfde68a, 1)
    this.flashRing.strokeCircleShape(circle)
    this.tweens.add({
      targets: circle,
      radius: 55,
      duration: 380,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.flashRing.clear()
        this.flashRing.lineStyle(4, 0xfde68a, 0.85)
        this.flashRing.strokeCircleShape(circle)
      },
      onComplete: () => this.flashRing.clear(),
    })
  }

  /** زر رجوع أنيق وواضح للمشهد الرئيسي. */
  private buildBackButton(): void {
    const btn = this.add.container(64, 44)
    const bg = this.add.graphics()
    bg.fillStyle(0x1e1b4b, 0.85)
    bg.fillRoundedRect(-44, -24, 88, 48, 24)
    bg.lineStyle(2, 0xfbbf24, 0.9)
    bg.strokeRoundedRect(-44, -24, 88, 48, 24)
    const label = this.add.text(0, 0, '← رجوع', {
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fde68a',
    }).setOrigin(0.5)
    btn.add([bg, label])
    btn.setDepth(200)

    const btnHit = new Phaser.Geom.Rectangle(-34, -20, 68, 40)
    btn.setInteractive(btnHit, Phaser.Geom.Rectangle.Contains)
    btn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.start('MainScene')
    })
  }

  /** تحديث العدّاد المعروض من المخزن. */
  private refreshCounter(): void {
    const count = getIstighfarCount()
    this.counterText.setText(`عدد الاستغفار: ${count}`)
  }
}
