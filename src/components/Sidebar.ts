/**
 * Sidebar — شريط الأيقونات الجانبي (DOM فوق قماش اللعبة) مع سهم فتح/طي القائمة.
 *
 * إصلاح العلّة: كان السهم ظاهراً في كل الحالات (بما فيها شاشة الترحيب والنوافذ
 * المفتوحة: المزرعة، الإعدادات، المصحف، الأنماط، النصائح، التخصيص، الاحتفالات).
 * الآن تُدار رؤية الشريط من حالة مركزية واحدة:
 *   visible = !welcomeActive
 * الأيقونات تبقى ثابتة أثناء اللعب، بما في ذلك عند فتح نافذة فوق القماش.
 *
 * واجهة الاستخدام من المشاهد (Phaser):
 *   setSidebarWelcomeActive(false)        → عند بدء MainScene
 *   setSidebarModalOpen('farm', true)     → عند فتح نافذة المزرعة/الإعدادات
 */
let sidebarRoot: HTMLElement | null = null

/** هل ما زالت شاشة الترحيب (أو نمط الاستغفار) معروضة؟ تبدأ true عند الإقلاع. */
let welcomeActive = true
/** معرّفات النوافذ المفتوحة حالياً (Set لمنع تداخل الفتح/الإغلاق). */
const openModals = new Set<string>()

/** إخفاء/إظهار الشريط مع شاشة الترحيب (تُستدعى من BootScene/MainScene/ZenScene). */
export function setSidebarWelcomeActive(active: boolean): void {
  welcomeActive = active
  syncVisibility()
}

/** تسجيل فتح/إغلاق نافذة (تُستدعى من المشهد لكل نافذة يفتحها). */
export function setSidebarModalOpen(id: string, open: boolean): void {
  if (open) openModals.add(id)
  else openModals.delete(id)
  syncVisibility()
}

/** هل هناك نافذة مفتوحة حالياً؟ */
export function isSidebarModalOpen(): boolean {
  return openModals.size > 0
}

/** إعادة حساب الرؤية (تُستدعى بعد تغيّر إعدادات الأيقونات أو حالة المشهد). */
export function refreshSidebarVisibility(): void {
  syncVisibility()
}

/**
 * هل الشريط معروض الآن؟
 *
 * يظهر فقط أثناء اللعب الفعلي في MainScene:
 *   - لا في شاشة الترحيب (welcomeActive).
 *   - لا فوق أي نافذة كاملة: المصحف، النصائح، المزرعة، الإعدادات، الأنماط…
 *     وتصل عبر 'reader-opened'/'reader-closed' ⇒ المفتاح 'dom-modal'.
 *
 * ملاحظة z-index: الشريط كان z-[2000] والمصحف/النصائح z-[70]، فكانت الأيقونات
 * تظهر فوق النوافذ فعلياً. خفّضنا الشريط إلى z-[60] ليجري النصائح والمصحف فوقه.
 */
export function isSidebarVisible(): boolean {
  return !welcomeActive && openModals.size === 0
}

/** تطبيق قاعدة الرؤية على عناصر DOM فعلياً. */
function syncVisibility(): void {
  if (!sidebarRoot) return
  const visible = isSidebarVisible()
  sidebarRoot.style.display = visible ? 'flex' : 'none'
}

