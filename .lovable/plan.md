

# إصلاح CLS 0.09 + تحسين LCP 2.06s

## المشاكل المتبقية

### 1. CLS 0.0857 — صورة الغلاف (المشكلة الرئيسية)
الصورة الرئيسية للغلاف تستخدم `max-w-full max-h-full object-contain` داخل flex container. عندما الصورة تتحمل، العنصر يتمدد من 0x0 إلى حجمه الطبيعي مما يسبب layout shift داخل الـ viewport.

**الحل:** تغيير `max-w-full max-h-full` إلى `w-full h-full` على صورة الغلاف الرئيسية. بما أن الحاوية لها ارتفاع ثابت (`h-56 sm:h-64 md:h-80 lg:h-96`)، الصورة هتاخد المساحة كاملة فوراً بدون ما تستنى التحميل.

### 2. CLS 0.0084 — أزرار طريقة العرض (بسيط)
فرق طفيف بين حجم الـ skeleton (`w-11 h-11`) وحجم الأزرار الفعلية (`p-3` + icon `w-5 h-5`). الزر الفعلي حجمه 44px (p-3 = 12px كل جانب + 20px أيقونة = 44px) وهو نفس `w-11 h-11` (44px). الفرق غالباً من `border` الموجود على الأزرار الفعلية وغير موجود على الـ skeleton.

**الحل:** إضافة `border border-transparent` على الـ skeleton placeholders لمطابقة الـ box model.

### 3. LCP 2.06s — صورة الـ blur هي الـ LCP
المتصفح يختار صورة الـ blur (`blur-xl scale-110`) كـ LCP لأنها تغطي مساحة أكبر من الصورة الرئيسية. المشكلة مش في سرعة التحميل (نفس الـ URL) لكن في أن الـ blur image مش المحتوى الأساسي.

**الحل:** إضافة `fetchpriority="high"` على صورة الـ blur أيضاً (هي نفس الـ URL فعلياً فلن تسبب طلب إضافي) + إضافة `decoding="sync"` لضمان الرسم الفوري.

---

## التفاصيل التقنية

### ملف: `src/pages/Restaurant.tsx`

**تغيير 1** — صورة الغلاف الرئيسية (سطر ~398):
```tsx
// قبل:
className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-4 border-white/20"

// بعد:
className="w-full h-full object-contain rounded-2xl shadow-2xl border-4 border-white/20"
```

**تغيير 2** — صورة الـ blur (سطر ~390):
```tsx
// قبل:
className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"

// بعد: إضافة fetchpriority و decoding
<img 
  src={getCoverImageUrl(restaurant.cover_image_url)} 
  alt="" 
  aria-hidden="true"
  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
  // @ts-ignore
  fetchpriority="high"
  decoding="sync"
/>
```

**تغيير 3** — Skeleton View Toggle (سطر ~327-328):
```tsx
// قبل:
<div className="w-11 h-11 bg-muted animate-pulse rounded-md" />
<div className="w-11 h-11 bg-muted animate-pulse rounded-md" />

// بعد:
<div className="w-11 h-11 bg-muted animate-pulse rounded-md border border-transparent" />
<div className="w-11 h-11 bg-muted animate-pulse rounded-md border border-transparent" />
```

## النتيجة المتوقعة

| المؤشر | قبل | بعد |
|--------|------|------|
| CLS | 0.09 | قريب من 0 |
| LCP | 2.06s | أسرع (decoding sync + صورة تاخد المساحة فوراً) |

