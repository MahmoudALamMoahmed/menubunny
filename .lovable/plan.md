

## إصلاح اتجاه RTL لمكون منطقة التوصيل (SortableAreaItem)

### المشكلة
المكون لا يحتوي على `dir="rtl"` — فيظهر مقبض السحب والنص على اليسار، وأزرار التعديل والحذف على اليمين (عكس المطلوب للعربية).

### الحل
**ملف واحد: `src/pages/BranchesManagement.tsx` — مكون `SortableAreaItem`**

إضافة `dir="rtl"` على الحاوية الرئيسية (سطر 326):

```tsx
<div 
  ref={setNodeRef}
  style={style}
  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
  dir="rtl"
>
```

هذا سيجعل:
- مقبض السحب + اسم المنطقة والسعر → على **اليمين**
- أزرار التعديل والحذف → على **اليسار**

