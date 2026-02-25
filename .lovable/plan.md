

# دمج بوابة دفع Kashier + نظام المحفظة (Wallet) - النسخة النهائية

## الهدف
السماح لصاحب المطعم بشحن رصيد محفظته عبر بوابة Kashier (وضع الاختبار Test Mode) باستخدام كل طرق الدفع المصرية (كارت بنكي، محافظ إلكترونية، BNPL).

## كيف يعمل النظام

```text
+------------------+       +---------------------+       +------------------+
| صفحة المحفظة     | ----> | create-payment       | ----> | Kashier API      |
| (Frontend)       |       | (يستخرج user من     |       | Payment Session  |
|                  |       |  التوكن، لا يقبل    |       |                  |
|                  |       |  owner_id من الفرونت)|       |                  |
+------------------+       +---------------------+       +------------------+
                                                                  |
                                                                  v
                                                          +------------------+
                                                          | صفحة الدفع       |
                                                          | (Kashier Hosted) |
                                                          +------------------+
                                                                  |
                                                          redirect + webhook
                                                                  |
+------------------+       +---------------------+               |
| تحديث الرصيد     | <---- | kashier-webhook      | <-------------+
| (داخل DB         |       | 1. تحقق التوقيع      |
|  Transaction     |       | 2. SELECT FOR UPDATE |
|  واحدة)          |       | 3. تحقق الحالة       |
+------------------+       | 4. تحقق المبلغ       |
                           | 5. تحديث في TX واحدة |
                           +---------------------+
```

## قاعدة البيانات

### جدول `wallets`
| عمود | النوع | ملاحظة |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| owner_id | uuid | NOT NULL, UNIQUE - مالك المطعم |
| balance | numeric(12,2) | DEFAULT 0, NOT NULL - محدد بدقة خانتين عشريتين لمنع مشاكل precision |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

RLS:
- SELECT: `owner_id = auth.uid()`
- INSERT: `owner_id = auth.uid()`
- لا يوجد UPDATE/DELETE من العميل - التعديل حصريا عبر service_role في الـ webhook

### جدول `wallet_transactions`
| عمود | النوع | ملاحظة |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| wallet_id | uuid | FK -> wallets, NOT NULL |
| amount | numeric(12,2) | NOT NULL - محدد بدقة خانتين عشريتين |
| type | text | DEFAULT 'topup' |
| status | text | DEFAULT 'pending', مع CHECK constraint: ('pending','success','failed') |
| kashier_order_id | text | UNIQUE - معرف الطلب في Kashier |
| kashier_session_id | text | معرف الجلسة |
| payment_method | text | card, wallet, bnpl |
| created_at | timestamptz | DEFAULT now() |

**Index للأداء:**
```text
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
```
هذا يضمن سرعة استعلامات سجل المعاملات حتى مع تزايد البيانات.

**CHECK constraint على status:**
```text
CHECK (status IN ('pending', 'success', 'failed'))
```
استخدام CHECK بدلا من ENUM لأن ENUM صعب التعديل لاحقا لو احتجنا حالة جديدة، بينما CHECK يمكن تعديله بسهولة.

RLS:
- SELECT: المالك يقرأ معاملاته فقط عبر join مع wallets
- INSERT: المالك ينشئ معاملات لمحفظته فقط
- لا يوجد UPDATE/DELETE من العميل

### دالة قاعدة بيانات: `process_successful_payment`
دالة PL/pgSQL تنفذ كل شيء في Transaction واحدة:
1. `SELECT ... FROM wallet_transactions WHERE kashier_order_id = $1 FOR UPDATE` (قفل السجل)
2. اذا كانت الحالة `success` بالفعل -> ارجاع "already_processed" بدون تعديل
3. التحقق من تطابق المبلغ المرسل من Kashier مع المبلغ الاصلي المسجل
4. اذا لم يتطابق -> ارجاع "amount_mismatch" بدون تعديل
5. تحديث حالة المعاملة الى "success" + تحديث payment_method
6. زيادة رصيد المحفظة بالمبلغ الاصلي (من الجدول، وليس من Kashier)
7. ارجاع "success"

في حالة اي خطأ -> Rollback تلقائي لكل الخطوات.

## Secrets المطلوبة (3 secrets جديدة)
- **KASHIER_API_KEY** - مفتاح الـ Payment API (Test Mode)
- **KASHIER_SECRET_KEY** - المفتاح السري (Test Mode)
- **KASHIER_MERCHANT_ID** - معرف التاجر

تحصل عليها من لوحة تحكم Kashier > Integrations.

## Edge Functions

### 1. `create-payment-session`
**الأمان - لا يقبل owner_id من الفرونت:**
- يستقبل فقط: `amount` (المبلغ المراد شحنه)
- يستخرج المستخدم من التوكن عبر `auth.getUser()` - وليس من الـ body
- يتحقق من وجود محفظة للمستخدم (وينشئها اذا لم تكن موجودة)
- يتحقق من أن المبلغ >= 10 ج.م (حد أدنى)

