interface Surah { id: number; name: string; verses: number }
interface BookmarkState { surah_id: number; verse_id: number }

const SURAH_ROWS: readonly [number, string, number][] = [
  [1, 'الفاتحة', 7], [2, 'البقرة', 286], [3, 'آل عمران', 200], [4, 'النساء', 176], [5, 'المائدة', 120], [6, 'الأنعام', 165], [7, 'الأعراف', 206], [8, 'الأنفال', 75], [9, 'التوبة', 129], [10, 'يونس', 109], [11, 'هود', 123], [12, 'يوسف', 111], [13, 'الرعد', 43], [14, 'إبراهيم', 52], [15, 'الحجر', 99], [16, 'النحل', 128], [17, 'الإسراء', 111], [18, 'الكهف', 110], [19, 'مريم', 98], [20, 'طه', 135], [21, 'الأنبياء', 112], [22, 'الحج', 78], [23, 'المؤمنون', 118], [24, 'النور', 64], [25, 'الفرقان', 77], [26, 'الشعراء', 227], [27, 'النمل', 93], [28, 'القصص', 88], [29, 'العنكبوت', 69], [30, 'الروم', 60], [31, 'لقمان', 34], [32, 'السجدة', 30], [33, 'الأحزاب', 73], [34, 'سبأ', 54], [35, 'فاطر', 45], [36, 'يس', 83], [37, 'الصافات', 182], [38, 'ص', 88], [39, 'الزمر', 75], [40, 'غافر', 85], [41, 'فصلت', 54], [42, 'الشورى', 53], [43, 'الزخرف', 89], [44, 'الدخان', 59], [45, 'الجاثية', 37], [46, 'الأحقاف', 35], [47, 'محمد', 38], [48, 'الفتح', 29], [49, 'الحجرات', 18], [50, 'ق', 45], [51, 'الذاريات', 60], [52, 'الطور', 49], [53, 'النجم', 62], [54, 'القمر', 55], [55, 'الرحمن', 78], [56, 'الواقعة', 96], [57, 'الحديد', 29], [58, 'المجادلة', 22], [59, 'الحشر', 24], [60, 'الممتحنة', 13], [61, 'الصف', 14], [62, 'الجمعة', 11], [63, 'المنافقون', 11], [64, 'التغابن', 18], [65, 'الطلاق', 12], [66, 'التحريم', 12], [67, 'الملك', 30], [68, 'القلم', 52], [69, 'الحاقة', 52], [70, 'المعارج', 44], [71, 'نوح', 28], [72, 'الجن', 28], [73, 'المزمل', 20], [74, 'المدثر', 56], [75, 'القيامة', 40], [76, 'الإنسان', 31], [77, 'المرسلات', 50], [78, 'النبأ', 40], [79, 'النازعات', 46], [80, 'عبس', 42], [81, 'التكوير', 29], [82, 'الانفطار', 19], [83, 'المطففين', 36], [84, 'الانشقاق', 25], [85, 'البروج', 22], [86, 'الطارق', 17], [87, 'الأعلى', 19], [88, 'الغاشية', 26], [89, 'الفجر', 30], [90, 'البلد', 20], [91, 'الشمس', 15], [92, 'الليل', 21], [93, 'الضحى', 11], [94, 'الشرح', 8], [95, 'التين', 8], [96, 'العلق', 19], [97, 'القدر', 5], [98, 'البينة', 8], [99, 'الزلزلة', 8], [100, 'العاديات', 11], [101, 'القارعة', 11], [102, 'التكاثر', 8], [103, 'العصر', 3], [104, 'الهمزة', 9], [105, 'الفيل', 5], [106, 'قريش', 4], [107, 'الماعون', 7], [108, 'الكوثر', 3], [109, 'الكافرون', 6], [110, 'النصر', 3], [111, 'المسد', 5], [112, 'الإخلاص', 4], [113, 'الفلق', 5], [114, 'الناس', 6],
]

