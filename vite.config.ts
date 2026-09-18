import { defineConfig } from 'vite'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

// ------------------------------------------------------------------
// vite-plugin-precache: حقن قائمة أصول البناء (JS/CSS hashed) في sw.js
// بعد كل build، حتى يعمل التطبيق كاملاً بدون إنترنت.
// ------------------------------------------------------------------
function injectPrecache() {
  return {
    name: 'vite-plugin-precache',
    apply: 'build' as const,
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const swPath = resolve(distDir, 'sw.js')
      let sw: string
      try {
        sw = readFileSync(swPath, 'utf8')
      } catch {
        return
      }
      // جمع كل الملفات في dist (عدا sw.js نفسه) كمسارات نسبية './...'
      const files: string[] = []
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = resolve(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else files.push('./' + full.replace(distDir + '\\', '').replaceAll('\\', '/'))
        }
      }
      walk(distDir)
      const assets = files.filter((f) => !f.endsWith('sw.js') && !f.endsWith('.DS_Store'))
      sw = sw.replace(
        '__PRECACHE_MANIFEST__',
        JSON.stringify(assets, null, 2),
      )
      writeFileSync(swPath, sw, 'utf8')
      console.log(`[precache] ✓ injected ${assets.length} assets into dist/sw.js`)
    },
  }
}

// See https://vite.dev/config/
export default defineConfig({
  // يعمل محليًا وعلى GitHub Pages (تحت المسار /thekr/) وعلى نطاق مخصص
  base: './',
  plugins: [tailwindcss(), injectPrecache()],
})
