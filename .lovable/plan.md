

# مراجعة وتنظيف ملفات الـ Hooks

بعد فحص الملفات الثلاثة سطر بسطر، الملفات موثقة بشكل ممتاز بالفعل. هذه التغييرات المطلوبة:

---

## 1. useRestaurantData.ts - حذف أنواع غير مستخدمة

الملف يعرّف 7 أنواع (Types) في أعلى الملف لكن **واحد فقط مستخدم فعلياً**:

| النوع | مستخدم؟ | أين؟ |
|-------|---------|------|
| `Restaurant` | لا | غير مستخدم |
| `Category` | لا | غير مستخدم |
| `MenuItem` | نعم | في `select` callback سطر 83 |
| `Size` | لا | غير مستخدم |
| `Extra` | لا | غير مستخدم |
| `Branch` | لا | غير مستخدم |
| `DeliveryArea` | لا | غير مستخدم |

**التغيير:** حذف الأنواع الست غير المستخدمة والإبقاء على `MenuItem` فقط، مع تعديل الـ import ليصبح أخف.

---

## 2. useAdminData.ts - الملف نظيف

الملف موثق بالكامل ولا يحتوي على عناصر غير مستخدمة.

**ملاحظة تقنية:** `useAdminSizes` لا يفلتر بـ `restaurant_id` في الاستعلام (يجلب كل الأحجام من قاعدة البيانات). هذا لأن جدول `sizes` مرتبط بـ `menu_item_id` وليس مباشرة بـ `restaurant_id`، لذا الفلترة تتم عبر RLS أو في الكود. هذا ليس خطأ.

---

## 3. useAdminMutations.ts - الملف نظيف

الملف موثق بالكامل بتعليقات واضحة على كل mutation وكل section. لا يوجد كود غير مستخدم.

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| useRestaurantData.ts | حذف 6 أنواع غير مستخدمة (Restaurant, Category, Size, Extra, Branch, DeliveryArea) |
| useAdminData.ts | لا تغيير - نظيف |
| useAdminMutations.ts | لا تغيير - نظيف |

### تفاصيل تقنية

**useRestaurantData.ts:**
- تعديل سطور 3-11 لتصبح:
```typescript
import type { Tables } from '@/integrations/supabase/types';

// Type - نوع صنف القائمة (يُستخدم في فلترة select)
type MenuItem = Tables<'menu_items'>;
```
- باقي الملف يبقى كما هو بدون أي تعديل