const SURAHS: Surah[] = SURAH_ROWS.map(([id, name, verses]): Surah => ({ id, name, verses }))

const BOOKMARK_KEY = 'quran-bookmark'
let modal: HTMLElement | null = null
let currentSurah: Surah | null = null
let viewer: HTMLElement | null = null
function getBookmark(): BookmarkState | null {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || 'null') } catch { return null }
}
function saveBookmark(state: BookmarkState): void { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(state)) }
function clearBookmark(): void { localStorage.removeItem(BOOKMARK_KEY) }
function arabicDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
}
function indexHtml(): string {
  const mark = getBookmark()
  const resume = mark ? `<button id="quran-resume" class="w-full rounded-xl border-amber-300 bg-amber-50 p-3 text-right text-amber-900">الاستمرار من سورة ${SURAHS[mark.surah_id - 1]?.name} - آية ${mark.verse_id} 🔖</button>` : ''
  return `${resume}<div class="grid grid-cols-1 gap-2">${SURAHS.map(s => `<button data-surah="${s.id}" class="flex items-center justify-between rounded-xl border-slate-200 bg-white p-3 text-right text-slate-800 shadow-sm hover:border-emerald-500 hover:bg-emerald-50"><span><b>${s.id}. ${s.name}</b><small class="mr-2 text-slate-500">${s.verses} آية</small></span><span class="text-emerald-700">›</span></button>`).join('')}</div>`
}

function renderIndex(): void {
  if (!viewer) return
  currentSurah = null
  viewer.innerHTML = indexHtml()
  viewer.querySelectorAll<HTMLButtonElement>('[data-surah]').forEach(b => b.onclick = () => openSurah(Number(b.dataset.surah)))
  viewer.querySelector<HTMLButtonElement>('#quran-resume')?.addEventListener('click', () => { const b = getBookmark(); if (b) openSurah(b.surah_id, b.verse_id) })
}

async function openSurah(id: number, focusVerse?: number): Promise<void> {
  currentSurah = SURAHS[id - 1]
  if (!viewer || !currentSurah) return
  viewer.innerHTML = `<div class="flex items-center justify-between"><button id="quran-back" class="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">الفهرس</button><h3 class="text-xl font-bold text-emerald-900">${currentSurah.name}</h3></div><p class="text-center text-slate-500">جارٍ تحميل السورة بالنص الإملائي القياسي...</p>`
  viewer.querySelector<HTMLButtonElement>('#quran-back')!.onclick = renderIndex
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${id}/quran-simple`)
    if (!response.ok) throw new Error('network')
    const json = await response.json() as { data?: { ayahs?: { numberInSurah: number; text: string }[] } }
    const ayahs = json.data?.ayahs || []
    const mark = getBookmark()
    const flow = ayahs.map(a => {
      const saved = mark?.surah_id === id && mark.verse_id === a.numberInSurah
      return `<span id="ayah-${a.numberInSurah}" data-ayah="${a.numberInSurah}" tabindex="0" role="button" class="quran-verse cursor-pointer rounded px-1 transition-colors ${saved ? 'bg-amber-100 ring-1 ring-amber-300' : ''}">${a.text} <span class="verse-number text-emerald-800">﴿${arabicDigits(a.numberInSurah)}﴾</span><span class="verse-mark ${saved ? '' : 'hidden'} text-amber-700" aria-label="علامة توقف"> ✔</span> </span>`
    }).join('')
    viewer.innerHTML = `<div class="flex items-center justify-between"><button id="quran-back" class="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">الفهرس</button><h3 class="text-xl font-bold text-emerald-900">${currentSurah.name}</h3></div><p class="quran-flow rounded-xl bg-white p-5 text-center text-xl leading-[2.35] text-slate-900 shadow-sm">${flow}</p><p class="text-center text-xs text-slate-500">النص الإملائي القياسي من مصدر موثوق عبر واجهة <code>quran-simple</code>، مع الحفاظ على أرقام الآيات.</p>`
    viewer.querySelector<HTMLButtonElement>('#quran-back')!.onclick = renderIndex
    viewer.querySelectorAll<HTMLElement>('[data-ayah]').forEach(verse => verse.addEventListener('click', () => {
      const verseId = Number(verse.dataset.ayah)
      const saved = getBookmark()
      if (saved?.surah_id === id && saved.verse_id === verseId) clearBookmark()
      else saveBookmark({ surah_id: id, verse_id: verseId })
      // تظليل آية واحدة فقط وإظهار ✔ مرة واحدة بجانب رقمها
      const active = getBookmark()
      viewer?.querySelectorAll<HTMLElement>('[data-ayah]').forEach(item => {
        const activeVerse = active?.surah_id === id && active.verse_id === Number(item.dataset.ayah)
        item.classList.toggle('bg-amber-100', activeVerse)
        item.classList.toggle('ring-1', activeVerse)
        item.classList.toggle('ring-amber-300', activeVerse)
        item.querySelector('.verse-mark')?.classList.toggle('hidden', !activeVerse)
      })
    }))
    if (focusVerse) setTimeout(() => document.getElementById(`ayah-${focusVerse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  } catch { viewer.innerHTML += '<p class="rounded-xl bg-red-50 p-4 text-center text-red-700">تعذر تحميل السورة حالياً. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.</p>' }
}

