

## المشكلة

الفروع تم تجميدها بنجاح في صفحة المطعم العامة، لكن **الفئات والأصناف والإضافات** لا تزال تظهر كاملة للعميل حتى بعد العودة للباقة المجانية.

## السبب

في `Restaurant.tsx`، تم إضافة `useMemo` للفروع فقط لتقييدها بحدود الباقة، لكن لم يتم تطبيق نفس المنطق على الفئات والأصناف والإضافات.

## الحل — ملف واحد: `src/pages/Restaurant.tsx`

تطبيق نفس نمط تقييد الفروع على الفئات والأصناف والإضافات:

1. **الفئات**: تغيير `categories` إلى `allCategories` وإضافة `useMemo` يقطع القائمة عند `limits.max_categories`
2. **الأصناف**: تغيير `useMenuItems` لجلب كل الأصناف بدون فلتر فئة، ثم تطبيق حد الباقة أولاً (`limits.max_items`)، ثم فلتر الفئة النشطة — كل ذلك في `useMemo` واحد
3. **الإضافات**: تغيير `extras` إلى `allExtras` وإضافة `useMemo` يقطع القائمة عند `limits.max_extras`

```typescript
// الفئات
const { data: allCategories = [] } = useCategories(restaurantId);
const categories = useMemo(() => {
  if (limits?.max_categories != null) return allCategories.slice(0, limits.max_categories);
  return allCategories;
}, [allCategories, limits?.max_categories]);

// الأصناف — بدون فلتر فئة في useMenuItems، نطبق الحدود ثم الفلتر يدوياً
const { data: allMenuItems = [] } = useMenuItems(restaurantId);
const filteredMenuItems = useMemo(() => {
  let items = allMenuItems;
  if (limits?.max_items != null) items = items.slice(0, limits.max_items);
  if (activeCategory && activeCategory !== 'all') {
    items = items.filter(item => item.category_id === activeCategory);
  }
  return items;
}, [allMenuItems, limits?.max_items, activeCategory]);

// الإضافات
const { data: allExtras = [] } = useExtras(restaurantId);
const extras = useMemo(() => {
  if (limits?.max_extras != null) return allExtras.slice(0, limits.max_extras);
  return allExtras;
}, [allExtras, limits?.max_extras]);
```

باقي الكود يستمر باستخدام `categories`, `filteredMenuItems`, `extras` كما هو — لا حاجة لتغيير أي شيء آخر.

