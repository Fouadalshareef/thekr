/**
 * SettingsPanel — نافذة «الإعدادات» الفاتحة (HTML/DOM بدل لوحة Phaser).
 *
 * تُفتح بالحدث 'open-settings'. تحتوي على إحصائيات اليوم، منزلق السرعة،
 * مفاتيح الصوت والاهتزاز، وأزرار تحديث التطبيق وتنزيله.
 *
 * لا يوجد مفتاح لإظهار/إخفاء المصحف أو الشريط الجانبي — كلاهما ظاهر دائماً
 * بقرار تصميمي: الشريط الجانبي элемصر الأول في التنقّل بين النوافذ، وإخفاؤه
 * كان يمنع الوصول إلى نفسه. وجود المفتاح يربك المستخدم بلا فائدة.
 *
 * كل تغيير يُطلق 'settings-changed' ليستجيب MainScene فوراً.
 */
import {
  getSpeed,
  getTodayStats,
  isSoundEnabled,
  isVibrationEnabled,
  setSoundEnabled,
  setSpeed,
  setVibrationEnabled,
} from '../services/SettingsService'
import { getTotalGoodDeeds } from '../services/GardenService'
import { forceAppUpdate, UPDATE_STATUS } from '../services/AppUpdateActions'
import { SEQUENCE_DHIKRS } from '../services/gameMode'

/** خيارات السرعة المتاحة (مضاعف سرعة تصاعد الفقاعات). */
const SPEED_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: 'هادئ' },
  { value: 1, label: 'عادي' },
  { value: 1.5, label: 'سريع' },
  { value: 2, label: 'سريع جداً' },
]

/** قيم السرعة الصالحة (لمطابقة القيمة المخزّنة عند الإقلاع). */
const SPEED_VALUES = SPEED_OPTIONS.map((o) => o.value)

/** حدث beforeinstallprompt (غير قياسي، لذا نعرّفه محلياً). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let root: HTMLElement | null = null
let statusEl: HTMLElement | null = null
let installRow: HTMLElement | null = null
let installBtn: HTMLButtonElement | null = null
let todayHost: HTMLElement | null = null
let open = false

/** حدث beforeinstallprompt محفوظ حتى نستطيع عرض الزر لاحقاً. */
let deferredPrompt: BeforeInstallPromptEvent | null = null

/** هل التطبيق مثبَّت ويعمل بوضع standalone؟ */
function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** كتابة رسالة حالة أسفل صف الإجراء. */
function setStatus(message: string, tone: 'ok' | 'error' = 'ok'): void {
  if (!statusEl) return
  statusEl.textContent = message
  statusEl.dataset.tone = tone
}

/** المزامنة مع MainScene: تغيير أي إعداد يُخزَّن ثم يُبثّ الحدث. */
function notifyChanged(): void {
  window.dispatchEvent(new CustomEvent('settings-changed'))
}

/** اسم الذكر لعرضه في إحصائيات اليوم (تطابق معرّفات SettingsService). */
function dhikrName(id: string): string {
  return SEQUENCE_DHIKRS.find((d) => d.id === id)?.name ?? id
}

/** رسم بطاقات إحصائيات اليوم (إجمالي اليوم + الإجمالي الكلي + التفصيل). */
function renderTodayStats(): void {
  if (!todayHost) return
  const entries = Object.entries(getTodayStats()).filter(([, n]) => n > 0)
  const todayTotal = entries.reduce((sum, [, n]) => sum + n, 0)

  const cards = `
    <div class="crisp-stats">
      <div class="crisp-stat"><b>${todayTotal}</b><span>ذكر اليوم</span></div>
      <div class="crisp-stat"><b>${getTotalGoodDeeds()}</b><span>الإجمالي الكلي</span></div>
    </div>`

  const detail = entries.length
    ? `<div class="crisp-card">
         <h3>تفصيل أذكار اليوم</h3>
         <div class="crisp-stat-list">${entries
           .map(
             ([id, n]) =>
               `<div class="crisp-stat-line"><span>${dhikrName(id)}</span><b>${n}</b></div>`,
           )
           .join('')}</div>
       </div>`
    : `<div class="crisp-card">
         <h3>تفصيل أذكار اليوم</h3>
         <p class="crisp-empty">لم تبدأ أذكار اليوم بعد — اضغط الفقاعات لتبدأ.</p>
       </div>`

  todayHost.innerHTML = cards + detail
}

