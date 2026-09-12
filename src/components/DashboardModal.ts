/**
 * DashboardModal — لوحة التحكم والإحصائيات (طبقة HTML/Tailwind فوق محرك اللعبة):
 *  - شريط تحكم بسرعة التصاعد (بطيء/تأملي → سريع/تحفيزي) مع حظره أثناء نمط Zen.
 *  - إحصائيات اليوم لكل ذكر تفصيلياً (بما في ذلك الاستغفار).
 *  - السجل التراكمي: تاريخ البدء والإجمالي الكلي ومستوى الحديقة.
 *  - تعديل اسم المستخدم.
 * تُفتح عبر حدث مخصص: window.dispatchEvent(new CustomEvent('open-dashboard')).
 */
import {
  getSpeed,
  setSpeed,
  getUsername,
  setUsername,
  getStartDate,
  getTodayStats,
  isSoundEnabled,
  setSoundEnabled,
  isVibrationEnabled,
  setVibrationEnabled,
  isGameEnabled,
  setGameEnabled,
  isQuranEnabled,
  setQuranEnabled,
  areIconsEnabled,
  setIconsEnabled,
} from '../services/SettingsService'
import { getGardenState } from '../services/GardenService'
import { loadDhikrData } from '../services/DhikrStorage'
import { saveUserData } from '../services/UserDataBackup'
import {
  APP_VERSION,
  hasPendingUpdate,
  HAS_UPDATE_KEY,
  LAST_SEEN_VERSION_KEY,
} from '../services/AppVersion'

