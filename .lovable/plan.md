

## التشخيص

### المشكلة الرئيسية: الـ Cron Job غير موجود أصلاً

استعلمت جدول `cron.job` والنتيجة **فارغة** — لم يتم إنشاء أي Cron Job. لذلك الـ Edge Function لم تُستدعى أبداً (لا يوجد أي logs).

### المشكلة الثانية: حقل `status` يبقى `active` دائماً

لا يوجد أي آلية تحدّث `status` إلى `expired` عند انتهاء `expires_at`. حالياً `get_restaurant_limits` تعتمد على `expires_at > now()` فقط لتحديد هل الاشتراك فعال، لكن الحقل نفسه لا يتغير.

---

## الحل

### 1. إنشاء Cron Job (كل دقيقة للاختبار)

عبر SQL insert tool (ليس migration):

```sql
SELECT cron.schedule(
  'auto-renew-subscriptions',
  '* * * * *',
  $$ SELECT net.http_post(
    url := 'https://lpfzrsdqyqesjzfaxqwq.supabase.co/functions/v1/auto-renew-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZnpyc2RxeXFlc2p6ZmF4cXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTA0MzksImV4cCI6MjA4NjIyNjQzOX0.GYZpV-ZRdFGOfCS1BcIb4d4DoZBaCvgW-ndv55WRXS4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

### 2. تحديث Edge Function

إضافة خطوة بعد محاولة التجديد: تحديث `status = 'expired'` للاشتراكات التي:
- `expires_at <= now()`
- لم يتم تجديدها (رصيد غير كافٍ أو `auto_renew = false`)

```text
الخوارزمية المحدثة:
1. جلب الاشتراكات المنتهية/قريبة الانتهاء مع auto_renew=true → حاول التجديد
2. بعد التجديد: UPDATE subscriptions SET status='expired' WHERE expires_at <= now() AND status='active'
   (هذا يشمل الاشتراكات بدون auto_renew أيضاً)
```

### 3. تحديث `toggle_auto_renew` RPC

حالياً يشترط `status = 'active'` — يجب أن يعمل حتى لو `status = 'expired'` (لأن المستخدم قد يريد تفعيله قبل التجديد اليدوي).

---

## الملفات المتأثرة

| الملف/الأداة | التغيير |
|-------|---------|
| SQL Insert Tool | إنشاء Cron Job |
| `supabase/functions/auto-renew-subscriptions/index.ts` | إضافة تحديث status إلى expired |
| Migration | لا حاجة — الجدول يدعم status بالفعل |

بعد الاختبار الناجح، نغيّر الـ Cron من كل دقيقة إلى كل ساعة أو يومياً.
