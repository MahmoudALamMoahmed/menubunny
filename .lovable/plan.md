

# خطة الانتقال من Cloudinary إلى Bunny.net

## ملخص التغييرات

سنقوم باستبدال نظام رفع وحذف وعرض الصور بالكامل من Cloudinary إلى Bunny.net Storage + CDN.

## كيف يعمل Bunny.net

- **الرفع**: نرسل الملف عبر HTTP PUT إلى `https://storage.bunnycdn.com/{storageZone}/{path}/{filename}` مع Access Key في الـ header
- **العرض**: الصور تُعرض مباشرة عبر Pull Zone: `https://menuss.b-cdn.net/{path}/{filename}`
- **الحذف**: نرسل HTTP DELETE إلى نفس عنوان الـ Storage مع Access Key

## الفرق عن Cloudinary

| الميزة | Cloudinary | Bunny.net |
|--------|-----------|-----------|
| الرفع | من المتصفح مباشرة (Upload Preset) | عبر Edge Function (لحماية Access Key) |
| العرض | URL مع transformations | URL مباشر من CDN |
| الحذف | عبر Edge Function | عبر Edge Function |
| تحسين الصور | Cloudinary transformations | Bunny Optimizer (مدمج في CDN) |

## خطوات التنفيذ

### 1. حفظ Access Key كـ Secret
- سنضيف secret باسم `BUNNY_STORAGE_ACCESS_KEY` بقيمة `60d702bb-5cb5-4301-b021df7eaa73-4f33-43b5`
- باقي المعلومات (Storage Name, Pull Zone URL) ستكون ثوابت في الكود لأنها ليست حساسة

### 2. إنشاء Edge Function جديدة `bunny-upload`
- تستقبل الصورة (بعد الضغط في المتصفح) + المسار المطلوب
- ترفعها إلى Bunny Storage عبر HTTP PUT
- تُرجع رابط الـ CDN

### 3. تعديل Edge Function الحذف
- إعادة تسمية/استبدال `cloudinary-delete` بـ `bunny-delete`
- تستقبل مسار الملف وتحذفه من Bunny Storage عبر HTTP DELETE

### 4. إعادة كتابة `src/lib/cloudinary.ts` إلى `src/lib/bunny.ts`
- استبدال `uploadToCloudinary` بـ `uploadToBunny` - ترسل الصورة المضغوطة إلى Edge Function
- استبدال `deleteFromCloudinary` بـ `deleteFromBunny`
- تبسيط دوال عرض الصور (`getOptimizedUrl`, `getCoverImageUrl`, `getLogoUrl`, `getMenuItemUrl`) لتُرجع روابط CDN مباشرة بدلا من Cloudinary transformations
- الإبقاء على نفس نظام الضغط (`browser-image-compression`) في المتصفح قبل الرفع
- الإبقاء على نفس دوال إنشاء المسارات (`getCoverPublicId`, `getLogoPublicId`, `getMenuItemPublicId`)

### 5. تحديث `ImageUploader.tsx`
- تغيير الاستيرادات من `cloudinary` إلى `bunny`
- نفس الواجهة والسلوك، فقط تغيير أسماء الدوال المستدعاة

### 6. تحديث باقي الملفات
- `Dashboard.tsx` - تغيير الاستيرادات
- `MenuManagement.tsx` - تغيير الاستيرادات
- `Restaurant.tsx` - تغيير الاستيرادات
- `ProductDetailsDialog.tsx` - تغيير الاستيرادات

### 7. حذف الملفات القديمة
- حذف `src/lib/cloudinary.ts`
- حذف `supabase/functions/cloudinary-delete/index.ts`

---

## التفاصيل التقنية

### Edge Function: `bunny-upload`

```text
POST /bunny-upload
Body: FormData { file: Blob, path: string }

1. يقرأ BUNNY_STORAGE_ACCESS_KEY من environment
2. يرسل PUT إلى https://storage.bunnycdn.com/menuss/{path}
   Header: AccessKey: {key}
   Body: binary file data
3. يُرجع { url: "https://menuss.b-cdn.net/{path}" }
```

### Edge Function: `bunny-delete`

```text
POST /bunny-delete
Body: { path: string }

1. يقرأ BUNNY_STORAGE_ACCESS_KEY من environment
2. يرسل DELETE إلى https://storage.bunnycdn.com/menuss/{path}
   Header: AccessKey: {key}
3. يُرجع { success: true }
```

### بنية المسارات في Bunny Storage

```text
menuss/
  restaurants/
    {username}/
      cover_{timestamp}.webp
      logo_{timestamp}.webp
      menu-items/
        {itemId}_{timestamp}.webp
```

### دوال عرض الصور (مبسطة)

بدلا من Cloudinary transformations، سنستخدم روابط CDN المباشرة. Bunny CDN يدعم تحسين الصور تلقائيا إذا كان Bunny Optimizer مفعل على الـ Pull Zone.

```text
getOptimizedUrl(url) -> يُرجع الرابط كما هو (CDN يتكفل بالتحسين)
getCoverImageUrl(url) -> يُرجع الرابط مباشرة
getLogoUrl(url) -> يُرجع الرابط مباشرة
getMenuItemUrl(url) -> يُرجع الرابط مباشرة
```

## ملاحظة مهمة

الصور الموجودة حاليا على Cloudinary لن تعمل بعد التغيير. إذا كان لديك صور مرفوعة بالفعل، ستحتاج إلى إعادة رفعها عبر النظام الجديد.

