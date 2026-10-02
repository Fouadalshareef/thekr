let modal: HTMLElement | null = null

export function initAdviceModal(): void {
  modal = document.createElement('div')
  modal.id = 'advice-modal'
  modal.className = 'fixed inset-0 z-[11000] hidden items-center justify-center p-4 touch-pan-y'
  modal.innerHTML = `
    <div id="advice-backdrop" aria-hidden="true"></div>
    <main id="advice-scroll" dir="rtl" aria-labelledby="advice-title">
      <header class="welcome-header">
        <span class="welcome-mark" aria-hidden="true">✦</span>
        <p class="welcome-kicker">الباقيات الصالحات</p>
        <h1 id="advice-title">نصائح الذكر والاستغفار</h1>
        <p class="welcome-subtitle">طمأنينة القلب تبدأ بذكر الله</p>
        <span class="welcome-divider" aria-hidden="true"><i></i></span>
      </header>

      <section class="welcome-section" aria-labelledby="dhikr-ranks-title">
        <h2 id="dhikr-ranks-title"><span class="welcome-section-mark">01</span> مراتب الذكر</h2>
        <ol class="welcome-ranks">
          <li><span class="rank-number">١</span><p><strong>الأولى (الأفضل)</strong>بالقلب واللسان معاً مع حضور الذهن واستشعار المعنى.</p></li>
          <li><span class="rank-number">٢</span><p><strong>الثانية</strong>بالقلب فقط (يُثاب عليه، ومناسب للأوقات والأماكن الخاصة).</p></li>
          <li><span class="rank-number">٣</span><p><strong>الثالثة</strong>باللسان فقط (يُثاب عليه، وهو أقل مراتب الذكر).</p></li>
        </ol>
      </section>

      <section class="welcome-section welcome-istighfar" aria-labelledby="istighfar-title">
        <h2 id="istighfar-title"><span class="welcome-section-mark">02</span> الطريقة الأفضل للاستغفار</h2>
        <p class="welcome-copy">الجمع بين الإقرار بالذنب والانكسار مع حضور القلب.</p>
        <blockquote class="welcome-quote">
          <span>من أفضل الصيغ المختصرة</span>
          <strong>«أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ»</strong>
        </blockquote>
        <blockquote class="welcome-quote welcome-quote-long">
          <span>سيد الاستغفار</span>
          <strong>«اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ...»</strong>
        </blockquote>
      </section>

      <button id="advice-close" type="button" class="advice-start-btn">
        <span class="advice-start-icon" aria-hidden="true">✦</span>
        <span>ابدأ الأذكار</span>
        <span class="advice-start-arrow" aria-hidden="true">←</span>
      </button>
    </main>
  `
  document.body.appendChild(modal)

  const closeBtn = modal.querySelector<HTMLButtonElement>('#advice-close')

  closeBtn?.addEventListener('click', hide)

  // نافذة النصائح تظهر مرة واحدة فقط في عمر الصفحة (الجلسة).
  // السبب: MainScene.create() يطلق «show-advice» في كل تشغيل، والرجوع
  // من نمط الاستغفار (ZenScene) يعيد تشغيله ⇒ كانت النصائح تطفو مجدداً
  // وتمنع رؤية واجهة اللعب مباشرة بعد الرجوع.
  let adviceShown = false
  window.addEventListener('show-advice', () => {
    if (adviceShown) return
    adviceShown = true
    show()
  })
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
