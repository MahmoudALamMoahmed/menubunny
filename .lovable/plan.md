

## الوضع الحالي

موظف الفرع يُوجَّه لـ `BranchOrders.tsx` التي تجلب **كل** طلبات الفرع بدون فلتر `order_source`. يرى كل الطلبات مخلوطة.

## الاقتراح

إضافة **تبويبات (Tabs)** في صفحة `BranchOrders.tsx`:

| تبويب | المحتوى |
|-------|---------|
| طلبات لوحة التحكم | `order_source = 'dashboard'` |
| طلبات واتساب | `order_source = 'whatsapp'` |

هذا أبسط وأوضح من إنشاء صفحة منفصلة — موظف الفرع له صفحة واحدة فقط يتنقل فيها بين التبويبات.

## التغييرات

### 1. `src/hooks/useAdminData.ts`
- تعديل `useBranchOrders` ليقبل `orderSource` parameter اختياري وفلترة بـ `.eq('order_source', orderSource)` عند وجوده

### 2. `src/pages/BranchOrders.tsx`
- إضافة state لـ `activeTab` (`'dashboard' | 'whatsapp'`)
- استخدام مكون `Tabs` من shadcn
- استدعاء `useBranchOrders` مع `orderSource = activeTab`
- عرض عداد الطلبات المعلقة والإحصائيات لكل تبويب بشكل مستقل

