
## الخطة: التجديد التلقائي للاشتراكات مع سويتش التحكم

### ما سيُنفذ

**3 مراحل:**

---

### 1. تعديل قاعدة البيانات

**إضافة عمود `auto_renew` لجدول `subscriptions`:**
```sql
ALTER TABLE subscriptions ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
```

تعديل دالة `subscribe_to_plan` لتقبل `p_auto_renew` وتحفظه في العمود الجديد.

---

### 2. Edge Function: `auto-renew-subscriptions`

Edge Function تُشغَّل يومياً عبر Cron Job:

```text
الخوارزمية:
1. جلب كل الاشتراكات التي:
   - status = 'active'
   - expires_at < now() + interval '1 day'
   - auto_renew = true
2. لكل اشتراك:
   a. تحقق من رصيد المحفظة
   b. إذا الرصيد كافٍ → استدعاء subscribe_to_plan (تجديد)
   c. إذا الرصيد غير كافٍ → ابقِ الاشتراك كما هو (سينتهي طبيعياً وتُرجع get_restaurant_limits الباقة المجانية)
```

لا نحتاج "تخفيض" يدوي — `get_restaurant_limits` تُرجع تلقائياً الباقة المجانية إذا انتهى الاشتراك.

**Cron Job يُنفَّذ بـ SQL عبر insert tool (وليس migration):**
```sql
-- يتطلب تفعيل pg_cron + pg_net في Supabase Dashboard
SELECT cron.schedule(
  'auto-renew-subscriptions-daily',
  '0 2 * * *',  -- كل يوم الساعة 2 صباحاً
  $$ SELECT net.http_post(
    url := 'https://lpfzrsdqyqesjzfaxqwq.supabase.co/functions/v1/auto-renew-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZnpyc2RxeXFlc2p6ZmF4cXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTA0MzksImV4cCI6MjA4NjIyNjQzOX0.GYZpV-ZRdFGOfCS1BcIb4d4DoZBaCvgW-ndv55WRXS4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

---

### 3. سويتش التجديد التلقائي في صفحة `Subscription.tsx`

**في بطاقة الباقة الحالية** — يظهر فقط إذا كان المستخدم مشتركاً في باقة مدفوعة:

```text
┌─────────────────────────────────────────┐
│  التجديد التلقائي                        │
│  يُجدَّد اشتراكك تلقائياً قبل انتهائه   │
│  إذا كان الرصيد كافياً                   │
│                         [ ● ON ]        │
└─────────────────────────────────────────┘
```

---

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Migration | إضافة `auto_renew` لجدول `subscriptions` |
| Migration | تعديل دالة `subscribe_to_plan` لدعم `auto_renew` |
| `supabase/functions/auto-renew-subscriptions/index.ts` | **جديد** — منطق التجديد التلقائي |
| `supabase/config.toml` | إضافة `[functions.auto-renew-subscriptions]` |
| `src/hooks/useSubscription.ts` | إضافة hook لجلب وتحديث `auto_renew` |
| `src/pages/Subscription.tsx` | إضافة Switch في بطاقة الباقة الحالية |

---

### ملاحظة مهمة: تفعيل pg_cron

يجب تفعيل extensions من Supabase Dashboard:
- `pg_cron` من: **Database → Extensions**
- `pg_net` من: **Database → Extensions**

ثم سأنفذ الـ SQL لإنشاء الـ Cron Job عبر insert tool.
