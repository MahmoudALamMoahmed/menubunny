

## المشكلة

الباقة المجانية تحتوي على `whatsapp_orders: true` و `dashboard_orders: false`. الفحص الحالي في صفحتي واتساب يستخدم `whatsapp_orders` — لذلك لا يتم تجميدهما أبداً.

## التغييرات المطلوبة

### 1. `src/pages/WhatsAppOrders.tsx` و `src/pages/WhatsAppAnalytics.tsx`
تغيير فحص الميزة من `whatsapp_orders` إلى `dashboard_orders`:
```typescript
// قبل
const hasWhatsappOrders = !limits || (limits.features as any)?.whatsapp_orders;

// بعد
const hasWhatsappOrders = !limits || (limits.features as any)?.dashboard_orders;
```
هذا يجعل الصفحتين مجمدتين في الباقة المجانية (`dashboard_orders: false`) ومفتوحتين في المدفوعة (`dashboard_orders: true`).

### 2. `src/pages/Restaurant.tsx` — حفظ الطلب في DB فقط للباقات المدفوعة
في دالة `sendOrderToWhatsApp`، نضيف فحص `limits` قبل الحفظ في قاعدة البيانات. إذا الباقة مجانية (`dashboard_orders: false`)، نتخطى الـ `insert` ونفتح واتساب فقط.

نحتاج جلب `limits` في صفحة `Restaurant.tsx` (موجود بالفعل عبر `useRestaurantLimits`):
```typescript
const hasDashboardOrders = limits?.features && (limits.features as any)?.dashboard_orders;

// داخل sendOrderToWhatsApp:
if (hasDashboardOrders) {
  await supabase.from('orders').insert({ ... });
}
// ثم فتح واتساب بشكل طبيعي في كلا الحالتين
```

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `WhatsAppOrders.tsx` | تغيير feature check إلى `dashboard_orders` |
| `WhatsAppAnalytics.tsx` | تغيير feature check إلى `dashboard_orders` |
| `Restaurant.tsx` | تخطي حفظ الطلب في DB إذا الباقة مجانية |

