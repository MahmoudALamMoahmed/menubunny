

## التحليل

حالياً طلبات واتساب **لا تُحفظ** في قاعدة البيانات — فقط تفتح رابط واتساب. لذلك نحتاج أولاً حفظها في الـ DB ثم عرضها.

## القرار: نفس الجدول `orders` مع عمود `order_source`

**الأفضل هو نفس الجدول** لأن:
- نفس البنية (اسم العميل، الأصناف، السعر...)
- لا تكرار في الكود أو الـ RLS
- يمكن دمج التقارير مستقبلاً إذا أردت
- الفلترة بسيطة بعمود واحد

## الخطة

### 1. تعديل قاعدة البيانات
- إضافة عمود `order_source TEXT DEFAULT 'dashboard'` لجدول `orders`
- القيم: `'dashboard'` | `'whatsapp'`

### 2. حفظ طلبات واتساب في الـ DB
- في `sendOrderToWhatsApp` بـ `Restaurant.tsx`: إضافة `supabase.from('orders').insert(...)` مع `order_source: 'whatsapp'` **قبل** فتح رابط واتساب
- تعديل `sendOrderToDashboard` ليضيف `order_source: 'dashboard'`

### 3. صفحة طلبات واتساب (`WhatsAppOrders.tsx`)
- نسخة من `Orders.tsx` مع فلتر `order_source = 'whatsapp'`
- نفس الفلاتر والإحصائيات ولكن بدون تغيير حالة الطلب (أو مع تغيير حسب رغبتك)
- عنوان "طلبات واتساب"

### 4. صفحة تقارير واتساب (`WhatsAppAnalytics.tsx`)
- نسخة من `Analytics.tsx` مع فلتر `order_source = 'whatsapp'`
- نفس الرسوم البيانية والـ KPIs

### 5. Hook مشترك للبيانات
- تعديل `useAdminOrders` ليقبل `orderSource` parameter
- تعديل `useAnalyticsData` → `fetchAllOrders` ليقبل فلتر `order_source`

### 6. التوجيه والربط
- إضافة Routes في `App.tsx`
- إضافة أزرار في `Dashboard.tsx` للصفحتين الجديدتين
- ربط Realtime في الصفحة الجديدة

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Migration | إضافة عمود `order_source` |
| `src/pages/Restaurant.tsx` | حفظ طلب واتساب في DB + `order_source` |
| `src/hooks/useAdminData.ts` | إضافة فلتر `order_source` |
| `src/hooks/useAnalyticsData.ts` | إضافة فلتر `order_source` |
| `src/pages/WhatsAppOrders.tsx` | صفحة جديدة |
| `src/pages/WhatsAppAnalytics.tsx` | صفحة جديدة |
| `src/pages/Dashboard.tsx` | أزرار للصفحتين |
| `src/App.tsx` | Routes جديدة |

