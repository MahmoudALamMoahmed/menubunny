
# اضافة زر تفعيل/ايقاف صوت التنبيه

## الفكرة
اضافة زر (Switch) في صفحتي الطلبات (Orders و BranchOrders) يسمح بتفعيل او ايقاف صوت التنبيه عند وصول طلب جديد. يتم حفظ التفضيل في localStorage حتى يبقى محفوظاً بعد اغلاق المتصفح.

## التغييرات

### 1. `src/hooks/useOrdersRealtime.ts`
- اضافة قراءة تفضيل الصوت من localStorage قبل تشغيله
- المفتاح: `notification_sound_enabled` (القيمة الافتراضية: `true` - مفعل)
- تعديل سطر `playNotificationSound()` ليتحقق من التفضيل اولاً

### 2. `src/hooks/useNotificationSound.ts` (ملف جديد)
- Hook بسيط يدير حالة تفعيل/ايقاف الصوت
- يقرأ ويكتب في localStorage
- يرجع `{ soundEnabled, toggleSound }`

### 3. `src/pages/Orders.tsx`
- استيراد `useNotificationSound` و مكون `Switch`
- اضافة زر Switch بجانب عداد الطلبات المعلقة مع ايقونة صوت (Volume2/VolumeX)

### 4. `src/pages/BranchOrders.tsx`
- نفس التغيير: اضافة Switch للتحكم بالصوت

## التفاصيل التقنية

```text
localStorage key: "notification_sound_enabled"
القيمة الافتراضية: "true" (مفعل)

useNotificationSound() -> { soundEnabled: boolean, toggleSound: () => void }

useOrdersRealtime - قبل playNotificationSound():
  if (localStorage.getItem('notification_sound_enabled') !== 'false') {
    playNotificationSound();
  }
```

الزر سيظهر بجانب كارت العداد كـ Switch صغير مع ايقونة مكبر صوت، مما يجعل الوصول اليه سهلاً ومباشراً.
