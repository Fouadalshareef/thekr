/**
 * measure-banner.mjs — قياس مواضع الفتحات في شريط Resource.png.
 *
 * الهدف: عند استبدال صورة الشريط، تتغيّر مواضع الفتحات، فنحتاج أرقاماً
 * جديدة لموضع كل عنصر (المستوى/الاسم، الإجمالي، زر الإيقاف) بدل تخمينها.
 * الأداة ترصد مناطق الخلفية الكريمية (فاتحة، دافئة، شبه بيضاء) داخل اللوحة
 * الخشبية وتُخرج مركز كل منطقة كنسبة مئوية من عرض/ارتفاع الصورة — وهي نفس
 * الوحدة المستخدمة في CSS (.rk-slot-* left/top).
 *
 * الاستعمال:  node scripts/measure-banner.mjs <مسار الصورة> [مسار آخر ...]
 */
import { decodePng, pixelAt, writeDownscaledPng } from './png-decode.mjs'

/** خلفية الفتحة: فاتحة ودافئة (كريمية)، بعيدة عن الذهبي والخشبي والداكن. */
function isSlotBackground(r, g, b, a) {
  if (a < 200) return false
  if (r < 225 || g < 210 || b < 180) return false
  // الخشب الداكن والذهبي مشبعان؛ الكريمي قريب من الرمادي (فرق القنوات صغير).
  if (r - b > 60) return false
  if (Math.abs(r - g) > 45) return false
  // نستبعد الأبيض الناصع: الفتحة ليست بيضاء ساطعة بل كريمية ذات دفء.
  if (r > 252 && g > 250 && b > 244) return false
  return true
}

/**
 * تجزئة الصورة إلى مكونات متصلة (تعبئة فيضيّة بمكدّس صريح).
 * نستخدم Uint8Array للمصفوفة الراجعة لتفادي بطء المصفوفات الاعتيادية.
 */
function findRegions(img) {
  const { width, height, data, channels, colorType, palette } = img
  const px = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      let r, g, b, a
      if (colorType === 3) {
        const p = data[i] * 3
        r = palette[p]; g = palette[p + 1]; b = palette[p + 2]; a = 255
      } else if (channels === 1) {
        r = g = b = data[i]; a = 255
      } else if (channels === 2) {
        r = g = b = data[i]; a = data[i + 1]
      } else {
        r = data[i]; g = data[i + 1]; b = data[i + 2]; a = data[i + 3]
      }
      if (isSlotBackground(r, g, b, a)) px[y * width + x] = 1
    }
  }

  const regions = []
  const stack = new Int32Array(width * height)
  for (let start = 0; start < px.length; start++) {
    if (px[start] === 0) continue
    px[start] = 0
    let top = 0
    stack[top++] = start
    let minX = width, maxX = 0, minY = height, maxY = 0, area = 0

    while (top > 0) {
      const index = stack[--top]
      const x = index % width
      const y = (index - x) / width
      area++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      if (x > 0 && px[index - 1] === 1) { px[index - 1] = 0; stack[top++] = index - 1 }
      if (x < width - 1 && px[index + 1] === 1) { px[index + 1] = 0; stack[top++] = index + 1 }
      if (y > 0 && px[index - width] === 1) { px[index - width] = 0; stack[top++] = index - width }
      if (y < height - 1 && px[index + width] === 1) { px[index + width] = 0; stack[top++] = index + width }
    }

    // نُبقي فقط ما يشبه الفتحة: منطقة واسعة نسبياً (≥1% من مساحة الصورة).
    if (area * 100 >= width * height) {
      regions.push({ minX, maxX, minY, maxY, area })
    }
  }

  return regions
}

/**
 * أين يجلس النص داخل فتحة تحوي أيقونة (نجمة) في أحد طرفيها؟
 *
 * الطريقة المختارة: نمسح الصفوف داخل الفتحة، ونقسّم كل صفّ إلى مقاطع
 * كريمية متّصلة. النجمة تقطع الكريمي إلى مقطعين ⇒ نأخذ المقطع الأعرض
 * في الصفّ الأوسط (حيث النجمة أعرض ما يكون) وهو الفراغ الحرّ للنص.
 *
 * بديلنا المرفوض أوّلاً: تمييز البكسلات الذهبية داخل النطاق. بطل لأن
 * إطار الفتحة ذهبي أيضاً، فيحسب المسح كامل عرض الفتحة ويعطي 71.9% بدل
 * الموضع الصحيح ~54.6%.
 */
