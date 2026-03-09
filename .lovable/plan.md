

# إصلاح جدول "جميع الأصناف المباعة" ليطابق تصميم "الأصناف الأكثر طلباً"

## المشكلة
الجدولان متطابقان في الأعمدة والبيانات، لكن المشكلة أن `ScrollArea` يلتف حول مكون `Table` الذي بداخله `div` بـ `overflow-auto`. هذا التداخل يسبب مشاكل في العرض والمحاذاة.

## الحل
إعادة كتابة `AllItemsTable.tsx` ليستخدم نفس بنية `TopItems.tsx` بالضبط، مع إضافة `ScrollArea` بشكل صحيح عن طريق لف الـ `Card` بالكامل أو استخدام `max-h` على الـ `CardContent` مع `overflow-y-auto` بدلاً من `ScrollArea` لتجنب التعارض مع div الـ overflow الموجود داخل مكون `Table`.

## التعديل - ملف واحد: `src/components/analytics/AllItemsTable.tsx`

استبدال `ScrollArea` بـ `div` بسيط مع `overflow-y-auto` و `max-h-[400px]`:

```tsx
<div className="max-h-[400px] overflow-y-auto" dir="rtl">
  <Table>
    ...
  </Table>
</div>
```

هذا يزيل التعارض بين `ScrollArea` و `Table` ويحافظ على إمكانية التمرير مع تطابق التصميم مع جدول الأصناف الأكثر طلباً.

