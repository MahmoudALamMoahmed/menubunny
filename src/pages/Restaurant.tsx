import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, ShoppingCart, Plus, Minus, Settings, LayoutGrid, List,
  Facebook,
  Instagram,
  Building2 } from 'lucide-react';
import RestaurantFooter from '@/components/RestaurantFooter';
import ProductDetailsDialog from '@/components/ProductDetailsDialog';
import BranchesDialog from '@/components/BranchesDialog';
import ShareDialog from '@/components/ShareDialog';
import { getLogoUrl, getCoverImageUrl, getCoverBlurUrl, getMenuItemUrl } from '@/lib/bunny';
import { useRestaurant, useCategories, useMenuItems, useSizes, useExtras, useBranches, useDeliveryAreas } from '@/hooks/useRestaurantData';
import { useRestaurantLimits } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import PaymentMethodSection from '@/components/PaymentMethodSection';

import type { Tables } from '@/integrations/supabase/types';

// تعريف الأنواع من Supabase + واجهة السلة
type MenuItem = Tables<'menu_items'>;
type Size = Tables<'sizes'>;
type Extra = Tables<'extras'>;

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: Size;
  selectedExtras?: Extra[];
}

export default function Restaurant() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // React Query - جلب بيانات المطعم من قاعدة البيانات بناءً على اسم المستخدم
  const { data: restaurant, isLoading: loadingRestaurant } = useRestaurant(username);
  const restaurantId = restaurant?.id;
  
  // UI State - تتبع الفئة النشطة المختارة لفلترة المنيو
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // React Query - جلب فئات القائمة (المتاحة فقط)
  const { data: allCategories = [], isLoading: loadingCategories } = useCategories(restaurantId);
  // React Query - جلب أصناف القائمة (بدون فلتر فئة — نطبق الحدود أولاً)
  const { data: allMenuItems = [], isLoading: loadingMenuItems } = useMenuItems(restaurantId);
  // React Query - جلب أحجام الأصناف المتاحة
  const { data: sizes = [] } = useSizes(restaurantId);
  // React Query - جلب الإضافات المتاحة
  const { data: allExtras = [] } = useExtras(restaurantId);
  // React Query - جلب الفروع النشطة
  const { data: allBranches = [] } = useBranches(restaurantId);
  const { data: limits } = useRestaurantLimits(restaurantId);

  // تقييد الفئات بحدود الباقة
  const categories = useMemo(() => {
    if (limits?.max_categories != null) return allCategories.slice(0, limits.max_categories);
    return allCategories;
  }, [allCategories, limits?.max_categories]);

  // تقييد الأصناف بحدود الباقة ثم فلتر الفئة النشطة
  const filteredMenuItems = useMemo(() => {
    let items = allMenuItems;
    if (limits?.max_items != null) items = items.slice(0, limits.max_items);
    if (activeCategory && activeCategory !== 'all') {
      items = items.filter(item => item.category_id === activeCategory);
    }
    return items;
  }, [allMenuItems, limits?.max_items, activeCategory]);

  // تقييد الإضافات بحدود الباقة
  const extras = useMemo(() => {
    if (limits?.max_extras != null) return allExtras.slice(0, limits.max_extras);
    return allExtras;
  }, [allExtras, limits?.max_extras]);
  
  // Only show branches within plan limits to public visitors
  const branches = useMemo(() => {
    if (limits?.max_branches != null) {
      return allBranches.slice(0, limits.max_branches);
    }
    return allBranches;
  }, [allBranches, limits?.max_branches]);
  
  // Performance - استخراج معرفات الفروع لتمريرها لـ hook مناطق التوصيل
  const branchIds = useMemo(() => branches.map(b => b.id), [branches]);
  // React Query - جلب مناطق التوصيل النشطة للفروع
  const { data: deliveryAreas = [] } = useDeliveryAreas(branchIds.length > 0 ? branchIds : undefined);

  // Preload blur cover (LCP element) during render — faster than useEffect
  const coverBlurUrl = restaurant?.cover_image_url ? getCoverBlurUrl(restaurant.cover_image_url) : '';
  if (coverBlurUrl && typeof document !== 'undefined' && !document.querySelector(`link[href="${CSS.escape(coverBlurUrl)}"]`)) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = coverBlurUrl;
    // @ts-ignore
    link.fetchpriority = 'high';
    document.head.appendChild(link);
  }

  // UI State - حالات واجهة المستخدم (السلة، بيانات العميل، نوع العرض، المنتج المحدد، الفرع، المنطقة، طريقة الدفع)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  // التحقق من ملكية المطعم - لإظهار زر الإدارة
  const isOwner = user && restaurant && user.id === restaurant.owner_id;

  // دالة إضافة صنف للسلة مع دعم الأحجام والإضافات
  const addToCart = (item: MenuItem, selectedSize?: Size, selectedExtras?: Extra[]) => {
    const extrasTotal = selectedExtras?.reduce((sum, e) => sum + e.price, 0) || 0;
    const basePrice = selectedSize ? selectedSize.price : item.price;
    const cartItem = {
      ...item,
      selectedSize,
      selectedExtras,
      price: basePrice + extrasTotal
    };
    setCart(prev => {
      const extrasKey = selectedExtras?.map(e => e.id).sort().join(',') || '';
      const existingItem = prev.find(ci => 
        ci.id === item.id && 
        ci.selectedSize?.id === selectedSize?.id &&
        (ci.selectedExtras?.map(e => e.id).sort().join(',') || '') === extrasKey
      );
      if (existingItem) {
        return prev.map(ci => 
          ci.id === item.id && 
          ci.selectedSize?.id === selectedSize?.id &&
          (ci.selectedExtras?.map(e => e.id).sort().join(',') || '') === extrasKey
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { ...cartItem, quantity: 1 }];
    });
    const sizeText = selectedSize ? ` - ${selectedSize.name}` : '';
    const extrasText = selectedExtras && selectedExtras.length > 0 ? ` + ${selectedExtras.map(e => e.name).join(', ')}` : '';
    toast({
      title: 'تم إضافة العنصر',
      description: `تم إضافة ${item.name}${sizeText}${extrasText} إلى السلة`
    });
  };

  // دالة حذف/تقليل كمية صنف من السلة
  const removeFromCart = (itemId: string, sizeId?: string, extrasKey?: string) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => 
        cartItem.id === itemId && 
        cartItem.selectedSize?.id === sizeId &&
        (cartItem.selectedExtras?.map(e => e.id).sort().join(',') || '') === (extrasKey || '')
      );
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(cartItem => 
          cartItem.id === itemId && 
          cartItem.selectedSize?.id === sizeId &&
          (cartItem.selectedExtras?.map(e => e.id).sort().join(',') || '') === (extrasKey || '')
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prev.filter(cartItem => !(
        cartItem.id === itemId && 
        cartItem.selectedSize?.id === sizeId &&
        (cartItem.selectedExtras?.map(e => e.id).sort().join(',') || '') === (extrasKey || '')
      ));
    });
  };

  // فتح حوار تفاصيل المنتج
  const openProductDialog = (item: MenuItem) => {
    setSelectedProduct(item);
    setShowProductDialog(true);
  };


  // حساب إجمالي سعر السلة
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  // حساب سعر التوصيل حسب المنطقة المختارة
  const getDeliveryPrice = () => {
    if (!selectedArea) return 0;
    const area = deliveryAreas.find(a => a.id === selectedArea);
    return area?.delivery_price || 0;
  };

  // استرجاع مناطق التوصيل لفرع معين
  const getAreasForBranch = (branchId: string) => {
    return deliveryAreas.filter(area => area.branch_id === branchId);
  };

  // حساب الإجمالي الكلي (سلة + توصيل)
  const getFinalTotal = () => {
    return getTotalPrice() + getDeliveryPrice();
  };

  // التحقق من صحة بيانات الطلب قبل الإرسال
  const validateOrder = (): boolean => {
    if (cart.length === 0 || !customerName || !customerAddress || !customerPhone || !restaurant) return false;
    
    if (branches.length > 0 && !selectedBranch) {
      toast({ title: 'اختر الفرع', description: 'يرجى اختيار الفرع الذي تريد الطلب منه', variant: 'destructive' });
      return false;
    }

    if (selectedBranch && getAreasForBranch(selectedBranch).length > 0 && !selectedArea) {
      toast({ title: 'اختر المنطقة', description: 'يرجى اختيار منطقة التوصيل', variant: 'destructive' });
      return false;
    }
    return true;
  };

  // تفريغ السلة وإعادة تعيين البيانات بعد إرسال الطلب بنجاح
  const resetOrderState = () => {
    setCart([]);
    setShowCartDialog(false);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setSelectedBranch('');
    setSelectedArea('');
    setPaymentMethod('cash');
  };

  // الحصول على order_mode للفرع المختار
  const getSelectedBranchOrderMode = (): string => {
    if (!selectedBranch) return 'whatsapp';
    const branch = branches.find(b => b.id === selectedBranch);
    return (branch as any)?.order_mode || 'whatsapp';
  };

  // إرسال الطلب للوحة التحكم (حفظ في قاعدة البيانات)
  const sendOrderToDashboard = async () => {
    if (!validateOrder() || !restaurant) return;

    try {
      const branch = branches.find(b => b.id === selectedBranch);
      const area = deliveryAreas.find(a => a.id === selectedArea);
      
      const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        size: item.selectedSize ? { id: item.selectedSize.id, name: item.selectedSize.name, price: item.selectedSize.price } : undefined,
        extras: item.selectedExtras?.map(e => ({ id: e.id, name: e.name, price: e.price })),
      }));

      const { error } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id,
        branch_id: selectedBranch || null,
        delivery_area_id: selectedArea || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_method: paymentMethod,
        items: orderItems as any,
        total_price: getFinalTotal(),
        notes: area ? `المنطقة: ${area.name} - الفرع: ${branch?.name || ''}` : (branch?.name ? `الفرع: ${branch.name}` : null),
        status: 'pending',
      });

      if (error) throw error;

      resetOrderState();
      toast({ title: 'تم إرسال الطلب', description: 'تم إرسال طلبك بنجاح وسيتم التواصل معك قريباً' });
    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ في إرسال الطلب، يرجى المحاولة مرة أخرى', variant: 'destructive' });
    }
  };

  // إرسال الطلب عبر واتساب - بناء رسالة الطلب وفتح رابط واتساب + حفظ في DB
  const sendOrderToWhatsApp = async () => {
    if (!validateOrder() || !restaurant) return;

    try {
      const totalPrice = getTotalPrice();
      const deliveryPrice = getDeliveryPrice();
      const finalTotal = getFinalTotal();
      
      let whatsappNumber = '';
      let branchName = '';
      let areaName = '';
      const branch = branches.find(b => b.id === selectedBranch);
      const area = deliveryAreas.find(a => a.id === selectedArea);
      
      if (branches.length > 0 && selectedBranch) {
        if (branch?.whatsapp_phone) {
          whatsappNumber = branch.whatsapp_phone;
          branchName = branch.name;
        }
      }

      if (area) {
        areaName = area.name;
      }

      // حفظ الطلب في قاعدة البيانات فقط إذا كانت الباقة تدعم إدارة الطلبات
      const hasDashboardOrders = limits?.features && (limits.features as any)?.dashboard_orders;
      
      if (hasDashboardOrders) {
        const orderItems = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          size: item.selectedSize ? { id: item.selectedSize.id, name: item.selectedSize.name, price: item.selectedSize.price } : undefined,
          extras: item.selectedExtras?.map(e => ({ id: e.id, name: e.name, price: e.price })),
        }));

        await supabase.from('orders').insert({
          restaurant_id: restaurant.id,
          branch_id: selectedBranch || null,
          delivery_area_id: selectedArea || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          payment_method: paymentMethod,
          items: orderItems as any,
          total_price: finalTotal,
          notes: areaName ? `المنطقة: ${areaName} - الفرع: ${branchName || ''}` : (branchName ? `الفرع: ${branchName}` : null),
          status: 'pending',
          order_source: 'whatsapp',
        } as any);
      }

      const orderText = cart.map(item => {
        const sizeText = item.selectedSize ? ` (${item.selectedSize.name})` : '';
        const extrasText = item.selectedExtras && item.selectedExtras.length > 0 
          ? ` + ${item.selectedExtras.map(e => e.name).join(', ')}` 
          : '';
        return `${item.quantity} - ${item.name}${sizeText}${extrasText} = ${item.price * item.quantity} جنيه`;
      }).join('\n');
      
      const branchText = branchName ? `\n🏪 الفرع: ${branchName}` : '';
      const areaText = areaName ? `\n📍 المنطقة: ${areaName}` : '';
      const deliveryText = deliveryPrice > 0 ? `\n🚗 سعر التوصيل: ${deliveryPrice} جنيه` : '';
      
      const paymentMethodText = paymentMethod === 'cash' ? 'الدفع عند الاستلام' : paymentMethod;
      
      const paymentNote = paymentMethod !== 'cash' ? '\n\n⏳ ملاحظة: العميل سيرسل إثبات الدفع بعد هذه الرسالة' : '';
      
      const message = `🛒 طلب جديد من ${restaurant.name}${branchText}${areaText}

👤 بيانات العميل:
الاسم: ${customerName}
العنوان: ${customerAddress}
رقم الهاتف: ${customerPhone}

📋 تفاصيل الطلب:
${orderText}

💰 إجمالي الطلب: ${totalPrice} جنيه${deliveryText}
💵 الإجمالي الكلي: ${finalTotal} جنيه
💳 طريقة الدفع: ${paymentMethodText}${paymentNote}

الرجاء تأكيد استلام الطلب.
شكراً لكم.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      resetOrderState();
      toast({ title: 'تم إرسال الطلب', description: 'تم إرسال طلبك عبر واتساب بنجاح' });
    } catch (error) {
      console.error('خطأ عام:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في إرسال الطلب، يرجى المحاولة مرة أخرى',
        variant: 'destructive'
      });
    }
  };

  // حالة التحميل - عرض Skeleton بدل spinner لتقليل CLS
  if (loadingRestaurant || loadingCategories || loadingMenuItems) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Skeleton Header */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
              <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
        </div>
        {/* Skeleton Cover */}
        <div className="w-full h-64 sm:h-72 md:h-96 lg:h-[500px] bg-muted animate-pulse" />
        {/* Skeleton Info */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
                <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
                <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton Categories */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-2 overflow-x-auto pb-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-8 w-16 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton View Toggle */}
        <div className="container px-4 flex justify-end gap-2 py-4">
           <div className="w-11 h-11 bg-muted animate-pulse rounded-md border border-transparent" />
          <div className="w-11 h-11 bg-muted animate-pulse rounded-md border border-transparent" />
        </div>
        {/* Skeleton Menu Cards */}
        <div className="container mx-auto px-4 pb-32">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-video bg-muted animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // حالة عدم وجود المطعم
  if (!restaurant) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">المطعم غير موجود</h1>
          <Button onClick={() => navigate('/')}>العودة للرئيسية</Button>
        </div>
      </div>;
  }

  return <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header - الهيدر */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url && (
              <img 
                src={getLogoUrl(restaurant.logo_url)} 
                alt={`${restaurant.name} logo`}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                loading="lazy"
              />
            )}
            <h1 className="text-xl font-bold text-gray-800">{restaurant.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ShareDialog restaurantName={restaurant.name} username={username!} />
            {isOwner && <Button variant="outline" size="sm" onClick={() => navigate(`/${username}/dashboard`)}>
                <Settings className="w-4 h-4 ml-1" />
                إدارة المطعم
              </Button>}
          </div>
        </div>
      </div>

      {/* Cover Image - صورة الغلاف (img tag للـ blur بدل background-image لتجنب طلب مزدوج) */}
      <div className="relative w-full h-56 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
        {restaurant.cover_image_url && (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <img 
              src={getCoverImageUrl(restaurant.cover_image_url)} 
              alt={restaurant.name} 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-4 border-white/20" 
              loading="eager"
              // @ts-ignore
              fetchpriority="high"
              decoding="sync"
            />
          </div>
        )}
      </div>

      {/* Restaurant Info - معلومات المطعم وروابط التواصل */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <BranchesDialog 
                restaurantId={restaurant.id}
                trigger={
                  <button 
                    className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 text-white rounded-xl flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                  >
                    <Building2 className="w-5 h-5" />
                  </button>
                }
              />

              {restaurant.facebook_url && (
                <a 
                  href={restaurant.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-[#1877F2] text-white rounded-xl flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-[#1877F2]/40 transition-all duration-300"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              
              {restaurant.instagram_url && (
                <a 
                  href={restaurant.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white rounded-xl flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-[#FD1D1D]/40 transition-all duration-300"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

       {/* Categories - فئات القائمة */}
       {categories.length > 0 && <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 scroll-smooth">
                <Button variant={activeCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory('all')}>
                  الكل
                </Button>
                {categories.map(category => <Button key={category.id} variant={activeCategory === category.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory(category.id)}>
                    {category.name}
                  </Button>)}
              </div>
            </div>
          </div>
          </div>
        }

       {/* تبديل طريقة العرض - شبكة أو قائمة */}
        <div className="container px-4 flex justify-end gap-2 py-4">
          <button
              onClick={() => setViewType("list")}
              className={`p-3 border rounded-md transition ${
                viewType === "list"
                ? "bg-primary text-white border-black"
                : "bg-white text-black border-black"
                }`}
                >
                  <List className="w-5 h-5 stroke-[1.5]" />
                </button>
                <button
                  onClick={() => setViewType("grid")}
                  className={`p-3 border rounded-md transition ${
                    viewType === "grid"
                      ? "bg-primary text-white border-black"
                      : "bg-white text-black border-black"
                  }`}
                >
                  <LayoutGrid className="w-5 h-5 stroke-[1.5]" />
                </button>
        </div>

     {/* Menu Items - أصناف القائمة */}
      <div className="container mx-auto px-4 pb-32">
        {filteredMenuItems.length === 0 ? <div className="text-center py-12">
            <p className="text-gray-600">لا توجد عناصر في القائمة حالياً</p>
          </div> : viewType === 'grid' ? <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenuItems.map(item => <Card key={item.id} className="overflow-hidden h-full flex flex-col cursor-pointer" onClick={() => openProductDialog(item)}>
                <CardContent className="p-2 flex-1 flex flex-col">
                  {item.image_url && <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                      <img src={getMenuItemUrl(item.image_url, 'medium')} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                    </div>}
                  <div className="p-2 flex-1">
                    <h3 className="font-semibold text-sm sm:text-lg text-gray-800 mb-2">{item.name}</h3>
                    {item.description && <p className="hidden sm:block text-gray-600 text-sm mb-2">{item.description}</p>}
                    
                    <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-sm sm:text-lg font-bold text-primary">
                      {item.price} جنيه
                    </span>
                  
                      <Button size="sm" onClick={e => {
                  e.stopPropagation();
                  openProductDialog(item);
                }} className="px-2 py-1 text-xs h-7 rounded-sm sm:px-4 sm:py-2 sm:text-sm sm:h-9 sm:rounded-md">
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div> : <div className="grid gap-4">
            {/* عرض القائمة - List View */}
            {filteredMenuItems.map(item => <Card key={item.id} className="overflow-hidden cursor-pointer" onClick={() => openProductDialog(item)}>
                <CardContent className="p-2">
                  <div className="flex flex-row-reverse items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={e => {
                  e.stopPropagation();
                  openProductDialog(item);
                }}  className="px-2 py-1 text-xs h-7 rounded-sm sm:px-4 sm:py-2 sm:text-sm sm:h-9 sm:rounded-md">
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة
                      </Button>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-sm sm:text-lg text-gray-800 mb-1">{item.name}</h3>
                      {item.description && <p className="hidden sm:block text-gray-600 text-sm mb-2">{item.description}</p>}
                      <span className="text-sm font-bold text-primary block mb-2 sm:text-lg">
                        {item.price} جنيه
                      </span>
                    </div>

                    {item.image_url && <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img src={getMenuItemUrl(item.image_url, 'medium')} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                      </div>}
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Bottom Navigation - شريط التنقل السفلي */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-10">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex flex-col items-center gap-0.5 text-xs transition text-red-600 font-bold hover:text-red-500"
            >
              <Home className="w-6 h-6" />
              <span>الرئيسية</span>
            </button>

            <BranchesDialog 
              restaurantId={restaurant.id}
              trigger={
                <button className="flex flex-col items-center gap-0.5 text-xs transition text-gray-600 hover:text-red-500">
                  <Building2 className="w-6 h-6" />
                  <span>الفروع والتواصل</span>
                </button>
              }
            />
            
              {/* Cart Dialog - حوار السلة */}
              <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
                <DialogTrigger asChild>
                  <button className={`relative flex flex-col items-center gap-0.5 text-xs transition ${showCartDialog ? "text-red-600 font-bold" : "text-gray-600"} hover:text-red-500`}>
                    <ShoppingCart className="w-6 h-6" />
                    سلة الطلبات
                    <Badge className="absolute -top-1 -right-1 bg-primary text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full">
                      {cart.length}
                    </Badge>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-4 flex flex-col" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>سلة الطلبات</DialogTitle>
                  </DialogHeader>

                  <div className="overflow-y-auto flex-1 space-y-4 pr-2 pl-2 max-h-[calc(90vh-100px)]">
                    {/* عناصر السلة */}
                    <div className="space-y-2">
                       {cart.map(item => {
                         const extrasKey = item.selectedExtras?.map(e => e.id).sort().join(',') || '';
                         return (
                           <div key={`${item.id}-${item.selectedSize?.id || 'no-size'}-${extrasKey}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                             <div className="flex-1">
                               <div className="font-medium">
                                 {item.name}
                                 {item.selectedExtras && item.selectedExtras.length > 0 && (
                                   <span className="text-xs text-primary mr-1">
                                     + {item.selectedExtras.map(e => e.name).join(', ')}
                                   </span>
                                 )}
                               </div>
                               {item.selectedSize && <div className="text-xs text-gray-500">
                                   الحجم: {item.selectedSize.name}
                                 </div>}
                               <div className="text-sm text-gray-600">
                                 {item.price} جنيه × {item.quantity}
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                               <Button size="sm" variant="outline" onClick={() => removeFromCart(item.id, item.selectedSize?.id, extrasKey)}>
                                 <Minus className="w-3 h-3" />
                               </Button>
                               <span className="font-medium">{item.quantity}</span>
                               <Button size="sm" onClick={() => addToCart(item, item.selectedSize, item.selectedExtras)}>
                                 <Plus className="w-3 h-3" />
                               </Button>
                             </div>
                           </div>
                         );
                       })}
                    </div>

                    <Separator />

                    {/* ملخص الأسعار */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>إجمالي الطلب:</span>
                        <span>{getTotalPrice()} جنيه</span>
                      </div>
                      {getDeliveryPrice() > 0 && (
                        <div className="flex justify-between text-sm text-primary">
                          <span>سعر التوصيل:</span>
                          <span>{getDeliveryPrice()} جنيه</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>الإجمالي الكلي:</span>
                        <span>{getFinalTotal()} جنيه</span>
                      </div>
                    </div>

                    <Separator />

                    {/* بيانات التوصيل - اختيار الفرع والمنطقة وطريقة الدفع */}
                    <div className="space-y-3">
                      <h3 className="font-medium">بيانات التوصيل</h3>

                      {branches.length > 0 && (
                        <div>
                          <Label htmlFor="branch">اختر الفرع</Label>
                          <Select 
                            value={selectedBranch} 
                            onValueChange={(value) => {
                              setSelectedBranch(value);
                              setSelectedArea('');
                              setPaymentMethod('cash');
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="اختر الفرع الذي تريد الطلب منه" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {branches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name} {branch.address ? `- ${branch.address}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedBranch && getAreasForBranch(selectedBranch).length > 0 && (
                        <div>
                          <Label htmlFor="area">اختر منطقة التوصيل</Label>
                          <Select value={selectedArea} onValueChange={setSelectedArea}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="اختر المنطقة" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {getAreasForBranch(selectedBranch).map(area => (
                                <SelectItem key={area.id} value={area.id}>
                                  {area.name} - {area.delivery_price} جنيه توصيل
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* طريقة الدفع */}
                      {selectedBranch && <PaymentMethodSection
                        branchId={selectedBranch}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        finalTotal={getFinalTotal()}
                        toast={toast}
                      />}

                      {/* بيانات العميل */}
                      <div>
                        <Label htmlFor="customerName">الاسم</Label>
                        <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسمك الكريم" />
                      </div>
                      <div>
                        <Label htmlFor="customerAddress">العنوان</Label>
                        <Textarea id="customerAddress" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="عنوان التوصيل بالتفصيل" rows={2} />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">رقم الهاتف</Label>
                        <Input id="customerPhone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم هاتفك" />
                      </div>
                      
                      {/* أزرار إرسال الطلب حسب order_mode الفرع */}
                      {(() => {
                        const orderMode = getSelectedBranchOrderMode();
                        const isDisabled = cart.length === 0 || !customerName || !customerAddress || !customerPhone;
                        return (
                          <div className="space-y-2">
                            {(orderMode === 'whatsapp') && (
                              <Button onClick={sendOrderToWhatsApp} disabled={isDisabled} className="w-full bg-green-600 hover:bg-green-700">
                                إرسال الطلب واتساب
                              </Button>
                            )}
                            {(orderMode === 'dashboard') && (
                              <Button onClick={sendOrderToDashboard} disabled={isDisabled} className="w-full">
                                إرسال الطلب للمطعم
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
          </div>
        </div>
      </div>

      {/* Product Details Dialog - حوار تفاصيل المنتج */}
      <ProductDetailsDialog 
        open={showProductDialog} 
        onOpenChange={setShowProductDialog} 
        item={selectedProduct}
        sizes={sizes.filter(s => s.menu_item_id === selectedProduct?.id)}
        extras={extras}
        onAddToCart={addToCart}
      />

      {/* Restaurant Footer - فوتر المطعم */}
      <RestaurantFooter restaurant={restaurant} />
    </div>;
}