/** مزامنة مفتاح التبديل مع القيمة المخزّنة. */
function syncToggle(id: string, value: boolean): void {
  root?.querySelector(id)?.setAttribute('aria-checked', String(value))
}

/** مزامنة كل عناصر التحكم مع القيم المخزّنة (تُستدعى عند كل فتح). */
function syncAll(): void {
  const speed = getSpeed()
  const normalizedSpeed = SPEED_VALUES.includes(speed) ? speed : 1
  const slider = root?.querySelector<HTMLInputElement>('#settings-speed')
  const speedValue = root?.querySelector<HTMLOutputElement>('#settings-speed-value')
  if (slider) {
    slider.value = String(normalizedSpeed)
    slider.style.setProperty('--speed-progress', `${((normalizedSpeed - 0.5) / 1.5) * 100}%`)
  }
  if (speedValue) speedValue.textContent = SPEED_OPTIONS.find((option) => option.value === normalizedSpeed)?.label ?? 'عادي'

  syncToggle('#settings-sound', isSoundEnabled())
  syncToggle('#settings-vibrate', isVibrationEnabled())

  if (installRow) installRow.style.display = isInstalled() ? 'none' : 'flex'
  if (installBtn) installBtn.disabled = !deferredPrompt
  const hint = root?.querySelector('#settings-install-hint')
  if (hint) {
    hint.textContent = isInstalled()
      ? 'التطبيق مثبَّت بالفعل ويعمل دون اتصال'
      : deferredPrompt
        ? 'نزّل التطبيق ليعمل من شاشتك الرئيسية'
        : 'التنزيل المباشر غير متاح في هذا المتصفح'
  }

  renderTodayStats()
}

/** ربط مفتاح تبديل بمخزّن الإعدادات (كتابة + بثّ الحدث). */
function bindToggle(id: string, write: (v: boolean) => void): void {
  const btn = root?.querySelector<HTMLButtonElement>(id)
  btn?.addEventListener('click', () => {
    const next = btn.getAttribute('aria-checked') !== 'true'
    write(next)
    btn.setAttribute('aria-checked', String(next))
    notifyChanged()
  })
}

/** فتح النافذة مع مزامنة كل العناصر من الحالة المخزّنة. */
export function showSettingsPanel(): void {
  if (!root) return
  syncAll()
  setStatus('')
  root.classList.remove('hidden')
  open = true
  document.body.classList.add('modal-open')
  // يوقف MainScene الفيزياء ويخفي واجهة اللعب أثناء فتح النافذة.
  window.dispatchEvent(new CustomEvent('reader-opened'))
  root.querySelector('.crisp-scroll')?.scrollTo({ top: 0 })
}

/** إغلاق النافذة. */
export function hideSettingsPanel(): void {
  if (!root || !open) return
  root.classList.add('hidden')
  open = false
  document.body.classList.remove('modal-open')
  window.dispatchEvent(new CustomEvent('reader-closed'))
}

/** هل نافذة الإعدادات مفتوحة؟ (يستخدمها MainScene لمزامنة الشريط الجانبي) */
export function isSettingsPanelOpen(): boolean {
  return open
}


/**
 * بناء النافذة مرة واحدة وربط كل الأحداث.
 * الترتيب: نبني الـ HTML، ثم نلتقط المراجع، ثم نربط الأحداث.
 */
