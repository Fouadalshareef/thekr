/**
 * FarmModal — نافذة «مزرعة الحسنات» الفاتحة كاملة الشاشة.
 *
 * بديل كامل لواجهة DOM الداكنة القديمة (components/GardenModal.ts):
 *  - Phaser.GameObjects.Container واحد بعمق ثابت (5000) فوق كل عناصر المشهد.
 *  - خلفية فاتحة كاملة الشاشة (#fcfcfc) مرسومة بـ Graphics.
 *  - زر إغلاق أحمر (×) أعلى اليسار يُخفي الحاوية ويُعيد واجهة اللعبة.
 *  - عنوان مركزي «مزرعة الحسنات» بخط أخضر داكن.
 *  - شبكة عمودين واسعة (2×3 وما بعدها) لبطاقات العناصر: أيقونة أكبر + اسم أوضح
 *    + عتبة الفتح، مع تمييز بصري بين المفتوح (أخضر فاتح) والمقفل (رمادي + 🔒).
 *  - بطاقات إحصائية (المستوى + إجمالي الأذكار) وشريط تقدم العنصر القادم.
 *
 * كل العناصر تفاعلية عبر setInteractive مع مناطق لمس مريحة للموبايل.
 */
import Phaser from 'phaser'
import { GARDEN_ELEMENTS, getGardenState } from '../../services/GardenService'
import { setRectHitArea } from './hitArea'
import {
  EMOJI_FONT,
  LIGHT_COLORS,
  LIGHT_TEXT,
  MODAL_FONT,
  buildLightModalFrame,
  drawCard,
  type LightModalFrame,
} from './LightModal'

/** رموز عناصر المزرعة (العنصر المقفل يُعرض دائمًا بـ 🔒). */
const STAGE_ICONS: Record<string, string> = {
  desert: '🏜️',
  grass: '🌿',
  'flower-red': '🌹',
  'flower-yellow': '🌼',
  bush: '🌳',
  tree: '🌴',
  bird: '🐦',
  fountain: '⛲',
  butterflies: '🦋',
  rainbow: '🌈',
}

/** عدد أعمدة الشبكة (بطاقتان في كل صف بقياس كبير ومقروء). */
const GRID_COLUMNS = 2

export class FarmModal {
  /** الحاوية الجذرية للنافذة (تُخفى/تُظهر كوحدة واحدة). */
  container: Phaser.GameObjects.Container

