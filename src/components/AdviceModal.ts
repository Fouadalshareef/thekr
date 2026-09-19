let modal: HTMLElement | null = null

export function initAdviceModal(): void {
  modal = document.createElement('div')
  modal.id = 'advice-modal'
  modal.className = 'fixed inset-0 z-[70] hidden items-center justify-center p-4 touch-pan-y'
  modal.innerHTML = `
    <div id="advice-backdrop" class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
    <div id="advice-scroll" class="juicy-panel relative w-[95%] max-w-[480px] max-h-[85vh] overflow-y-auto p-6 space-y-6" style="touch-action: pan-y !important; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;">

      <div class="flex flex-col items-center gap-3 text-center mb-2">
        <div class="w-14 h-14 bg-teal-900/50 rounded-full flex items-center justify-center border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
          <span class="text-xl text-teal-400">💡</span>
        </div>
        <h2 class="text-2xl font-bold text-teal-100 font-['Amiri']">نصائح الذكر والاستغفار</h2>
      </div>

      <div class="space-y-5 text-right font-['Segoe_UI']" dir="rtl">

        <div class="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <h3 class="text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
            <span>📌</span> مراتب الذكر:
          </h3>
          <ul class="space-y-3 text-slate-200 text-sm leading-relaxed pr-2">
            <li class="flex items-start gap-2">
              <span class="text-teal-400 mt-1">•</span>
              <span><strong class="text-teal-200">الأولى (الأفضل):</strong> بالقلب واللسان معاً مع حضور الذهن واستشعار المعنى.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-teal-400 mt-1">•</span>
              <span><strong class="text-teal-200">الثانية:</strong> بالقلب فقط (يُثاب عليه، ومناسب للأوقات والأماكن الخاصة).</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-teal-400 mt-1">•</span>
              <span><strong class="text-teal-200">الثالثة:</strong> باللسان فقط (يُثاب عليه، وهو أقل مراتب الذكر).</span>
            </li>
          </ul>
        </div>

        <div class="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <h3 class="text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
            <span>✨</span> الطريقة الأفضل للاستغفار:
          </h3>
          <p class="text-slate-200 text-sm leading-relaxed mb-3">
            الجمع بين الإقرار بالذنب والانكسار مع حضور القلب.
          </p>
          <div class="space-y-3 pr-2">
            <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700/30">
              <p class="text-xs text-slate-400 mb-1">من أفضل الصيغ المختصرة:</p>
              <p class="text-teal-100 font-['Amiri'] text-lg font-bold">«أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ»</p>
            </div>
            <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700/30">
              <p class="text-xs text-slate-400 mb-1">سيد الاستغفار:</p>
              <p class="text-teal-100 font-['Amiri'] text-lg font-bold leading-loose">«اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ...»</p>
            </div>
          </div>
        </div>

      </div>

      <button id="advice-close" type="button"
        class="advice-start-btn cursor-pointer">
        <span class="advice-start-icon">🌿</span>
        <span>ابدأ الأذكار</span>
      </button>

    </div>
  `
  document.body.appendChild(modal)

  const closeBtn = modal.querySelector<HTMLButtonElement>('#advice-close')

  closeBtn?.addEventListener('click', hide)

  window.addEventListener('show-advice', () => show())
}

function show(): void {
  if (!modal) return
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  document.body.classList.add('modal-open')
  window.dispatchEvent(new CustomEvent('reader-opened'))

  const scroller = modal.querySelector<HTMLElement>('#advice-scroll')
  if (scroller) scroller.scrollTop = 0
}

function hide(): void {
  if (!modal) return
  modal.classList.add('hidden')
  modal.classList.remove('flex')
  document.body.classList.remove('modal-open')
  window.dispatchEvent(new CustomEvent('reader-closed'))
}
