
# التحكم في أبعاد صورة الغلاف بعد القص

## المشكلة

`maxWidthOrHeight` في `browser-image-compression` لا يكبّر الصور -- فقط يصغّرها. فلو الصورة المقصوصة 1200px عرض والحد 3500px، تبقى 1200px كما هي. لهذا تغيير القيمة لا يؤثر.

الأبعاد الفعلية تتحدد من:
1. حجم الصورة الأصلية المرفوعة
2. منطقة القص (`pixelCrop`) في `ImageCropper.tsx` -- الكانفاس يُنشأ بنفس أبعاد البكسل المقصوصة بالضبط (سطر 59-60)

## الحل

إضافة خطوة **resize** داخل دالة `getCroppedImg` في `ImageCropper.tsx` تعتمد على `targetWidth` يُمرر حسب نوع الصورة.

### التغييرات

#### 1. `src/components/ImageCropper.tsx`

- تعديل دالة `getCroppedImg` لتقبل `targetWidth` اختياري
- بعد القص، إذا كان `targetWidth` محدد وعرض الصورة المقصوصة مختلف، يتم رسمها على كانفاس جديد بالعرض المطلوب مع الحفاظ على نسبة العرض للارتفاع

```text
getCroppedImg(imageSrc, pixelCrop, rotation, targetWidth?)
  1. قص الصورة كالمعتاد (الكود الحالي)
  2. إذا targetWidth موجود وعرض القص != targetWidth:
     - إنشاء كانفاس ثالث بعرض targetWidth
     - حساب الارتفاع: targetWidth / aspectRatio
     - رسم الصورة المقصوصة على الكانفاس الجديد (resize)
  3. إرجاع الـ Blob من الكانفاس النهائي
```

- تعديل الـ Props لتقبل `targetWidth` اختياري
- تمرير `targetWidth` إلى `getCroppedImg` عند التأكيد

#### 2. `src/components/ImageUploader.tsx`

- إضافة mapping لكل `imageType` إلى `targetWidth`:

| imageType | targetWidth |
|-----------|-------------|
| cover     | 2400        |
| product   | 1920        |
| logo      | 800         |

- تمرير `targetWidth` كـ prop إلى `ImageCropper`

#### 3. `src/lib/bunny.ts`

- إرجاع `maxWidthOrHeight` للغلاف إلى 2400 (بدل 3500) لأن الـ resize أصبح يتم في خطوة القص
- هذا يجعل `maxWidthOrHeight` شبكة أمان فقط (fallback) في حالة تعطيل القص

## النتيجة

- صورة الغلاف ستكون دائما 2400px عرض بعد القص (أو أي قيمة تحددها)
- لو الصورة الأصلية أصغر، يتم تكبيرها للعرض المطلوب
- لو أكبر، يتم تصغيرها
- التغيير يحتاج إعادة رفع الصورة لتطبيقه
