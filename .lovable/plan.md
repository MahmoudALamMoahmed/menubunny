

# خطة إضافة تعليقات توضيحية لكل hook/state في المشروع

بعد فحص جميع الصفحات والمكونات، سأضيف تعليقات عربية فوق كل `useState`, `useEffect`, `useMemo`, `useRef`, `useQuery`, `useMutation`, وأي hook آخر، توضح:
- نوعه (React Query / UI State / Side Effect / إلخ)
- مهمته بالتحديد

---

## الملفات المتأثرة والتعليقات المطلوبة

### 1. Restaurant.tsx (صفحة اليوزر الرئيسية)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 45 | `useRestaurant(username)` | React Query - جلب بيانات المطعم من قاعدة البيانات بناءً على اسم المستخدم |
| 48 | `useState('all')` | UI State - تتبع الفئة النشطة المختارة لفلترة المنيو |
| 50 | `useCategories(restaurantId)` | React Query - جلب فئات القائمة (المتاحة فقط) |
| 51 | `useMenuItems(restaurantId, activeCategory)` | React Query - جلب أصناف القائمة مع فلترة حسب الفئة النشطة |
| 52 | `useSizes(restaurantId)` | React Query - جلب أحجام الأصناف المتاحة |
| 53 | `useExtras(restaurantId)` | React Query - جلب الإضافات المتاحة |
| 54 | `useBranches(restaurantId)` | React Query - جلب الفروع النشطة |
| 56 | `useMemo(...)` | Performance - استخراج معرفات الفروع لتمريرها لـ hook مناطق التوصيل |
| 57 | `useDeliveryAreas(branchIds)` | React Query - جلب مناطق التوصيل النشطة للفروع |
| 60-71 | `useState(...)` متعددة | UI State - حالات واجهة المستخدم (السلة، بيانات العميل، نوع العرض، المنتج المحدد، الفرع، المنطقة، طريقة الدفع) |
| 71 | `useRef(null)` | DOM Ref - مرجع لعنصر الفئات لتمرير السكرول |

### 2. Orders.tsx (صفحة الطلبات)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 25 | `useRestaurant(username)` | React Query - جلب بيانات المطعم |
| 26 | `useAdminOrders(restaurant?.id)` | React Query - جلب جميع الطلبات (بدون فلترة) للأدمن |
| 27 | `useUpdateOrderStatus(restaurant?.id)` | React Query Mutation - تحديث حالة الطلب مع إعادة جلب تلقائية |

### 3. MenuManagement.tsx (إدارة القائمة)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 65 | `useRestaurant(username)` | React Query - جلب بيانات المطعم الأساسية |
| 68-71 | `useAdminCategories/Items/Sizes/Extras` | React Query - جلب بيانات القائمة الكاملة (بدون فلترة) للإدارة |
| 76-86 | `useSave/Delete/Reorder...` | React Query Mutation - عمليات الحفظ والحذف وإعادة الترتيب |
| 63 | `useQueryClient()` | React Query - للوصول المباشر للكاش عند التحديث المتفائل (DnD) |
| 92-143 | `useState(...)` متعددة | UI State - حالات النماذج (فتح/إغلاق الفورم، التعديل، البحث، الفلترة، حوار الحذف) |
| 145-150 | `useSensors(...)` | DnD Kit - إعداد حساسات السحب والإفلات (PointerSensor + KeyboardSensor) |
| 152-156 | `useEffect(...)` | Auth Guard - توجيه المستخدم غير المسجل لصفحة تسجيل الدخول |

### 4. BranchesManagement.tsx (إدارة الفروع)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 256 | `useRestaurant(username)` | React Query - جلب بيانات المطعم |
| 259-261 | `useAdminBranches/DeliveryAreas` | React Query - جلب الفروع ومناطق التوصيل الكاملة للإدارة |
| 266-272 | `useSave/Delete/Toggle/Reorder...` | React Query Mutation - عمليات CRUD وإعادة الترتيب |
| 254 | `useQueryClient()` | React Query - للوصول المباشر للكاش عند التحديث المتفائل |
| 274-306 | `useState(...)` متعددة | UI State - حالات النماذج والحوارات والبحث والفلترة |
| 320-324 | `useEffect(...)` | Auth Guard - توجيه المستخدم غير المسجل لصفحة تسجيل الدخول |

