import { defineConfig } from 'vite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

// ------------------------------------------------------------------
// vite-plugin-precache: حقن قائمة أصول البناء (JS/CSS hashed) في sw.js
// بعد كل build، حتى يعمل التطبيق كاملاً بدون إنترنت.
//
// وحقن __BUILD_ID__ داخل CACHE_NAME في sw.js: معرّف مشتق من بصمة الأصول
// المجزّأة (JS/CSS) + وقت البناء. الغرض: CACHE_NAME يتغير مع كل نشر، فيلغي
// الكاش القديم تلقائياً عند تفعيل الـ service worker. بدون هذا يبقى العميل
// على النسخة المخزّنة (Cache-First) ولا يرى أي تحديث واجهة مهما تكرر النشر.
// ------------------------------------------------------------------
function injectPrecache() {
  return {
    name: 'vite-plugin-precache',
    apply: 'build' as const,
    closeBundle() {
      // import.meta.dirname بدل __dirname: Vite 8 سيحوّل configLoader إلى
      // 'native' افتراضياً ولا يوفر __dirname في ملف الإعداد، فيظهر تحذير
      // "unsupported by configLoader: 'native'". استخدام البديل الرسمي
      // يزيل التحذير ويعمل مع أي نسخة Vite 6+.
      const distDir = resolve(import.meta.dirname, 'dist')
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
          // path.relative يتعامل مع فاصل المسار الصحيح على كل المنصات.
          // كان الكودpreviously يستبدل 'dist\\' حصراً، فينتج على Linux
          // مسارات مطلقة مثل './home/runner/work/.../dist/assets/x.js'
          // تفشل جميعها في cache.add ⇒Precaching معطّل فعلياً على CI.
          else files.push('./' + relative(distDir, full).replaceAll('\\', '/'))
        }
      }
      walk(distDir)
      const assets = files.filter((f) => !f.endsWith('sw.js') && !f.endsWith('.DS_Store'))
      sw = sw.replace(
        '__PRECACHE_MANIFEST__',
        JSON.stringify(assets, null, 2),
      )

      // بصمة البناء: أسماء الملفات المجزّأة (JS/CSS) تحمل بصمة محتواها نفسها،
      // فتكفي لاكتشاف تغيّر الواجهة فعلياً. ويُضاف طابع زمني (نهاية البناء) لضمان
      // أن كل نشر ينتج CACHE_NAME مختلفاً، فيُلغي كاش العميل القديم دائماً.
      const fingerprint = createHash('sha256')
      for (const rel of assets.sort()) {
        if (rel.startsWith('./assets/')) {
          fingerprint.update(rel)
          try {
            fingerprint.update(readFileSync(resolve(distDir, rel.slice(2))))
          } catch {
            /* تجاهل: البصمة تكفي بالاسم */
          }
        }
      }
      // Date.now() وقت البناء: لا نعتمد على mtime الخاص بـ dist/sw.js لأنه
      // مُنسوخ من public/ قد يحتفظ بوقت قديم فلا يتغير المعرّف بين البناءات.
      const buildId = `${fingerprint.digest('hex').slice(0, 8)}-${Date.now().toString(36)}`
      // replaceAll: الاسم يظهر أيضاً في تعليق التوثيق أعلى الملف، فاستبدال أول
      // ورود فقط (وهو التعليق) يترك الثابت دون حقن.
      sw = sw.replaceAll('__CACHE_NAME__', `baqiyat-${buildId}`)

      writeFileSync(swPath, sw, 'utf8')
      console.log(`[precache] ✓ injected ${assets.length} assets into dist/sw.js (buildId=${buildId})`)
    },
  }
}

// See https://vite.dev/config/
export default defineConfig({
  // يعمل محليًا وعلى GitHub Pages (تحت المسار /thekr/) وعلى نطاق مخصص
  base: './',
  build: {
    // Phaser (~1.2MB) هو أكبر حزمة في المشروع. فصل محرك الألعاب في chunk
    // مستقل لا يُصغّر الحجم الكلي، لكنه يجعل الكاش طويل الأجل فعّالاً: تعديل
    // كود اللعبة لا يُبطل تحميل محرك Phaser من جديد. رفع حد التحذير يمنع
    // رسالة "Some chunks are larger than 500 kB" المتوقعة لبقية الكود.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        // Rolldown (محرّك Vite 8) يقبل manualChunks كدالة فقط، بخلاف الكائن
        // الذي كان يقبله Rollup. إسناد "phaser" لحزمة واحدة بنفسه يفصل
        // المحرك عن بقية الكود دون كتابة أسماء ملفات هشة.
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser'
        },
      },
    },
  },
  plugins: [tailwindcss(), injectPrecache()],
})
