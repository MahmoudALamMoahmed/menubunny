

# إصلاح: الضغط بيلغي الـ resize بتاع الـ cropper

## المشكلة الجذرية

التدفق الحالي:

1. الـ Cropper بيقص الصورة ويعمل resize لـ 2800px عرض (صح)
2. الـ Blob بيروح لـ `handleUpload` → `uploadToBunny` → `compressImage`
3. `browser-image-compression` بتاخد الصورة 2800px وممكن **تصغّرها** عشان تحقق `maxSizeMB: 3`
4. النتيجة: الصورة بتطلع أصغر من 2800px

## الحل

### 1. `src/lib/bunny.ts` - زيادة `maxSizeMB` للغلاف

غلاف بعرض 2800px بصيغة WebP ممكن يكون أكبر من 3MB. نزود الحد لـ 5MB:

```
maxSizeMB: 5  (بدل 3)
```

### 2. `src/components/ImageCropper.tsx` - إضافة console.log للتأكد

إضافة log بعد الـ resize عشان نتأكد إن الأبعاد صح:

```
console.log('Cropped dimensions:', croppedCanvas.width, 'x', croppedCanvas.height);
console.log('Final dimensions after resize:', finalCanvas.width, 'x', finalCanvas.height);
```

### 3. `src/components/ImageUploader.tsx` - إضافة log بعد الضغط

إضافة log في `handleUpload` لمعرفة أبعاد الصورة بعد الضغط عشان نشوف إذا الضغط بيغير الأبعاد:

```
console.log('File size before compression:', file.size);
// بعد الضغط
console.log('File size after compression:', compressedFile.size);
```

## النتيجة المتوقعة

- صورة الغلاف هتطلع 2800px عرض فعلا بعد الرفع
- الـ logs هتساعدنا نتأكد إن كل خطوة شغالة صح
