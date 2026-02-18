
# إصلاح توجيه موظف الفرع بعد تسجيل الدخول

## تشخيص المشكلة

المشكلة الجوهرية هي **سباق التزامن (Race Condition)** بين:
- **`useEffect` في `Auth.tsx`**: يُراقب تغيّر `user` ويحاول التوجيه فوراً
- **`resolveUserType` في `useAuth.tsx`**: دالة غير متزامنة تجلب بيانات الموظف من قاعدة البيانات

عند تسجيل الدخول:
1. `user` يُعيَّن (المستخدم دخل)
2. `useEffect` في Auth.tsx يُشتغَل على الفور
3. في هذه اللحظة `isBranchStaff = false` (لأن بيانات الموظف لم تُجلب بعد)
4. يُوجَّه المستخدم لـ `/` كأنه صاحب مطعم
5. بعد ثانية تصل بيانات الموظف لكن التوجيه تمّ خطأً

**النتيجة**: موظف الفرع يجد نفسه في الصفحة الرئيسية مع زر "الدخول لمطعمك" معطّل (صحيح أمنياً لكن بدون بديل مناسب).

## الحل المقترح

### المبدأ: إضافة حالة "loading" للتحقق من نوع المستخدم

إضافة state جديدة `userTypeLoading` في `useAuth.tsx` تبقى `true` حتى تنتهي `resolveUserType` من عملها. بهذا يعرف كل مكون متى يكون النوع جاهزاً فعلاً.

---

## التعديلات المطلوبة

### 1. `src/hooks/useAuth.tsx` - إضافة `userTypeLoading`

إضافة state جديدة:
```typescript
const [userTypeLoading, setUserTypeLoading] = useState(true);
```

تعديل `resolveUserType`:
```typescript
const resolveUserType = async (userId: string) => {
  setUserTypeLoading(true);   // ← ابدأ التحميل
  const staffInfo = await fetchBranchStaffInfo(userId);
  if (staffInfo) {
    setBranchStaffInfo(staffInfo);
    setUsername(null);
  } else {
    setBranchStaffInfo(null);
    await fetchUsername(userId);
  }
  setUserTypeLoading(false);  // ← انتهى التحميل
};
```

عند تسجيل الخروج، إعادة تعيين الحالة:
```typescript
// في onAuthStateChange عندما session تكون null
setUserTypeLoading(false);
```

تصدير `userTypeLoading` في السياق (context).

---

### 2. `src/pages/Auth.tsx` - إصلاح منطق التوجيه

**المشكلة الحالية**: `useEffect` يعتمد فقط على `user` و`isBranchStaff`، ولا ينتظر اكتمال جلب البيانات.

**الإصلاح**: إضافة `userTypeLoading` كشرط:

```typescript
const { signIn, signUp, user, ensureRestaurantExists, 
        branchStaffInfo, isBranchStaff, userTypeLoading } = useAuth();

useEffect(() => {
  const handleUserSession = async () => {
    if (!user) return;
    if (userTypeLoading) return; // ← انتظر حتى تكتمل البيانات

    if (isBranchStaff && branchStaffInfo) {
      navigate(`/${branchStaffInfo.restaurantUsername}/orders`);
      return;
    }

    if (!isBranchStaff) {
      const { created, error } = await ensureRestaurantExists();
      if (created) { toast(...) }
      if (!error || error.message === 'No pending restaurant data found') {
        navigate('/');
      }
    }
  };
  
  handleUserSession();
}, [user, isBranchStaff, branchStaffInfo, userTypeLoading, navigate, ...]);
```

---

### 3. `src/components/Header.tsx` - تحسين تجربة موظف الفرع

حالياً زر "الدخول لمطعمك" معطّل لأن `username = null` لموظف الفرع. يجب إضافة زر مخصص لموظف الفرع بدلاً منه:

**للمالك** → زر "الدخول لمطعمك" (موجود)  
**لموظف الفرع** → زر "صفحة الطلبات" يوجهه لـ `/{restaurantUsername}/orders`

```typescript
const { user, username, signOut, isBranchStaff, branchStaffInfo } = useAuth();

// في مكان الزر:
{user ? (
  <div className="flex items-center gap-3">
    <span>مرحباً {user.email}</span>
    
    {isBranchStaff && branchStaffInfo ? (
      // زر مخصص لموظف الفرع
      <Button onClick={() => navigate(`/${branchStaffInfo.restaurantUsername}/orders`)}>
        طلبات فرعي
      </Button>
    ) : (
      // زر المالك العادي
      <Button onClick={() => username && navigate(`/${username}`)} disabled={!username}>
        الدخول لمطعمك
      </Button>
    )}
    
    <Button variant="outline" onClick={handleSignOut}>تسجيل الخروج</Button>
  </div>
) : (...)}
```

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|---|---|
| `src/hooks/useAuth.tsx` | إضافة `userTypeLoading` state وتصديرها |
| `src/pages/Auth.tsx` | إضافة `userTypeLoading` كشرط للانتظار قبل التوجيه |
| `src/components/Header.tsx` | إضافة زر "طلبات فرعي" المخصص لموظف الفرع |

## الأمان - لا تغيير

- RLS على قاعدة البيانات تبقى كما هي (موظف الفرع لا يرى إلا طلبات فرعه)
- الموظف لا يستطيع الوصول لصفحات الإدارة (Dashboard, MenuManagement, etc.) لأنها تتحقق من `owner_id`
- التوجيه في الفرونت هو للتسهيل فقط، والحماية الفعلية في قاعدة البيانات