function findTextAreaInRegion(img, region) {
  const rows = 11
  let best = null
  for (let f = 0; f <= rows; f++) {
    const y = Math.round(region.minY + ((region.maxY - region.minY) * f) / rows)
    const runs = []
    let start = -1
    for (let x = region.minX; x <= region.maxX; x++) {
      const [r, g, b, a] = pixelAt(img, x, y)
      if (isSlotBackground(r, g, b, a)) {
        if (start === -1) start = x
      } else if (start !== -1) {
        if (x - start >= 3) runs.push([start, x - 1])
        start = -1
      }
    }
    if (start !== -1) runs.push([start, region.maxX])
    for (const [a, b] of runs) {
      const span = b - a
      // نتجاهل الشرائط الضيقة جداً: هذه أطراف أو ظلال لا مساحة نص.
      if (span < (region.maxX - region.minX) * 0.25) continue
      if (!best || span > best.span) best = { minX: a, maxX: b, y, span }
    }
  }
  return best
}

const rawArgs = process.argv.slice(2)
const previewIdx = rawArgs.indexOf('--preview')
const debug = rawArgs.includes('--debug')
const previewPath = previewIdx === -1 ? null : rawArgs[previewIdx + 1]
// نحذف الوسائط وعلاماتها معاً. نتحقق من previewIdx !== -1 قبل حذف ما بعده،
// وإلا حُذف أول مسار صورة بالخطأ (‎-1+1 = 0‎) ورُفض الاستعمال كله.
const args = rawArgs.filter(
  (_, i) =>
    i !== previewIdx &&
    !(previewIdx !== -1 && i === previewIdx + 1) &&
    rawArgs[i] !== '--debug',
)

if (args.length === 0) {
  console.error('الاستعمال: node scripts/measure-banner.mjs [--preview <ملف.png>] <image> [image ...]')
  process.exit(1)
}

