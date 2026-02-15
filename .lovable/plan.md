
# اضافة نظام استقبال الطلبات المزدوج (واتساب + لوحة التحكم)

## الفكرة

حاليا الطلبات تُرسل فقط عبر واتساب. المطلوب اضافة خيار ثاني: استقبال الطلبات مباشرة في لوحة التحكم (صفحة الطلبات). صاحب المطعم يختار لكل فرع طريقة استقبال الطلبات.

## التعديلات المطلوبة

### 1. تعديل قاعدة البيانات (Migration)

اضافة عمود `order_mode` لجدول `branches`:

```text
order_mode TEXT DEFAULT 'whatsapp'
-- القيم المتاحة: 'whatsapp' | 'dashboard' | 'both'
```

- `whatsapp` (الافتراضي): الطلبات تُرسل عبر واتساب فقط (السلوك الحالي)
- `dashboard`: الطلبات تُحفظ في قاعدة البيانات وتظهر في صفحة الطلبات فقط
- `both`: الخيارين متاحين للعميل

### 2. تعديل صفحة ادارة الفروع (`BranchesManagement.tsx`)

- اضافة حقل "طريقة استقبال الطلبات" في نموذج اضافة/تعديل الفرع
- عرض Select بثلاث خيارات: واتساب فقط / لوحة التحكم فقط / الاثنين معا
- اضافة `order_mode` للـ `formData` state والـ `resetForm` و `openEditDialog`

### 3. تعديل الـ Mutations (`useAdminMutations.ts`)

- اضافة `order_mode` للـ `SaveBranchData` interface
- الحقل يُرسل مع بقية بيانات الفرع عند الحفظ/التعديل

### 4. تعديل صفحة المطعم - السلة (`Restaurant.tsx`)

هذا التعديل الاساسي. بعد اختيار الفرع، يتم تحديد زر/أزرار الارسال بناءً على `order_mode` الفرع المختار:

- **اذا `whatsapp`**: يظهر زر "ارسال الطلب واتساب" فقط (السلوك الحالي)
- **اذا `dashboard`**: يظهر زر "ارسال الطلب للمطعم" فقط (يحفظ في قاعدة البيانات)
- **اذا `both`**: يظهر الزرين معا

#### دالة جديدة: `sendOrderToDashboard`
- تحفظ الطلب في جدول `orders` عبر Supabase insert
- تتضمن نفس البيانات (الاصناف، الفرع، المنطقة، بيانات العميل، طريقة الدفع، الاجمالي)
- بعد الحفظ بنجاح: تفريغ السلة + اظهار رسالة نجاح

### 5. تحديث جدول `orders` (اختياري - تحسين)

اضافة عمودين اختياريين لتخزين معلومات اضافية:

```text
branch_id UUID REFERENCES branches(id)
delivery_area_id UUID REFERENCES delivery_areas(id)
payment_method TEXT DEFAULT 'cash'
customer_address TEXT
```

هذا يحسن تتبع الطلبات في لوحة التحكم بشكل كبير مقارنة بتخزينها كنص في `notes`.

---

## التفاصيل التقنية

### Migration SQL

```text
-- اضافة عمود طريقة استقبال الطلبات للفروع
ALTER TABLE branches ADD COLUMN order_mode TEXT DEFAULT 'whatsapp';

-- اضافة اعمدة تفصيلية لجدول الطلبات
ALTER TABLE orders ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE orders ADD COLUMN delivery_area_id UUID REFERENCES delivery_areas(id);
ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN customer_address TEXT;
```

### الملفات المتأثرة

| الملف | التعديل |
|---|---|
| `BranchesManagement.tsx` | اضافة حقل order_mode في نموذج الفرع |
| `useAdminMutations.ts` | اضافة order_mode للـ SaveBranchData |
| `Restaurant.tsx` | اضافة دالة sendOrderToDashboard + تعديل ازرار السلة حسب order_mode |
| `useRestaurantData.ts` | لا يحتاج تعديل (الـ select('*') يجلب العمود الجديد تلقائيا) |
| `Orders.tsx` | تحسين عرض بيانات الطلب (الفرع، المنطقة، طريقة الدفع) |

### منطق زر الارسال في السلة

```text
الفرع المختار
    |
    +-- order_mode = 'whatsapp'
    |       --> زر "ارسال الطلب واتساب" (اخضر)
    |
    +-- order_mode = 'dashboard'  
    |       --> زر "ارسال الطلب للمطعم" (ازرق/primary)
    |
    +-- order_mode = 'both'
            --> زر "ارسال الطلب واتساب" (اخضر)
            --> زر "ارسال الطلب للمطعم" (ازرق/primary)
```

### بنية بيانات الطلب المحفوظ في Dashboard

```text
{
  restaurant_id: "...",
  branch_id: "...",
  delivery_area_id: "...",
  customer_name: "...",
  customer_phone: "...",
  customer_address: "...",
  payment_method: "cash" | "vodafone" | "etisalat" | "orange",
  items: [{ id, name, price, quantity, total, size?, extras? }],
  total_price: 150,
  notes: "...",
  status: "pending"
}
```
