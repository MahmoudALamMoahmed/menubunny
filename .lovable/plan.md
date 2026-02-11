

# إصلاح CLS المتبقي (0.0051)

## تحليل السبب

بمقارنة الـ Skeleton مع المحتوى الفعلي، وجدت فروقات صغيرة في **قسم الفئات (Categories)**:

| العنصر | Skeleton | الفعلي |
|--------|----------|--------|
| الحاوية الخارجية | `flex gap-2` مباشرة | `flex items-center justify-between flex-wrap gap-4` ثم بداخلها `flex gap-2 overflow-x-auto pb-3` |
| padding سفلي | لا يوجد | `pb-3` (للـ scrollbar) |
| حجم الأزرار | `h-8 w-16` ثابت | Button component بـ `size="sm"` (ممكن يختلف قليلاً) |

الـ `pb-3` الإضافي في الفئات الفعلية يزيد ارتفاع القسم بـ 12px عن الـ skeleton، وهذا يدفع كل شيء تحته (أزرار العرض + الوجبات) للأسفل = layout shift.

الناف بار السفلي `fixed bottom-0` فهو خارج الـ document flow ولا يسبب shift.

## الحل

### ملف: `src/pages/Restaurant.tsx`

**تغيير واحد** -- مطابقة هيكل الـ Skeleton للفئات مع الفعلي (سطر 332-340):

```tsx
// قبل (Skeleton):
<div className="bg-white border-b">
  <div className="container mx-auto px-4 py-4">
    <div className="flex gap-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-8 w-16 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  </div>
</div>

// بعد (مطابق للفعلي):
<div className="bg-white border-b">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex gap-2 overflow-x-auto pb-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-8 w-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  </div>
</div>
```

هذا يضمن أن الـ skeleton يحجز نفس المساحة بالضبط (بما فيها الـ `pb-3`) فلما المحتوى الفعلي يظهر، لا يحصل أي انزياح.

## النتيجة المتوقعة

| المؤشر | قبل | بعد |
|--------|------|------|
| CLS | 0.0051 | ~0 |
