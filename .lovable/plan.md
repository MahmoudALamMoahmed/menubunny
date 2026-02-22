

# اصلاح وتفعيل انيميشن عداد الطلبات المعلقة

## المشكلة
الكلاس `animate-scale-in` مستخدم في صفحتي Orders و BranchOrders لكنه **غير معرّف** في ملف `tailwind.config.ts`. الملف يحتوي فقط على انيميشن accordion-down و accordion-up، مما يعني أن الانيميشن لا يعمل حالياً.

## الحل
اضافة تعريف keyframe و animation لـ `scale-in` في `tailwind.config.ts`.

## التغييرات

### `tailwind.config.ts`
اضافة في قسم `keyframes`:
```text
'scale-in': {
  '0%': { transform: 'scale(0.7)', opacity: '0' },
  '100%': { transform: 'scale(1)', opacity: '1' }
}
```

اضافة في قسم `animation`:
```text
'scale-in': 'scale-in 0.3s ease-out'
```

هذا سيجعل الرقم يظهر بتأثير تكبير سلس كل مرة يتغير فيها عدد الطلبات المعلقة (بفضل `key={pendingCount}` الموجود اصلاً).

