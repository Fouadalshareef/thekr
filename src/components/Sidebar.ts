import { areIconsEnabled } from '../services/SettingsService'

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
    window.dispatchEvent(new CustomEvent('open-dashboard'))
    toggleMenu(false)
  })

  // إعدادات الإظهار / الإخفاء
  const applySettings = () => {
    const iconsEnabled = areIconsEnabled()
    container.style.display = iconsEnabled ? 'flex' : 'none'
    if (!iconsEnabled && isOpen) toggleMenu(false)
  }

  window.addEventListener('settings-changed', applySettings)
  applySettings()

  // شارة التحديث
  const updateBadge = document.getElementById('dom-update-badge')
  if (localStorage.getItem('has_update') === 'true') updateBadge?.classList.remove('hidden')
  window.addEventListener('app-update-available', () => updateBadge?.classList.remove('hidden'))
  window.addEventListener('open-dashboard', () => updateBadge?.classList.add('hidden'))
}
