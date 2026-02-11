

# خطة تحسين CLS في صفحة المطعم

## المشكلة
صفحة المطعم `/mahmoud` تعاني من CLS بسبب عدة مصادر:

1. **FOUT من الخطوط الـ Async**: تحويل Google Fonts إلى `media="print"` أزال render-blocking لكن أدخل مشكلة FOUT - النص يُرسم بخط النظام ثم يتبدل لخط Cairo/Tajawal مما يسبب layout shift
2. **قسم أزرار التبديل مفقود من الـ Skeleton**: المحتوى الفعلي يحتوي أزرار grid/list بينما الـ Skeleton لا يحتويها
3. **قسم الفئات مشروط**: الـ Skeleton يعرض فئات دائماً لكن المحتوى الفعلي يخفيها إذا لم توجد فئات

## التغييرات المطلوبة

### 1. إصلاح FOUT باستخدام `font-display: optional` + Self-hosting (index.html)

بدلاً من `media="print"` الذي يسبب FOUT، نعيد الخط الأساسي (Cairo 600,700) كـ render-blocking (ضروري لمنع CLS) ونُبقي الأوزان الثانوية فقط كـ async:

- إعادة `Cairo:wght@600;700 + Tajawal:wght@400;500` إلى `rel="stylesheet"` عادي (بدون media="print") لأنها الأوزان المرئية فوراً
- إبقاء `Cairo:wght@400;500 + Tajawal:wght@700` كـ async (media="print") لأنها تُستخدم في أقسام تحت الطي

### 2. إضافة أزرار التبديل للـ Skeleton (Restaurant.tsx)

إضافة placeholder لأزرار grid/list في الـ Skeleton بعد قسم الفئات وقبل كروت المنيو، بنفس الأبعاد والمحاذاة.

### 3. إضافة `font-display: swap` مع size-adjust في CSS (index.css)

إضافة `@font-face` override مع `size-adjust` لتقليل الفرق بين خط النظام والخط العربي عند التبديل.

## النتيجة المتوقعة

| المؤشر | قبل | بعد |
|--------|------|------|
| CLS | مرتفع (FOUT + skeleton mismatch) | قريب من 0 |
| Render-blocking | 0ms | ~165ms (CSS الخطوط الأساسية فقط) |
| LCP | بدون تغيير | بدون تغيير |

## التفاصيل التقنية

### index.html
- السطر 15: إزالة `media="print" onload="this.media='all'"` من رابط الخطوط الأساسية (Cairo 600,700 + Tajawal 400,500)
- إبقاء السطر 16 كما هو (الأوزان الثانوية async)

### src/pages/Restaurant.tsx
- إضافة بعد Skeleton Categories (سطر 318) وقبل Skeleton Menu Cards (سطر 320):
```text
Skeleton View Toggle:
  container px-4 flex justify-end gap-2 py-4
    div w-11 h-11 bg-muted animate-pulse rounded-md
    div w-11 h-11 bg-muted animate-pulse rounded-md
```

