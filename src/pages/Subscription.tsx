import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurantData';
import { useAdminCategories, useAdminMenuItems, useAdminBranches, useAdminExtras } from '@/hooks/useAdminData';
import { useRestaurantLimits, usePlans, useWalletBalance, useSubscribeToPlan, useSubscriptionHistory } from '@/hooks/useSubscription';
import { 
  Crown, ArrowLeft, Check, Wallet, Calendar, Zap, AlertTriangle, 
  Utensils, Grid3X3, Building2, Cookie, X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Subscription() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isBranchStaff, branchStaffInfo, userTypeLoading } = useAuth();
  
  // React Query - جلب البيانات
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(username);
  const restaurantId = restaurant?.id;
  
  const { data: limits, isLoading: limitsLoading } = useRestaurantLimits(restaurantId);
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: walletBalance = 0 } = useWalletBalance(user?.id);
  const { data: history = [] } = useSubscriptionHistory(restaurantId);
  
  // Current counts for usage display
  const { data: categories = [] } = useAdminCategories(restaurantId);
  const { data: menuItems = [] } = useAdminMenuItems(restaurantId);
  const { data: branches = [] } = useAdminBranches(restaurantId);
  const { data: extras = [] } = useAdminExtras(restaurantId);
  
  const subscribeMut = useSubscribeToPlan(restaurantId);
  
  // UI State
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; planId: string; planName: string; price: number }>({
    open: false, planId: '', planName: '', price: 0
  });

  // Auth Guard
  useEffect(() => {
    if (authLoading || userTypeLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isBranchStaff && branchStaffInfo) {
      navigate(`/${branchStaffInfo.restaurantUsername}/branch-orders`);
    }
  }, [authLoading, userTypeLoading, user, isBranchStaff, branchStaffInfo, navigate]);

  const handleSubscribe = () => {
    subscribeMut.mutate(confirmDialog.planId, {
      onSuccess: () => setConfirmDialog({ open: false, planId: '', planName: '', price: 0 }),
    });
  };

  const isLoading = authLoading || restaurantLoading || limitsLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-gray-600">المطعم غير موجود</p>
          <Button onClick={() => navigate('/')} className="mt-4">العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  // Usage calculations
  const usageItems = [
    { 
      label: 'الفئات', 
      current: categories.length, 
      max: limits?.max_categories,
      icon: Grid3X3,
    },
    { 
      label: 'الأصناف', 
      current: menuItems.length, 
      max: limits?.max_items,
      icon: Utensils,
    },
    { 
      label: 'الفروع', 
      current: branches.length, 
      max: limits?.max_branches,
      icon: Building2,
    },
    { 
      label: 'الإضافات', 
      current: extras.length, 
      max: limits?.max_extras,
      icon: Cookie,
    },
  ];

  // Plan features for display
  const planFeatures = (plan: typeof plans[0]) => {
    const features: { text: string; included: boolean }[] = [
      { text: plan.max_categories === null ? 'فئات غير محدودة' : `حتى ${plan.max_categories} فئات`, included: true },
      { text: plan.max_items === null ? 'أصناف غير محدودة' : `حتى ${plan.max_items} صنف`, included: true },
      { text: plan.max_branches === null ? 'فروع غير محدودة' : `حتى ${plan.max_branches} فروع`, included: true },
      { text: plan.max_extras === null ? 'إضافات غير محدودة' : `حتى ${plan.max_extras} إضافات`, included: true },
      { text: 'استقبال طلبات واتساب', included: (plan.features as any)?.whatsapp_orders ?? true },
      { text: 'استقبال طلبات لوحة التحكم', included: (plan.features as any)?.dashboard_orders ?? false },
      { text: 'موظفي الفروع', included: (plan.features as any)?.branch_staff ?? false },
      { text: 'التحليلات والتقارير', included: (plan.features as any)?.analytics ?? false },
    ];
    return features;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate(`/${restaurant.username}/dashboard`)}>
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة للوحة التحكم
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  إدارة الباقة
                </h1>
                <p className="text-gray-600 text-sm">{restaurant.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Current Plan & Wallet */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  الباقة الحالية
                </CardTitle>
                <Badge variant={limits?.is_subscribed ? 'default' : 'secondary'} className="text-sm">
                  {limits?.plan_name_ar || 'مجانية'}
                </Badge>
              </div>
              {limits?.expires_at && (
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  تنتهي في: {format(new Date(limits.expires_at), 'd MMMM yyyy', { locale: ar })}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {usageItems.map((item) => {
                const Icon = item.icon;
                const isUnlimited = item.max === null;
                const percent = isUnlimited ? 0 : Math.min(100, (item.current / item.max!) * 100);
                const isNearLimit = !isUnlimited && percent >= 80;
                
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                      </span>
                      <span className={isNearLimit ? 'text-orange-600 font-medium' : ''}>
                        {item.current} / {isUnlimited ? '∞' : item.max}
                      </span>
                    </div>
                    {!isUnlimited && (
                      <Progress 
                        value={percent} 
                        className={`h-2 ${isNearLimit ? '[&>div]:bg-orange-500' : ''}`} 
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Wallet Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-500" />
                رصيد المحفظة
              </CardTitle>
              <CardDescription>الرصيد المتاح للاشتراك</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {walletBalance.toLocaleString('ar-EG')} <span className="text-lg font-normal">ج.م</span>
              </div>
              <Button 
                variant="outline" 
                className="mt-4 w-full"
                onClick={() => navigate(`/${restaurant.username}/wallet`)}
              >
                شحن المحفظة
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Plans Grid */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            الباقات المتاحة
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = limits?.plan_id === plan.id;
              const canAfford = walletBalance >= Number(plan.price_monthly);
              const features = planFeatures(plan);
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-primary">الباقة الحالية</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name_ar}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">
                        {Number(plan.price_monthly).toLocaleString('ar-EG')}
                      </span>
                      <span className="text-muted-foreground"> ج.م / شهر</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground'}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="outline">
                        الباقة الحالية
                      </Button>
                    ) : Number(plan.price_monthly) === 0 ? (
                      <Button disabled className="w-full" variant="outline">
                        الباقة المجانية
                      </Button>
                    ) : (
                      <Button 
                        className="w-full"
                        disabled={!canAfford || subscribeMut.isPending}
                        onClick={() => setConfirmDialog({
                          open: true,
                          planId: plan.id,
                          planName: plan.name_ar,
                          price: Number(plan.price_monthly),
                        })}
                      >
                        {!canAfford ? (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            رصيد غير كافي
                          </span>
                        ) : (
                          'اشترك الآن'
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Subscription History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>سجل الاشتراكات</CardTitle>
              <CardDescription>آخر 10 عمليات اشتراك</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الباقة</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {format(new Date(tx.created_at), 'd MMM yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{tx.plans?.name_ar}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tx.type === 'subscribe' ? 'اشتراك جديد' : tx.type === 'renew' ? 'تجديد' : 'ترقية'}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(tx.amount).toLocaleString('ar-EG')} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الاشتراك</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم خصم <strong>{confirmDialog.price.toLocaleString('ar-EG')} ج.م</strong> من رصيد محفظتك 
              للاشتراك في باقة <strong>{confirmDialog.planName}</strong> لمدة شهر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction 
              onClick={handleSubscribe}
              disabled={subscribeMut.isPending}
            >
              {subscribeMut.isPending ? 'جاري الاشتراك...' : 'تأكيد الاشتراك'}
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
