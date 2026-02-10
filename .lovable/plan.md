

# اصلاح مشكلة الأداء في useSizes

## المشكلة

`useSizes` في `useRestaurantData.ts` و `useAdminSizes` في `useAdminData.ts` يجلبان **كل الأحجام من قاعدة البيانات بالكامل** بدون أي فلترة بـ `restaurant_id`. هذا يعني أن كل مطعم يحمّل أحجام كل المطاعم الأخرى.

**السبب:** جدول `sizes` لا يحتوي على عمود `restaurant_id` - هو مرتبط فقط عبر `menu_item_id`.

---

## الحل

استخدام استعلام Supabase مع فلتر عبر العلاقة (foreign key filter) لجلب الأحجام التابعة لأصناف المطعم فقط:

```typescript
.from('sizes')
.select('*, menu_items!inner(restaurant_id)')
.eq('menu_items.restaurant_id', restaurantId!)
```

هذا يولّد `INNER JOIN` في SQL يفلتر الأحجام حسب `restaurant_id` الموجود في `menu_items`.

---

## التغييرات المطلوبة

### 1. useRestaurantData.ts - useSizes (سطر 87-91)
تعديل الاستعلام من:
```typescript
const { data, error } = await supabase
  .from('sizes')
  .select('*')
  .order('display_order');
```
الى:
```typescript
const { data, error } = await supabase
  .from('sizes')
  .select('*, menu_items!inner(restaurant_id)')
  .eq('menu_items.restaurant_id', restaurantId!)
  .order('display_order');
```

### 2. useAdminData.ts - useAdminSizes (سطر 56-59)
نفس التعديل بالضبط.

---

## النتيجة المتوقعة

- بدلاً من جلب كل الأحجام في قاعدة البيانات، يتم جلب أحجام المطعم الحالي فقط
- تقليل حجم البيانات المنقولة وتحسين سرعة الاستعلام
- لا يوجد تأثير على باقي الكود لأن البيانات الإضافية (`menu_items`) تأتي كـ nested object ولا تتعارض مع الاستخدام الحالي