for (const file of args) {
  const img = decodePng(file)
  console.log(`\n=== ${file} (${img.width}×${img.height}) ===`)

  const regions = findRegions(img)
    .filter((r) => (r.maxX - r.minX) > img.width * 0.01 && (r.maxY - r.minY) > img.height * 0.01)
    .sort((a, b) => a.minX - b.minX)

  if (regions.length === 0) {
    console.log('  (لم تُرصد أي فتحة كريمية)')
  }

  for (const r of regions) {
    const cx = ((r.minX + r.maxX) / 2 / img.width) * 100
    const cy = ((r.minY + r.maxY) / 2 / img.height) * 100
    const w = ((r.maxX - r.minX) / img.width) * 100
    const h = ((r.maxY - r.minY) / img.height) * 100
    console.log(
      `  left: ${cx.toFixed(2)}%  top: ${cy.toFixed(2)}%` +
      `   (العرض ${w.toFixed(2)}% · الارتفاع ${h.toFixed(2)}%)` +
      `   بكسل x=${r.minX}..${r.maxX} y=${r.minY}..${r.maxY}`,
    )
  }

  // --debug: يطبع مقاطع الكريمي عبر عدة صفوف من كل فتحة. المقاطع
  // المنفصلة تكشف وجود أيقونة (نجمة) تقسم الفتحة، وموضع انقسامها يحدّد
  // أين يجب أن يجلس النص. هذه الطريقة أمتن من تمييز اللون الذهبي لأن
  // إطار الفتحة ذهبي أيضاً فيلتبس الأيقونة بالإطار.
  if (debug) {
    for (const r of regions) {
      const h = r.maxY - r.minY
      console.log(`  [debug] فتحة x=${r.minX}..${r.maxX}:`)
      for (let f = 0; f <= 10; f++) {
        const y = Math.round(r.minY + (h * f) / 10)
        const runs = []
        let start = -1
        for (let x = r.minX; x <= r.maxX; x++) {
          const [pr, pg, pb, pa] = pixelAt(img, x, y)
          const cream = isSlotBackground(pr, pg, pb, pa)
          if (cream && start === -1) start = x
          if (!cream && start !== -1) {
            if (x - start >= 3) runs.push([start, x - 1])
            start = -1
          }
        }
        if (start !== -1) runs.push([start, r.maxX])
        if (runs.length === 0) continue
        console.log(
          `    y=${y}: ` +
          runs
            .map(([a, b]) => `${((a / img.width) * 100).toFixed(1)}..${((b / img.width) * 100).toFixed(1)}`)
            .join(' | '),
        )
      }
    }
  }

// --preview <ملف>: تكتب صورة مصغّرة مع خطوط تُبيّن مراكز الفتحات،
  // للتحقق البصري أن الأرقام المقاسة تُطابق ما يظهر فعلاً في اللوحة.
  if (previewPath) {
    writePreview(img, regions, previewPath)
    console.log(`  ↳ معاينة: ${previewPath}`)
  }

  // الفتحة الوسطى قد تحوي أيقونة (نجمة) تشغل يسارها ⇒ نضع النص في الفراغ
  // المتبقي يمينها بدل مركز الفتحة الهندسي، وإلا تداخل الأيقونة مع الرقم.
  if (regions.length === 3) {
    const middle = regions[1]
    const area = findTextAreaInRegion(img, middle)
    if (area) {
      const pad = 10
      const freeStart = area.minX + pad
      const freeEnd = area.maxX - pad
      const cx = ((freeStart + freeEnd) / 2 / img.width) * 100
      const cy = ((middle.minY + middle.maxY) / 2 / img.height) * 100
      console.log(
        `  ↳ مساحة النص داخل الوسط (بعد النجمة):` +
        ` ${((freeStart / img.width) * 100).toFixed(1)}%..${((freeEnd / img.width) * 100).toFixed(1)}%` +
        `  ⇒ left: ${cx.toFixed(2)}%  top: ${cy.toFixed(2)}%`,
      )
    }
  }
}

/**
 * رسم معاينة: الصورة مصغّرة مع مربع حول كل فتحة وخطوط عمودية/أفقية
 * تمرّ بمركزها. الغرض فحص بصري لا دقّة هندسية (الدقّة تأتي من findRegions).
 */
function writePreview(img, regions, outPath) {
  const outW = 900
  const scale = img.width / outW
  const outH = Math.round(img.height / scale)
  const canvas = Buffer.alloc(outW * outH * 3)

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(img.width - 1, Math.round(x * scale))
      const sy = Math.min(img.height - 1, Math.round(y * scale))
      const [r, g, b] = pixelAt(img, sx, sy)
      const i = (y * outW + x) * 3
      canvas[i] = r; canvas[i + 1] = g; canvas[i + 2] = b
    }
  }

  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= outW || y >= outH) return
    const i = (y * outW + x) * 3
    canvas[i] = c[0]; canvas[i + 1] = c[1]; canvas[i + 2] = c[2]
  }
  const RED = [255, 0, 0]

  for (const r of regions) {
    const x0 = Math.round(r.minX / scale)
    const x1 = Math.round(r.maxX / scale)
    const y0 = Math.round(r.minY / scale)
    const y1 = Math.round(r.maxY / scale)
    const cx = Math.round((r.minX + r.maxX) / 2 / scale)
    const cy = Math.round((r.minY + r.maxY) / 2 / scale)
    for (let x = x0; x <= x1; x++) { put(x, y0, RED); put(x, y1, RED) }
    for (let y = y0; y <= y1; y++) { put(x0, y, RED); put(x1, y, RED) }
    for (let y = 0; y < outH; y++) put(cx, y, RED) // خط عمودي عبر المركز
    for (let x = 0; x < outW; x++) put(x, cy, RED) // خط أفقي عبر المركز
  }

  writeDownscaledPng({ width: outW, height: outH, channels: 3, colorType: 2, data: canvas, palette: null }, outW, outPath)
}