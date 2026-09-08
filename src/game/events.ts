/**
 * events.ts — أسماء الأحداث (Events) المشتركة بين مشاهد اللعبة وأجسامها.
 */

/** جسامة أحداث اللعبة. */
export const Events = {
  /** يُطلق عند التقاط جسم ذِكر (فرقعة) — الحمولة: { id, name, target }. */
  DHIKR_COLLECTED: 'dhikr:collected',
} as const
