

# اصلاح مشاكل التصميم في صفحة التقارير

## المشاكل المكتشفة والحلول

### 1. تداخل ارقام المحور Y مع الرسوم البيانية
**السبب**: المحور Y لا يحتوي على `width` كافٍ ولا `padding` للتنسيق مع RTL.

**الحل**: في جميع الشارتات (RevenueChart, OrdersChart, PeakHours):
- اضافة `width={60}` و `tickMargin={8}` على YAxis لاعطاء مسافة كافية للارقام
- اضافة `margin={{ left: 10, right: 10 }}` على الـ Chart container لمنع القص

### 2. تداخل النصوص في الرسوم الدائرية (Pie Charts)
**السبب**: الـ `label` النصي طويل (اسم + نسبة) مع `outerRadius` كبير مما يسبب تداخل.

**الحل**: في StatusDistribution و PaymentMethods:
- تصغير `outerRadius` الى 80
- استخدام `label` مختصر يعرض النسبة فقط (مثل `25%`)
- اضافة `Legend` اسفل الدائرة لعرض اسماء الحالات مع الالوان بدل وضعها على الدائرة

### 3. عناوين الجداول (TableHead) ناحية اليسار
**السبب**: مكون `TableHead` في `src/components/ui/table.tsx` يستخدم `text-left` بشكل ثابت.

**الحل**: تغيير `text-left` الى `text-right` في مكون `TableHead` لدعم RTL بشكل صحيح. هذا يؤثر على جداول TopItems و BranchPerformance.

---

## الملفات المعدلة

| الملف | التعديل |
|---|---|
| `src/components/ui/table.tsx` | تغيير `text-left` الى `text-right` في TableHead |
| `src/components/analytics/RevenueChart.tsx` | اضافة margin و width/tickMargin على YAxis |
| `src/components/analytics/OrdersChart.tsx` | نفس تعديلات YAxis |
| `src/components/analytics/PeakHours.tsx` | نفس تعديلات YAxis |
| `src/components/analytics/StatusDistribution.tsx` | تصغير outerRadius، label مختصر، اضافة Legend |
| `src/components/analytics/PaymentMethods.tsx` | نفس تعديلات الدائرة |
