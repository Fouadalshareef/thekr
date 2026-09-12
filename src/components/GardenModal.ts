import { getGardenState, GARDEN_ELEMENTS } from '../services/GardenService'

let modal: HTMLElement | null = null

function renderContent(): string {
  const garden = getGardenState()
  const nextLine = garden.next
    ? `العنصر القادم: <b class="text-amber-300">${garden.next.name}</b> عند ${garden.next.threshold} ذكراً`
    : 'اكتملت الحديقة بالكامل! 🌈'

  // Generate grid items
  const gridItems = GARDEN_ELEMENTS.map((el) => {
    const isUnlocked = garden.total >= el.threshold
    return `
      <div class="flex flex-col items-center p-3 rounded-xl border ${isUnlocked ? 'border-emerald-500/50 bg-emerald-900/30' : 'border-slate-700/50 bg-slate-800/30 opacity-60'} transition-all">
        <div class="text-2xl mb-1">${isUnlocked ? '✨' : '🔒'}</div>
        <div class="text-sm font-bold ${isUnlocked ? 'text-emerald-200' : 'text-slate-400'} text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">${el.name}</div>
        <div class="text-xs ${isUnlocked ? 'text-emerald-400/80' : 'text-slate-500'} font-mono mt-1">${el.threshold}</div>
      </div>
    `
  }).join('')

  return `
    <section class="space-y-4">
      <div class="text-center space-y-2">
        <h3 class="text-emerald-200 font-bold text-lg">مستوى الحديقة: ${garden.level}</h3>
        <p class="text-sm text-slate-300">إجمالي الأذكار: <span class="font-mono text-emerald-400 font-bold">${garden.total}</span></p>
      </div>

      <!-- شريط التقدم -->
      ${garden.next ? `
      <div class="bg-slate-800/80 rounded-lg p-3 space-y-2">
        <div class="flex justify-between text-xs text-slate-300">
          <span>${nextLine}</span>
          <span class="font-mono">${Math.round(garden.progress * 100)}%</span>
        </div>
        <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500 transition-all duration-500" style="width: ${Math.round(garden.progress * 100)}%"></div>
        </div>
      </div>
      ` : `
      <div class="bg-emerald-900/50 rounded-lg p-3 text-center border border-emerald-500/30">
        <span class="text-emerald-200 text-sm">${nextLine}</span>
      </div>
      `}

      <!-- شبكة العناصر -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[45vh] overflow-y-auto p-1 touch-pan-y" style="overscroll-behavior: contain;">
        ${gridItems}
      </div>
    </section>
  `
}

function refresh(): void {
  if (!modal) return
  const body = modal.querySelector<HTMLElement>('#garden-body')
  if (body) body.innerHTML = renderContent()
}

export function initGardenModal(): void {
  modal = document.createElement('div')
  modal.id = 'garden-modal'
  modal.className = 'fixed inset-0 z-[60] hidden items-start justify-center p-4 touch-pan-y'
  modal.innerHTML = `
    <div id="garden-backdrop" class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div id="garden-scroll" class="juicy-panel relative w-[90%] max-w-[420px] max-h-[85vh] overflow-y-auto p-6 space-y-6" style="touch-action: pan-y !important; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-xl font-bold text-emerald-100">
          <span class="text-lg">🌱</span>
          مزرعة الحسنات
        </h2>
        <button id="garden-close" type="button" class="modal-close-button" aria-label="إغلاق"><img src="game/icons/close.svg" alt=""></button>
      </div>
      <div id="garden-body" class="space-y-4"></div>
    </div>
  `
  document.body.appendChild(modal)
  refresh()

  modal.querySelector<HTMLButtonElement>('#garden-close')?.addEventListener('click', hide)
  modal.querySelector<HTMLElement>('#garden-backdrop')?.addEventListener('click', hide)

  window.addEventListener('open-garden', () => show())
}

function show(): void {
  if (!modal) return
  refresh()
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  document.body.classList.add('modal-open')
  window.dispatchEvent(new CustomEvent('reader-opened'))

  const scroller = modal.querySelector<HTMLElement>('#garden-scroll')
  if (scroller) scroller.scrollTop = 0
}

function hide(): void {
  if (!modal) return
  modal.classList.add('hidden')
  modal.classList.remove('flex')
  document.body.classList.remove('modal-open')
  window.dispatchEvent(new CustomEvent('reader-closed'))
}
