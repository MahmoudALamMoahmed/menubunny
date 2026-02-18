
# نظام حسابات الفروع - Branch Staff Accounts

## الفكرة العامة

إنشاء نظام يمكّن صاحب المطعم من إضافة حساب (إيميل + كلمة مرور) لكل فرع، بحيث يستطيع موظف الفرع تسجيل الدخول ورؤية طلبات فرعه فقط، دون أي صلاحيات أخرى.

## تصميم الحل

### نوع المستخدم

- **صاحب المطعم** (`owner`): يرى كل شيء، يتحكم في كل شيء.
- **موظف فرع** (`branch_staff`): يسجل دخوله من نفس صفحة `/auth`، يُعاد توجيهه تلقائياً لصفحة طلبات فرعه فقط.

### لماذا نفس صفحة تسجيل الدخول؟

- أبسط للمستخدم
- لا داعي لرابط منفصل
- بعد الدخول، النظام يحدد تلقائياً هل هو صاحب مطعم أم موظف فرع ويوجهه بشكل مناسب

---

## التعديلات المطلوبة

### 1. قاعدة البيانات (Migration)

**جدول `branch_staff`** - ربط مستخدمي Supabase Auth بالفروع:

```text
branch_staff:
  - id           uuid (PK)
  - user_id      uuid → auth.users (NOT NULL, UNIQUE)
  - branch_id    uuid → branches (NOT NULL)
  - restaurant_id uuid → restaurants (NOT NULL)
  - created_at   timestamptz
```

**سبب الاختيار**: 
- `user_id` له `UNIQUE` constraint → كل مستخدم مرتبط بفرع واحد فقط
- `restaurant_id` مُخزن مباشرةً للوصول السريع بدون JOIN معقد

**دالة Security Definer** لتجنب recursion في RLS:
```sql
create or replace function public.get_staff_branch_id(_user_id uuid)
returns uuid language sql stable security definer
set search_path = public as $$
  select branch_id from public.branch_staff where user_id = _user_id
$$;

create or replace function public.get_staff_restaurant_id(_user_id uuid)
returns uuid language sql stable security definer
set search_path = public as $$
  select restaurant_id from public.branch_staff where user_id = _user_id
$$;
```

**تعديل RLS على جدول `orders`**:
- إضافة Policy جديدة تسمح لموظف الفرع برؤية طلبات فرعه فقط:
```sql
CREATE POLICY "branch_staff_can_view_their_branch_orders"
ON public.orders FOR SELECT
USING (
  branch_id = public.get_staff_branch_id(auth.uid())
);

CREATE POLICY "branch_staff_can_update_their_branch_orders"  
ON public.orders FOR UPDATE
USING (
  branch_id = public.get_staff_branch_id(auth.uid())
);
```

**RLS على جدول `branch_staff`**:
```sql
-- صاحب المطعم يرى ويدير موظفي فروعه
CREATE POLICY "owners_manage_branch_staff" ON public.branch_staff
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = branch_staff.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);
-- الموظف يرى سجله فقط
CREATE POLICY "staff_see_own_record" ON public.branch_staff
FOR SELECT USING (user_id = auth.uid());
```

---

### 2. صفحة إدارة الفروع (`BranchesManagement.tsx`)

إضافة قسم "حساب الفرع" داخل كل كارت فرع يحتوي على:

**الحالة A - لا يوجد حساب بعد**:
- زر "إضافة حساب للفرع"
- يفتح Dialog يطلب: الإيميل + كلمة المرور

**الحالة B - يوجد حساب**:
- عرض الإيميل المرتبط بالفرع
- زر "حذف الحساب"

**كيف يتم الإنشاء؟**
- صاحب المطعم يكتب الإيميل وكلمة المرور
- يتم استدعاء Edge Function تستخدم `supabase_admin` (service role) لإنشاء المستخدم في Supabase Auth وإدخال سجل في `branch_staff`
- **سبب Edge Function**: العميل (browser) لا يستطيع إنشاء مستخدمين آخرين - يتطلب service role key

