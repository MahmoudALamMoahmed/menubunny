

## الخطة: استبدال طرق الدفع الثابتة بنظام ديناميكي

### الفكرة
بدلاً من الأعمدة الثابتة (vodafone_cash, etisalat_cash, orange_cash) في جدول branches، سننشئ جدول جديد `branch_payment_methods` يسمح لصاحب المطعم بإضافة أي طريقة دفع يريدها باسم ورقم حساب مخصصين.

### 1. تغييرات قاعدة البيانات

**إنشاء جدول جديد:**
```sql
CREATE TABLE branch_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,        -- مثال: "فودافون كاش", "انستاباي", "بنك مصر"
  account_number text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```
مع سياسات RLS مناسبة (قراءة للجميع، إدارة لصاحب المطعم).

**حذف الأعمدة القديمة** من جدول branches:
```sql
ALTER TABLE branches DROP COLUMN vodafone_cash, DROP COLUMN etisalat_cash, DROP COLUMN orange_cash;
```

### 2. تغييرات الكود

**BranchesManagement.tsx:**
- حذف حقول vodafone/etisalat/orange من الفورم
- إضافة قسم ديناميكي لإدارة طرق الدفع (إضافة/حذف) مع حقلين: اسم الطريقة + رقم الحساب
- جلب وحفظ من/إلى جدول `branch_payment_methods`

**Restaurant.tsx (السلة):**
- استبدال خيارات الدفع الثابتة بقائمة ديناميكية من `branch_payment_methods` للفرع المختار
- عرض اسم الطريقة ورقم الحساب مع زر النسخ
- الإبقاء على "الدفع عند الاستلام" كخيار ثابت دائماً

**OrderCard.tsx:**
- تحديث `getPaymentText` ليعرض اسم طريقة الدفع كما هو (لأنها أصبحت نصوص مخصصة)

**PaymentMethods.tsx (التحليلات):**
- تحديث `PAYMENT_LABELS` لعرض اسم الطريقة كما هو إذا لم يكن في القاموس

**useAnalyticsData.ts:**
- لا يحتاج تعديل (يستخدم payment_method كنص بالفعل)

**useRestaurantData.ts / useAdminData.ts:**
- إضافة hook لجلب طرق الدفع لفرع معين

### 3. كيف يعمل النظام الجديد

- صاحب المطعم يفتح تعديل الفرع → يضغط "إضافة طريقة دفع" → يكتب الاسم (مثلاً "انستاباي") والرقم → حفظ
- العميل في السلة يرى: "الدفع عند الاستلام" + طرق الدفع المضافة للفرع المختار
- عند اختيار طريقة دفع إلكترونية يظهر الرقم مع زر نسخ + تنبيه إرسال سكرين شوت عبر واتساب
- في الطلب يُحفظ اسم الطريقة في `payment_method` كنص

### الملفات المتأثرة
- `src/pages/BranchesManagement.tsx`
- `src/pages/Restaurant.tsx`
- `src/components/OrderCard.tsx`
- `src/components/analytics/PaymentMethods.tsx`
- `src/hooks/useRestaurantData.ts` أو `useAdminData.ts`
- Migration جديد لقاعدة البيانات

