

# إصلاح CLS 0.33 في صفحة المطعم

## المشكلة
ثلاثة عناصر في الـ Skeleton لا تطابق المحتوى الفعلي، مما يسبب انزياح تخطيط (Layout Shift) عند تحميل البيانات.

## التغييرات المطلوبة

### 1. إصلاح أزرار الهيدر (Skeleton Header)
**المشكلة**: الـ Skeleton يعرض placeholder واحد (`h-9 w-24`) بينما المحتوى الفعلي يعرض زرين بداخل `div.flex.items-center.gap-2`.

**الحل**: استبدال الـ placeholder الواحد بـ `div` يحتوي زرين بنفس أبعاد الأزرار الفعلية:
- زر المشاركة: `h-9 w-20`
- زر إدارة المطعم: `h-9 w-28`
- ملفوفين في `div.flex.items-center.gap-2` لمطابقة البنية الفعلية

### 2. إصلاح أيقونات التواصل (Skeleton Info)
**المشكلة**: الـ Skeleton يعرض أيقونتين ثابتتين بينما المحتوى الفعلي يعرض 1-3 أيقونات حسب البيانات (الفروع دائماً موجودة + فيسبوك وإنستجرام مشروطين).

**الحل**: عرض 3 أيقونات في الـ Skeleton (أقصى حالة ممكنة) بنفس الأبعاد (`w-9 h-9 rounded-xl`) لتغطية كل الحالات. هذا يضمن أن أي عدد أقل من الأيقونات لن يسبب shift لأن العناصر تنكمش فقط (لا تتمدد).

### 3. إصلاح View Toggle (عدم تطابق CSS class)
**المشكلة**: الـ Skeleton يستخدم `container mx-auto` بينما المحتوى الفعلي يستخدم `container` بدون `mx-auto`.

**الحل**: إزالة `mx-auto` من الـ Skeleton ليطابق المحتوى الفعلي بالضبط.

---

## التفاصيل التقنية

### ملف: `src/pages/Restaurant.tsx`

**تغيير 1** - سطر 295 (Skeleton Header الجزء الأيمن):
```
قبل:  <div className="h-9 w-24 bg-muted animate-pulse rounded" />
بعد:  <div className="flex items-center gap-2">
        <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
        <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
      </div>
```

**تغيير 2** - سطر 303-306 (Skeleton Info icons):
```
قبل:  <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
      </div>
بعد:  <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
        <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
      </div>
```

**تغيير 3** - سطر 320 (Skeleton View Toggle):
```
قبل:  <div className="container mx-auto px-4 flex justify-end gap-2 py-4">
بعد:  <div className="container px-4 flex justify-end gap-2 py-4">
```

## النتيجة المتوقعة
- CLS ينخفض من 0.33 إلى قريب من 0
- لا تأثير على التصميم أو الأداء
- الـ Skeleton يطابق المحتوى الفعلي بدقة في جميع الحالات