---

### 3. Edge Function جديدة: `create-branch-staff`

```text
Input:
  - branch_id: string
  - restaurant_id: string
  - email: string
  - password: string

Logic:
  1. التحقق أن المستدعي هو صاحب المطعم (من auth token)
  2. إنشاء مستخدم في Supabase Auth (service role)
  3. إدخال سجل في branch_staff
  
Output:
  - { success: true, user_id: "..." }
  - أو { error: "..." }
```

---

### 4. Edge Function جديدة: `delete-branch-staff`

```text
Input:
  - staff_user_id: string

Logic:
  1. التحقق أن المستدعي هو صاحب المطعم
  2. حذف المستخدم من Supabase Auth (service role)
  3. حذف السجل من branch_staff (cascade)
  
Output:
  - { success: true }
```

---

### 5. تعديل `useAuth.tsx` - منطق التوجيه بعد الدخول

حالياً: بعد الدخول، يتم التوجيه لـ `/`
المطلوب: التحقق هل المستخدم موظف فرع أم صاحب مطعم

```text
بعد تسجيل الدخول:
  1. check if user has a record in branch_staff
     - YES → navigate to `/{restaurant_username}/{branch_username}/orders` (أو أي route مناسب)
     - NO  → السلوك الحالي (التوجيه للرئيسية كصاحب مطعم)
```

---

### 6. تعديل صفحة الطلبات (`Orders.tsx`)

إضافة منطق فلترة ذكي:
- **إذا صاحب المطعم**: يرى كل الطلبات (السلوك الحالي)
- **إذا موظف فرع**: يرى فقط طلبات فرعه (مع إضافة badge يوضح اسم الفرع)

---

## تدفق البيانات الكامل

```text
صاحب المطعم
  │
  ├── يفتح صفحة الفروع
  ├── يضغط "إضافة حساب" على فرع معين
  ├── يكتب الإيميل + كلمة المرور
  └── يضغط "إنشاء"
        │
        ▼
   Edge Function (create-branch-staff)
        │
        ├── ينشئ مستخدم في Supabase Auth
        └── يدخل سجل في branch_staff
              { user_id, branch_id, restaurant_id }

موظف الفرع
  │
  ├── يفتح /auth ويسجل دخوله بإيميله
  ├── useAuth يتحقق: هل هذا المستخدم في branch_staff؟
  └── نعم → يوجهه لصفحة الطلبات بفرعه فقط
        │
        ▼
   /:username/orders
   (يرى فقط orders حيث branch_id = فرعه)
```

---

## الملفات المتأثرة

| الملف | التعديل |
|---|---|
| Migration SQL | إنشاء جدول `branch_staff` + دوال + RLS policies |
| `src/hooks/useAuth.tsx` | إضافة `branchStaffInfo` state + منطق توجيه الموظفين |
| `src/pages/BranchesManagement.tsx` | إضافة قسم "حساب الفرع" في كل كارت فرع |
| `src/hooks/useAdminData.ts` | hook جديد `useBranchStaffList` لجلب حسابات موظفي الفروع |
| `supabase/functions/create-branch-staff/index.ts` | Edge Function جديدة لإنشاء حساب موظف |
| `supabase/functions/delete-branch-staff/index.ts` | Edge Function جديدة لحذف حساب موظف |
| `src/pages/Orders.tsx` | فلترة تلقائية حسب نوع المستخدم (صاحب/موظف) |

---

## ملاحظات أمنية

- **RLS** على `orders` تمنع موظف الفرع من رؤية طلبات فروع أخرى حتى لو حاول مباشرةً من قاعدة البيانات
- **دوال Security Definer** تمنع حلقات RLS اللانهائية
- **Service Role** محمي داخل Edge Function فقط، لا يُشارك مع العميل أبداً
- موظف الفرع **لا يستطيع** إنشاء حسابات أو تعديل المنيو أو أي شيء غير صفحة الطلبات