  private readonly scene: Phaser.Scene
  private frame: LightModalFrame
  private readonly onClose: () => void

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene
    this.onClose = onClose
    this.frame = buildLightModalFrame(
      scene,
      'مزرعة الحسنات',
      'كل ٥٠٠ ذكر يفتح عنصراً جديداً في مزرعتك',
      () => this.onClose(),
    )
    this.container = this.frame.container
    this.refresh()
  }

  /** إظهار النافذة (مع إعادة بناء المحتوى بأحدث حالة للمزرعة). */
  show(): void {
    this.rebuildIfResized()
    this.refresh()
    this.container.setVisible(true)
  }

  /** إخفاء النافذة. */
  hide(): void {
    this.container.setVisible(false)
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible)
  }

  get visible(): boolean {
    return this.container.visible
  }

  /** تدمير النافذة وكل عناصرها (يُستدعى عند إغلاق المشهد). */
  destroy(): void {
    this.container.destroy(true)
  }

  /**
   * إعادة بناء هيكل النافذة إذا تغيّرت أبعاد الشاشة (تدوير الجهاز مثلاً)
   * لأن الخلفية وشريط العنوان يُرسمان بقياس الشاشة الحالي وقت البناء.
   */
  private rebuildIfResized(): void {
    if (this.frame.width === this.scene.scale.width && this.frame.height === this.scene.scale.height) {
      return
    }
    const wasVisible = this.container.visible
    this.container.destroy(true)
    this.frame = buildLightModalFrame(
      this.scene,
      'مزرعة الحسنات',
      'كل ٥٠٠ ذكر يفتح عنصراً جديداً في مزرعتك',
      () => this.onClose(),
    )
    this.container = this.frame.container
    this.container.setVisible(wasVisible)
  }

  /** إعادة بناء محتوى النافذة من حالة الحديقة الحالية. */
  refresh(): void {
    const { body, width, bodyTop, bodyBottom } = this.frame
    body.removeAll(true)

    const garden = getGardenState()
    const marginX = 16
    const contentW = Math.min(width - marginX * 2, 460)
    const cx = width / 2
    const left = cx - contentW / 2
    const gap = 12

    // ── 1) بطاقتا الإحصاء: مستوى المزرعة + إجمالي الأذكار ──
    const statW = (contentW - gap) / 2
    const statH = 74
    this.addStatCard(left + statW / 2, bodyTop + statH / 2, statW, statH, 'مستوى المزرعة', `${garden.level}`, 'عنصر مفتوح')
    this.addStatCard(left + statW + gap + statW / 2, bodyTop + statH / 2, statW, statH, 'إجمالي الأذكار', `${garden.total}`, 'ذكراً')

    // ── 2) بطاقة العنصر القادم + شريط التقدم ──
    const progressTop = bodyTop + statH + gap
    const progressH = 82
    this.addProgressCard(left, progressTop, contentW, progressH, garden.next, garden.progress)

    // ── 3) شبكة العناصر (عمودان) ──
    const gridTop = progressTop + progressH + gap
    const hintH = 26
    const rows = Math.max(1, Math.ceil(GARDEN_ELEMENTS.length / GRID_COLUMNS))
    const cellGap = 10
    const cellW = (contentW - (GRID_COLUMNS - 1) * cellGap) / GRID_COLUMNS
    const gridHeight = bodyBottom - hintH - 6 - gridTop
    // ارتفاع البطاقة يُشتق من المساحة المتاحة (بحد أدنى/أقصى) لتبقى الشبكة كاملة بلا تمرير.
    const cellH = Phaser.Math.Clamp((gridHeight - (rows - 1) * cellGap) / rows, 56, 118)
    const totalGridH = rows * cellH + (rows - 1) * cellGap
    const gridStart = gridTop + Math.max(0, (gridHeight - totalGridH) / 2)

    GARDEN_ELEMENTS.forEach((el, index) => {
      const col = index % GRID_COLUMNS
      const row = Math.floor(index / GRID_COLUMNS)
      // RTL: العمود الأول (0) على اليمين ثم الثاني على اليسار.
      const x =
        col === 0 ? cx + (cellW + cellGap) / 2 : cx - (cellW + cellGap) / 2
      const y = gridStart + row * (cellH + cellGap) + cellH / 2
      this.addElementCard(x, y, cellW, cellH, el.id, el.name, el.threshold, garden.total)
    })

    // ── 4) نص التلميح السفلي (يتغير عند لمس أي بطاقة) ──
    const hint = this.scene.add
      .text(cx, bodyBottom - hintH / 2, 'المس أي عنصر لمعرفة تفاصيله', {
        fontFamily: MODAL_FONT,
        fontSize: '14px',
        color: LIGHT_TEXT.muted,
      })
      .setOrigin(0.5)
      .setName('farm-hint')
    body.add(hint)
  }

  /** بطاقة إحصائية فاتحة (عنوان صغير + قيمة كبيرة + وحدة). */
  private addStatCard(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    unit: string,
  ): void {
    const card = this.scene.add.container(x, y)
    const bg = this.scene.add.graphics()
    drawCard(bg, -w / 2, -h / 2, w, h, { fill: LIGHT_COLORS.surface, border: LIGHT_COLORS.border })
    card.add(bg)
    card.add(
      this.scene.add
        .text(0, -h / 2 + 20, label, {
          fontFamily: MODAL_FONT,
          fontSize: '15px',
          color: LIGHT_TEXT.muted,
        })
        .setOrigin(0.5),
    )
    card.add(
      this.scene.add
        .text(0, 12, `${value} ${unit}`, {
          fontFamily: MODAL_FONT,
          fontSize: '23px',
          fontStyle: 'bold',
          color: LIGHT_TEXT.title,
        })
        .setOrigin(0.5),
    )
    this.frame.body.add(card)
  }

  /** بطاقة «العنصر القادم» مع شريط تقدم يمتلئ من اليمين نحو اليسار (RTL). */
  private addProgressCard(
    left: number,
    top: number,
    w: number,
    h: number,
    next: { name: string; threshold: number } | null,
    progress: number,
  ): void {
    const card = this.scene.add.container(left + w / 2, top + h / 2)
    const bg = this.scene.add.graphics()
    drawCard(bg, -w / 2, -h / 2, w, h, {
      fill: LIGHT_COLORS.surfaceAlt,
      border: LIGHT_COLORS.accentBorder,
    })
    card.add(bg)

    const inset = 14
    const title = next
      ? `العنصر القادم: ${next.name} • ${next.threshold} ذكراً`
      : 'اكتملت المزرعة بالكامل 🌈'
    card.add(
      this.scene.add
        .text(w / 2 - inset, -h / 2 + 22, title, {
          fontFamily: MODAL_FONT,
          fontSize: '17px',
          fontStyle: 'bold',
          color: LIGHT_TEXT.title,
        })
        .setOrigin(1, 0.5),
    )
    card.add(
      this.scene.add
        .text(-w / 2 + inset, -h / 2 + 22, `${Math.round(progress * 100)}%`, {
          fontFamily: 'Consolas, monospace',
          fontSize: '16px',
          fontStyle: 'bold',
          color: LIGHT_TEXT.eyebrow,
        })
        .setOrigin(0, 0.5),
    )

    // مسار التقدم + التعبئة (تبدأ من الحافة اليمنى داخل البطاقة).
    const trackW = w - inset * 2
    const trackY = h / 2 - 22
    const track = this.scene.add.graphics()
    track.fillStyle(0xffffff, 1)
    track.fillRoundedRect(-trackW / 2, trackY - 7, trackW, 14, 7)
    track.lineStyle(1.5, LIGHT_COLORS.border, 1)
    track.strokeRoundedRect(-trackW / 2, trackY - 7, trackW, 14, 7)
    card.add(track)

    const fillW = Math.max(6, trackW * Phaser.Math.Clamp(progress, 0, 1))
    const fill = this.scene.add
      .rectangle(trackW / 2 - 2, trackY, 6, 10, LIGHT_COLORS.accentBorder, 1)
      .setOrigin(1, 0.5)
    card.add(fill)
    this.scene.tweens.add({
      targets: fill,
      displayWidth: fillW,
      duration: 420,
      ease: 'Quad.easeOut',
    })

    this.frame.body.add(card)
  }

  /**
   * بطاقة عنصر واحد في الشبكة: أيقونة كبيرة + الاسم + عتبة الفتح.
   * المفتوح: زمردي فاتح بحدّ أخضر — المقفل: رمادي بحدّ باهت مع 🔒.
   */
  private addElementCard(
    x: number,
    y: number,
    w: number,
    h: number,
    id: string,
    name: string,
    threshold: number,
    total: number,
  ): void {
    const unlocked = total >= threshold
    const card = this.scene.add.container(x, y)

    const bg = this.scene.add.graphics()
    drawCard(bg, -w / 2, -h / 2, w, h, {
      fill: unlocked ? LIGHT_COLORS.accentLight : LIGHT_COLORS.lockedSurface,
      border: unlocked ? LIGHT_COLORS.accentBorder : LIGHT_COLORS.lockedBorder,
      radius: 16,
    })
    card.add(bg)

    const iconSize = Math.round(Phaser.Math.Clamp(h * 0.3, 20, 32))
    const nameSize = Math.round(Phaser.Math.Clamp(h * 0.17, 14, 20))
    card.add(
      this.scene.add
        .text(0, -h / 2 + h * 0.28, unlocked ? STAGE_ICONS[id] ?? '✨' : '🔒', {
          fontFamily: EMOJI_FONT,
          fontSize: `${iconSize}px`,
        })
        .setOrigin(0.5),
    )
    card.add(
      this.scene.add
        .text(0, h * 0.06, name, {
          fontFamily: MODAL_FONT,
          fontSize: `${nameSize}px`,
          fontStyle: 'bold',
          color: unlocked ? '#065f46' : LIGHT_TEXT.locked,
          align: 'center',
          wordWrap: { width: w - 16, useAdvancedWrap: true },
        })
        .setOrigin(0.5),
    )
    card.add(
      this.scene.add
        .text(0, h / 2 - h * 0.16, `${threshold} ذكراً`, {
          fontFamily: MODAL_FONT,
          fontSize: '13px',
          color: unlocked ? LIGHT_TEXT.muted : LIGHT_TEXT.locked,
        })
        .setOrigin(0.5),
    )

    // تفاعل: ضغط لحظي + تحديث نص التلميح السفلي بتفاصيل العنصر.
    card.setSize(w, h)
    setRectHitArea(card, w, h, 2, true)
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.scene.tweens.add({
        targets: card,
        scale: 0.96,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
      const remaining = Math.max(0, threshold - total)
      this.setHint(
        unlocked
          ? `🌿 «${name}» مفتوح في مزرعتك — حصادك الحالي ${total} ذكراً`
          : `🔒 «${name}» يُفتح عند ${threshold} ذكراً — بقي ${remaining} ذكراً`,
      )
    })
    this.frame.body.add(card)
  }

  /** تحديث نص التلميح السفلي داخل النافذة. */
  private setHint(text: string): void {
    const hint = this.frame.body.getByName('farm-hint') as Phaser.GameObjects.Text | null
    hint?.setText(text)
  }
}

