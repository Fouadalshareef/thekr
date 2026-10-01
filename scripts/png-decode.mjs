/**
 * png-decode.mjs — فك ترميز PNG بسيط بلا أي اعتمادية خارجية.
 *
 * 이유: قياس مواضع فتحات شريط Resource.png يحتاج قراءة بكسلات الصورة،
 * ومحاولة فعل ذلك عبر System.Drawing في PowerShell كانت بطيئة ومعرّضة
 * لأخطاء نوع في المصفوفات ثنائية الأبعاد. هنا نستخدم zlib المدمجة في
 * Node (نفس ما يعتمد عليه أي مُرمِّز صور) فتصير القياسات فورية.
 *
 * يدعم: bitDepth 8، لوني (0/3/4/2/6)، بلا تشابك (interlace = 0).
 * يرمي خطأً واضحاً لأي حالة غير مدعومة بدل إنتاج أرقام صادقة.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'

const PNG_SIGNATURE = 0x89504e47

/** عدد القنوات حسب colorType كما يحدده معيار PNG. */
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

/** قراءة ملف PNG وإرجاع { width, height, channels, colorType, data, palette }. */
export function decodePng(filePath) {
  const buf = readFileSync(filePath)
  if (buf.readUInt32BE(0) !== PNG_SIGNATURE) {
    throw new Error(`ليس ملف PNG: ${filePath}`)
  }

  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  let palette = null
  const idat = []

  let off = 8
  while (off + 8 <= buf.length) {
    const length = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + length)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'PLTE') {
      palette = Buffer.from(data)
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    off += 12 + length
  }

  if (bitDepth !== 8) throw new Error(`عمق البت غير مدعوم: ${bitDepth}`)
  if (interlace !== 0) throw new Error('صور PNG المتشابكة غير مدعومة')
  const channels = CHANNELS[colorType]
  if (!channels) throw new Error(`نوع لون غير مدعوم: ${colorType}`)
  if (colorType === 3 && !palette) throw new Error('صورة بلون مفهرس بلا لوحة ألوان')

  // فك ضغط دفتر البيانات ثم إعادة بناء الأسطر بإلغاء مرشّحات PNG الخمسة.
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)

  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride

    const rowStart = y * stride
    const prevStart = rowStart - stride
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[rowStart + x - channels] : 0
      const b = y > 0 ? out[prevStart + x] : 0
      const c = x >= channels && y > 0 ? out[prevStart + x - channels] : 0
      let value = line[x]
      switch (filter) {
        case 0: break
        case 1: value += a; break
        case 2: value += b; break
        case 3: value += (a + b) >> 1; break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          break
        }
        default: throw new Error(`مرشّح PNG غير معروف: ${filter}`)
      }
      out[rowStart + x] = value & 0xff
    }
  }

  return { width, height, channels, colorType, data: out, palette }
}

/** إرجاع [r, g, b, a] للبكسل عند (x, y). */
export function pixelAt(img, x, y) {
  const { channels, colorType, data, width, palette } = img
  const i = (y * width + x) * channels
  if (colorType === 3) {
    const p = data[i] * 3
    return [palette[p], palette[p + 1], palette[p + 2], 255]
  }
  if (channels === 1) return [data[i], data[i], data[i], 255]
  if (channels === 2) return [data[i], data[i], data[i], data[i + 1]]
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}
// ------------------------------------------------------------------
// ترميز PNG (للإخراج فقط): نحتاجه لتوليد معاينة مصغّرة يمكن رؤيتها
// للتحقق البصري من مواضع الفتحات قبل تعديل CSS.
// ------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** لفّة بيانات PNG واحدة (طول + نوع + بيانات + CRC). */
function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/**
 * تصغير صورة (بمتوسط 2×2) وحفظها كـ PNG — للمعاينة فقط.
 * نكتب RGB بلا شفافية لتبقى المعاينة متوافقة مع كل العارضين.
 */
export function writeDownscaledPng(img, targetWidth, outPath) {
  const scale = img.width / targetWidth
  const outW = targetWidth
  const outH = Math.max(1, Math.round(img.height / scale))

  const raw = Buffer.alloc(outH * (outW * 3 + 1))
  let p = 0
  for (let y = 0; y < outH; y++) {
    raw[p++] = 0 // مرشّح None
    for (let x = 0; x < outW; x++) {
      let r = 0, g = 0, b = 0, n = 0
      const x0 = Math.floor(x * scale)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scale))
      const y0 = Math.floor(y * scale)
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * scale))
      for (let sy = y0; sy < y1 && sy < img.height; sy++) {
        for (let sx = x0; sx < x1 && sx < img.width; sx++) {
          const [pr, pg, pb] = pixelAt(img, sx, sy)
          r += pr; g += pg; b += pb; n++
        }
      }
      raw[p++] = n ? Math.round(r / n) : 0
      raw[p++] = n ? Math.round(g / n) : 0
      raw[p++] = n ? Math.round(b / n) : 0
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(outW, 0)
  ihdr.writeUInt32BE(outH, 4)
  ihdr[8] = 8 // عمق البت
  ihdr[9] = 2 // RGB

  writeFileSync(outPath, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]))
  return { outW, outH }
}