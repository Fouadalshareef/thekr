import { getIstighfarArchive } from '../services/DhikrStorage'

let archiveEl: HTMLElement | null = null
let escapeHandler: ((event: KeyboardEvent) => void) | null = null

function formatCount(count: number): string {
  return new Intl.NumberFormat('ar').format(count)
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatMonth(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('ar', {
    month: 'long',
    year: 'numeric',
  })
}

function createHistoryRow(label: string, count: number): HTMLElement {
  const row = document.createElement('li')
  row.className = 'istighfar-archive-row'

  const date = document.createElement('span')
  date.textContent = label
  const value = document.createElement('strong')
  value.textContent = formatCount(count)
  row.append(date, value)
  return row
}

/** فتح شاشة أرشيف الاستغفار فوق مشهد Zen. */
export function showIstighfarArchive(): void {
  if (archiveEl) return

  const archive = getIstighfarArchive()
  const overlay = document.createElement('section')
  overlay.id = 'istighfar-archive'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-labelledby', 'istighfar-archive-title')
  overlay.innerHTML = `
    <div class="istighfar-archive-card">
      <header class="istighfar-archive-header">
        <div>
          <h1 id="istighfar-archive-title">أرشيف الاستغفار</h1>
          <p>إجمالي الاستغفار</p>
          <strong id="istighfar-archive-total"></strong>
        </div>
        <button class="istighfar-archive-back" type="button">العودة للاستغفار</button>
      </header>
      <div class="istighfar-archive-content">
        <h2>آخر 30 يوماً</h2>
        <ul id="istighfar-daily-history" class="istighfar-archive-list"></ul>
        <h2>الأشهر الأقدم</h2>
        <ul id="istighfar-monthly-history" class="istighfar-archive-list"></ul>
        <p id="istighfar-empty-months" class="istighfar-archive-empty hidden">
          لا توجد بيانات أقدم من 30 يوماً.
        </p>
      </div>
    </div>
  `

  const total = overlay.querySelector<HTMLElement>('#istighfar-archive-total')
  if (total) total.textContent = formatCount(archive.totalCount)

  const dailyList = overlay.querySelector<HTMLUListElement>('#istighfar-daily-history')
  archive.daily.forEach(({ date, count }) => {
    dailyList?.append(createHistoryRow(formatDay(date), count))
  })

  const monthlyList = overlay.querySelector<HTMLUListElement>('#istighfar-monthly-history')
  archive.monthly.forEach(({ month, count }) => {
    monthlyList?.append(createHistoryRow(formatMonth(month), count))
  })
  if (archive.monthly.length === 0) {
    overlay.querySelector('#istighfar-empty-months')?.classList.remove('hidden')
  }

  const close = () => {
    overlay.remove()
    archiveEl = null
    if (escapeHandler) {
      window.removeEventListener('keydown', escapeHandler)
      escapeHandler = null
    }
  }

  overlay.querySelector('.istighfar-archive-back')?.addEventListener('click', close)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close()
  })
  overlay.querySelector('.istighfar-archive-card')?.addEventListener('click', (event) => {
    event.stopPropagation()
  })
  escapeHandler = (event) => {
    if (event.key === 'Escape') close()
  }
  window.addEventListener('keydown', escapeHandler)

  archiveEl = overlay
  document.body.append(overlay)
  overlay.querySelector<HTMLButtonElement>('.istighfar-archive-back')?.focus()
}