**الخطوات:**
1. استخراج user_id من JWT token
2. جلب/انشاء المحفظة لهذا المستخدم
3. انشاء سجل في `wallet_transactions` بحالة "pending" مع المبلغ الاصلي
4. ارسال طلب الى Kashier API لانشاء Payment Session
5. ارجاع `sessionUrl` للفرونت اند

```text
POST https://test-api.kashier.io/v3/payment/sessions
Headers: Authorization, api-key
Body:
  amount, currency: "EGP", merchantId, mode: "test"
  allowedMethods: "card,wallet,bnpl"
  merchantRedirect: "{APP_URL}/{username}/wallet?payment=done"
  serverWebhook: "{SUPABASE_URL}/functions/v1/kashier-webhook"
  order: {transaction_id}
  display: "ar"
```

### 2. `kashier-webhook`
**نقطة عامة (بدون JWT)** - تستقبل POST من Kashier فقط.

**طبقات الأمان بالترتيب:**

**الطبقة 1 - التحقق من التوقيع:**
- استخراج `x-kashier-signature` من الـ headers
- حساب HMAC-SHA256 باستخدام Payment API Key
- مقارنة التوقيع - رفض فوري اذا لم يتطابق + تسجيل في logs

**الطبقة 2 - Idempotency (منع التكرار):**
- استدعاء دالة `process_successful_payment` التي تقفل السجل بـ `FOR UPDATE`
- اذا كانت الحالة `success` بالفعل -> لا يحدث شيء

**الطبقة 3 - التحقق من المبلغ:**
- الدالة تقارن المبلغ القادم من Kashier مع المبلغ الاصلي في `wallet_transactions`
- اذا لم يتطابق -> رفض + تسجيل في logs + عدم تعديل الرصيد

**الطبقة 4 - Transaction واحدة:**
- كل العمليات (قفل، تحقق، تحديث حالة، تحديث رصيد) تتم في Transaction واحدة
- اي خطأ = Rollback تلقائي

**الطبقة 5 - تسجيل كل شيء (Logging):**
- تسجيل كل webhook وارد (ناجح أو فاشل)
- تسجيل نتيجة التحقق من التوقيع
- تسجيل اي رفض بسبب عدم تطابق المبلغ
- تسجيل حالات "already_processed"

**الرد دائما 200 OK** (حسب متطلبات Kashier).

## الفرونت اند

### صفحة المحفظة `src/pages/Wallet.tsx`
- Route جديد في App.tsx
- تعرض: الرصيد الحالي + نموذج شحن + سجل المعاملات
- زر "شحن المحفظة" يرسل المبلغ فقط (بدون owner_id) الى Edge Function
- يفتح `sessionUrl` في تبويب جديد
- **merchantRedirect يُستخدم فقط لتحديث الـ UI** (refetch البيانات عند العودة)
- لا يتم تعديل اي رصيد من الفرونت اند ابدا

### تعديل `src/pages/Dashboard.tsx`
- اضافة زر "المحفظة" في الاجراءات السريعة

### تعديل `src/App.tsx`
- اضافة Route للمحفظة

## ملخص نقاط الأمان والتحسينات

| النقطة | التطبيق |
|---|---|
| منع تكرار اضافة الرصيد | SELECT FOR UPDATE + فحص الحالة في DB Transaction |
| التحقق من المبلغ | مقارنة مبلغ Kashier مع المبلغ الاصلي في الجدول |
| عدم الثقة في owner_id | استخراج المستخدم من JWT فقط |
| عدم الاعتماد على merchantRedirect | التعديل حصريا عبر webhook |
| DB Transaction واحدة | دالة process_successful_payment تنفذ كل شيء atomically |
| تسجيل Logs | كل webhook يُسجل بنتيجته |
| numeric(12,2) | دقة محددة لمنع مشاكل precision |
| Index على wallet_id | اداء سريع لسجل المعاملات |
| CHECK constraint على status | قيم محددة فقط (pending, success, failed) |

## ملخص الملفات

| ملف | نوع | وصف |
|---|---|---|
| Migration | جديد | جداول wallets, wallet_transactions + index + check + دالة process_successful_payment + RLS |
| supabase/functions/create-payment-session/index.ts | جديد | انشاء جلسة دفع |
| supabase/functions/kashier-webhook/index.ts | جديد | استقبال اشعارات Kashier بكل طبقات الأمان |
| src/pages/Wallet.tsx | جديد | صفحة المحفظة |
| src/pages/Dashboard.tsx | تعديل | اضافة رابط المحفظة |
| src/App.tsx | تعديل | اضافة Route |