export function initSidebar(): void {
  if (document.getElementById('dom-sidebar')) return

  const container = document.createElement('div')
  container.id = 'dom-sidebar'
  // z-[60] لا z-[2000]: يجب أن تمرّ النوافذ فوق الشريط دائماً، والنوافذ
  // (النصائح/المصحف z-[70]، والمزارع/الإعدادات z-[5000]) أعلى منه.
  // top يأتي من CSS عبر المتغير --rk-sidebar-top (يتحرك مع شريط التخصيص).
  container.className = 'fixed left-[16px] flex flex-col gap-[20px] z-[60] pointer-events-none'
  // style to ensure RTL does not break left positioning
  container.style.direction = 'ltr' // Ensure left positioning is physical

  container.innerHTML = `
    <!-- القائمة: أيقونات ثابتة الظاهرة دائماً (لا سهم طي/فتح) -->
    <div id="sidebar-menu" class="flex flex-col gap-[20px] opacity-100 translate-x-0" style="direction: rtl;">

      <!-- النمط -->
      <div class="flex flex-col items-center">
        <button id="btn-pattern" class="w-[52px] h-[52px] relative flex items-center justify-center outline-none bg-transparent border-none active:scale-95 transition-transform duration-100 ease-out pointer-events-auto">
          <img src="icons/icon-pattern.png" alt="Pattern" class="w-12 h-12 object-contain pointer-events-none drop-shadow-md" style="image-rendering: -webkit-optimize-contrast;" />
        </button>
        <span class="label-badge mt-[-6px] z-10 px-2 py-0.5 rounded-md text-[11px] shadow-sm whitespace-nowrap">النمط</span>
      </div>

      <!-- المزرعة -->
      <div class="flex flex-col items-center">
        <button id="btn-farm" class="w-[52px] h-[52px] relative flex items-center justify-center outline-none bg-transparent border-none active:scale-95 transition-transform duration-100 ease-out pointer-events-auto">
          <img src="icons/icon-farm.png" alt="Farm" class="w-12 h-12 object-contain pointer-events-none drop-shadow-md" style="image-rendering: -webkit-optimize-contrast;" />
        </button>
        <span class="label-badge mt-[-6px] z-10 px-2 py-0.5 rounded-md text-[11px] shadow-sm whitespace-nowrap">المزرعة</span>
      </div>

      <!-- المصحف -->
      <div class="flex flex-col items-center">
        <button id="btn-quran" class="w-[52px] h-[52px] relative flex items-center justify-center outline-none bg-transparent border-none active:scale-95 transition-transform duration-100 ease-out pointer-events-auto">
          <img src="icons/icon-quran.png" alt="Quran" class="w-12 h-12 object-contain pointer-events-none drop-shadow-md" style="image-rendering: -webkit-optimize-contrast;" />
        </button>
        <span class="label-badge mt-[-6px] z-10 px-2 py-0.5 rounded-md text-[11px] shadow-sm whitespace-nowrap">المصحف</span>
      </div>

      <!-- الإعدادات -->
      <div class="flex flex-col items-center relative">
        <button id="btn-settings" class="w-[52px] h-[52px] relative flex items-center justify-center outline-none bg-transparent border-none active:scale-95 transition-transform duration-100 ease-out pointer-events-auto">
          <img src="game/icons/settings-gbtn.svg" alt="Settings" class="w-[46px] h-[46px] object-contain pointer-events-none drop-shadow-md" />
        </button>
        <span class="label-badge mt-[-6px] z-10 px-2 py-0.5 rounded-md text-[11px] shadow-sm whitespace-nowrap">الإعدادات</span>
        <!-- شارة التحديث -->
        <div id="dom-update-badge" class="absolute top-0 right-0 w-[16px] h-[16px] rounded-full bg-red-500 border-2 border-white shadow-md hidden pointer-events-none" style="animation: badge-pulse 0.6s ease-in-out infinite alternate;">
           <span class="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">!</span>
        </div>
      </div>

    </div>
  `

  document.body.appendChild(container)

  // القائمة ثابتة الظهور: لا حالة طي ولا سهم.
  sidebarRoot = container

  // لا مستمع للنقر في الخارج anymore: القائمة ثابتة الظهور فلا تُطوى.

  // الأحداث للأزرار
  document.getElementById('btn-pattern')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open-mode-panel'))
  })
  document.getElementById('btn-farm')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open-garden'))
  })
  document.getElementById('btn-quran')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open-quran'))
  })
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    // نافذة الإعدادات الفاتحة (DOM في components/SettingsPanel).
    window.dispatchEvent(new CustomEvent('open-settings'))
  })

  // الأيقونات ثابتة أثناء اللعب؛ شاشة الترحيب هي الحالة الوحيدة التي تخفيها.
  window.addEventListener('settings-changed', refreshSidebarVisibility)
  // نوافذ DOM تعلن حالتها للمشهد، دون إخفاء الشريط الجانبي.
  window.addEventListener('reader-opened', () => setSidebarModalOpen('dom-modal', true))
  window.addEventListener('reader-closed', () => setSidebarModalOpen('dom-modal', false))
  // يبدأ التطبيق على شاشة الترحيب: السهم مخفي حتى يُعلن المشهد الرئيسي بدء اللعب.
  refreshSidebarVisibility()

  // شارة التحديث
  const updateBadge = document.getElementById('dom-update-badge')
  if (localStorage.getItem('has_update') === 'true') updateBadge?.classList.remove('hidden')
  window.addEventListener('app-update-available', () => updateBadge?.classList.remove('hidden'))
  window.addEventListener('open-settings', () => updateBadge?.classList.add('hidden'))
}
