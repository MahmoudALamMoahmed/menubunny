
# تنظيف الكود المهمل وإصلاح التضارب

## ما وجدته بعد المراجعة الشاملة

### المشكلة 1 - `useAdminData.ts`: Hook مهمل تماماً

`useCurrentStaffInfo` (السطر 191-205) لم يُستخدم في **أي ملف** في المشروع. كان مُخصصاً للنظام القديم قبل نقل منطق التحقق من نوع المستخدم داخل `useAuth.tsx`. الحل: **حذفه**.

### المشكلة 2 - `Orders.tsx`: نقص في شرط التحميل

السطر 87 في `Orders.tsx` يتحقق من `authLoading` لكن لا يتحقق من `userTypeLoading`. هذا يعني أن الصفحة قد تبدأ في عرض بيانات المطعم وجلب الطلبات **قبل اكتمال التحقق من نوع المستخدم**، مما قد يؤدي إلى لحظة عرض خاطئة لموظف الفرع قبل أن يُطرد بالـ Guard.

```typescript
// الحالي (خطأ):
if (authLoading || restaurantLoading || ordersLoading) {

// الصحيح:
if (authLoading || userTypeLoading || restaurantLoading || ordersLoading) {
```

---

## الملفات السليمة - لا تحتاج تعديل

| الملف | الحالة |
|---|---|
| `useAuth.tsx` | نظيف - `userTypeLoading` صحيح |
| `Auth.tsx` | نظيف - redirect لـ `branch-orders` صحيح |
| `BranchesManagement.tsx` | نظيف - guard يعمل صحيح |
| `BranchOrders.tsx` | نظيف - guard وبيانات صحيحة |
| `useAdminMutations.ts` | نظيف - `useUpdateOrderStatus` يدعم كلا النوعين |

---

## التعديلات المطلوبة

### 1. `src/hooks/useAdminData.ts` - حذف `useCurrentStaffInfo`
حذف الـ hook كاملاً (السطور 191-205) لأنه مهمل ولا يُستخدم في أي مكان.

### 2. `src/pages/Orders.tsx` - إضافة `userTypeLoading` لشرط التحميل
تعديل السطر 87 ليشمل `userTypeLoading` في شرط التحميل.

---

## ملخص الملفات المتأثرة

| الملف | نوع التعديل | التفاصيل |
|---|---|---|
| `src/hooks/useAdminData.ts` | **حذف hook** | حذف `useCurrentStaffInfo` المهمل |
| `src/pages/Orders.tsx` | **إصلاح بسيط** | إضافة `userTypeLoading` لشرط التحميل |
