

# إصلاح CLS 0.077 + تحسين LCP 2.89s

## تحليل المشاكل

### 1. CLS صورة الغلاف (0.0675)
مع `max-w-full max-h-full`، عنصر الـ img يبدأ بحجم 0x0 وينمو لما الصورة تتحمل. الحل الوحيد اللي يحافظ على البوردر الملتصق بالصورة هو إضافة `decoding="sync"` على الصورة الرئيسية. هذا يجبر المتصفح على فك تشفير الصورة في نفس الـ frame اللي تتحمل فيه، فالتحول يحصل فوراً بدون ما المستخدم يلاحظه كـ shift.

### 2. CLS أزرار العرض + المنيو (0.0095)
العناصر المتأثرة هي الحاويات نفسها (`div.container.px-4.flex.justify-end.gap-2.py-4` و `div.container.mx-auto.px-4.pb-32`). هذا الـ shift يحصل لما صورة الغلاف (فوقهم) تتغير حجمها داخل الـ overflow-hidden container -- حتى لو الحاوية ارتفاعها ثابت، تغيير الصورة الداخلية يمكن يأثر على حساب الـ layout. إضافة `decoding="sync"` للصورة هيحل هذا أيضاً.

### 3. LCP 2.89s -- صورة الـ blur
حالياً الصورة تتحمل بعد ما React يعمل render. يمكن تسريعها بإضافة `<link rel="preload">` ديناميكياً في الـ `<head>` فور معرفة الـ URL، قبل ما الـ component يعمل render.

## التفاصيل التقنية

### ملف: `src/pages/Restaurant.tsx`

**تغيير 1** -- إضافة `decoding="sync"` على صورة الغلاف الرئيسية (سطر ~398-405):
```tsx
// بعد:
<img 
  src={getCoverImageUrl(restaurant.cover_image_url)} 
  alt={restaurant.name} 
  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-4 border-white/20" 
  loading="eager"
  // @ts-ignore
  fetchpriority="high"
  decoding="sync"
/>
```

**تغيير 2** -- Preload ديناميكي لصورة الغلاف لتحسين LCP. إضافة `useEffect` يحقن `<link rel="preload">` في الـ `<head>` فور توفر بيانات المطعم:
```tsx
useEffect(() => {
  if (restaurant?.cover_image_url) {
    const url = getCoverImageUrl(restaurant.cover_image_url);
    // تجنب التكرار
    if (!document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      // @ts-ignore
      link.fetchpriority = 'high';
      document.head.appendChild(link);
    }
  }
}, [restaurant?.cover_image_url]);
```

## النتيجة المتوقعة

| المؤشر | قبل | بعد (متوقع) |
|--------|------|------|
| CLS | 0.077 | اقل بكتير -- decoding sync يقلل نافذة الـ shift |
| LCP | 2.89s | اسرع -- preload يبدأ تحميل الصورة مبكراً |

