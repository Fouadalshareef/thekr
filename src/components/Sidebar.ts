import { areIconsEnabled } from '../services/SettingsService'

/**
 * Sidebar — شريط الأيقونات الجانبي (DOM فوق قماش اللعبة) مع سهم فتح/طي القائمة.
 *
 * إصلاح العلّة: كان السهم ظاهراً في كل الحالات (بما فيها شاشة الترحيب والنوافذ
 * المفتوحة: المزرعة، الإعدادات، المصحف، الأنماط، النصائح، التخصيص، الاحتفالات).
 * الآن تُدار رؤية الشريط (وبالتالي السهم) من حالة مركزية واحدة:
 *   visible = الأيقونات مفعّلة && !welcomeActive && لا توجد أي نافذة مفتوحة
 *
 * واجهة الاستخدام من المشاهد (Phaser):
 *   setSidebarWelcomeActive(false)        → عند بدء MainScene
 *   setSidebarModalOpen('farm', true)     → عند فتح نافذة المزرعة/الإعدادات
 */
let sidebarRoot: HTMLElement | null = null
let arrowIconEl: HTMLElement | null = null
/** طيّ القائمة فوراً (تُربط داخل initSidebar). */
let collapseMenu: ((force?: boolean) => void) | null = null

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

/** هل السهم/الشريط معروض الآن؟ */
export function isSidebarVisible(): boolean {
  return areIconsEnabled() && !welcomeActive && openModals.size === 0
}

/** تطبيق قاعدة الرؤية على عناصر DOM فعلياً. */
function syncVisibility(): void {
  if (!sidebarRoot) return
  const visible = isSidebarVisible()
  // السهم (وزر الإعدادات والمصحف والأنماط) مخفي تماماً في شاشة الترحيب والنوافذ.
  sidebarRoot.style.display = visible ? 'flex' : 'none'
  if (arrowIconEl) arrowIconEl.style.display = visible ? 'block' : 'none'
  // عند الإخفاء نطوي القائمة دائماً حتى لا تعود مفتوحة عند الإظهار التالي.
  if (!visible) collapseMenu?.(false)
}

export function initSidebar(): void {
  if (document.getElementById('dom-sidebar')) return

  const container = document.createElement('div')
  container.id = 'dom-sidebar'
  container.className = 'fixed left-[16px] top-[62px] flex flex-col gap-[20px] z-[2000] pointer-events-none'
  // style to ensure RTL does not break left positioning
  container.style.direction = 'ltr' // Ensure left positioning is physical

  container.innerHTML = `
    <!-- زر التوسيع / الطي -->
    <div class="flex flex-col items-center">
      <button id="sidebar-toggle" class="w-[52px] h-[52px] relative flex items-center justify-center outline-none bg-transparent border-none active:scale-95 transition-transform duration-100 ease-out pointer-events-auto">
        <img src="game/icons/arrow-gbtn.svg" id="sidebar-arrow-icon" class="w-[46px] h-[46px] object-contain pointer-events-none transition-transform duration-300" />
      </button>
    </div>

    <!-- القائمة القابلة للطي -->
    <div id="sidebar-menu" class="flex flex-col gap-[20px] transition-all duration-300 opacity-0 -translate-x-full pointer-events-none" style="direction: rtl;">
      
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

  let isOpen = false
  const menu = document.getElementById('sidebar-menu')!
  const arrow = document.getElementById('sidebar-arrow-icon')!

  const toggleMenu = (force?: boolean) => {
    isOpen = force ?? !isOpen
    if (isOpen) {
      menu.classList.remove('opacity-0', '-translate-x-full', 'pointer-events-none')
      menu.classList.add('opacity-100', 'translate-x-0')
      arrow.style.transform = 'rotate(180deg)'
    } else {
      menu.classList.add('opacity-0', '-translate-x-full', 'pointer-events-none')
      menu.classList.remove('opacity-100', 'translate-x-0')
      arrow.style.transform = 'rotate(0deg)'
    }
  }

  // ربط مراجع الوحدة (تستخدمها دالة الرؤية المصدَّرة للمشاهد).
  sidebarRoot = container
  arrowIconEl = arrow
  collapseMenu = (force?: boolean) => toggleMenu(force)

  document.getElementById('sidebar-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMenu()
  })
  
  // إغلاق عند النقر في الخارج
  document.addEventListener('click', (e) => {
    if (!isOpen) return
    const target = e.target as HTMLElement
    if (!container.contains(target)) {
      toggleMenu(false)
    }
  })

  // الأحداث للأزرار
  document.getElementById('btn-pattern')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open-mode-panel'))
    toggleMenu(false)
  })
  document.getElementById('btn-farm')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open-garden'))
    toggleMenu(false)
  })
  document.getElementById('btn-quran')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open-quran'))
    toggleMenu(false)
  })
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    // نافذة الإعدادات الجديدة (Phaser Container فاتحة كاملة الشاشة).
    window.dispatchEvent(new CustomEvent('open-settings'))
    toggleMenu(false)
  })

  // إعدادات الإظهار / الإخفاء + قاعدة إخفاء السهم في شاشة الترحيب والنوافذ.
  window.addEventListener('settings-changed', refreshSidebarVisibility)
  // نوافذ DOM (النصائح/المصحف/الأنماط/التخصيص) تُعلن فتحها وإغلاقها بهذين الحدثين.
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
