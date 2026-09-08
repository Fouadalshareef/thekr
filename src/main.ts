import './style.css'
import { createGame } from './game/PhaserGame'
import { initDashboard } from './components/DashboardModal'
import { initGardenModal } from './components/GardenModal'
import { initAdviceModal } from './components/AdviceModal'
import { initQuranModal } from './components/QuranModal'
import { APP_VERSION, hasPendingUpdate } from './services/AppVersion'

// مسح تلقائي للذاكرة المؤقتة لضمان جلب أحدث الملفات
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => caches.delete(name))
  })
}

// معالجة المستخدم الجديد (لم يسبق له تشغيل التطبيق)
if (!localStorage.getItem('last_seen_version')) {
  localStorage.setItem('last_seen_version', APP_VERSION)
  localStorage.setItem('has_update', 'false')
}

// مسح شارة التطبيق الخارجية (PWA Badge) إذا لم يكن هناك تحديث معلق
if (!hasPendingUpdate() && 'clearAppBadge' in navigator) {
  navigator.clearAppBadge().catch(() => {})
}

// تهيئة اللوحات فوق قماش اللعبة.
initDashboard()
initGardenModal()
initAdviceModal()
initQuranModal()

// تشغيل محرك اللعبة داخل الحاوية #game-container
// مقاس ثابت موحّد (480×854) بدون devicePixelRatio — هو سبب انزياح اللمس.
// Phaser بنمط FIT سيوسّع اللعبة تلقائياً مع بقاء إحداثيات اللمس متطابقة 100%.
const game = createGame({ width: 480, height: 854, parent: 'game-container' })

// تحديث ناعم عند تغيّر حجم النافذة أو تدوير الجهاز
const refreshScale = () => game.scale.refresh()
window.addEventListener('resize', refreshScale)
window.addEventListener('orientationchange', refreshScale)

// ------------------------------------------------------------------
// منع تداخل أحداث التمرير/السحب مع لمس اللعبة (Scroll blocking)
// ------------------------------------------------------------------
// نمنع التمرير/السحب على كامل الصفحة إلا إذا كان مصدر اللمس
// داخل نافذة الإعدادات (#dashboard-modal) حيث نحتاج التمرير العمودي
const blockScroll = (e: Event) => {
  const target = e.target as HTMLElement | null
  // السماح بالتمرير في أي نافذة منبثقة تحتاج إلى التمرير العمودي
  if (target && target.closest('#dashboard-modal, #garden-modal, #advice-modal, #quran-modal')) return
  e.preventDefault()
}
document.addEventListener('touchmove', blockScroll, { passive: false })
document.addEventListener('gesturestart', blockScroll)
document.addEventListener('wheel', blockScroll, { passive: false })
// منع السحب للتحديث (pull-to-refresh) عبر منع الإفراط في التمرير
document.documentElement.style.overscrollBehavior = 'none'
document.body.style.overscrollBehavior = 'none'
// منع تحديد النص أو القائمة السياقية أثناء النقر السريع المتكرر
document.body.style.userSelect = 'none'
// ملاحظة: لا نضع touchAction = 'none' على body لأنه يُعطّل touch-action: pan-y
// في نافذة الإعدادات (المتصفح يحسب تقاطع القيم في سلسلة body→modal→scroll).
// الـ canvas يحمل touch-action: none في CSS وهو يكفي لمنع التمرير أثناء اللعب.
document.addEventListener('contextmenu', blockScroll)

// ------------------------------------------------------------------
// نافذة منبثقة لتثبيت التطبيق (PWA Install Prompt)
// ------------------------------------------------------------------
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'

/** هل يعمل التطبيق حالياً في وضع مثبّت (standalone)؟ */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** إنشاء وإظهار شريط/نافذة أنيقة لتثبيت التطبيق. */
function showInstallBanner(deferred: BeforeInstallPromptEvent): void {
  if (document.getElementById('pwa-install-banner')) return

  const banner = document.createElement('div')
  banner.id = 'pwa-install-banner'
  banner.style.cssText = [
    'position: fixed',
    'top: 14px',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 9999',
    'width: min(90%, 400px)',
    'display: flex',
    'align-items: center',
    'gap: 12px',
    'padding: 14px 16px',
    'border-radius: 16px',
    'background: rgba(6, 46, 34, 0.95)',
    'border: 1px solid rgba(52, 211, 153, 0.5)',
    'box-shadow: 0 10px 30px rgba(0,0,0,0.45)',
    'color: #ecfdf5',
    'font-family: "Segoe UI", Tahoma, sans-serif',
    'direction: rtl',
    'backdrop-filter: blur(6px)',
  ].join(';')

  banner.innerHTML = `
    <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
      <span style="font-size:16px; font-weight:700;">ثبّت التطبيق على جهازك 📲</span>
      <span style="font-size:13px; color:#a7f3d0;">وصول أسرع وأذكارك دائماً بين يديك</span>
    </div>
    <button id="pwa-install-btn" style="cursor:pointer; border:none; border-radius:12px; padding:10px 16px;
      background: linear-gradient(135deg, #10b981, #059669); color:#ffffff; font-size:15px; font-weight:700;
      font-family: inherit;">تثبيت</button>
    <button id="pwa-install-dismiss" aria-label="إغلاق" style="cursor:pointer; border:none; background:transparent;
      color:#94a3b8; font-size:20px; line-height:1; padding:6px;">✕</button>
  `
  document.body.appendChild(banner)

  const close = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    banner.remove()
  }

  banner.querySelector('#pwa-install-btn')?.addEventListener('click', async () => {
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      /* تجاهل أي رفض من المتصفح */
    }
    close()
  })

  banner.querySelector('#pwa-install-dismiss')?.addEventListener('click', close)
}

// التقاط حدث التثبيت وعرض النافذة عند الزيارة الأولى (وليس في وضع standalone)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  const evt = e as BeforeInstallPromptEvent
  if (!isStandalone() && !localStorage.getItem(DISMISS_KEY)) {
    // تأخير بسيط حتى تستقر واجهة اللعبة أولاً
    setTimeout(() => showInstallBanner(evt), 1500)
  }
})
