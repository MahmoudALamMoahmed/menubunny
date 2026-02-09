import { useState, useEffect,useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, ShoppingCart, User, Plus, Minus, Phone, MapPin, Clock, Share2, Settings, LayoutGrid, List,
  Facebook,
  Instagram,
  ChevronRight,
  ChevronLeft,
  Building2,
  Copy } from 'lucide-react';
import RestaurantFooter from '@/components/RestaurantFooter';
import ProductDetailsDialog from '@/components/ProductDetailsDialog';
import BranchesDialog from '@/components/BranchesDialog';
import ShareDialog from '@/components/ShareDialog';
import { getLogoUrl, getCoverImageUrl, getMenuItemUrl } from '@/lib/bunny';
interface Restaurant {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  logo_url: string;
  owner_id: string;
  facebook_url: string;
  address: string;
  email: string;
  instagram_url: string;
  working_hours: string;
}
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  category_id: string;
}
interface Size {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  display_order: number;
}
interface Category {
  id: string;
  name: string;
  display_order: number;
}
interface Extra {
  id: string;
  name: string;
  price: number;
}
interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: Size;
  selectedExtras?: Extra[];
}
interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  delivery_phone: string | null;
  working_hours: string | null;
  is_active: boolean;
  vodafone_cash?: string | null;
  etisalat_cash?: string | null;
  orange_cash?: string | null;
}
interface DeliveryArea {
  id: string;
  branch_id: string;
  name: string;
  delivery_price: number;
  is_active: boolean;
}
export default function Restaurant() {
  const {
    username
  } = useParams<{
    username: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const categoriesRef = useRef<HTMLDivElement | null>(null);

  const isOwner = user && restaurant && user.id === restaurant.owner_id;

  const scrollCategories = (direction: "left" | "right") => {
    if (categoriesRef.current) {
      const scrollAmount = 200; // مقدار الحركة بالبيكسل
      categoriesRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (username) {
      fetchRestaurantData();
    }
  }, [username]);
  const fetchRestaurantData = async () => {
    try {
      // جلب بيانات المطعم
      const {
        data: restaurantData,
        error: restaurantError
      } = await supabase.from('restaurants').select('*').eq('username', username).single();
      if (restaurantError || !restaurantData) {
        navigate('/404');
        return;
      }
      setRestaurant(restaurantData);

      // جلب الفئات
      const {
        data: categoriesData
      } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantData.id).order('display_order');
      setCategories(categoriesData || []);

      // جلب عناصر القائمة
      const {
        data: menuData
      } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantData.id).eq('is_available', true).order('display_order');
      setMenuItems(menuData || []);

      // جلب الأحجام
      const {
        data: sizesData
      } = await supabase.from('sizes').select('*').order('display_order');
      setSizes(sizesData || []);

      // جلب الإضافات
      const {
        data: extrasData
      } = await supabase.from('extras').select('*').eq('restaurant_id', restaurantData.id).eq('is_available', true).order('display_order');
      setExtras(extrasData || []);

      // جلب الفروع
      const {
        data: branchesData
      } = await supabase.from('branches').select('*').eq('restaurant_id', restaurantData.id).eq('is_active', true).order('display_order');
      setBranches(branchesData || []);

      // جلب مناطق التوصيل
      const branchIds = (branchesData || []).map(b => b.id);
      if (branchIds.length > 0) {
        const { data: areasData } = await supabase
          .from('delivery_areas')
          .select('*')
          .in('branch_id', branchIds)
          .eq('is_active', true)
          .order('display_order');
        setDeliveryAreas(areasData || []);
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل بيانات المطعم',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
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
      // البحث عن نفس الصنف بنفس الحجم والإضافات
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
  const openProductDialog = (item: MenuItem) => {
    setSelectedProduct(item);
    setShowProductDialog(true);
  };
  const getSizesForItem = (itemId: string) => {
    return sizes.filter(size => size.menu_item_id === itemId);
  };
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getDeliveryPrice = () => {
    if (!selectedArea) return 0;
    const area = deliveryAreas.find(a => a.id === selectedArea);
    return area?.delivery_price || 0;
  };

  const getAreasForBranch = (branchId: string) => {
    return deliveryAreas.filter(area => area.branch_id === branchId);
  };

  const getFinalTotal = () => {
    return getTotalPrice() + getDeliveryPrice();
  };
  const sendOrderToWhatsApp = async () => {
    if (cart.length === 0 || !customerName || !customerAddress || !customerPhone || !restaurant) return;
    
    // إذا كان هناك فروع ولم يتم اختيار فرع
    if (branches.length > 0 && !selectedBranch) {
      toast({
        title: 'اختر الفرع',
        description: 'يرجى اختيار الفرع الذي تريد الطلب منه',
        variant: 'destructive'
      });
      return;
    }

    // إذا كان هناك مناطق للفرع المختار ولم يتم اختيار منطقة
    if (selectedBranch && getAreasForBranch(selectedBranch).length > 0 && !selectedArea) {
      toast({
        title: 'اختر المنطقة',
        description: 'يرجى اختيار منطقة التوصيل',
        variant: 'destructive'
      });
      return;
    }

    try {
      const totalPrice = getTotalPrice();
      const deliveryPrice = getDeliveryPrice();
      const finalTotal = getFinalTotal();
      
      // تحديد رقم الواتساب المناسب من الفرع المختار
      let whatsappNumber = '';
      let branchName = '';
      let areaName = '';
      
      if (branches.length > 0 && selectedBranch) {
        const branch = branches.find(b => b.id === selectedBranch);
        if (branch?.whatsapp_phone) {
          whatsappNumber = branch.whatsapp_phone;
          branchName = branch.name;
        }
      }

      if (selectedArea) {
        const area = deliveryAreas.find(a => a.id === selectedArea);
        if (area) {
          areaName = area.name;
        }
      }

      // تحضير رسالة الواتساب
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
      
      // تحديد نص طريقة الدفع
      let paymentMethodText = 'الدفع عند الاستلام';
      if (paymentMethod === 'vodafone') {
        paymentMethodText = 'فودافون كاش';
      } else if (paymentMethod === 'etisalat') {
        paymentMethodText = 'اتصالات كاش';
      } else if (paymentMethod === 'orange') {
        paymentMethodText = 'اورانج كاش';
      }
      
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

      // إرسال الرسالة عبر الواتساب
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      // إفراغ السلة وإغلاق النافذة
      setCart([]);
      setShowCartDialog(false);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setSelectedBranch('');
      setSelectedArea('');
      setPaymentMethod('cash');
      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلبك عبر واتساب بنجاح'
      });
    } catch (error) {
      console.error('خطأ عام:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في إرسال الطلب، يرجى المحاولة مرة أخرى',
        variant: 'destructive'
      });
    }
  };
  const filteredMenuItems = activeCategory === 'all' ? menuItems : menuItems.filter(item => item.category_id === activeCategory);
  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المطعم...</p>
        </div>
      </div>;
  }
  if (!restaurant) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">المطعم غير موجود</h1>
          <Button onClick={() => navigate('/')}>العودة للرئيسية</Button>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
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

      {/* Cover Image */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
  
        {/* Blurred low-res background */}
        <img
          src={`${getCoverImageUrl(restaurant.cover_image_url)}?width=50&blur=20`}
          className="absolute inset-0 w-full h-full object-cover scale-110"
          alt=""
          aria-hidden
          loading="lazy"
        />

        {/* Main image */}
        <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
          <img
            src={`${getCoverImageUrl(restaurant.cover_image_url)}?width=900`}
            alt={restaurant.name}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-lg"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>


      {/* Restaurant Info */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
          {/*   {restaurant.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span>{restaurant.phone}</span>
              </div>
            )} */}
            
            {/* Social Media & Contact Icons */}
            <div className="flex items-center gap-3">
              {/* أيقونة الفروع والتواصل */}
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
            {/* {restaurant.address && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{restaurant.address}</span>
              </div>
            )} */}
          </div>
        </div>
      </div>

       {/* Categories */}
             {/* التصنيفات */}
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


       {/* تبديل طريقة العرض */}
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

     {/* Menu Items */}
      {/* عناصر المنيو */}
      <div className="container mx-auto px-4 pb-32">
        {filteredMenuItems.length === 0 ? <div className="text-center py-12">
            <p className="text-gray-600">لا توجد عناصر في القائمة حالياً</p>
          </div> : viewType === 'grid' ? <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenuItems.map(item => <Card key={item.id} className="overflow-hidden h-full flex flex-col cursor-pointer" onClick={() => openProductDialog(item)}>
                <CardContent className="p-2 flex-1 flex flex-col">
                  {item.image_url && <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                      <img src={getMenuItemUrl(item.image_url, 'medium')} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>}
                  <div className="p-2 flex-1">
                    <h3 className="font-semibold text-sm sm:text-lg text-gray-800 mb-2">{item.name}</h3>
                    {item.description && <p className="hidden sm:block text-gray-600 text-sm mb-2">{item.description}</p>}
                    
                    {/* عرض السعر الأساسي دائماً */}
                    <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-sm sm:text-lg font-bold text-primary"> {/* text-base */}
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
                      {/* عرض السعر الأساسي دائماً */}
                      <span className="text-sm font-bold text-primary block mb-2 sm:text-lg">
                        {item.price} جنيه
                      </span>
                    </div>

                    {item.image_url && <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={getMenuItemUrl(item.image_url, 'medium')} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>}
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-10">
            {/* الرئيسية */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex flex-col items-center gap-0.5 text-xs transition text-red-600 font-bold hover:text-red-500"
            >
              <Home className="w-6 h-6" />
              <span>الرئيسية</span>
            </button>

            {/* الفروع والتواصل */}
            <BranchesDialog 
              restaurantId={restaurant.id}
              trigger={
                <button className="flex flex-col items-center gap-0.5 text-xs transition text-gray-600 hover:text-red-500">
                  <Building2 className="w-6 h-6" />
                  <span>الفروع والتواصل</span>
                </button>
              }
            />
            
             {/* سلة الطلبات */}
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

                  {/* كل المحتوى داخل هذا الصندوق القابل للسكرول */}
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

                    <div className="space-y-3">
                      <h3 className="font-medium">بيانات التوصيل</h3>

                      {/* اختيار الفرع إذا كان هناك فروع */}
                      {branches.length > 0 && (
                        <div>
                          <Label htmlFor="branch">اختر الفرع</Label>
                          <Select 
                            value={selectedBranch} 
                            onValueChange={(value) => {
                              setSelectedBranch(value);
                              setSelectedArea(''); // إعادة تعيين المنطقة عند تغيير الفرع
                              setPaymentMethod('cash'); // إعادة تعيين طريقة الدفع عند تغيير الفرع
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

                      {/* اختيار المنطقة إذا كان الفرع المختار لديه مناطق */}
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

                      {/* اختيار طريقة الدفع - يظهر بعد اختيار الفرع */}
                      <div className="space-y-3">
                        <Label className="font-medium">طريقة الدفع</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="cash">
                              <span className="flex items-center gap-2">💵 الدفع عند الاستلام</span>
                            </SelectItem>
                            {selectedBranch && branches.find(b => b.id === selectedBranch)?.vodafone_cash && (
                              <SelectItem value="vodafone">
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                  فودافون كاش
                                </span>
                              </SelectItem>
                            )}
                            {selectedBranch && branches.find(b => b.id === selectedBranch)?.etisalat_cash && (
                              <SelectItem value="etisalat">
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                  اتصالات كاش
                                </span>
                              </SelectItem>
                            )}
                            {selectedBranch && branches.find(b => b.id === selectedBranch)?.orange_cash && (
                              <SelectItem value="orange">
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                                  اورانج كاش
                                </span>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {/* عرض رقم الدفع الإلكتروني */}
                        {paymentMethod !== 'cash' && selectedBranch && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-center gap-2 text-lg font-bold text-amber-800">
                              {paymentMethod === 'vodafone' && (
                                <>
                                  <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                                  <span>{branches.find(b => b.id === selectedBranch)?.vodafone_cash}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                                    onClick={() => {
                                      const number = branches.find(b => b.id === selectedBranch)?.vodafone_cash;
                                      if (number) {
                                        navigator.clipboard.writeText(number);
                                        toast({ title: 'تم النسخ', description: 'تم نسخ الرقم بنجاح' });
                                      }
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {paymentMethod === 'etisalat' && (
                                <>
                                  <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                                  <span>{branches.find(b => b.id === selectedBranch)?.etisalat_cash}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                                    onClick={() => {
                                      const number = branches.find(b => b.id === selectedBranch)?.etisalat_cash;
                                      if (number) {
                                        navigator.clipboard.writeText(number);
                                        toast({ title: 'تم النسخ', description: 'تم نسخ الرقم بنجاح' });
                                      }
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {paymentMethod === 'orange' && (
                                <>
                                  <span className="w-4 h-4 bg-orange-500 rounded-full"></span>
                                  <span>{branches.find(b => b.id === selectedBranch)?.orange_cash}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                                    onClick={() => {
                                      const number = branches.find(b => b.id === selectedBranch)?.orange_cash;
                                      if (number) {
                                        navigator.clipboard.writeText(number);
                                        toast({ title: 'تم النسخ', description: 'تم نسخ الرقم بنجاح' });
                                      }
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="text-center text-sm text-amber-700">
                              <p className="font-medium">⚠️ تنبيه مهم:</p>
                              <p>ارسل المبلغ ({getFinalTotal()} جنيه) للرقم الظاهر أعلاه</p>
                              <p>وخد اسكرين شوت لإثبات الدفع</p>
                              <p className="mt-2 font-medium">واضغط على "إرسال الطلب واتساب"</p>
                              <p>وبعد إرسال طلبك ارسل إثبات الدفع</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="customerName">اسم العميل</Label>
                        <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="أدخل اسمك" />
                      </div>

                      <div>
                        <Label htmlFor="customerAddress">عنوان التوصيل</Label>
                        <Textarea id="customerAddress" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="أدخل عنوان التوصيل بالتفصيل" rows={3} />
                      </div>

                      <div>
                        <Label htmlFor="customerPhone">رقم العميل</Label>
                        <Input id="customerPhone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="أدخل رقم هاتفك" type="tel" />
                      </div>
                    </div>

                    <Button 
                      onClick={sendOrderToWhatsApp} 
                      className="w-full" 
                      disabled={
                        !customerName || 
                        !customerAddress || 
                        !customerPhone || 
                        (branches.length > 0 && !selectedBranch) ||
                        (selectedBranch && getAreasForBranch(selectedBranch).length > 0 && !selectedArea)
                      }
                    >
                      إرسال الطلب واتساب
                    </Button>
                  </div>
                </DialogContent>

              </Dialog>

            {/* الملف الشخصي */}
            {/* <button className={`flex flex-col items-center gap-0.5 text-xs transition ${location.pathname === "/profile" ? "text-red-600 font-bold" : "text-gray-600"} hover:text-red-500`}>
              <User className="w-6 h-6" />
              الملف الشخصي
            </button> */}
          </div>
          
          {/* Red Cart at the far left */}
          {/* {cart.length > 0 && <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {cart.reduce((total, item) => total + item.quantity, 0)} عنصر
              </Badge>
            </div>} */}
        </div>
      </div>

      {/* Restaurant Footer */}
      <RestaurantFooter restaurant={restaurant} />
      
      {/* Product Details Dialog */}
      <ProductDetailsDialog open={showProductDialog} onOpenChange={setShowProductDialog} item={selectedProduct} sizes={sizes} extras={extras} onAddToCart={addToCart} />
    </div>;
}