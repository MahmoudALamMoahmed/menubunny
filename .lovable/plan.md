

# إصلاح CLS 0.32 — مطابقة هيكل الـ Skeleton مع المحتوى الفعلي

## المشكلة الجذرية
الـ Skeleton والمحتوى الفعلي لهم **بنية HTML مختلفة**، مش بس أبعاد مختلفة. عند انتهاء التحميل، React يشيل الـ Skeleton بالكامل ويحط المحتوى الفعلي، وأي فرق في الهيكل يسبب Layout Shift.

## الفروق المكتشفة والحلول

### 1. قسم الأيقونات (Info) — هيكل مختلف

**Skeleton الحالي:**
```text
div.bg-white.border-b
  div.container.mx-auto.px-4.py-4
    div.flex.items-center.gap-3        <-- الأيقونات مباشرة
```

**المحتوى الفعلي:**
```text
div.bg-white.border-b
  div.container.mx-auto.px-4.py-4
    div.flex.items-center.gap-4        <-- wrapper إضافي
      div.flex.items-center.gap-3      <-- الأيقونات هنا
```

**الحل:** إضافة الـ wrapper div بنفس الـ classes (`flex items-center gap-4 text-sm text-gray-600`) في الـ Skeleton.

### 2. قسم الفئات (Categories) — عرض مشروط

**Skeleton الحالي:** يعرض الفئات دائماً  
**المحتوى الفعلي:** `{categories.length > 0 && ...}` — مشروط

**الحل:** بما أن البيانات لم تُحمل بعد أثناء الـ Skeleton، لا نعرف إن كان المطعم له فئات أم لا. الحل الأسلم هو **إبقاء الفئات في الـ Skeleton** لأن معظم المطاعم لها فئات. لكن لو مطعم mahmoud مفيهوش فئات، يجب حذف قسم الفئات من الـ Skeleton.

### 3. قسم المنيو — classes مختلفة

**Skeleton:** `container mx-auto px-4 py-4`  
**الفعلي:** `container mx-auto px-4 pb-32`

**الحل:** تغيير الـ Skeleton ليستخدم `pb-32` بدل `py-4`.

## التفاصيل التقنية

### ملف: `src/pages/Restaurant.tsx`

**تغيير 1** — Skeleton Info (سطر ~304-312):
```tsx
// قبل:
<div className="bg-white border-b">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
      <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
      <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
    </div>
  </div>
</div>

// بعد:
<div className="bg-white border-b">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  </div>
</div>
```

**تغيير 2** — Skeleton Menu Cards container (سطر ~329):
```tsx
// قبل:
<div className="container mx-auto px-4 py-4">

// بعد:
<div className="container mx-auto px-4 pb-32">
```

## النتيجة المتوقعة
- CLS ينخفض بشكل كبير لأن الهيكل أصبح متطابق
- الـ wrapper div المفقود كان يسبب فرق في حساب المسافات مما يحرك كل العناصر تحته
- تغيير `py-4` إلى `pb-32` يضمن أن قسم المنيو لا يتحرك عند التبديل

