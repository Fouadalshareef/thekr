/**
 * verify-hidpi-pinch.mjs — تحقق آلي من الدقة العالية (High-DPI) والتقريب بإصبعين.
 *
 * يخدم dist/ عبر خادم محلي ثم يفتح اللعبة في متصفح حقيقي بمقاس هاتف (390×844)
 * مع محاكاة كثافة بكسلين (deviceScaleFactor=2)، ويتحقق من:
 *   1. قماش Phaser يكون أكبر من الـ viewport بمقدار dpr (canvas.width ≈ 390×2).
 *   2. التقريب بإصبعين يرفع الكاميرا حتى 2.5 فقط (لا يتجاوز الحد).
 *   3. عند إفلات الإصبعين تعود الكاميرا إلى تكبير 1 وتمرير صفر.
 *   4. عدم وجود أي خطأ JavaScript وقت التشغيل.
 *
 * التشغيل: node scripts/verify-hidpi-pinch.mjs   (يتطلب npm run build أولاً)
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

function startServer(root) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0])
    if (rel === '/') rel = '/index.html'
    const file = path.join(root, rel)
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function resolveBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]
  const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
  const cacheDir = path.join(home, '.cache', 'puppeteer', 'chrome')
  if (fs.existsSync(cacheDir)) {
    for (const v of fs.readdirSync(cacheDir)) {
      candidates.unshift(path.join(cacheDir, v, 'chrome-win64', 'chrome.exe'))
    }
  }
  return candidates.find((p) => typeof p === 'string' && fs.existsSync(p))
}

const results = []
function check(ok, label) {
  results.push({ ok, label })
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${label}`)
}

async function main() {
  const server = await startServer(DIST)
  const url = `http://127.0.0.1:${server.address().port}/`
  const browserPath = await resolveBrowser()
  if (!browserPath) {
    console.error('لم يتم العثور على Chrome/Edge. حدّد المسار عبر CHROME_PATH.')
    process.exit(1)
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  })

  const errors = []
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push(String(e.message)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(url, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 4500))

  // الدخول إلى المشهد الرئيسي من شاشة الترحيب ثم إغلاق نافذة النصائح
  await page.mouse.click(195, 430)
  await new Promise((r) => setTimeout(r, 800))
  await page.evaluate(() => document.querySelector('#advice-close')?.click())
  await new Promise((r) => setTimeout(r, 1500))

  // ---------- 1) قماش عالي الدقة ----------
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { w: c.width, h: c.height, cssW: r.width, cssH: r.height, dpr: window.devicePixelRatio }
  })
  check(
    canvasInfo.w > canvasInfo.cssW * 1.5,
    `قماش عالي الدقة: backing=${canvasInfo.w}px مقابل CSS=${canvasInfo.cssW}px (dpr=${canvasInfo.dpr})`,
  )

  // ---------- 2) التقريب بإصبعين ----------
  // الكاميرا تابعة للمشهد (ليست خاصية على Phaser.Game)، فنصل إليها عبر SceneManager.
  const getCam = () =>
    page.evaluate(() => {
      const game = window.__phaserGame
      const scene = game?.scene?.getScene?.('MainScene')
      const cam = scene?.cameras?.main
      return cam ? { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY } : null
    })

  const before = await getCam()
  check(before && Math.abs(before.zoom - 1) < 0.01, `الكاميرا تبدأ بتكبير 1 (zoom=${before?.zoom?.toFixed(3)})`)

  const client = await page.createCDPSession()
  const cx = 195
  const cy = 400
  const spread = async (from, to, steps = 12) => {
    for (let i = 1; i <= steps; i++) {
      const d = from + ((to - from) * i) / steps
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - d / 2, y: cy, id: 1 },
          { x: cx + d / 2, y: cy, id: 2 },
        ],
      })
      await new Promise((r) => setTimeout(r, 25))
    }
  }

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 40, y: cy, id: 1 },
      { x: cx + 40, y: cy, id: 2 },
    ],
  })
  await new Promise((r) => setTimeout(r, 150))
  await spread(80, 500) // إبعاد كبير جداً — يجب أن يُحدَّ عند 2.5
  const zoomed = await getCam()
  check(
    zoomed && zoomed.zoom > 1.2 && zoomed.zoom <= 2.51,
    `التقريب يعمل ويُحدَّ عند 2.5 (zoom=${zoomed?.zoom?.toFixed(3)})`,
  )

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await new Promise((r) => setTimeout(r, 250))

  // تقريب معتدل ثم تصغير حتى الحد الأدنى
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 40, y: cy, id: 1 },
      { x: cx + 40, y: cy, id: 2 },
    ],
  })
  await new Promise((r) => setTimeout(r, 120))
  await spread(80, 160) // تقريب معتدل
  const mid = await getCam()
  check(mid && mid.zoom > 1.05 && mid.zoom <= 2.51, `تقريب معتدل ضمن الحدود (zoom=${mid?.zoom?.toFixed(3)})`)
  await spread(160, 20) // تصغير قوي — يجب أن يُحدَّ عند 1
  const shrunk = await getCam()
  check(shrunk && shrunk.zoom >= 0.99, `التصغير محدّد عند 1 (zoom=${shrunk?.zoom?.toFixed(3)})`)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await new Promise((r) => setTimeout(r, 300))

  const after = await getCam()
  check(
    after && Math.abs(after.zoom - 1) < 0.01 && Math.abs(after.scrollX) < 1.5 && Math.abs(after.scrollY) < 1.5,
    `بعد الإفلات: العودة إلى تكبير 1 وتمرير صفر (zoom=${after?.zoom?.toFixed(3)} scrollX=${after?.scrollX?.toFixed(2)} scrollY=${after?.scrollY?.toFixed(2)})`,
  )

  check(errors.length === 0, `لا أخطاء JavaScript وقت التشغيل${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)

  await browser.close()
  server.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length ? `${failed.length} حالة فاشلة` : 'كل الحالات ناجحة ✅'}`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

