/**
 * ParticleBurst.ts — مؤثر الجزيئات الضوئية الذهبية المتطايرة عند فرقعة جسم.
 */
import Phaser from 'phaser'

const TEXTURE_KEY = 'pixel-glow'

/**
 * توليد نسيج "نقطة ضوئية دائرية" مرة واحدة لكل مشهد (إن لم يكن موجوداً)
 * ليُستخدم لاحقاً لرسم الجزيئات.
 */
export function ensurePixelTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return
  const canvas = scene.textures.createCanvas(TEXTURE_KEY, 16, 16)
  if (!canvas) return
  const g = canvas.getContext()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(8, 8, 8, 0, Math.PI * 2)
  g.fill()
  canvas.refresh()
}

/**
 * إطلاق دفعة جزيئات ذهبية متطايرة عند إحداثية معينة،
 * مع تدمير الدفعة تلقائياً بعد انتهاء عمر الجزيئات.
 */
export function emitGoldBurst(scene: Phaser.Scene, x: number, y: number, count = 14): void {
  ensurePixelTexture(scene)

  const emitter = scene.add.particles(x, y, TEXTURE_KEY, {
    speed: { min: 90, max: 280 },
    angle: { min: 0, max: 360 },
    gravityY: 380,
    lifespan: { min: 350, max: 800 },
    scale: { start: 0.55, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffd700, 0xf7c948, 0xfde68a, 0xffffff, 0xfbbf24],
    quantity: 1,
    emitting: false,
    blendMode: 'ADD',
    emitZone: undefined,
  })

  emitter.explode(count)
  scene.time.delayedCall(950, () => emitter.destroy())
}
