/**
 * audio.ts — محاكي صوتي مبني على Web Audio API.
 * يولّد صوت فرقعة ناعم ولطيف (Soft Pop) عند الكبس بدون ملفات صوتية خارجية.
 */
import { isSoundEnabled } from './SettingsService'

export interface PopOptions {
  /** إزاحة نغمية بالنصف نغمة (semitone) لإعطاء كل نوع ذِكر نغمة مميزة. */
  pitch?: number
  /** شدة الصوت (0..1). */
  volume?: number
}

let ctx: AudioContext | null = null

/** إحضار سياق صوتي واحد مشترك، وإنشاؤه عند أول استخدام (ضمن إيماءة المستخدم). */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/**
 * تشغيل صوت فرقعة ناعم: نغمة جيبية منخفضة تتهاوى سريعاً
 * + نغمة مثلثية رفيعة تمنح الإحساس "بامتداد الفقاعة".
 * @returns true إذا تم تشغيل الصوت فعلاً.
 */
export function playPop(options: PopOptions = {}): boolean {
  // احترام إعداد كتم الصوت (sound_enabled !== 'false')
  if (!isSoundEnabled()) return false
  const { pitch = 0, volume = 1 } = options
  const ac = getContext()
  if (!ac) return false

  const t = ac.currentTime
  const master = ac.createGain()
  master.gain.setValueAtTime(0.0001, t)
  master.gain.exponentialRampToValueAtTime(Math.min(0.5, 0.28 * volume), t + 0.012)
  master.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  master.connect(ac.destination)

  const tone = (from: number, to: number, type: OscillatorType, level: number): void => {
    const osc = ac.createOscillator()
    osc.type = type
    const gain = ac.createGain()
    gain.gain.value = level
    osc.connect(gain)
    gain.connect(master)
    const shift = Math.pow(2, pitch / 12)
    osc.frequency.setValueAtTime(from * shift, t)
    osc.frequency.exponentialRampToValueAtTime(to * shift, t + 0.12)
    osc.start(t)
    osc.stop(t + 0.16)
  }

  // الجسم الرئيسي للفرقعة (نغمة ناعمة تتهاوى بسرعة)
  tone(330, 70, 'sine', 1)
  // "لمعة" خفيفة علوية تجعل الصوت حيوياً
  tone(940, 280, 'triangle', 0.3)

  return true
}

/**
 * نغمة زن دافئة وهادئة (أجراس ناعمة متصاعدة) لبيئة الاستغفار التأملي.
 * @returns true إذا تم تشغيل النغمة فعلاً.
 */
export function playZenTone(volume = 0.6): boolean {
  const ac = getContext()
  if (!ac) return false
  const t = ac.currentTime
  const master = ac.createGain()
  master.gain.setValueAtTime(0.0001, t)
  master.gain.exponentialRampToValueAtTime(0.2 * volume, t + 0.05)
  master.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
  master.connect(ac.destination)

  const bell = (freq: number, at: number, level: number): void => {
    const osc = ac.createOscillator()
    osc.type = 'sine'
    const gain = ac.createGain()
    gain.gain.value = level
    osc.connect(gain)
    gain.connect(master)
    osc.frequency.setValueAtTime(freq, t + at)
    osc.start(t + at)
    osc.stop(t + at + 1.2)
  }

  bell(392, 0, 1) // G4
  bell(523.25, 0.09, 0.55) // C5
  bell(659.25, 0.18, 0.3) // E5
  return true
}
