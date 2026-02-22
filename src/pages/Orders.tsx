import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, Clock, Volume2, VolumeX } from 'lucide-react';
import { useRestaurant } from '@/hooks/useRestaurantData';
import { useAdminOrders } from '@/hooks/useAdminData';
import { useUpdateOrderStatus } from '@/hooks/useAdminMutations';
import { useAuth } from '@/hooks/useAuth';
import OrderCard from '@/components/OrderCard';
import OrderFilters from '@/components/OrderFilters';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Switch } from '@/components/ui/switch';

export default function Orders() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isBranchStaff, branchStaffInfo, userTypeLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || userTypeLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (isBranchStaff && branchStaffInfo) {
      navigate(`/${branchStaffInfo.restaurantUsername}/branch-orders`);
    }
  }, [authLoading, userTypeLoading, user, isBranchStaff, branchStaffInfo, navigate]);

  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(username);
  const { data: orders = [], isLoading: ordersLoading } = useAdminOrders(restaurant?.id);
  const updateStatusMut = useUpdateOrderStatus(restaurant?.id);

  useOrdersRealtime({
    filterColumn: 'restaurant_id',
    filterValue: restaurant?.id,
    queryKey: ['admin_orders', restaurant?.id],
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!order.id.toLowerCase().includes(q) && !order.customer_name.toLowerCase().includes(q) && !order.customer_phone.includes(q)) return false;
      }
      if (timeFilter !== null) {
        if (new Date(order.created_at).getTime() < Date.now() - timeFilter * 3600000) return false;
      }
      if (statusFilter && order.status !== statusFilter) return false;
      return true;
    });
  }, [orders, searchQuery, timeFilter, statusFilter]);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const { soundEnabled, toggleSound } = useNotificationSound();

  const handleUpdateStatus = (orderId: string, newStatus: string, isConfirmed?: boolean) => {
    updateStatusMut.mutate({ orderId, status: newStatus, isConfirmed });
  };

  if (authLoading || userTypeLoading || restaurantLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(`/${username}/dashboard`)} className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة للوحة التحكم
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">الطلبات</h1>
              <p className="text-muted-foreground">إدارة طلبات {restaurant?.name}</p>
            </div>
          </div>
        </div>

        {/* Pending Orders Counter */}
        <Card className={`mb-6 border-2 ${pendingCount > 0 ? 'border-orange-400 bg-orange-50' : 'border-muted'}`}>
          <CardContent className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-14 h-14 rounded-full ${pendingCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className={`text-3xl font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>{pendingCount}</p>
                <p className="text-sm text-muted-foreground">طلبات جديدة بانتظار المراجعة</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-muted-foreground" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
            </div>
          </CardContent>
        </Card>

        <OrderFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          totalCount={orders.length}
          filteredCount={filteredOrders.length}
        />

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد طلبات</h3>
                <p className="text-muted-foreground text-center">
                  {orders.length > 0 ? 'لا توجد طلبات تطابق الفلاتر المحددة' : 'لم يتم استلام أي طلبات حتى الآن'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                isUpdating={updateStatusMut.isPending}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
