

## ثلاث مشاكل يجب حلها

### 1. قفل صفحتي طلبات واتساب وتقارير واتساب في الباقة المجانية

**الملفات:** `WhatsAppOrders.tsx` و `WhatsAppAnalytics.tsx`

نفس نمط `Orders.tsx`: إضافة `useRestaurantLimits` + `UpgradePrompt` مع فحص `features.whatsapp_orders`.

```typescript
const { data: limits } = useRestaurantLimits(restaurant?.id);
const hasWhatsappOrders = !limits || (limits.features as any)?.whatsapp_orders;

// في الـ JSX:
{!hasWhatsappOrders ? (
  <UpgradePrompt feature="طلبات واتساب" description="..." />
) : ( /* المحتوى الحالي */ )}
```

### 2. منع موظف الفرع من الدخول في الباقة المجانية

**الملف:** `BranchOrders.tsx`

الموظف يملك `branchStaffInfo.restaurant_id` — نستخدمه لجلب `useRestaurantLimits` ونفحص `features.branch_staff`. إذا كانت الميزة غير متاحة، نعرض رسالة ونمنع الوصول.

```typescript
const { data: limits } = useRestaurantLimits(branchStaffInfo?.restaurant_id);
const hasBranchStaff = limits?.features && (limits.features as any)?.branch_staff;

// إذا الباقة لا تدعم موظفي الفروع → عرض رسالة "اشتراك المطعم لا يشمل هذه الميزة"
```

### 3. إشعار صوتي لا يعمل في تبويب واتساب (موظف الفرع)

**السبب:** `useOrdersRealtime` يشترك في كل `INSERT` على `branch_id` بدون فلتر `order_source`. الاشتراك واحد ولكن الـ `queryKey` يتغير مع التبويب — فعند INSERT طلب واتساب أثناء التواجد في تبويب dashboard، يتم تجاهله لأن الـ processedIds يمنع التكرار عند التبديل.

**المشكلة الفعلية:** القناة تفلتر بـ `branch_id` فقط. عند وصول طلب واتساب والمستخدم في تبويب dashboard، يتم invalidate الـ query الخاص بـ dashboard فقط (لأن queryKey يحتوي على activeTab). الصوت يعمل لأي طلب جديد بغض النظر عن المصدر — لكن المستخدم لا يرى الطلب لأنه في تبويب آخر.

**الحل:** في `BranchOrders.tsx`، إضافة اشتراكين realtime — واحد لكل مصدر — أو اشتراك واحد يعمل invalidate لكلا الـ queryKeys. الأبسط: إضافة استدعاء ثانٍ لـ `useOrdersRealtime` لتغطية كلا التبويبين:

```typescript
// إشعارات لطلبات لوحة التحكم
useOrdersRealtime({
  filterColumn: 'branch_id',
  filterValue: branchStaffInfo?.branch_id,
  queryKey: ['branch_orders', branchStaffInfo?.branch_id, 'dashboard'],
});

// إشعارات لطلبات واتساب
useOrdersRealtime({
  filterColumn: 'branch_id',
  filterValue: branchStaffInfo?.branch_id,
  queryKey: ['branch_orders', branchStaffInfo?.branch_id, 'whatsapp'],
});
```

هذا يضمن أن أي طلب جديد يشغل الصوت والإشعار بغض النظر عن التبويب النشط، ويحدث بيانات كلا التبويبين.

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `WhatsAppOrders.tsx` | إضافة `useRestaurantLimits` + `UpgradePrompt` |
| `WhatsAppAnalytics.tsx` | إضافة `useRestaurantLimits` + `UpgradePrompt` |
| `BranchOrders.tsx` | فحص `branch_staff` feature + اشتراكين realtime |

