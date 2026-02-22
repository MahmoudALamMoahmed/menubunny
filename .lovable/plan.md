

# اضافة عداد الطلبات الجديدة (Pending) في لوحة التحكم مع تحديث فوري

## الفكرة

اضافة كارت احصائي اعلى صفحة Dashboard يعرض عدد الطلبات المعلقة (pending) مع تحديث لحظي عبر Supabase Realtime باستخدام نفس الـ hook الموجود `useOrdersRealtime`.

## التغييرات

### ملف واحد فقط: `src/pages/Dashboard.tsx`

1. **استيراد** `useAdminOrders` و `useOrdersRealtime`
2. **جلب الطلبات** عبر `useAdminOrders(restaurant?.id)` - نفس الطريقة المستخدمة في صفحة Orders
3. **تفعيل Real-time** عبر استدعاء `useOrdersRealtime` بنفس الـ query key حتى يتم invalidate تلقائياً عند وصول طلب جديد
4. **حساب العدد** بفلترة الطلبات محلياً: `orders.filter(o => o.status === 'pending').length`
5. **عرض كارت** فوق قسم "اجراءات سريعة" يحتوي على:
   - عدد الطلبات المعلقة بخط كبير
   - نص "طلبات جديدة بانتظار المراجعة"
   - زر للانتقال لصفحة الطلبات
   - لون تمييزي (برتقالي/اصفر) عند وجود طلبات معلقة

## التفاصيل التقنية

```typescript
// الاستيرادات الجديدة
import { useAdminOrders } from '@/hooks/useAdminData';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';

// داخل الـ component
const { data: orders = [] } = useAdminOrders(restaurant?.id);

useOrdersRealtime({
  filterColumn: 'restaurant_id',
  filterValue: restaurant?.id,
  queryKey: ['admin_orders', restaurant?.id],
});

const pendingCount = orders.filter(o => o.status === 'pending').length;
```

الكارت سيظهر فقط عند وجود مطعم مسجل (`restaurant` موجود). عند عدم وجود طلبات معلقة سيعرض "0" بلون محايد، وعند وجود طلبات سيتحول للون تنبيهي.

## لماذا هذا النهج؟

- اعادة استخدام `useAdminOrders` و `useOrdersRealtime` الموجودين بالفعل بدون كود جديد
- نفس الـ query key (`admin_orders`) يعني ان البيانات مشتركة مع صفحة Orders بدون طلبات مكررة للسيرفر
- التحديث الفوري يعمل تلقائياً لان الـ hook يعمل invalidate لنفس الـ key

