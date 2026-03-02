
# إصلاح مشاكل التصميم المتبقية في الشارتات

## المشكلة 1: تداخل أرقام المحور Y (الأرقام ذات الخانتين أو أكثر)
**السبب**: `width={60}` و `tickMargin={8}` غير كافيين للأرقام الكبيرة.

**الحل**: في RevenueChart, OrdersChart, PeakHours:
- زيادة `width` من 60 إلى 80 على YAxis
- زيادة `tickMargin` من 8 إلى 12
- زيادة `margin.left` من 10 إلى 20

## المشكلة 2: تداخل خط الـ label مع النسبة في الرسم الدائري
**السبب**: الـ label الافتراضي في Recharts يرسم خطاً من الدائرة للنص، وعندما تكون القطع قريبة يتداخل الخط مع الرقم.

**الحل**: في StatusDistribution و PaymentMethods:
- تصغير `outerRadius` إلى 70
- إزالة الـ `label` نهائياً من الدائرة (لأن Legend موجود بالفعل يعرض الأسماء)
- استخدام `labelLine={false}` لإزالة الخطوط
- بدلاً من ذلك، إضافة النسبة داخل Tooltip فقط

هذا الحل أنظف لأن Legend بالأسفل يعرض كل الحالات مع ألوانها، والنسب تظهر عند تمرير الماوس.

---

## الملفات المعدلة

| الملف | التعديل |
|---|---|
| `src/components/analytics/RevenueChart.tsx` | زيادة width و tickMargin و margin |
| `src/components/analytics/OrdersChart.tsx` | نفس التعديلات |
| `src/components/analytics/PeakHours.tsx` | نفس التعديلات |
| `src/components/analytics/StatusDistribution.tsx` | إزالة label والخطوط، الاعتماد على Legend و Tooltip |
| `src/components/analytics/PaymentMethods.tsx` | نفس تعديلات الدائرة |
