import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Building2, LogOut } from 'lucide-react';
import { useBranchOrders } from '@/hooks/useAdminData';
import { useUpdateOrderStatus } from '@/hooks/useAdminMutations';
import { useAuth } from '@/hooks/useAuth';
import OrderCard from '@/components/OrderCard';

export default function BranchOrders() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, loading, isBranchStaff, branchStaffInfo, userTypeLoading, signOut } = useAuth();

  useEffect(() => {
    if (loading || userTypeLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isBranchStaff) { navigate(`/${username}/orders`); return; }
  }, [user, loading, isBranchStaff, userTypeLoading, navigate, username]);

  const { data: orders = [], isLoading: ordersLoading } = useBranchOrders(
    isBranchStaff ? branchStaffInfo?.branch_id : undefined
  );
  const updateStatusMut = useUpdateOrderStatus(branchStaffInfo?.branch_id, true);

  const handleUpdateStatus = (orderId: string, newStatus: string, isConfirmed?: boolean) => {
    updateStatusMut.mutate({ orderId, status: newStatus, isConfirmed });
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  if (loading || userTypeLoading || ordersLoading) {
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
      <div className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">طلبات الفرع</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    موظف فرع
                  </Badge>
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد طلبات</h3>
                <p className="text-muted-foreground text-center">لم يتم استلام أي طلبات لفرعك حتى الآن</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
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
