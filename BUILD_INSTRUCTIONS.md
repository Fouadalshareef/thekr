# تعليمات بناء تطبيق أندرويد (APK) — الباقيات الصالحات

تم تجهيز المشروع بالكامل عبر **Capacitor**. مجلد `android/` جاهز ومتزامن مع ملفات الويب المبنية في `dist/`.

## الخطوات السريعة

### الطريقة الأولى: عبر Android Studio (الأسهل — بنقرة واحدة)
1. افتح **Android Studio**.
2. اختر **File > Open** ثم افتح مجلد `android` داخل هذا المشروع:
   ```
   albaqiyat-alsalihat/android
   ```
3. انتظر حتى ينتهي Gradle Sync (أول مرة قد يستغرق دقائق لتنزيل التبعيات).
4. من القائمة العلوية: **Build > Build App(s) APK(s)**.
5. عند انتهاء البناء اضغط **locate** في الإشعار، أو ستجد الملف في:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. انقل ملف الـ APK إلى جوالك وثبّته (فعّل "التثبيت من مصادر غير معروفة").

### الطريقة الثانية: عبر سطر الأوامر (Gradle)
```bash
cd albaqiyat-alsalihat/android
# على ويندوز:
gradlew.bat assembleDebug
# على ماك/لينكس:
./gradlew assembleDebug
```
الملف الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`

> لبناء نسخة إصدار موقّعة (Release): استخدم `gradlew.bat assembleRelease` مع إعداد مفتاح التوقيع في `android/app/build.gradle`.

## تحديث التطبيق بعد أي تعديل على الكود
```bash
cd albaqiyat-alsalihat
npm run build          # بناء ملفات الويب إلى dist/
npx cap sync android   # مزامنة dist/ مع مجلد android
```
ثم أعد بناء الـ APK بالطريقة أعلاه.

## PWA (التثبيت من المتصفح)
المشروع مهيأ أيضاً كـ **PWA** قابل للتثبيت مباشرة من المتصفح:
- `public/manifest.json` — بيانات التطبيق (الاسم، الألوان، الاتجاه Portrait، الأيقونات).
- `public/sw.js` — Service Worker للعمل دون اتصال.
- بعد نشر الموقع (مثلاً على GitHub Pages أو Netlify)، سيظهر زر "تثبيت التطبيق" في المتصفح.

## بيانات الحزمة
- **اسم التطبيق:** الباقيات الصالحات
- **معرّف الحزمة:** `com.albaqiyat.alsalihat`
- **web-dir:** `dist`
- **الإعدادات:** `capacitor.config.ts` في جذر المشروع