const DHIKR_LABELS: { id: string; label: string }[] = [
  { id: 'subhanallah', label: 'سُبْحَانَ الله' },
  { id: 'alhamdulillah', label: 'الْحَمْدُ لِلَّه' },
  { id: 'allahu-akbar', label: 'اللهُ أَكْبَر' },
  { id: 'la-ilaha-illa-allah', label: 'لَا إِلَٰهَ إِلَّا الله' },
  { id: 'la-hawla', label: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ' },
  { id: 'subhanallah-wa-bihamdih', label: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ' },
  { id: 'salawat', label: 'الصلاة الإبراهيمية' },
  { id: 'istighfar', label: 'أَسْتَغْفِرُ الله' },
]

let modal: HTMLElement | null = null
let zenMode = false

/** تحديد ما إذا كان نمط Zen نشطاً (لتعطيل شريط السرعة). */
export function setZenMode(active: boolean): void {
  zenMode = active
  const slider = modal?.querySelector<HTMLInputElement>('#dash-speed')
  if (slider) slider.disabled = active
  const note = modal?.querySelector<HTMLElement>('#dash-speed-note')
  if (note) note.classList.toggle('hidden', !active)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function renderContent(): string {
  const stats = getTodayStats()
  const garden = getGardenState()
  const data = loadDhikrData()
  const speed = getSpeed()

  const statRows = DHIKR_LABELS.map(
    ({ id, label }) => `
      <div class="juicy-card flex items-center justify-between px-4 py-3">
        <span class="text-xl text-slate-100">${label}</span>
        <span class="font-mono text-xl font-bold text-emerald-300">${stats[id] ?? 0}</span>
      </div>`,
  ).join('')

  const nextLine = garden.next
    ? `العنصر القادم: <b class="text-amber-300">${garden.next.name}</b> عند ${garden.next.threshold} ذكراً (${Math.round(garden.progress * 100)}%)`
    : 'اكتملت الحديقة بالكامل! 🌈'

  return `
    <!-- السرعة -->
    <section class="space-y-2">
      <h3 class="flex items-center gap-2 text-sm font-bold text-emerald-200">
        <img class="ui-vector-icon" src="game/icons/theme-v2.svg" alt=""> سرعة التصاعد
      </h3>
      <div class="flex items-center gap-3">
        <span class="text-xs text-slate-400">تأملي</span>
        <input id="dash-speed" type="range" min="0.5" max="2" step="0.1" value="${speed}"
          ${zenMode ? 'disabled' : ''}
          class="flex-1 accent-emerald-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" />
        <span class="text-xs text-slate-400">تحفيزي</span>
        <span id="dash-speed-val" class="font-mono text-xs text-emerald-300 w-10 text-center">${speed.toFixed(1)}×</span>
      </div>
      <p id="dash-speed-note" class="hidden text-xs text-amber-300">التعديل معطّل أثناء نمط الاستغفار الهادئ.</p>
    </section>

    <!-- الصوت والاهتزاز -->
    <section class="space-y-2">
      <h3 class="flex items-center gap-2 text-sm font-bold text-emerald-200">
        <img class="ui-vector-icon" src="game/icons/settings-v2.svg" alt=""> الصوت والاهتزاز
      </h3>
      <div class="space-y-2">
        <label class="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-3 cursor-pointer">
          <span class="text-xl text-slate-100">أصوات الفقاعات</span>
          <input id="dash-sound" type="checkbox" ${isSoundEnabled() ? 'checked' : ''} class="peer sr-only" />
          <span class="relative inline-flex w-12 h-7 shrink-0 items-center rounded-full bg-slate-600 transition-colors peer-checked:bg-emerald-500 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:-translate-x-5"></span>
        </label>
        <label class="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-3 cursor-pointer">
          <span class="text-xl text-slate-100">الاهتزاز عند النقر</span>
          <input id="dash-vibrate" type="checkbox" ${isVibrationEnabled() ? 'checked' : ''} class="peer sr-only" />
          <span class="relative inline-flex w-12 h-7 shrink-0 items-center rounded-full bg-slate-600 transition-colors peer-checked:bg-emerald-500 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:-translate-x-5"></span>
        </label>
      </div>
    </section>

    <!-- تشغيل/إيقاف اللعبة والمصحف والأيقونات -->
    <section class="space-y-2">
      <h3 class="flex items-center gap-2 text-sm font-bold text-emerald-200">
        <img class="ui-vector-icon" src="game/icons/settings-v2.svg" alt=""> تشغيل وإيقاف العناصر
      </h3>
      <div class="space-y-2">
        <label class="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-3 cursor-pointer">
          <span class="text-xl text-slate-100">اللعبة</span>
          <input id="dash-game" type="checkbox" ${isGameEnabled() ? 'checked' : ''} class="peer sr-only" />
          <span class="relative inline-flex w-12 h-7 shrink-0 items-center rounded-full bg-slate-600 transition-colors peer-checked:bg-emerald-500 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:-translate-x-5"></span>
        </label>
        <label class="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-3 cursor-pointer">
          <span class="text-xl text-slate-100">المصحف الشريف</span>
          <input id="dash-quran" type="checkbox" ${isQuranEnabled() ? 'checked' : ''} class="peer sr-only" />
          <span class="relative inline-flex w-12 h-7 shrink-0 items-center rounded-full bg-slate-600 transition-colors peer-checked:bg-emerald-500 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:-translate-x-5"></span>
        </label>
        <label class="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-3 cursor-pointer">
          <span class="text-xl text-slate-100">جميع الأيقونات</span>
          <input id="dash-icons" type="checkbox" ${areIconsEnabled() ? 'checked' : ''} class="peer sr-only" />
          <span class="relative inline-flex w-12 h-7 shrink-0 items-center rounded-full bg-slate-600 transition-colors peer-checked:bg-emerald-500 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:-translate-x-5"></span>
        </label>
      </div>
    </section>

    <!-- إحصائيات اليوم -->
    <section class="space-y-2">
      <h3 class="flex items-center gap-2 text-sm font-bold text-emerald-200">
        <img class="ui-vector-icon" src="game/icons/theme-v2.svg" alt=""> أذكار اليوم
      </h3>
      <div class="grid gap-1.5">${statRows}</div>
    </section>

    <!-- السجل التراكمي والحديقة -->
    <section class="space-y-2">
      <h3 class="flex items-center gap-2 text-sm font-bold text-emerald-200">
        <span>🌸</span> حديقة الحسنات والسجل
      </h3>
      <div class="rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-200 space-y-1">
        <div class="flex justify-between"><span>اسم المستخدم داخل اللعبة</span></div>
        <input id="dash-username" type="text" value="${getUsername()}" maxlength="24"
          class="w-full rounded-md bg-slate-900 border border-slate-600 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400 outline-none" />
        <div class="flex justify-between pt-1"><span>بداية الاستخدام</span><span class="text-slate-300">${formatDate(getStartDate())}</span></div>
        <div class="flex justify-between"><span>إجمالي الأذكار الكلي</span><span class="font-mono text-emerald-300">${data.totalCount}</span></div>
        <div class="flex justify-between"><span>مستوى الحديقة</span><span class="font-mono text-emerald-300">${garden.level} عناصر</span></div>
        <p class="text-xs text-slate-400 pt-1">${nextLine}</p>
      </div>
    </section>

    <!-- تحديث النسخة -->
    <section class="space-y-2">
      <h3 class="flex items-center gap-2 text-sm font-bold text-emerald-200">
        🔄 إصدار التطبيق
      </h3>
      <div class="rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-200 space-y-2">
        <div class="flex justify-between items-center">
          <span>الإصدار الحالي</span>
          <span class="font-mono text-xs text-slate-400">v${APP_VERSION}</span>
        </div>
        ${
          hasPendingUpdate()
            ? `<div class="flex items-center gap-2 rounded-lg border border-red-400/50 bg-red-500/15 px-3 py-2 animate-pulse">
                 <span class="relative inline-flex w-3 h-3">
                   <span class="absolute inline-flex w-full h-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                   <span class="relative inline-flex w-3 h-3 rounded-full bg-red-500"></span>
                 </span>
                 <span class="text-xs font-bold text-red-300">تحديث جديد متوفر 🚀</span>
               </div>`
            : ''
        }
        <button id="dash-force-update" type="button"
          class="w-full flex items-center justify-center gap-2 rounded-lg ${hasPendingUpdate() ? 'bg-gradient-to-l from-emerald-500 to-teal-400 shadow-[0_0_18px_rgba(16,185,129,0.65)] animate-pulse hover:from-emerald-400 hover:to-teal-300' : 'bg-emerald-700/80 hover:bg-emerald-600'} active:scale-95 transition-all px-3 py-2 text-sm font-bold text-white cursor-pointer">
          ${hasPendingUpdate() ? '🚀 تحديث النسخة الآن' : '🔄 تحديث النسخة الآن'}
        </button>
        <p id="dash-update-status" class="hidden text-xs text-center text-amber-300">جارٍ حفظ بياناتك ومسح الكاش وإعادة التشغيل...</p>
        <p id="dash-update-available" class="hidden text-xs text-center text-emerald-300 font-bold">✅ تحديث جاهز! اضغط الزر للتطبيق.</p>
      </div>
    </section>
  `
}

function refresh(): void {
  if (!modal) return
  const body = modal.querySelector<HTMLElement>('#dash-body')
  if (body) body.innerHTML = renderContent()
  bindEvents()
}

function bindEvents(): void {
  const slider = modal?.querySelector<HTMLInputElement>('#dash-speed')
  slider?.addEventListener('input', () => {
    const v = Number(slider.value)
    setSpeed(v)
    modal?.querySelector<HTMLElement>('#dash-speed-val')?.replaceChildren(`${v.toFixed(1)}×`)
  })

  const nameInput = modal?.querySelector<HTMLInputElement>('#dash-username')
  nameInput?.addEventListener('change', () => {
    setUsername(nameInput.value)
  })

  // مفاتيح الصوت والاهتزاز (تُحفظ في localStorage: sound_enabled / vibrate_enabled)
  modal?.querySelector<HTMLInputElement>('#dash-sound')?.addEventListener('change', (e) => {
    setSoundEnabled((e.target as HTMLInputElement).checked)
  })
  modal?.querySelector<HTMLInputElement>('#dash-vibrate')?.addEventListener('change', (e) => {
    setVibrationEnabled((e.target as HTMLInputElement).checked)
  })

  // مفاتيح تشغيل/إيقاف اللعبة والمصحف والأيقونات (تُطبق فوراً عبر حدث settings-changed)
  modal?.querySelector<HTMLInputElement>('#dash-game')?.addEventListener('change', (e) => {
    setGameEnabled((e.target as HTMLInputElement).checked)
    window.dispatchEvent(new CustomEvent('settings-changed'))
  })
  modal?.querySelector<HTMLInputElement>('#dash-quran')?.addEventListener('change', (e) => {
    setQuranEnabled((e.target as HTMLInputElement).checked)
    window.dispatchEvent(new CustomEvent('settings-changed'))
  })
  modal?.querySelector<HTMLInputElement>('#dash-icons')?.addEventListener('change', (e) => {
    setIconsEnabled((e.target as HTMLInputElement).checked)
    window.dispatchEvent(new CustomEvent('settings-changed'))
  })

  modal?.querySelector<HTMLButtonElement>('#dash-close')?.addEventListener('click', hide)
  modal?.querySelector<HTMLElement>('#dash-backdrop')?.addEventListener('click', hide)

  // زر التحديث القسري: حفظ بيانات المستخدم + مسح الكاش + إجبار SW على الإستبدال + إعادة التحميل
  modal?.querySelector<HTMLButtonElement>('#dash-force-update')?.addEventListener('click', async () => {
    const statusEl = modal?.querySelector<HTMLElement>('#dash-update-status')
    if (statusEl) statusEl.classList.remove('hidden')

    try {
      // 0) حفظ كل بيانات المستخدم قبل أي شيء: العدادات الكلية، حديقة الحسنات، اسم المستخدم
      saveUserData()

      // 1) مسح جميع الكاشات
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))

      // 2) إرسال SKIP_WAITING للـ Service Worker إن وجد
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      } else if (reg?.installing) {
        reg.installing.postMessage({ type: 'SKIP_WAITING' })
      }

      // 3) تسجيل الإصدار الجديد (كي لا تظهر شارة التحديث أو نافذة "ما الجديد" مجدداً)
      localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION)
      localStorage.removeItem(HAS_UPDATE_KEY)
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {})
      }

      // 4) إعادة تحميل قسرية بعد 600ms للتأكد من معالجة الرسائل
      setTimeout(() => window.location.reload(), 600)
    } catch {
      // في أسوأ الأحوال أعد التحميل مباشرة
      window.location.reload()
    }
  })
}

