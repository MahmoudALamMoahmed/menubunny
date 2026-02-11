

# إصلاح CLS 0.35 - مشكلة التحميل المتتابع

## السبب الجذري

الـ Skeleton حالياً يغطي فقط تحميل بيانات المطعم (`loadingRestaurant`). لكن بعد انتهائه، الاستعلامات التابعة (الفئات، الأصناف) لا تزال تُحمّل:

```text
الـ Timeline الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Skeleton ──┐
            │ restaurant query (~780ms)
            ├── Skeleton يختفي ──────────────┐
            │                                │ categories = [] (فارغ)
            │                                │ menuItems = [] (فارغ)
            │                                │
            │                    categories تحمّل ─── CLS! (القسم يظهر فجأة)
            │                    menuItems تحمّل ──── CLS! (الكروت تظهر فجأة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                  مجموع CLS = ~0.35
```

## الحل

توسيع شرط عرض الـ Skeleton ليشمل تحميل الفئات والأصناف أيضاً، بحيث لا يختفي الـ Skeleton إلا بعد اكتمال جميع البيانات الأساسية.

## التغييرات المطلوبة

### الملف: `src/pages/Restaurant.tsx`

**1. استخراج `isLoading` من hooks الفئات والأصناف (سطر 53-55)**

```typescript
const { data: categories = [], isLoading: loadingCategories } = useCategories(restaurantId);
const { data: filteredMenuItems = [], isLoading: loadingMenuItems } = useMenuItems(restaurantId, activeCategory);
```

**2. توسيع شرط الـ Skeleton (سطر 285)**

تغيير من:
```typescript
if (loadingRestaurant) {
```
الى:
```typescript
if (loadingRestaurant || loadingCategories || loadingMenuItems) {
```

هذا يضمن بقاء الـ Skeleton ظاهراً حتى تكتمل جميع البيانات المرئية (فئات + أصناف)، فلا يحدث أي انزياح.

## النتيجة المتوقعة

| المؤشر | قبل | بعد |
|--------|-----|-----|
| CLS | 0.35 | ~0 |
| LCP | ~1.8s | ~1.8s (بدون تغيير) |

الـ Skeleton سيبقى لفترة أطول قليلاً (~200ms إضافية) لكن بدون أي انزياح في المحتوى.

