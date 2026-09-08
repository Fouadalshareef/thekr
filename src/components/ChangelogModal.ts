/**
 * ChangelogModal — نافذة "ما الجديد في هذا التحديث؟"
 * تظهر مرة واحدة عند إقلاع التطبيق إذا كان last_seen_version لا يطابق
 * الإصدار الحالي (APP_VERSION)، ثم تحدّث last_seen_version.
 */
import { APP_VERSION, CHANGELOG, isChangelogPending, LAST_SEEN_VERSION_KEY } from '../services/AppVersion'

let changelogModal: HTMLElement | null = null

/** إنشاء النافذة وتهيئتها (تُستدعى مرة عند الإقلاع من main.ts). */
export function initChangelog(): void {
  if (!isChangelogPending()) return

  changelogModal = document.createElement('div')
  changelogModal.id = 'changelog-modal'
  changelogModal.className = 'fixed inset-0 z-[70] flex items-center justify-center p-4'
  changelogModal.innerHTML = `
    <div id="changelog-backdrop" class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div class="relative w-[90%] max-w-[400px] rounded-2xl border border-emerald-400/50 bg-slate-900/97 p-6 shadow-2xl space-y-4 animate-[fadeIn_0.25s_ease-out]">
      <div class="flex items-center gap-3">
        <span class="text-3xl">🎉</span>
        <div>
          <h2 class="text-lg font-bold text-emerald-100">ما الجديد في هذا التحديث؟</h2>
          <p class="text-xs text-slate-400 font-mono">v${APP_VERSION}</p>
        </div>
      </div>
      <ul class="space-y-2 text-sm text-slate-200">
        ${CHANGELOG.map((item) => `<li class="rounded-lg bg-slate-800/70 px-3 py-2 leading-relaxed">${item}</li>`).join('')}
      </ul>
      <button id="changelog-close" type="button"
        class="w-full rounded-xl bg-gradient-to-l from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400
               active:scale-95 transition-all px-4 py-2.5 text-sm font-bold text-white cursor-pointer">
        رائع، لنبدأ! ✨
      </button>
    </div>
  `
  document.body.appendChild(changelogModal)

  const close = () => {
    try {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION)
    } catch {
      /* تجاهل */
    }
    changelogModal?.remove()
    changelogModal = null
  }

  changelogModal.querySelector('#changelog-close')?.addEventListener('click', close)
  changelogModal.querySelector('#changelog-backdrop')?.addEventListener('click', close)
}