export function initQuranModal(): void {
  modal = document.createElement('div')
  modal.id = 'quran-modal'
  modal.className = 'fixed inset-0 z-[70] hidden touch-pan-y'
  modal.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;margin:0;padding:0;'
  modal.innerHTML = `<div id="quran-backdrop" class="absolute inset-0 bg-black/60"></div><div id="quran-scroll" class="relative h-full w-full overflow-y-auto bg-emerald-50 p-5 pt-20 text-slate-900" style="touch-action:pan-y;overscroll-behavior:contain"><header id="quran-header" class="fixed inset-x-0 top-0 z-10 flex items-center justify-between bg-white/90 p-4 shadow-md backdrop-blur transition-opacity"><h2 class="flex items-center gap-2 text-2xl font-bold text-emerald-900"><span class="h-6 w-6">📖</span> المصحف الشريف</h2><div class="flex items-center gap-3"><button id="quran-index" class="modal-index-button" type="button"><img src="game/icons/index.svg" alt="الفهرس"></button><button id="quran-close" class="modal-close-button" type="button" aria-label="إغلاق"><img src="game/icons/close.svg" alt=""></button></div></header><div id="quran-viewer" class="mx-auto w-full max-w-3xl space-y-3"></div></div>`
  document.body.appendChild(modal); viewer = modal.querySelector('#quran-viewer'); renderIndex()
  modal.querySelector('#quran-close')?.addEventListener('click', hide); modal.querySelector('#quran-index')?.addEventListener('click', renderIndex); modal.querySelector('#quran-backdrop')?.addEventListener('click', hide)
  const header = modal.querySelector<HTMLElement>('#quran-header')
  let headerTimer: number | undefined
  const revealHeader = () => { if (!header) return; header.classList.remove('opacity-0', 'pointer-events-none'); window.clearTimeout(headerTimer); headerTimer = window.setTimeout(() => header.classList.add('opacity-0', 'pointer-events-none'), 3000) }
  modal.addEventListener('click', revealHeader)
  header?.classList.add('opacity-0', 'pointer-events-none')
  window.addEventListener('open-quran', show)
}
function show(): void { modal?.classList.remove('hidden'); modal?.classList.add('flex'); document.body.classList.add('modal-open'); renderIndex(); window.dispatchEvent(new CustomEvent('reader-opened')) }
function hide(): void { modal?.classList.add('hidden'); modal?.classList.remove('flex'); document.body.classList.remove('modal-open'); window.dispatchEvent(new CustomEvent('reader-closed')) }
