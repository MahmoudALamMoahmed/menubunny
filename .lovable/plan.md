
# فصل صفحة طلبات الفرع + تنظيف الكود القديم

## ما سيتم حذفه من الكود القديم

### في `Orders.tsx` (صفحة الأدمن):
- حذف `isBranchStaff` و`branchStaffInfo` من `useAuth()` (لن تُستخدم بعد الآن)
- حذف `useBranchOrders` بالكامل (الـ hook وكل استخدامه)
- حذف المنطق الشرطي `isBranchStaff ? branchOrders : allOrders`
- حذف badge "موظف فرع" وشرط `{!isBranchStaff && ...}` من الـ UI
- حذف المتغير `effectiveUsername` (غير مستخدم أصلاً في الكود الحالي)
- حذف import الـ `Building2` icon (يستخدمه فقط badge الموظف)
- النتيجة: صفحة `Orders.tsx` تصبح **للمالك فقط** بكود نظيف بدون شروط

### في `Auth.tsx`:
- تغيير الـ redirect من `/${restaurantUsername}/orders` إلى `/${restaurantUsername}/branch-orders`

### في `Header.tsx`:
- تغيير رابط زر "طلبات فرعي" من `/${restaurantUsername}/orders` إلى `/${restaurantUsername}/branch-orders`

---

## ما سيُضاف

### 1. صفحة جديدة `src/pages/BranchOrders.tsx`
صفحة مستقلة كاملة تحتوي على:

**Guards للأمان:**
- إذا لم يكن مسجل دخول → توجيه لـ `/auth`
- إذا كان مسجل دخول لكن ليس موظف فرع (أي مالك) → توجيه لـ `/:username/orders`

**المحتوى:**
- Header بسيط: اسم المطعم + badge "موظف فرع" + زر تسجيل خروج فقط
- قائمة الطلبات باستخدام `useBranchOrders` من `useAdminData`
- أزرار تحديث حالة الطلب باستخدام `useUpdateOrderStatus`
- نفس تصميم بطاقات الطلبات الموجودة (كود مشترك منسوخ ومنظف)

### 2. إضافة Guard في صفحات الأدمن

في كل صفحة: `Dashboard`, `Orders`, `MenuManagement`, `FooterManagement`, `BranchesManagement`:

```typescript
const { isBranchStaff, branchStaffInfo, userTypeLoading } = useAuth();

useEffect(() => {
  if (userTypeLoading) return;
  if (isBranchStaff && branchStaffInfo) {
    navigate(`/${branchStaffInfo.restaurantUsername}/branch-orders`);
  }
}, [isBranchStaff, branchStaffInfo, userTypeLoading, navigate]);
```

### 3. تحديث `App.tsx`
إضافة route جديد:
```typescript
const BranchOrders = lazy(() => import("./pages/BranchOrders"));
// ...
<Route path="/:username/branch-orders" element={<BranchOrders />} />
```

---

## ملخص الملفات المتأثرة

| الملف | نوع التغيير | التفاصيل |
|---|---|---|
| `src/pages/BranchOrders.tsx` | **إنشاء جديد** | صفحة طلبات الفرع المستقلة |
| `src/App.tsx` | **تعديل** | إضافة route الجديد |
| `src/pages/Orders.tsx` | **تنظيف + guard** | حذف كل كود الموظف، إضافة guard للمالك فقط |
| `src/pages/Auth.tsx` | **تعديل بسيط** | تغيير redirect الموظف لـ `branch-orders` |
| `src/components/Header.tsx` | **تعديل بسيط** | تغيير رابط "طلبات فرعي" لـ `branch-orders` |
| `src/pages/Dashboard.tsx` | **إضافة guard** | طرد موظف الفرع لـ `branch-orders` |
| `src/pages/MenuManagement.tsx` | **إضافة guard** | طرد موظف الفرع لـ `branch-orders` |
| `src/pages/FooterManagement.tsx` | **إضافة guard** | طرد موظف الفرع لـ `branch-orders` |
| `src/pages/BranchesManagement.tsx` | **إضافة guard** | طرد موظف الفرع لـ `branch-orders` |

---

## تدفق المستخدم بعد التغيير

```text
موظف الفرع يسجل الدخول
        ↓
Auth.tsx → navigate(`/{restaurantUsername}/branch-orders`)
        ↓
صفحة BranchOrders.tsx:
  - Guard يتحقق: هل هو موظف فرع؟ ✓
  - يرى طلبات فرعه فقط (RLS تحميه من الباك-اند)
  - لا يوجد أي رابط لصفحات الأدمن

لو حاول الدخول لـ /dashboard أو /orders أو أي صفحة أدمن عبر URL
        ↓
Guard في الصفحة يكتشف isBranchStaff = true
        ↓
يُعاد توجيهه فوراً إلى /{restaurantUsername}/branch-orders
```

---

## الأمان - طبقتان

- **طبقة 1 (قاعدة البيانات)**: RLS تمنع الموظف من رؤية أو تعديل أي بيانات خارج فرعه حتى لو تجاوز الـ Guards
- **طبقة 2 (Frontend Guards)**: كل صفحة أدمن تطرده فوراً، وصفحة BranchOrders لا تحتوي على أي روابط للأدمن