/** إنشاء اللوحة وتهيئة مستمع حدث الفتح (تُستدعى مرة عند الإقلاع). */
export function initDashboard(): void {
  modal = document.createElement('div')
  modal.id = 'dashboard-modal'
  modal.className = 'fixed inset-0 z-[60] hidden items-start justify-center p-4'
  modal.innerHTML = `
    <div id="dash-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div id="dash-scroll" class="juicy-panel relative w-[90%] max-w-[420px] max-h-[85vh] overflow-y-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-xl font-bold text-emerald-100">
          <span class="text-lg">⚙️</span>
          لوحة التحكم
        </h2>
        <button id="dash-close" type="button" class="modal-close-button" aria-label="إغلاق"><img src="game/icons/close.svg" alt=""></button>
      </div>
      <div id="dash-body" class="space-y-5"></div>
    </div>
  `
  document.body.appendChild(modal)
  refresh()

  window.addEventListener('open-dashboard', () => show())

  // إظهار رسالة "تحديث جاهز" تلقائياً عند كشف نسخة SW جديدة
  window.addEventListener('sw-update-ready', () => {
    const note = modal?.querySelector<HTMLElement>('#dash-update-available')
    if (note) note.classList.remove('hidden')
  })
}

/** فتح اللوحة (مع تحديث المحتوى). */
export function showDashboard(): void {
  show()
}

function show(): void {
  if (!modal) return
  refresh()
  setZenMode(zenMode)
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  // تفعيل touch-action: pan-y على body مؤقتاً لتمكين التمرير على الجوال
  document.body.classList.add('modal-open')
  window.dispatchEvent(new CustomEvent('reader-opened'))

  // ضبط التمرير ليعود دائماً إلى أعلى النافذة عند الفتح،
  // فيظهر العنوان "لوحة التحكم" وشريط السرعة مباشرة دون أي اقتصاص علوي.
  const scroller = modal.querySelector<HTMLElement>('#dash-scroll')
  if (scroller) scroller.scrollTop = 0
}

function hide(): void {
  if (!modal) return
  modal.classList.add('hidden')
  modal.classList.remove('flex')
  // استعادة الوضع الطبيعي بعد إغلاق المودال
  document.body.classList.remove('modal-open')
  window.dispatchEvent(new CustomEvent('reader-closed'))
}