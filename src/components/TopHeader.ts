/**
 * TopHeader — الشريط العلوي فوق قماش اللعبة (DOM) بتصميم اللوحة الخشبية.
 *
 * الأصل: `src/assets/rk-banner.png` (2172×724) لوحة خشبية بثلاث فتحات:
 *   - يسار (10.27% عرض، 30.66% ارتفاع): دائرة صغيرة ⇒ اسم المستخدم + المستوى.
 *   - وسط (41.76% عرض، 27.21% ارتفاع): الحبة البيضاء يمين النجمة ⇒ الإجمالي.
 *   - يمين (18.55% عرض، 56.08% ارتفاع): دائرة كبيرة ⇒ زر الإيقاف/الاستئناف.
 * كل عنصر يُموضَع بنسبة مئوية من أبعاد اللوحة، فيبقى مضبوطاً على أي مقاس.
 * عند استبدال الصورة: `node scripts/measure-banner.mjs src/assets/rk-banner.png`
 * ثم تُحدَّث النسب هنا وفي .rk-slot-* في style.css من مخرجات القياس.
 *
 * سلوك الرؤية (قاعدة مركزية واحدة مع الشريط الجانبي — components/Sidebar):
 *   يظهر الشريط أثناء اللعب الفعلي في MainScene فقط، ويختفي تلقائياً عند
 *   شاشة الترحيب أو نمط الاستغفار أو فتح أي نافذة (المصحف/النصائح/المزرعة…).
 */
import { getUsername } from '../services/SettingsService'
import { getTotalGoodDeeds, getGardenState } from '../services/GardenService'
import { onGameUiVisibilityChange } from './Sidebar'
// استيراد عبر Vite (وليس مساراً ثابتاً في public/):
// Vite يُصدر الصورة باسم مجزّأ ببصمة المحتوى (rk-banner-<hash>.png)،
// فأي استبدال للصورة ينتج عنواناً جديداً تماماً ولا يصيبه كاش قديم
// من Service Worker ولا من HTTP cache — وهو ما كان يُبقي الشريط القديم ظاهراً.
import BANNER_URL from '../assets/rk-banner.png'

/** مراجع عناصر الشريط (بعد initTopHeader). */
let rootEl: HTMLElement | null = null
let nameEl: HTMLElement | null = null
let levelEl: HTMLElement | null = null
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

/** تحديث المستوى (عدد عناصر الحديقة المفتوحة) — يسار اللوحة. */
function renderLevel(): void {
  if (!levelEl) return
  levelEl.textContent = String(getGardenState().level)
}

/** تحديث العدّاد الإجمالي — وسط اللوحة. */
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
 * إعادة رسم كل ما يتغيّر من خارج المكوّن (الاسم، المستوى، الإجمالي، الإيقاف).
 * تُستدعى عند فتح أي نافذة أو بعد كل ذكر جديد.
 */
export function refreshTopHeader(): void {
  renderName()
  renderLevel()
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

/**
 * طلب إظهار/إخفاء الشريط.
 * لا ننفّذ القرار مباشرة: النتيجة = (طلب ظاهر) ∧ (اللعبة في وضع اللعب الفعلي).
 * 중앙 هو مصدر الحقيقة الوحيد، فلا يمكن أن يختفي الشريط خلف نافذة مفتوحة.
 */
let headerRequested = false

export function setTopHeaderVisible(visible: boolean): void {
  headerRequested = visible
  applyVisibility()
}

/** تطبيق القاعدة المركزية على عنصر DOM فعلياً. */
function applyVisibility(): void {
  if (!rootEl) return
  const show = headerRequested && isGameplayUiVisible
  rootEl.style.display = show ? 'block' : 'none'
}

/** مرآة لحالة الشريط الجانبي (المركز في الرؤية). */
let isGameplayUiVisible = false

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
    <!-- يسار: اسم المستخدم + المستوى (الدائرة الصغيرة) -->
    <div class="rk-slot rk-slot-left">
      <span class="rk-level-line">
        <span class="rk-slot-label">المستوى</span>
        <span id="top-header-level" class="rk-level">1</span>
      </span>
      <span id="top-header-name" class="rk-header-name"></span>
    </div>

    <!-- وسط: إجمالي الأذكار (الحبة البيضاء يمين النجمة) -->
    <div class="rk-slot rk-slot-center">
      <span class="rk-slot-label">إجمالي الأذكار</span>
      <span id="top-header-total" class="rk-header-count">0</span>
    </div>

    <!-- يمين: زر الإيقاف/الاستئناف (الدائرة الكبيرة) -->
    <button id="top-header-pause" class="rk-slot rk-slot-right rk-pause-btn" type="button"
            aria-label="إيقاف مؤقت" aria-pressed="false">
      <img src="${PAUSE_ICON}" alt="" aria-hidden="true" />
    </button>
  `
  // الصورة تُمرَّر عبر --rk-banner. العنوان هنا ناتج عن استيراد Vite فيصير
  // مساراً مطلقاً بالاسم المجزّأ، فيعمل مع base:'./' على GitHub Pages
  // وأي مسار نشر، وبلا تحذير حل المسار في CSS.
  rootEl.style.setProperty('--rk-banner', `url("${new URL(BANNER_URL, document.baseURI).href}")`)

  document.body.appendChild(rootEl)

  nameEl   = rootEl.querySelector('#top-header-name')
  levelEl  = rootEl.querySelector('#top-header-level')
  countEl  = rootEl.querySelector('#top-header-total')
  pauseBtn = rootEl.querySelector('#top-header-pause')

  // ضغط الزر: نخبر المشهد ليتولى الإيقاف الفعلي.
  pauseBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('header-pause-toggle'))
  })

  // قاعدة الرؤية المركزية: نتبع حالة الشريط الجانبي (لعب فعلي فقط).
  onGameUiVisibilityChange((visible) => {
    isGameplayUiVisible = visible
    applyVisibility()
  })

  refreshTopHeader()

  // تحديث الاسم فوراً عند تغييره من نافذة الإعدادات، والإجمالي بعد كل ذكر.
  window.addEventListener('username-changed', renderName)
  window.addEventListener('settings-changed', refreshTopHeader)
  window.addEventListener('dhikr-counted', renderCount)
}