export function initSettingsPanel(): void {
  if (document.getElementById('settings-panel')) return

  root = document.createElement('section')
  root.id = 'settings-panel'
  root.className = 'crisp-modal hidden'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'الإعدادات')
  root.innerHTML = `
    <div class="crisp-content">
      <header class="crisp-header">
        <div>
          <p class="crisp-eyebrow">⚙️ تخصيصك</p>
          <h2>الإعدادات</h2>
          <p>تحكم بسرعة الذكر والصوت وتابع إنجازك اليومي</p>
        </div>
        <button class="crisp-close" type="button" aria-label="إغلاق">×</button>
      </header>

      <div class="crisp-scroll">

        <div id="settings-today"></div>

        <div class="crisp-row crisp-speed-row">
          <div class="crisp-row-text">
            <strong>سرعة الأذكار</strong>
            <output id="settings-speed-value" for="settings-speed">عادي</output>
          </div>
          <div class="crisp-speed-control">
            <input id="settings-speed" class="crisp-range" type="range" min="0.5" max="2" step="0.5" value="1" aria-label="سرعة الأذكار" />
            <div class="crisp-speed-labels" aria-hidden="true"><span>هادئ</span><span>عادي</span><span>سريع</span><span>سريع جداً</span></div>
          </div>
        </div>

        <div class="crisp-row">
          <div class="crisp-row-text">
            <strong>الأصوات</strong>
            <small>نغمة عند جمع كل ذكر</small>
          </div>
          <button id="settings-sound" class="crisp-toggle" type="button"
                  role="switch" aria-checked="false" aria-label="تشغيل الأصوات"></button>
        </div>

        <div class="crisp-row">
          <div class="crisp-row-text">
            <strong>الاهتزاز</strong>
            <small>اهتزاز خفيف عند جمع الذكر (يعتمد على دعم الجهاز)</small>
          </div>
          <button id="settings-vibrate" class="crisp-toggle" type="button"
                  role="switch" aria-checked="false" aria-label="تشغيل الاهتزاز"></button>
        </div>

        <div class="crisp-actions">
          <button id="settings-update" class="crisp-action crisp-action-update" type="button">
            <span class="crisp-action-icon" aria-hidden="true">↻</span><span>تحديث التطبيق</span>
          </button>

          <div id="settings-install-row" class="crisp-install-action" style="display:none">
            <div class="crisp-row-text">
              <strong>تنزيل التطبيق</strong>
              <small id="settings-install-hint">نزّل التطبيق ليعمل من شاشتك الرئيسية</small>
            </div>
            <button id="settings-install" class="crisp-action crisp-action-install" type="button">
              <span class="crisp-action-icon" aria-hidden="true">↓</span><span>تنزيل</span>
            </button>
          </div>
        </div>

        <p id="settings-status" class="crisp-status" role="status" aria-live="polite"></p>
      </div>
    </div>
  `
  const panel = root // نسخة محلية: تُبقي TS narrow حتى داخل الـ closures
  document.body.appendChild(panel)

  statusEl = panel.querySelector('#settings-status')
  installRow = panel.querySelector('#settings-install-row')
  installBtn = panel.querySelector('#settings-install')
  todayHost = panel.querySelector('#settings-today')

  panel.querySelector('.crisp-close')?.addEventListener('click', hideSettingsPanel)
  panel.addEventListener('click', (e) => {
    if (e.target === panel) hideSettingsPanel()
  })

  root.querySelector('#settings-speed')?.addEventListener('input', (e) => {
    const slider = e.target as HTMLInputElement
    const v = Number(slider.value)
    if (!Number.isFinite(v)) return
    setSpeed(v)
    slider.style.setProperty('--speed-progress', `${((v - 0.5) / 1.5) * 100}%`)
    const speedValue = root?.querySelector<HTMLOutputElement>('#settings-speed-value')
    if (speedValue) speedValue.textContent = SPEED_OPTIONS.find((option) => option.value === v)?.label ?? 'عادي'
  })

  bindToggle('#settings-sound', setSoundEnabled)
  bindToggle('#settings-vibrate', setVibrationEnabled)

  // زر التحديث: forceAppUpdate يبثّ الرسائل عبر onStatus ثم يُعيد التحميل.
  // ملاحظة: لا يوجد "لا يوجد تحديث" — الإجراء يطبّق التحديث ويحمّل دائماً.
  root.querySelector('#settings-update')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement
    btn.disabled = true
    setStatus(UPDATE_STATUS.working)
    void forceAppUpdate((message) => setStatus(message))
  })

  // زر التثبيت: يستدعي beforeinstallprompt المخزَّن.
  installBtn?.addEventListener('click', () => {
    const prompt = deferredPrompt
    if (!prompt) return
    setStatus('جارٍ فتح مثبّت التطبيق…')
    void prompt.prompt().then(() =>
      prompt.userChoice.then((choice) => {
        setStatus(
          choice.outcome === 'accepted'
            ? '✅ تم تثبيت التطبيق على جهازك'
            : 'تم إلغاء التثبيت',
        )
        deferredPrompt = null
        if (installRow) installRow.style.display = 'none'
      }),
    )
  })

  // المتصفح يطلق هذا الحدث مرة واحدة عند توفّر التثبيت؛ نحفظه لعرض الزر لاحقاً.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    if (installRow) installRow.style.display = 'flex'
    if (installBtn) installBtn.disabled = false
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    if (installRow) installRow.style.display = 'none'
    setStatus('✅ التطبيق مثبَّت ويعمل الآن دون إنترنت')
  })

  // يفتحها MainScene بعد التحقق من أن المشهد الرئيسي نشط.
}
