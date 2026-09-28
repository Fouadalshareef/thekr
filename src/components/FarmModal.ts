/**
 * FarmModal — نافذة «مزرعة الحسنات» الفاتحة (HTML/DOM بدل حاوية Phaser).
 *
 * تُبنى مرة واحدة في main.ts وتُفتح بالحدث 'open-garden' (الذي يرسله
 * Sidebar عند ضغط أيقونة المزرعة). تحسب الحالة من GardenService كلما فُتحت،
 * فتبقى الأرقام مطابقة لما جمعه اللاعب فعلاً.
 *
 * عند الفتح/الإغلاق نُطلق reader-opened/reader-closed — وهما الحدثان اللذان
 * يستخدمهما MainScene لإيقاف الفيزياء ولإخفاء الشريط الجانبي.
 */
import { GARDEN_ELEMENTS, getGardenState } from '../services/GardenService'

/** رموز عناصر المزرعة (العنصر المقفل يُعرض دائماً بقفل). */
const STAGE_ICONS: Record<string, string> = {
  desert: '🏜️',
  grass: '🌿',
  'flower-red': '🌹',
  'flower-yellow': '🌼',
  bush: '🌳',
  tree: '🌴',
  bird: '🐦',
  fountain: '⛲',
  butterflies: '🦋',
  rainbow: '🌈',
}

let root: HTMLElement | null = null
let body: HTMLElement | null = null

/** هل النافذة مفتوحة الآن؟ */
let open = false

/** بناء محتوى النافذة من حالة المزرعة الحالية. */
function render(): void {
  if (!body) return
  const g = getGardenState()

  const stats = `
    <div class="crisp-stats">
      <div class="crisp-stat"><b>${g.level}</b><span>عنصر مفتوح</span></div>
      <div class="crisp-stat"><b>${g.total}</b><span>إجمالي الأذكار</span></div>
    </div>
  `

  // بطاقة العنصر القادم + شريط التقدم (أو رسالة اكتمال المزرعة)
  const nextCard = g.next
    ? `<div class="crisp-card">
         <h3>التالي: ${g.next.name}</h3>
         <small style="color:#527267">عند ${g.next.threshold} ذكراً — باقٍ ${Math.max(0, g.next.threshold - g.total)}</small>
         <div class="crisp-bar"><div class="crisp-fill" style="width:${Math.round(g.progress * 100)}%"></div></div>
       </div>`
    : `<div class="crisp-card">
         <h3>🎉 أكملت المزرعة كلها!</h3>
         <small style="color:#527267">ما شاء الله، فتحت كل العناصر. بارك الله فيك.</small>
       </div>`

  const cards = GARDEN_ELEMENTS.map((el) => {
    const unlocked = g.total >= el.threshold
    const cls = unlocked ? 'open' : 'locked'
    const ico = unlocked ? (STAGE_ICONS[el.id] ?? '🌱') : '🔒'
    return `<div class="crisp-item ${cls}">
        <div class="crisp-ico">${ico}</div>
        <div class="crisp-name">${el.name}</div>
        <div class="crisp-sub">${el.threshold} ذكر</div>
      </div>`
  }).join('')

  const grid = `<div class="crisp-card"><h3>عناصر المزرعة</h3><div class="crisp-grid">${cards}</div></div>`

  body.innerHTML = stats + nextCard + grid
}

/** فتح النافذة (مع إعادة الحساب من الرصيد الحالي). */
export function showFarmModal(): void {
  const el = root
  const content = body
  if (!el || !content) return
  render()
  el.classList.remove('hidden')
  open = true
  document.body.classList.add('modal-open')
  // يوقف MainScene الفيزياء ويخفي الشريط الجانبي أثناء فتح النافذة.
  window.dispatchEvent(new CustomEvent('reader-opened'))
  content.scrollTop = 0
}

/** إغلاق النافذة. */
export function hideFarmModal(): void {
  if (!root || !open) return
  root.classList.add('hidden')
  open = false
  document.body.classList.remove('modal-open')
  window.dispatchEvent(new CustomEvent('reader-closed'))
}

/** هل النافذة مفتوحة؟ (يستخدمها المشهد لمزامنة إخفاء الشريط الجانبي) */
export function isFarmModalOpen(): boolean {
  return open
}

export function initFarmModal(): void {
  if (document.getElementById('farm-modal')) return

  root = document.createElement('section')
  root.id = 'farm-modal'
  root.className = 'crisp-modal hidden'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'مزرعة الحسنات')
  root.innerHTML = `
    <div class="crisp-content">
      <header class="crisp-header">
        <div>
          <p class="crisp-eyebrow">🌱 حديقتك</p>
          <h2>مزرعة الحسنات</h2>
          <p>كل ٥٠٠ ذكر يفتح عنصراً جديداً في مزرعتك</p>
        </div>
        <button class="crisp-close" type="button" aria-label="إغلاق">×</button>
      </header>
      <div class="crisp-scroll" id="farm-body"></div>
    </div>
  `
  document.body.appendChild(root)
  body = root.querySelector('#farm-body')

  root.querySelector('.crisp-close')?.addEventListener('click', hideFarmModal)
  // الإغلاق بالنقر على الخلفية (خارج البطاقة نفسها)
  root.addEventListener('click', (e) => {
    if (e.target === root) hideFarmModal()
  })

  window.addEventListener('open-garden', showFarmModal)

  //Shutdown: إغلاق النافذة إن كانت مفتوحة عند تفكيك التطبيق.
  window.addEventListener('pagehide', () => {
    if (open) hideFarmModal()
  })
}


