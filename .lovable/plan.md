
# إضافة فلاتر متقدمة لصفحة الطلبات

## ما سيتم إنشاؤه

### مكون فلترة مشترك `src/components/OrderFilters.tsx`

مكون واحد يُستخدم في كل من `Orders.tsx` و `BranchOrders.tsx` يحتوي على:

**1. بحث بكود الطلب / اسم العميل / رقم العميل**
- حقل إدخال واحد يبحث في الثلاثة معاً (كود الطلب، اسم العميل، رقم الهاتف)
- بحث فوري أثناء الكتابة (بدون زر بحث)
- أيقونة بحث داخل الحقل

**2. فلتر الوقت**
- أزرار chips قابلة للاختيار: "آخر ساعة" | "ساعتين" | "3 ساعات" | "4 ساعات" | "5 ساعات" | "6 ساعات" | "7 ساعات" | "8 ساعات" | "الكل"
- الافتراضي: "الكل"
- تصميم أفقي مع scroll على الموبايل

**3. فلتر حالة الطلب**
- أزرار chips: "الكل" | "في الانتظار" | "مؤكد" | "قيد التحضير" | "جاهز" | "تم التسليم" | "ملغي"
- كل حالة بلونها المميز (نفس ألوان البادجات الموجودة)

**4. عداد النتائج**
- يظهر عدد الطلبات المفلترة من إجمالي الطلبات (مثال: "عرض 5 من 20 طلب")

---

## التصميم الريسبونسيف

```text
Desktop (lg+):
+--------------------------------------------------+
| [🔍 بحث بالكود أو الاسم أو الرقم...............]  |
| الوقت: [الكل] [ساعة] [ساعتين] [3] [4] [5] [6].. |
| الحالة: [الكل] [انتظار] [مؤكد] [تحضير] [جاهز].. |
| عرض 5 من 20 طلب                                  |
+--------------------------------------------------+

Mobile (sm):
+---------------------------+
| [🔍 بحث................] |
| الوقت:                    |
| [الكل] [ساعة] [ساعتين] ► |
| (scroll أفقي)             |
| الحالة:                   |
| [الكل] [انتظار] [مؤكد] ► |
| عرض 5 من 20 طلب          |
+---------------------------+
```

- حقل البحث يأخذ العرض الكامل دائماً
- أزرار الفلاتر في صف أفقي مع `overflow-x-auto` على الشاشات الصغيرة
- الفلاتر داخل Card مع padding مناسب

---

## منطق الفلترة (في الصفحة، ليس في المكون)

الفلترة تتم على البيانات المحملة بالفعل من React Query (client-side filtering) لأن:
- البيانات محملة مسبقاً بالكامل
- لا حاجة لطلبات إضافية من السيرفر
- استجابة فورية عند تغيير الفلتر

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [timeFilter, setTimeFilter] = useState<number | null>(null); // ساعات، أو null = الكل
const [statusFilter, setStatusFilter] = useState<string | null>(null); // null = الكل

const filteredOrders = useMemo(() => {
  return orders.filter(order => {
    // فلتر البحث
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchName = order.customer_name.toLowerCase().includes(q);
      const matchPhone = order.customer_phone.includes(q);
      if (!matchId && !matchName && !matchPhone) return false;
    }
    // فلتر الوقت
    if (timeFilter !== null) {
      const orderTime = new Date(order.created_at).getTime();
      const cutoff = Date.now() - (timeFilter * 60 * 60 * 1000);
      if (orderTime < cutoff) return false;
    }
    // فلتر الحالة
    if (statusFilter && order.status !== statusFilter) return false;
    return true;
  });
}, [orders, searchQuery, timeFilter, statusFilter]);
```

---

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/OrderFilters.tsx` | **إنشاء جديد** - مكون الفلاتر المشترك |
| `src/pages/Orders.tsx` | إضافة state الفلاتر + منطق الفلترة + عرض المكون |
| `src/pages/BranchOrders.tsx` | نفس الإضافة (فلاتر + فلترة) |

---

## التفاصيل التقنية

### Props للمكون `OrderFilters`:

```typescript
interface OrderFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  timeFilter: number | null;
  onTimeFilterChange: (hours: number | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  totalCount: number;
  filteredCount: number;
}
```

### أزرار الوقت:
- تستخدم `Button` مع `variant="outline"` للعادي و `variant="default"` للمختار
- حجم صغير `size="sm"` للمظهر المتناسق

### أزرار الحالة:
- تستخدم `Badge` بألوان مطابقة لألوان `STATUS_CONFIG` في `OrderCard.tsx`
- cursor pointer وتأثير hover
