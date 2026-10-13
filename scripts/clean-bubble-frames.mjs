/**
 * clean-bubble-frames.mjs
 * يزيل الإطار/الحلقة البيضاء الخارجية عن صور فقاعات الأذكار (PNG)
 * ويحوّل البكسل الأبيض شبه الشفاف إلى شفاف تماماً لإزالة الهالة.
 *
 * الخوارزمية:
 *  1) flood-fill من الحدود لكل بكسل شبه أبيض (brightness عالية وchroma منخفضة)
 *     — يمسح الإطار الأبيض الخارجي المتصل بالحافة فقط، ولا يلمس الأبيض الداخلي.
 *  2) تنظيف الحواف: أي بكسل فاتح مُجاور لبكسل شفاف (محذوف) يُخفَّض تماثلياً.
 * 3) حفظ الصور بصيغة PNG مع الحفاظ على الشفافية.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'pi', 'Bubbles')
const TARGETS = ['sobhanallah.png', 'alhamdulillah.png', 'allahu_akbar.png', 'hawqala.png']

/** عتبة "الأبيض": قناة ألوان قريبة من 255 وفرق بين القنوات صغير. */
const LIGHT_MIN = 236 // أدنى قيمة للقناة الفاتحة
const CHROMA_MAX = 22 // أقصى فرق بين أعلى وأدنى قناة (لتحديد اللونية)

function isWhitePixel(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return min >= LIGHT_MIN && max - min <= CHROMA_MAX
}

async function cleanImage(name) {
  const src = path.join(DIR, name)
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const px = data // RGBA
  const removed = new Uint8Array(width * height)
  // Int32Array مخزن كفهرس بكسل واحد لكل عنصر لتجنّب إنشاء مصفوفات [x, y]
  // كثيرة أثناء flood-fill، خصوصاً مع الصور عالية الدقة.
  const stack = new Int32Array(width * height)
  let stackLength = 0
  const idx = (x, y) => y * width + x
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = idx(x, y)
    if (removed[i]) return
    const o = i * channels
    if (px[o + 3] === 0 || isWhitePixel(px[o], px[o + 1], px[o + 2])) {
      removed[i] = 1
      stack[stackLength++] = i
    }
  }

  // 1) بذور الحدود الأربع
  for (let x = 0; x < width; x++) { pushIf(x, 0); pushIf(x, height - 1) }
  for (let y = 0; y < height; y++) { pushIf(0, y); pushIf(width - 1, y) }

  // 2) flood-fill 4-اتجاه
  while (stackLength > 0) {
    const i = stack[--stackLength]
    const x = i % width
    const y = Math.floor(i / width)
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1)
  }

  // 3) إزالة البكسل المحدَّد (شفاف تماماً)
  for (let i = 0; i < removed.length; i++) {
    if (removed[i]) px[i * channels + 3] = 0
  }

  // 4) تنظيف الحواف: أي بكسل مُبقى ومجاور لبكسل شفاف => خفّض ألفا تماثلياً مع بياضه
  const alphaCopy = new Uint8Array(width * height)
  for (let i = 0; i < alphaCopy.length; i++) alphaCopy[i] = px[i * channels + 3]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y)
      if (alphaCopy[i] === 0) continue
      const o = i * channels
      if (!isWhitePixel(px[o], px[o + 1], px[o + 2])) continue
      let touchesClear = false
      if (x > 0 && alphaCopy[idx(x - 1, y)] === 0) touchesClear = true
      else if (x < width - 1 && alphaCopy[idx(x + 1, y)] === 0) touchesClear = true
      else if (y > 0 && alphaCopy[idx(x, y - 1)] === 0) touchesClear = true
      else if (y < height - 1 && alphaCopy[idx(x, y + 1)] === 0) touchesClear = true
      if (touchesClear) {
        const r = px[o], g = px[o + 1], b = px[o + 2]
        const whiteness = (r + g + b) / 765 // 0..1
        px[o + 3] = Math.round(alphaCopy[i] * (1 - whiteness))
      }
    }
  }

  const out = await sharp(Buffer.from(px), { raw: { width, height, channels } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()

  fs.writeFileSync(src, out)
  const stat = fs.statSync(src)
  console.log(`${name}: ${width}x${height} -> ${(stat.size / 1024).toFixed(0)} KB`)
}

for (const t of TARGETS) {
  if (fs.existsSync(path.join(DIR, t))) await cleanImage(t)
  else console.log(`SKIP (missing): ${t}`)
}
console.log('done')
