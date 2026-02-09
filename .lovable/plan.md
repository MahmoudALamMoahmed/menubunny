

# تحسين صفحة المطعم باستخدام React Query + select

## لماذا `select` بدلا من `useMemo`؟

- **`select` في React Query** تعمل كـ selector محسّن تلقائيا: لا تُعاد إلا عند تغير الـ `data` من السيرفر
- **`useMemo`** يحتاج تحديد الـ dependencies يدويا وقد يُعاد حسابه بدون داعي عند أي re-render
- `select` تفصل منطق التحويل عن الـ component مما يجعل الكود أنظف
- `select` لا تسبب re-render إلا إذا تغيرت النتيجة فعلا (structural sharing)

## الهيكل المقترح

### 1. إنشاء custom hooks للبيانات

ملف جديد: `src/hooks/useRestaurantData.ts`

يحتوي على:

- **`useRestaurant(username)`** - يجلب بيانات المطعم
- **`useCategories(restaurantId)`** - يجلب الفئات (مفعّل فقط عند توفر restaurantId)
- **`useMenuItems(restaurantId)`** - يجلب عناصر القائمة
- **`useSizes()`** - يجلب الاحجام
- **`useExtras(restaurantId)`** - يجلب الاضافات
- **`useBranches(restaurantId)`** - يجلب الفروع
- **`useDeliveryAreas(branchIds)`** - يجلب مناطق التوصيل

كل hook يستخدم `useQuery` مع `enabled` للتحكم بالترتيب.

### 2. استخدام `select` للفلترة

مثال عملي لفلترة عناصر القائمة حسب الفئة:

```text
const { data: filteredItems } = useQuery({
  queryKey: ['menu_items', restaurantId],
  queryFn: () => supabase.from('menu_items')...
  select: (data) => 
    activeCategory === 'all' 
      ? data 
      : data.filter(item => item.category_id === activeCategory),
});
```

ملاحظة مهمة: عند استخدام `select` مع متغير خارجي مثل `activeCategory`، الـ select تُعاد عند كل render لأن الـ function reference يتغير. للحل الامثل نستخدم useCallback:

```text
const selectFilteredItems = useCallback(
  (data: MenuItem[]) => 
    activeCategory === 'all' ? data : data.filter(item => item.category_id === activeCategory),
  [activeCategory]
);
```

او ببساطة نستخدم `select` بدون `useCallback` لان التكلفة بسيطة جدا مع structural sharing.

### 3. استخدام `select` لجلب الاحجام لكل صنف

```text
const getSizesForItem = (itemId: string) => 
  sizes?.filter(size => size.menu_item_id === itemId) || [];
```

هذه الدالة بسيطة ولا تحتاج select، لكن يمكن تحويلها لـ hook منفصل إذا اردنا.

### 4. الاستعلامات المتوازية تلقائيا

مع React Query، الاستعلامات التي لها `enabled: true` تعمل بالتوازي تلقائيا بدون `Promise.all`. فقط الاستعلامات التي تعتمد على نتيجة استعلام سابق (مثل `restaurantId`) تنتظر.

```text
// هذا يعمل تلقائيا بالتوازي بعد جلب restaurant
useCategories(restaurant?.id)    // متوازي
useMenuItems(restaurant?.id)     // متوازي  
useSizes()                       // متوازي (لا يعتمد على شيء)
useExtras(restaurant?.id)        // متوازي
useBranches(restaurant?.id)      // متوازي
// هذا ينتظر الفروع
useDeliveryAreas(branchIds)      // ينتظر branches
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useRestaurantData.ts` | ملف جديد - جميع الـ hooks |
| `src/pages/Restaurant.tsx` | استبدال useState/useEffect بالـ hooks الجديدة |
| `src/components/BranchesDialog.tsx` | تحويل لاستخدام `useBranches` hook بدلا من fetch مستقل |

## التفاصيل التقنية

### هيكل `useRestaurantData.ts`

```text
// useRestaurant - الاستعلام الاساسي
useQuery({
  queryKey: ['restaurant', username],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('restaurants').select('*').eq('username', username).single();
    if (error) throw error;
    return data;
  },
  enabled: !!username,
});

// useCategories - يعتمد على restaurantId
useQuery({
  queryKey: ['categories', restaurantId],
  queryFn: ...,
  enabled: !!restaurantId,
});

// useMenuItems - مع select للفلترة
useQuery({
  queryKey: ['menu_items', restaurantId],
  queryFn: ...,
  enabled: !!restaurantId,
  select: (data) => activeCategory === 'all' ? data : data.filter(...),
});
```

### تبسيط Restaurant.tsx

الـ component سيصبح اخف بكثير:
- حذف جميع useState الخاصة بالبيانات (restaurant, categories, menuItems, sizes, extras, branches, deliveryAreas)
- حذف useEffect و fetchRestaurantData بالكامل
- حذف loading state (React Query يوفر isLoading)
- الابقاء على useState الخاصة بالـ UI فقط (cart, activeCategory, viewType, الخ)

### معالجة حالة المطعم غير موجود

```text
const { data: restaurant, isLoading, isError } = useRestaurant(username);

if (isLoading) return <LoadingSpinner />;
if (isError || !restaurant) return <NotFoundView />;
```

### ملاحظة عن `select` vs `useMemo`

في حالة `filteredMenuItems` تحديدا، `select` هي الخيار الانسب لانها:
1. لا تسبب re-render اضافي بفضل structural sharing
2. تعمل على مستوى الـ cache - اذا كانت النتيجة نفسها لا يحصل re-render
3. الكود اوضح: التحويل مرتبط بالـ query مباشرة

لكن بما ان `activeCategory` متغير UI وليس من السيرفر، سنمرره كـ parameter للـ hook:

```text
const { data: filteredItems } = useFilteredMenuItems(restaurantId, activeCategory);
```

