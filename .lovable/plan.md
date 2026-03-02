
# عكس اتجاه محور X ليتوافق مع RTL

## المشكلة
بعد نقل محور Y لليمين، التواريخ على محور X ما زالت تسير من اليسار لليمين (LTR). المفروض في واجهة RTL أن التسلسل الزمني يبدأ من اليمين (الأقدم) وينتهي في اليسار (الأحدث).

## الحل
إضافة `reversed={true}` على مكون `XAxis` في الشارتات الثلاثة. هذه خاصية مدمجة في Recharts تعكس اتجاه المحور الأفقي بدون الحاجة لعكس البيانات يدوياً.

## الملفات المعدلة

| الملف | التعديل |
|---|---|
| `src/components/analytics/RevenueChart.tsx` | إضافة `reversed={true}` على `XAxis` |
| `src/components/analytics/OrdersChart.tsx` | إضافة `reversed={true}` على `XAxis` |
| `src/components/analytics/PeakHours.tsx` | إضافة `reversed={true}` على `XAxis` |

## التعديل في كل ملف
سطر واحد فقط - تغيير:
```
<XAxis dataKey="label" fontSize={12} />
```
إلى:
```
<XAxis dataKey="label" fontSize={12} reversed={true} />
```

## النتيجة
- التواريخ تبدأ من اليمين (الأقدم) وتنتهي في اليسار (الأحدث)
- يتوافق مع اتجاه القراءة العربية ومع موضع محور Y على اليمين
- لا يؤثر على أي شيء آخر في الشارت
