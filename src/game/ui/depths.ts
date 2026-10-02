/**
 * depths — سلّم موحّد لعمق الطبقات داخل الـ Canvas.
 *
 * لماذا ملف واحد؟ كان كل مشهد يكتب أرقاماً متفرّقة (2500، 1999، 1500، 2001)،
 * فتسبب ذلك في تراكب حقيقي: الفقاعات عند 2500 كانت تُرسَم *فوق* عدّاد الجلسة
 * (1999) وشريط التخصيص (2000)، بينما الشريط الجانبي كان مرسوماً في مدى مختلف.
 *
 * القاعدة: الخلفية تحت 0، وHUD داخل Canvas عند 1000، والأذكار الطافية عند 2500،
 * ثم النوافذ داخل Canvas. نوافذ DOM تُرتّب فوق الـ Canvas عبر CSS.
 */

/** خلفيات المشهد (سماء، حديقة) — خلف كل شيء. */
export const DEPTH_BACKGROUND = -20

/** عناصر اللعب الطافية: الفقاعات/البالونات/الجواهر. */
export const DEPTH_GAMEPLAY = 2500

/** جزيئات مرافقة الفقاعات (تُدمج بـ ADD) — خلف الفقاعة نفسها. */
export const DEPTH_GAMEPLAY_PARTICLE = DEPTH_GAMEPLAY - 1

/**
 * واجهة اللعب الدائمة داخل Canvas — تحت الأذكار الطافية.
 * ملاحظة: هذه طبقة *داخل الـ Canvas* فقط. الواجهة التي تُبنى بـ DOM
 * (الشريط العلوي .rk-header) تُرتَّب بـ z-index لا بـ depth — انظر style.css.
 */
export const DEPTH_HUD = 1000

/** عدّاد الجلسة (إطار session.png + الرقم داخله). */
export const DEPTH_SESSION_COUNTER = DEPTH_HUD + 1

/** بطاقات النوافذ الداكنة والحواجز التي تحجب اللعب. */
export const DEPTH_MODAL = 3000

/** حواجز التعتيم فوق البطاقات (30 + 1). */
export const DEPTH_MODAL_BLOCKER = DEPTH_MODAL + 1

/** بطاقات الاحتفال/الاستراحة ورسائل النمط. */
export const DEPTH_CARD = DEPTH_MODAL + 1

/** النوافذ الفاتحة (LightModal) — فوق كل ما سبق. */
export const DEPTH_LIGHT_MODAL = 5000