### 5. Dashboard.tsx (لوحة التحكم)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 23 | `useRestaurant(username)` | React Query - جلب بيانات المطعم |
| 24 | `useSaveRestaurant(username)` | React Query Mutation - حفظ/تحديث بيانات المطعم |
| 26-39 | `useState(...)` | UI State - حالة فتح حوار المعلومات وبيانات النموذج |
| 41-45 | `useEffect(...)` | Auth Guard - توجيه المستخدم غير المسجل لصفحة تسجيل الدخول |
| 47-65 | `useEffect(...)` | Data Sync - مزامنة بيانات المطعم من React Query إلى نموذج التعديل المحلي |

### 6. FooterManagement.tsx (إدارة الفوتر)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 19 | `useRestaurant(username)` | React Query - جلب بيانات المطعم |
| 20 | `useSaveRestaurant(username)` | React Query Mutation - حفظ بيانات الفوتر |
| 22-28 | `useState(...)` | UI State - بيانات نموذج الفوتر |
| 30-34 | `useEffect(...)` | Auth Guard - توجيه المستخدم غير المسجل |
| 36-46 | `useEffect(...)` | Data Sync - مزامنة بيانات المطعم إلى النموذج المحلي |

### 7. Auth.tsx (تسجيل الدخول)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 56-73 | `useState(...)` متعددة | UI State - بيانات النماذج (إيميل، كلمة مرور، اسم مستخدم، حالة التحميل، الأخطاء) |
| 83 | `useUsernameAvailability(username)` | Custom Hook (useState + useEffect + debounce) - التحقق من توفر اسم المستخدم |
| 86-91 | `useEffect(...)` | Timer - عداد تنازلي لإعادة إرسال رابط التأكيد |
| 121-141 | `useEffect(...)` | Auth Redirect - عند تسجيل الدخول بنجاح، إنشاء المطعم والتوجيه |

### 8. ForgotPassword.tsx (نسيان كلمة المرور)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 13-27 | `useState(...)` متعددة | UI State - بيانات النموذج وحالات العرض المختلفة |
| 30-38 | `useEffect(...)` | URL Check - التحقق من وجود توكن إعادة التعيين في URL |
| 41-46 | `useEffect(...)` | Timer - عداد تنازلي لإعادة إرسال الرابط |

### 9. useAuth.tsx (مزود المصادقة)

| السطر | الكود | التعليق |
|-------|-------|---------|
| 27-30 | `useState(...)` | Auth State - حالة المستخدم والجلسة والتحميل واسم المستخدم |
| 106-140 | `useEffect(...)` | Auth Listener - مستمع لتغييرات حالة المصادقة من Supabase + جلب الجلسة الحالية |

### 10. المكونات الأخرى

**ImageUploader.tsx:**
- جميع الـ `useState` هي UI State لحالات الرفع والمعاينة والسحب
- `useRef` مرجع لعنصر input الملف
- `useCallback` تحسين أداء لمنع إعادة الإنشاء

**ImageCropper.tsx:**
- جميع الـ `useState` هي UI State لموقع القص والتكبير والدوران
- `useCallback` تحسين أداء

**ShareDialog.tsx:**
- `useState` حالات UI بسيطة (نسخ، فتح)
- `useRef` مرجع لعنصر QR Code

**BranchesDialog.tsx:**
- `useState` حالة فتح/إغلاق الحوار
- `useBranches` هو React Query - جلب الفروع

**ProductDetailsDialog.tsx:**
- `useState` حالات UI (الحجم المختار، الإضافات، الكمية)
- `useEffect` إعادة تعيين الاختيارات عند فتح الحوار بمنتج جديد

**useAvailabilityCheck.ts:**
- `useState` + `useEffect` مع debounce يدوي - هذا مقبول لأنه عملية لمرة واحدة أثناء التسجيل ولا تحتاج كاش

---

## ملاحظة مهمة

لن يتم تغيير أي منطق في الكود. فقط إضافة تعليقات توضيحية فوق كل hook لتسهيل فهم الكود. التعليقات ستكون بالعربية ومختصرة وواضحة.

