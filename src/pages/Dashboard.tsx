import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurantData';
import { useSaveRestaurant } from '@/hooks/useAdminMutations';
import ImageUploader from '@/components/ImageUploader';
import { getCoverPublicId, getLogoPublicId } from '@/lib/bunny';
import { 
  Settings, Menu, BarChart3, ShoppingBag, ArrowLeft, Save, Eye, Building2, Store
} from 'lucide-react';

export default function Dashboard() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isBranchStaff, branchStaffInfo, userTypeLoading } = useAuth();
  
  // React Query - جلب بيانات المطعم
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(username);
  // React Query Mutation - حفظ/تحديث بيانات المطعم
  const saveRestaurantMut = useSaveRestaurant(username);
  
  // UI State - حالة فتح حوار المعلومات وبيانات النموذج
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    description: '',
    cover_image_url: '',
    logo_url: '',
    facebook_url: '',
    email: '',
    instagram_url: '',
    working_hours: '',
    cover_image_public_id: '',
    logo_public_id: ''
  });

  // Auth Guard - توجيه المستخدم غير المسجل لصفحة تسجيل الدخول
  useEffect(() => {
    if (authLoading || userTypeLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    // Guard - موظف الفرع لا يملك صلاحية الدخول لهذه الصفحة
    if (isBranchStaff && branchStaffInfo) {
      navigate(`/${branchStaffInfo.restaurantUsername}/branch-orders`);
    }
  }, [authLoading, userTypeLoading, user, isBranchStaff, branchStaffInfo, navigate]);

  // Data Sync - مزامنة بيانات المطعم من React Query إلى نموذج التعديل المحلي
  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        username: restaurant.username || '',
        description: restaurant.description || '',
        cover_image_url: restaurant.cover_image_url || '',
        logo_url: restaurant.logo_url || '',
        facebook_url: restaurant.facebook_url || '',
        email: restaurant.email || '',
        instagram_url: restaurant.instagram_url || '',
        working_hours: restaurant.working_hours || '',
        cover_image_public_id: restaurant.cover_image_public_id || '',
        logo_public_id: restaurant.logo_public_id || ''
      });
    } else if (!restaurantLoading && username) {
      setFormData(prev => ({ ...prev, username: username }));
    }
  }, [restaurant, restaurantLoading, username]);

  // دالة حفظ بيانات المطعم عبر React Query Mutation
  const handleSave = () => {
    if (!user) return;
    saveRestaurantMut.mutate(
      { id: restaurant?.id, data: formData, ownerId: user.id },
      { onSuccess: () => setInfoDialogOpen(false) }
    );
  };

  if (authLoading || restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header - الهيدر */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {restaurant ? 'لوحة التحكم' : 'إنشاء مطعم جديد'}
                </h1>
                <p className="text-gray-600 text-sm">
                  {restaurant ? `${restaurant.name}` : 'أنشئ مطعمك الإلكتروني الآن'}
                </p>
              </div>
            </div>
            {restaurant && (
              <Button variant="outline" onClick={() => navigate(`/${restaurant.username}`)}>
                <Eye className="w-4 h-4 ml-2" />
                عرض المطعم
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
              <CardDescription>اختر ما تريد إدارته</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => setInfoDialogOpen(true)}>
                <Store className="w-4 h-4 ml-2" />
                إدارة معلومات المطعم
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled={!restaurant} onClick={() => restaurant && navigate(`/${restaurant.username}/menu-management`)}>
                <Menu className="w-4 h-4 ml-2" />
                إدارة القائمة
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled={!restaurant} onClick={() => restaurant && navigate(`/${restaurant.username}/footer-management`)}>
                <Settings className="w-4 h-4 ml-2" />
                إدارة الفوتر
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled={!restaurant} onClick={() => restaurant && navigate(`/${restaurant.username}/branches-management`)}>
                <Building2 className="w-4 h-4 ml-2" />
                إدارة الفروع
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled={!restaurant} onClick={() => restaurant && navigate(`/${restaurant.username}/orders`)}>
                <ShoppingBag className="w-4 h-4 ml-2" />
                الطلبات
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled={!restaurant} onClick={() => restaurant && navigate(`/${restaurant.username}/analytics`)}>
                <BarChart3 className="w-4 h-4 ml-2" />
                التقارير
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle>مساعدة</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">هل تحتاج مساعدة في إعداد مطعمك؟</p>
              <Button variant="outline" size="sm" className="w-full">تواصل معنا</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Restaurant Info Dialog - حوار معلومات المطعم */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {restaurant ? 'إدارة معلومات المطعم' : 'إنشاء مطعم جديد'}
            </DialogTitle>
            <DialogDescription>أدخل البيانات الأساسية لمطعمك</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المطعم *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="مطعم الأصالة" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">اسم المطعم في الرابط *</Label>
                <div className="relative">
                  <Input id="username" value={formData.username} onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))} placeholder="hany" required disabled={!!restaurant} />
                  <div className="text-xs text-gray-500 mt-1">سيكون رابط مطعمك: /{formData.username}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">وصف المطعم</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="نقدم أفضل المأكولات الشرقية والغربية..." rows={3} />
            </div>

            {restaurant && (
              <div className="grid md:grid-cols-2 gap-4">
                <ImageUploader label="صورة الغلاف" currentImageUrl={formData.cover_image_url} currentPublicId={formData.cover_image_public_id} publicId={getCoverPublicId(restaurant.username)} aspectRatio="cover" imageType="cover" onUploadComplete={(url, publicId) => setFormData(prev => ({ ...prev, cover_image_url: url, cover_image_public_id: publicId }))} onDelete={() => setFormData(prev => ({ ...prev, cover_image_url: '', cover_image_public_id: '' }))} />
                <ImageUploader label="شعار المطعم" currentImageUrl={formData.logo_url} currentPublicId={formData.logo_public_id} publicId={getLogoPublicId(restaurant.username)} aspectRatio="logo" imageType="logo" onUploadComplete={(url, publicId) => setFormData(prev => ({ ...prev, logo_url: url, logo_public_id: publicId }))} onDelete={() => setFormData(prev => ({ ...prev, logo_url: '', logo_public_id: '' }))} />
              </div>
            )}
            
            {!restaurant && (
              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">ℹ️ يمكنك رفع صور الغلاف والشعار بعد إنشاء المطعم</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="facebook_url">رابط صفحة الفيسبوك</Label>
              <Input id="facebook_url" value={formData.facebook_url} onChange={(e) => setFormData(prev => ({ ...prev, facebook_url: e.target.value }))} placeholder="https://facebook.com/restaurant-name" />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saveRestaurantMut.isPending}>
                {saveRestaurantMut.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
