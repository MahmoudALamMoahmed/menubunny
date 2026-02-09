

# خطة فحص وتنظيف المشروع بعد تطبيق React Query

## ملخص الوضع الحالي

بعد فحص جميع الصفحات والـ hooks، المشروع في حالة جيدة بشكل عام. معظم الصفحات تستخدم React Query بشكل صحيح. لكن هناك بقايا قديمة تحتاج تنظيف في مكانين رئيسيين:

---

## المشاكل المكتشفة

### 1. صفحة Orders.tsx - لا تزال تستخدم useState + useEffect + fetch يدوي

صفحة الطلبات لا تزال تجلب الطلبات يدويا عبر `useState` و `useEffect` و `fetchOrders` بدلا من React Query. هذا يعني:
- لا يوجد كاش للطلبات
- لا يوجد إعادة جلب تلقائية
- عند تحديث حالة طلب، يتم تحديث الـ state المحلي يدويا بدلا من invalidation

### 2. DnD Reorder في MenuManagement و BranchesManagement - يستخدم supabase مباشرة

عمليات إعادة الترتيب (Drag & Drop) في صفحتي إدارة القائمة والفروع لا تزال تستخدم `supabase` مباشرة بدلا من mutations. هذا مقبول تقنيا لأن العمليات تحتاج تحديث متفائل (optimistic update) مع `setQueryData`، لكن يمكن تحويلها لـ mutations لتوحيد النمط.

### 3. صفحات Auth.tsx و ForgotPassword.tsx - تستخدم supabase مباشرة

هذا طبيعي ومقبول لأن عمليات المصادقة (login/signup/reset) تتعامل مع `supabase.auth` مباشرة وليس مع الجداول، فلا حاجة لـ React Query هنا.

---

## خطة التنفيذ

### المهمة 1: تحويل Orders.tsx لاستخدام React Query بالكامل

- انشاء hook جديد `useAdminOrders` في `useAdminData.ts` لجلب الطلبات
- حذف `useState` و `useEffect` و `fetchOrders` من Orders.tsx
- تحديث `useUpdateOrderStatus` في `useAdminMutations.ts` لعمل `invalidateQueries` للطلبات بدلا من تحديث الـ state المحلي

### المهمة 2: تحويل عمليات DnD Reorder لاستخدام mutations

- انشاء mutations مخصصة للترتيب: `useReorderCategories`, `useReorderMenuItems`, `useReorderExtras`, `useReorderBranches`, `useReorderDeliveryAreas` في `useAdminMutations.ts`
- كل mutation ستدعم التحديث المتفائل (optimistic update) عبر `onMutate` + `onError` rollback
- حذف استيراد `supabase` المباشر من MenuManagement.tsx و BranchesManagement.tsx بعد التحويل

### المهمة 3: تنظيف الـ interfaces المكررة

- الملفات تحتوي على interfaces محلية (مثل `MenuItem`, `Size`, `Extra`, `Branch`, `DeliveryArea`) مكررة في عدة صفحات بينما الـ types موجودة بالفعل في `supabase/types.ts`
- توحيد استخدام `Tables<'menu_items'>` من Supabase types بدلا من تعريفها يدويا في كل ملف

---

## التفاصيل التقنية

### Hook جديد: useAdminOrders

```typescript
// في useAdminData.ts
export function useAdminOrders(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_orders', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60, // دقيقة واحدة - الطلبات تتغير بسرعة
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}
```

### تحديث useUpdateOrderStatus

```typescript
// اضافة invalidation للطلبات
export function useUpdateOrderStatus(restaurantId: string | undefined) {
  const qc = useQueryClient();
  // ...
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['admin_orders', restaurantId] });
  }
}
```

### Reorder Mutations (مثال)

```typescript
export function useReorderCategories(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      const { error } = await supabase.from('categories').upsert(updates);
      if (error) throw error;
    },
    onMutate: async (newOrder) => {
      // حفظ البيانات القديمة للـ rollback
      const prev = qc.getQueryData(['admin_categories', restaurantId]);
      return { prev };
    },
    onError: (_, __, context) => {
      // rollback عند الخطأ
      qc.setQueryData(['admin_categories', restaurantId], context?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin_categories', restaurantId] });
    },
  });
}
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useAdminData.ts` | اضافة `useAdminOrders` |
| `src/hooks/useAdminMutations.ts` | تحديث `useUpdateOrderStatus` + اضافة reorder mutations |
| `src/pages/Orders.tsx` | حذف fetch يدوي واستخدام `useAdminOrders` |
| `src/pages/MenuManagement.tsx` | حذف `import { supabase }` واستخدام reorder mutations |
| `src/pages/BranchesManagement.tsx` | حذف `import { supabase }` واستخدام reorder mutations |

