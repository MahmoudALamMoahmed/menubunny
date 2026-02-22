

# اشعارات فورية Real-time للطلبات الجديدة

## النهج

انشاء hook مخصص `useOrdersRealtime` يستخدم Supabase Realtime للاستماع لجدول `orders` ويقوم بـ:
1. عند وصول طلب جديد (INSERT): اعادة جلب بيانات React Query تلقائياً + عرض toast تنبيهي
2. عند تحديث طلب (UPDATE): اعادة جلب البيانات بصمت (بدون toast)

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/hooks/useOrdersRealtime.ts` | **انشاء جديد** - Hook للاشتراك في Supabase Realtime |
| `src/pages/Orders.tsx` | اضافة استدعاء الـ hook |
| `src/pages/BranchOrders.tsx` | اضافة استدعاء الـ hook |

---

## التفاصيل التقنية

### Hook: `useOrdersRealtime`

```typescript
// المعاملات:
// - filterColumn: 'restaurant_id' او 'branch_id'
// - filterValue: قيمة الفلتر (ID)
// - queryKey: مفتاح React Query لاعادة الجلب

useOrdersRealtime({
  filterColumn: 'restaurant_id',
  filterValue: restaurant.id,
  queryKey: ['admin_orders', restaurant.id]
});
```

**آلية العمل:**
- يُنشئ `supabase.channel()` مع اسم فريد يتضمن الـ ID
- يستمع لأحداث `INSERT` و `UPDATE` على جدول `orders` مع فلتر `eq` على العمود المحدد
- عند INSERT: يستدعي `queryClient.invalidateQueries` + يعرض toast "طلب جديد!"
- عند UPDATE: يستدعي `queryClient.invalidateQueries` فقط (تحديث صامت)
- يقوم بـ cleanup (unsubscribe) عند unmount أو تغير المعاملات
- يستخدم `useRef` لتجنب عرض toast مكرر

### استخدام فلتر Supabase Realtime على مستوى السيرفر

بدلاً من استقبال كل الطلبات وفلترتها في الكلاينت، سيتم استخدام فلتر `eq` في الاشتراك:

```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'orders',
  filter: `restaurant_id=eq.${restaurantId}`
}, callback)
```

هذا يضمن ان السيرفر يرسل فقط الاحداث المتعلقة بمطعم/فرع المستخدم الحالي.

### تنبيه Toast للطلب الجديد

عند وصول طلب جديد يظهر toast يحتوي:
- عنوان: "طلب جديد!"
- وصف: اسم العميل

### الاستخدام في Orders.tsx (صاحب المطعم)

```typescript
useOrdersRealtime({
  filterColumn: 'restaurant_id',
  filterValue: restaurant?.id,
  queryKey: ['admin_orders', restaurant?.id]
});
```

### الاستخدام في BranchOrders.tsx (موظف الفرع)

```typescript
useOrdersRealtime({
  filterColumn: 'branch_id',
  filterValue: branchStaffInfo?.branch_id,
  queryKey: ['branch_orders', branchStaffInfo?.branch_id]
});
```

---

## ملاحظات

- Supabase Realtime يحتاج ان يكون مفعلاً على جدول `orders` (يتم تفعيله عبر الـ Dashboard او migration)
- الـ hook يعمل مع RLS تلقائياً لان الاشتراك يحترم سياسات الامان
- لا حاجة لتغيير قاعدة البيانات اذا كان Realtime مفعلاً بالفعل على الجدول

