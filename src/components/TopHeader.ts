/**
 * TopHeader — الشريط العلوي الحديث فوق قماش اللعبة (DOM ثلاثي المناطق).
 *
 * الترتيب من اليسار إلى اليمين (فيزيائي، لأن الحاوية بـ direction: ltr):
 *   - الاسم: اسم المستخدم المحفوظ في SettingsService.
 *   - الوسط: إجمالي الأذكار التراكمي (يشمل الاستغفار) عبر GardenService.
 *   - اليمين: زر إيقاف/استئناف يُبلّغ MainScene عبر حدث 'header-pause-toggle'.
 *
 * ملاحظات:
 *  - الحاوية pointer-events:none حتى لا تحجب لمس الفقاعات؛ الأجزاء التفاعلية فقط
 *    تأخذ pointer-events:auto.
 *  - المشهد هو مصدر الحقيقة لحالة الإيقاف: MainScene يستدعي setTopHeaderPaused
 *    بعد كل تبديل، ويحوّل ضغط الزر إلى نداء togglePause عبر الحدث.
 */
import { getUsername } from '../services/SettingsService'
import { getTotalGoodDeeds } from '../services/GardenService'

/** مراجع عناصر الشريط (بعد initTopHeader). */
let rootEl: HTMLElement | null = null
let nameEl: HTMLElement | null = null
let countEl: HTMLElement | null = null
let pauseBtn: HTMLButtonElement | null = null

/** هل اللعبة متوقفة حالياً (مرآة لحالة MainScene)؟ */
let paused = false

/** أسماء ملفات أيقونات الإيقاف/التشغيل (SVG في public/game/icons). */
const PAUSE_ICON = 'game/icons/pause-gbtn.svg'
const PLAY_ICON = 'game/icons/play-gbtn.svg'

/** تحديث اسم المستخدم المعروض. */
function renderName(): void {
  if (!nameEl) return
  nameEl.textContent = getUsername()
}

/** تحديث العدّاد الإجمالي. */
function renderCount(): void {
  if (!countEl) return
  countEl.textContent = String(getTotalGoodDeeds())
}

/** مزامنة أيقونة الزر مع حالة الإيقاف الحالية. */
function renderPauseIcon(): void {
  if (!pauseBtn) return
  const icon = pauseBtn.querySelector('img')
  const src = paused ? PLAY_ICON : PAUSE_ICON
  if (icon && icon.getAttribute('src') !== src) icon.setAttribute('src', src)
  pauseBtn.setAttribute('aria-label', paused ? 'استئناف' : 'إيقاف مؤقت')
  pauseBtn.setAttribute('aria-pressed', String(paused))
  pauseBtn.title = paused ? 'استئناف' : 'إيقاف مؤقت'
}

/**
 * إعادة رسم كل ما يتغيّر من خارج المكوّن (الاسم، الإجمالي، حالة الإيقاف).
 * تُستدعى عند فتح أي نافذة أو بعد كل ذكر جديد.
 */
export function refreshTopHeader(): void {
  renderName()
  renderCount()
  renderPauseIcon()
}

/**
 * ضبط حالة الإيقاف المعروضة في الشريط.
 * المصدر هو MainScene (حالة الفيزياء الحقيقية) — لا نبدّل الحالة هنا.
 */
export function setTopHeaderPaused(next: boolean): void {
  paused = next
  renderPauseIcon()
}

/** إخفاء الشريط (شاشة الترحيب) أو إظهاره. */
export function setTopHeaderVisible(visible: boolean): void {
  if (rootEl) rootEl.style.display = visible ? 'flex' : 'none'
}

/** بناء الشريط مرة واحدة. */
export function initTopHeader(): void {
  if (document.getElementById('top-header')) return

  rootEl = document.createElement('header')
  rootEl.id = 'top-header'
  rootEl.className = 'top-header'
  rootEl.setAttribute('aria-label', 'الشريط العلوي')
  rootEl.innerHTML = `
    <div class="top-header-name"><span id="top-header-name"></span></div>
    <div class="top-header-count">
      <b id="top-header-total">0</b>
      <small>ذكر</small>
    </div>
    <button id="top-header-pause" class="top-header-pause" type="button" aria-label="إيقاف مؤقت" aria-pressed="false">
      <img src="${PAUSE_ICON}" alt="" aria-hidden="true" />
    </button>
  `
  document.body.appendChild(rootEl)

  nameEl = rootEl.querySelector('#top-header-name')
  countEl = rootEl.querySelector('#top-header-total')
  pauseBtn = rootEl.querySelector('#top-header-pause')

  // ضغط الزر: لا نبدّل الحالة هنا — نخبر المشهد ليتولى الإيقاف الفعلي.
  pauseBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('header-pause-toggle'))
  })

  refreshTopHeader()

  // تحديث الاسم فوراً عند تغييره من نافذة الإعدادات.
  window.addEventListener('username-changed', renderName)
  window.addEventListener('dhikr-counted', renderCount)
}

