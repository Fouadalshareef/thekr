import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jfif': 'image/jpeg' }

function startServer(root) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0])
    if (rel === '/') rel = '/index.html'
    const file = path.join(root, rel)
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end('nf'); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)))
}

const server = await startServer(DIST)
const url = `http://127.0.0.1:${server.address().port}/`
const home = process.env.USERPROFILE ?? ''
const cacheDir = path.join(home, '.cache', 'puppeteer', 'chrome')
let browserPath = null
for (const v of fs.readdirSync(cacheDir)) { const p = path.join(cacheDir, v, 'chrome-win64', 'chrome.exe'); if (fs.existsSync(p)) browserPath = p }

const dpr = Number(process.argv[2] || 3)
const browser = await puppeteer.launch({ executablePath: browserPath, headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 390, height: 844, deviceScaleFactor: dpr, hasTouch: true, isMobile: true } })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 4500))
await page.mouse.click(195, 430)
await new Promise((r) => setTimeout(r, 1200))
await page.evaluate(() => document.querySelector('#advice-close')?.click())
await new Promise((r) => setTimeout(r, 2000))
// ننتظر ظهور فقاعة إن لم تكن ظاهرة
await new Promise((r) => setTimeout(r, 1500))
const out = path.join(ROOT, `shot-ui-dpr${dpr}.png`)
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 390, height: 844 }, captureBeyondViewport: false })
console.log('saved', out)
await browser.close(); server.close()
