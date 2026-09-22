/* =====================================================================
   gbtn.js — تفاعل أزرار اللعبة (مُستخرج من js/buttons.js في الحزمة)
   الموجة النقرية + القفزة + نقرة صوتية اختيارية (Web Audio) + إشعار نصي
   =====================================================================
   كل زر يحمل:
     data-theme="steel|sunset|leaf|gold|coral"   نمط الألوان
     data-name="الإعدادات"                        الاسم المعروض في الإشعار
     data-action="open-dashboard"                 الوظيفة البرمجية السابقة للزر
   عند النقر يُطلق حدثاً مخصّصاً باسم الحدث في data-action لتربطه الصفحة المضيفة
   (نفس الأحداث التي يستخدمها اللعبة: open-dashboard / open-mode-panel /
    open-garden / open-quran / toggle-pause).
   ===================================================================== */
(function () {
  'use strict'

  var buttons = document.querySelectorAll('.gbtn')
  var toastText = document.getElementById('toast-text')
  var toastDot = document.getElementById('toast-dot')
  var soundToggle = document.getElementById('sound-toggle')
  var depthToggle = document.getElementById('depth-toggle')
  var audioCtx = null

  /* لون توهّج كل نمط (نفس --glow في gbtn.css) */
  var themeColors = {
    steel: '#6f9dff',
    sunset: '#ff8a4c',
    leaf: '#77e06e',
    gold: '#ffd577',
    coral: '#ff7ea0',
    violet: '#aa8cff',
  }
  var toneMap = { steel: 520, sunset: 660, leaf: 600, gold: 740, coral: 460, violet: 560 }

  /* --- نغمة نقرة قصيرة عبر Web Audio (بدون أي ملفات صوت) --- */
  function clickTone(freq) {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return
        audioCtx = new AC()
      }
      var t = audioCtx.currentTime
      var osc = audioCtx.createOscillator()
      var gain = audioCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.12)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(t)
      osc.stop(t + 0.18)
    } catch (e) { /* تجاهل أي خطأ صوتي */ }
  }

  function toast(message, color) {
    if (toastText) toastText.textContent = message
    if (toastDot && color) {
      toastDot.style.background = color
      toastDot.style.boxShadow =
        '0 0 0 4px ' + hexA(color, 0.18) + ', 0 0 14px ' + color
    }
  }

  /* تحويل لون hex إلى rgba بشفافية معيّنة (للهالة) */
  function hexA(hex, alpha) {
    var h = hex.replace('#', '')
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    var n = parseInt(h, 16)
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')'
  }

  /* --- ربط التفاعل بكل زر --- */
  Array.prototype.forEach.call(buttons, function (btn) {
    var theme = btn.getAttribute('data-theme') || 'steel'

    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-name') || 'زر'
      var action = btn.getAttribute('data-action') || ''
      var color = themeColors[theme] || '#6f9dff'

      /* موجة نقرية حول الزر (إعادة تشغيل الحركة) */
      btn.classList.remove('is-pulsing')
      void btn.offsetWidth
      btn.classList.add('is-pulsing')

      /* قفزة ممتعة */
      btn.classList.remove('is-clicked')
      void btn.offsetWidth
      btn.classList.add('is-clicked')

      if (soundToggle && soundToggle.checked) clickTone(toneMap[theme] || 520)

      /* ربط الزر بوظيفته البرمجية السابقة في اللعبة */
      if (action) document.dispatchEvent(new CustomEvent(action, { detail: { name: name, theme: theme } }))
      toast('تم الضغط على: ' + name + (action ? '  ←  ' + action : ''), color)
    })

    btn.addEventListener('animationend', function (e) {
      if (e.animationName === 'gbtn-pulse') btn.classList.remove('is-pulsing')
      if (e.animationName === 'gbtn-pop') btn.classList.remove('is-clicked')
    })
  })

  /* --- تبديل عمق الإطار (مرتفع / منخفض) --- */
  if (depthToggle) {
    depthToggle.addEventListener('click', function () {
      var flat = document.body.classList.toggle('flat')
      depthToggle.textContent = flat ? 'عمق الإطار: منخفض' : 'عمق الإطار: مرتفع'
    })
  }
})()
