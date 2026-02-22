
# نقل عداد الطلبات المعلقة من Dashboard الى صفحات الطلبات

## الفكرة
نقل كارت عداد الطلبات المعلقة (pending) من صفحة Dashboard الى صفحتي Orders و BranchOrders، مع تنظيف كود Dashboard من كل ما يتعلق بالعداد.

## التغييرات

### 1. `src/pages/Dashboard.tsx` - ازالة العداد بالكامل
- حذف استيراد `useAdminOrders` و `useOrdersRealtime` و `Clock`
- حذف استدعاء `useAdminOrders` و `useOrdersRealtime` و حساب `pendingCount`
- حذف كارت العداد من الـ JSX (سطر 144-163)

### 2. `src/pages/Orders.tsx` - اضافة العداد
- اضافة استيراد `Clock` من lucide-react
- حساب `pendingCount` من الـ orders الموجودة اصلاً (البيانات محملة بالفعل)
- اضافة كارت العداد فوق الفلاتر مباشرة (بدون زر "عرض الطلبات" لاننا اصلاً في صفحة الطلبات)

### 3. `src/pages/BranchOrders.tsx` - اضافة العداد
- اضافة استيراد `Clock` من lucide-react
- حساب `pendingCount` من الـ orders الموجودة اصلاً
- اضافة نفس كارت العداد فوق الفلاتر

## ملاحظات
- لا حاجة لاستيرادات جديدة للبيانات لان Orders و BranchOrders تجلب الطلبات بالفعل عبر `useAdminOrders` و `useBranchOrders` وتستخدم `useOrdersRealtime` - كل شيء جاهز
- الكارت في صفحات الطلبات لن يحتوي زر "عرض الطلبات" لان المستخدم موجود فعلاً في الصفحة
- التحديث الفوري يعمل تلقائياً لان الـ hooks موجودة اصلاً
