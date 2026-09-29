/**
 * TopHeader — الشريط العلوي بتصميم Royal Kingdom فوق قماش اللعبة (DOM).
 *
 * التصميم: شريط عميق (كرمزي/نبيذي #7A1A2C) بحواف مستديرة + بريق 3D.
 *   - يسار:  أيقونة أفاتار + اسم المستخدم داخل حلقة ذهبية.
 *   - وسط:  عدّاد الأذكار الإجمالي داخل حبّة بيضاء مع أيقونة ذهبية.
 *   - يمين: زر إيقاف/استئناف مطرّز.
 *
 * سلوك الرؤية:
 *   - مخفيٌّ تلقائياً عند الإقلاع (شاشة الترحيب).
 *   - يظهر فقط حين تستدعي MainScene setTopHeaderVisible(true).
 *   - يختفي عند فتح أي نافذة فاتحة (المزرعة، الإعدادات، القرآن …).
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
const PLAY_ICON  = 'game/icons/play-gbtn.svg'

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

/** إخفاء الشريط (شاشة الترحيب / نوافذ فاتحة) أو إظهاره. */
export function setTopHeaderVisible(visible: boolean): void {
  if (rootEl) rootEl.style.display = visible ? 'flex' : 'none'
}

/** بناء الشريط مرة واحدة. */
export function initTopHeader(): void {
  if (document.getElementById('top-header')) return

  rootEl = document.createElement('header')
  rootEl.id = 'top-header'
  rootEl.className = 'rk-header'
  rootEl.setAttribute('aria-label', 'الشريط العلوي')
  // مخفي حتى تُفعّله MainScene
  rootEl.style.display = 'none'

  rootEl.innerHTML = `
    <!-- يسار: أفاتار + اسم -->
    <div class="rk-header-profile">
      <div class="rk-avatar" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="url(#av-bg)"/>
          <circle cx="20" cy="15" r="7" fill="#fff" opacity="0.9"/>
          <ellipse cx="20" cy="34" rx="11" ry="8" fill="#fff" opacity="0.7"/>
          <defs>
            <radialGradient id="av-bg" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#b45309"/>
            </radialGradient>
          </defs>
        </svg>
      </div>
      <span id="top-header-name" class="rk-header-name"></span>
    </div>

    <!-- وسط: عدّاد الأذكار -->
    <div class="rk-header-count-wrap">
      <span class="rk-coin-icon" aria-hidden="true">✨</span>
      <span id="top-header-total" class="rk-header-count">0</span>
    </div>

    <!-- يمين: زر الإيقاف -->
    <button id="top-header-pause" class="rk-pause-btn" type="button"
            aria-label="إيقاف مؤقت" aria-pressed="false">
      <img src="${PAUSE_ICON}" alt="" aria-hidden="true" />
    </button>
  `

  document.body.appendChild(rootEl)

  nameEl   = rootEl.querySelector('#top-header-name')
  countEl  = rootEl.querySelector('#top-header-total')
  pauseBtn = rootEl.querySelector('#top-header-pause')

  // ضغط الزر: نخبر المشهد ليتولى الإيقاف الفعلي.
  pauseBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('header-pause-toggle'))
  })

  refreshTopHeader()

  // تحديث الاسم فوراً عند تغييره من نافذة الإعدادات.
  window.addEventListener('username-changed', renderName)
  window.addEventListener('dhikr-counted', renderCount)
}
