

# فحص وتنظيف صفحات اليوزر و App.tsx

## نتيجة الفحص

### App.tsx - نظيف تماما
لا توجد مشاكل. الملف يقوم فقط بإعداد QueryClientProvider و الراوتر. لا يحتاج تغيير.

### Index.tsx - نظيف تماما
صفحة ثابتة (static) بدون أي جلب بيانات. لا تحتاج React Query أصلا.

### Restaurant.tsx - يحتاج تنظيف بسيط

**الايجابي:** يستخدم React Query بشكل صحيح عبر hooks من `useRestaurantData.ts`. لا يوجد `useEffect` أو fetch يدوي.

**المشكلة الوحيدة:** يحتوي على interfaces محلية مكررة (سطر 26-51):

```typescript
interface MenuItem { ... }
interface Size { ... }
interface Extra { ... }
interface CartItem extends MenuItem { ... }
```

`MenuItem` و `Size` و `Extra` موجودة بالفعل كـ `Tables<'menu_items'>` و `Tables<'sizes'>` و `Tables<'extras'>` في Supabase types. يجب حذف التعريفات المحلية واستخدام الأنواع المركزية.

ملاحظة: `CartItem` ليس له مقابل في Supabase لأنه نوع خاص بالـ UI (سلة الطلبات)، لذا سيبقى كـ interface محلي لكن سيعتمد على `Tables<'menu_items'>` بدلا من `MenuItem` المحلي.

### ProductDetailsDialog.tsx - يحتاج تنظيف

نفس المشكلة: يحتوي على interfaces محلية مكررة (سطر 10-32) لـ `MenuItem` و `Size` و `Extra`. يجب استبدالها بـ `Tables<'...'>`.

### RestaurantFooter.tsx - نظيف تماما
يستخدم `Tables<'restaurants'>` من Supabase types و `useBranches` من React Query. ممتاز.

### BranchesDialog.tsx - نظيف تماما
يستخدم `useBranches` من React Query. لا مشاكل.

### ShareDialog.tsx - نظيف تماما
لا يتعامل مع بيانات من قاعدة البيانات. لا يحتاج React Query.

### useAvailabilityCheck.ts - مقبول كما هو
يستخدم `useState` + `useEffect` مع debounce يدوي للتحقق من توفر اسم المستخدم. هذا نمط مقبول لأن العملية تتم مرة واحدة أثناء التسجيل ولا تحتاج كاش.

---

## خطة التنفيذ

### المهمة الوحيدة: توحيد الأنواع (Types) في ملفين

| الملف | التغيير |
|-------|---------|
| `src/pages/Restaurant.tsx` | حذف interfaces المحلية (`MenuItem`, `Size`, `Extra`) واستبدالها بـ `Tables<'menu_items'>` وغيرها. تحديث `CartItem` ليعتمد على `Tables<'menu_items'>` |
| `src/components/ProductDetailsDialog.tsx` | حذف interfaces المحلية واستبدالها بـ `Tables<'...'>` من Supabase types |

### التفاصيل التقنية

#### Restaurant.tsx - التغييرات

حذف الأسطر 26-51 (الـ interfaces المحلية) واستبدالها بـ:

```typescript
import type { Tables } from '@/integrations/supabase/types';

type MenuItem = Tables<'menu_items'>;
type Size = Tables<'sizes'>;
type Extra = Tables<'extras'>;

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: Size;
  selectedExtras?: Extra[];
}
```

هذا يضمن أن الأنواع متزامنة دائما مع قاعدة البيانات وتحتوي على جميع الحقول.

#### ProductDetailsDialog.tsx - التغييرات

حذف الأسطر 10-32 (الـ interfaces المحلية) واستبدالها بـ:

```typescript
import type { Tables } from '@/integrations/supabase/types';

type MenuItem = Tables<'menu_items'>;
type Size = Tables<'sizes'>;
type Extra = Tables<'extras'>;
```

---

## ملخص

المشروع من ناحية اليوزر في حالة ممتازة. جميع الصفحات تستخدم React Query بشكل صحيح. التغيير الوحيد المطلوب هو توحيد الأنواع (types) في ملفين فقط لمنع التكرار وضمان التزامن مع قاعدة البيانات.

