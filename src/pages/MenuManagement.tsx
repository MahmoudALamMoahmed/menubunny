import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useRestaurant } from '@/hooks/useRestaurantData';
import { useAdminCategories, useAdminMenuItems, useAdminSizes, useAdminExtras } from '@/hooks/useAdminData';
import {
  useSaveCategory, useDeleteCategory,
  useSaveMenuItem, useDeleteMenuItem,
  useSaveSize, useDeleteSize,
  useSaveExtra, useDeleteExtra,
} from '@/hooks/useAdminMutations';
import ImageUploader from '@/components/ImageUploader';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { SortableItem } from '@/components/SortableItem';
import { getMenuItemPublicId } from '@/lib/bunny';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  Ruler,
  Cookie,
  Search
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  display_order: number;
  restaurant_id: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  restaurant_id: string;
  image_url: string | null;
  image_public_id: string | null;
  is_available: boolean;
  display_order: number;
}

interface Size {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  display_order: number;
}

interface Extra {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  is_available: boolean;
  display_order: number;
}

export default function MenuManagement() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(username);
  const restaurantId = restaurant?.id;
  
  const { data: categories = [], isLoading: categoriesLoading } = useAdminCategories(restaurantId);
  const { data: menuItems = [], isLoading: itemsLoading } = useAdminMenuItems(restaurantId);
  const { data: sizes = [], isLoading: sizesLoading } = useAdminSizes(restaurantId);
  const { data: extras = [], isLoading: extrasLoading } = useAdminExtras(restaurantId);
  
  const dataLoading = categoriesLoading || itemsLoading || sizesLoading || extrasLoading;

  // Mutations
  const saveCategoryMut = useSaveCategory(restaurantId);
  const deleteCategoryMut = useDeleteCategory(restaurantId);
  const saveItemMut = useSaveMenuItem(restaurantId);
  const deleteItemMut = useDeleteMenuItem(restaurantId);
  const saveSizeMut = useSaveSize(restaurantId);
  const deleteSizeMut = useDeleteSize(restaurantId);
  const saveExtraMut = useSaveExtra(restaurantId);
  const deleteExtraMut = useDeleteExtra(restaurantId);

  const saving = saveCategoryMut.isPending || saveItemMut.isPending || saveSizeMut.isPending || saveExtraMut.isPending;
  const isDeleting = deleteCategoryMut.isPending || deleteItemMut.isPending || deleteSizeMut.isPending || deleteExtraMut.isPending;
  
  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showSizesDialog, setShowSizesDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display_order: 0
  });
  
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    image_public_id: '',
    is_available: true,
    display_order: 0
  });
  
  // Temporary item ID for new items (for image upload)
  const [tempItemId, setTempItemId] = useState<string | null>(null);
  
  const [sizeForm, setSizeForm] = useState({
    name: '',
    price: '',
    display_order: 0
  });
  
  const [extraForm, setExtraForm] = useState({
    name: '',
    price: '',
    display_order: 0
  });
  
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Delete confirmation states
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'category' | 'item' | 'size' | 'extra';
    id: string;
    name: string;
  }>({ open: false, type: 'category', id: '', name: '' });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Helper to invalidate all admin queries (for DnD reorder operations)
  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ['admin_categories', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['admin_menu_items', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['admin_sizes', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['admin_extras', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['categories', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['sizes', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['extras', restaurantId] });
  };

  const handleSaveCategory = () => {
    if (!restaurant || !categoryForm.name.trim()) return;
    saveCategoryMut.mutate(
      { id: editingCategory?.id, name: categoryForm.name, display_order: categoryForm.display_order },
      {
        onSuccess: () => {
          setCategoryForm({ name: '', display_order: 0 });
          setShowCategoryForm(false);
          setEditingCategory(null);
        },
      }
    );
  };

  const handleSaveItem = () => {
    if (!restaurant || !itemForm.name.trim() || !itemForm.price) return;
    saveItemMut.mutate(
      {
        id: editingItem?.id,
        name: itemForm.name,
        description: itemForm.description || null,
        price: parseFloat(itemForm.price),
        category_id: itemForm.category_id || null,
        image_url: itemForm.image_url || null,
        image_public_id: itemForm.image_public_id || null,
        is_available: itemForm.is_available,
        display_order: itemForm.display_order,
        restaurant_id: restaurant.id,
      },
      {
        onSuccess: () => {
          setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '', image_public_id: '', is_available: true, display_order: 0 });
          setTempItemId(null);
          setShowItemForm(false);
          setEditingItem(null);
        },
      }
    );
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryMut.mutate(categoryId, {
      onSuccess: () => setDeleteDialog({ open: false, type: 'category', id: '', name: '' }),
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId);
    deleteItemMut.mutate(
      { itemId, imagePublicId: item?.image_public_id },
      { onSuccess: () => setDeleteDialog({ open: false, type: 'item', id: '', name: '' }) }
    );
  };

  // Size management functions
  const handleSaveSize = () => {
    if (!selectedItemId || !sizeForm.name.trim() || !sizeForm.price) return;
    saveSizeMut.mutate(
      {
        id: editingSize?.id,
        menu_item_id: selectedItemId,
        name: sizeForm.name,
        price: parseFloat(sizeForm.price),
        display_order: sizeForm.display_order,
      },
      {
        onSuccess: () => {
          setSizeForm({ name: '', price: '', display_order: 0 });
          setEditingSize(null);
        },
      }
    );
  };

  const handleDeleteSize = (sizeId: string) => {
    deleteSizeMut.mutate(sizeId, {
      onSuccess: () => setDeleteDialog({ open: false, type: 'size', id: '', name: '' }),
    });
  };

  const openSizesDialog = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowSizesDialog(true);
    setSizeForm({ name: '', price: '', display_order: 0 });
    setEditingSize(null);
  };

  const getSizesForItem = (itemId: string) => {
    return sizes.filter(size => size.menu_item_id === itemId);
  };

  // Extras management functions
  const handleSaveExtra = () => {
    if (!restaurant || !extraForm.name.trim() || !extraForm.price) return;
    saveExtraMut.mutate(
      {
        id: editingExtra?.id,
        restaurant_id: restaurant.id,
        name: extraForm.name,
        price: parseFloat(extraForm.price),
        display_order: extraForm.display_order,
        is_available: true,
      },
      {
        onSuccess: () => {
          setExtraForm({ name: '', price: '', display_order: 0 });
          setEditingExtra(null);
        },
      }
    );
  };

  const handleDeleteExtra = (extraId: string) => {
    deleteExtraMut.mutate(extraId, {
      onSuccess: () => setDeleteDialog({ open: false, type: 'extra', id: '', name: '' }),
    });
  };

  // Handle drag end for categories
  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    queryClient.setQueryData(['admin_categories', restaurantId], newCategories);
    
    try {
      const updates = newCategories.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        display_order: index,
        restaurant_id: cat.restaurant_id,
      }));
      
      const { error } = await supabase.from('categories').upsert(updates);
      if (error) throw error;
      
      toast({ title: 'تم الترتيب', description: 'تم تحديث ترتيب الفئات' });
    } catch (error) {
      console.error('Error updating category order:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الترتيب', variant: 'destructive' });
      invalidateAdminData();
    }
  };

  // Handle drag end for menu items
  const handleItemDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const filteredItems = menuItems.filter(item => 
      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
    
    const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
    const newIndex = filteredItems.findIndex((item) => item.id === over.id);
    
    const newFilteredItems = arrayMove(filteredItems, oldIndex, newIndex);
    
    const otherItems = menuItems.filter(item => 
      !item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) &&
      !item.description?.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
    
    const newMenuItems = [...newFilteredItems, ...otherItems];
    queryClient.setQueryData(['admin_menu_items', restaurantId], newMenuItems);
    
    try {
      const updates = newFilteredItems.map((item, index) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category_id: item.category_id,
        restaurant_id: item.restaurant_id,
        image_url: item.image_url,
        image_public_id: item.image_public_id,
        is_available: item.is_available,
        display_order: index,
      }));
      
      const { error } = await supabase.from('menu_items').upsert(updates);
      if (error) throw error;
      
      toast({ title: 'تم الترتيب', description: 'تم تحديث ترتيب الأصناف' });
    } catch (error) {
      console.error('Error updating item order:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الترتيب', variant: 'destructive' });
      invalidateAdminData();
    }
  };

  // Handle drag end for extras
  const handleExtraDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = extras.findIndex((e) => e.id === active.id);
    const newIndex = extras.findIndex((e) => e.id === over.id);
    
    const newExtras = arrayMove(extras, oldIndex, newIndex);
    queryClient.setQueryData(['admin_extras', restaurantId], newExtras);
    
    try {
      const updates = newExtras.map((extra, index) => ({
        id: extra.id,
        name: extra.name,
        price: extra.price,
        restaurant_id: extra.restaurant_id,
        is_available: extra.is_available,
        display_order: index,
      }));
      
      const { error } = await supabase.from('extras').upsert(updates);
      if (error) throw error;
      
      toast({ title: 'تم الترتيب', description: 'تم تحديث ترتيب الإضافات' });
    } catch (error) {
      console.error('Error updating extras order:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الترتيب', variant: 'destructive' });
      invalidateAdminData();
    }
  };

  if (authLoading || restaurantLoading || dataLoading) {
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
          <p className="text-gray-600">المطعم غير موجود أو ليس لديك صلاحية للوصول إليه</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/${restaurant.username}/dashboard`)}
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة لوحة التحكم
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">إدارة القائمة</h1>
                <p className="text-gray-600 text-sm">إدارة فئات وأصناف {restaurant.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Categories Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>إدارة الفئات</CardTitle>
                  <CardDescription>أضف وعدل فئات القائمة</CardDescription>
                </div>
                <Button onClick={() => setShowCategoryForm(!showCategoryForm)}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة فئة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCategoryForm && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <Label htmlFor="categoryName">اسم الفئة</Label>
                    <Input
                      id="categoryName"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: المقبلات"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryOrder">ترتيب العرض</Label>
                    <Input
                      id="categoryOrder"
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveCategory} disabled={saving}>
                      <Save className="w-4 h-4 ml-2" />
                      {editingCategory ? 'تحديث' : 'حفظ'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                        setCategoryForm({ name: '', display_order: 0 });
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={categories.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <SortableItem key={category.id} id={category.id}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-gray-500">ترتيب: {category.display_order}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCategory(category);
                                setCategoryForm({
                                  name: category.name,
                                  display_order: category.display_order
                                });
                                setShowCategoryForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteDialog({
                                open: true,
                                type: 'category',
                                id: category.id,
                                name: category.name
                              })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Menu Items Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>إدارة الأصناف</CardTitle>
                  <CardDescription>أضف وعدل أصناف القائمة</CardDescription>
                </div>
                <Button onClick={() => {
                  setShowItemForm(!showItemForm);
                  if (!showItemForm) {
                    setTempItemId(crypto.randomUUID());
                  }
                }}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة صنف
                </Button>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن صنف..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="pr-9 h-9 text-sm"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9">
                    <SelectValue placeholder="جميع الفئات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showItemForm && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <Label htmlFor="itemName">اسم الصنف</Label>
                    <Input
                      id="itemName"
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: شاورما لحم"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemDescription">الوصف</Label>
                    <Textarea
                      id="itemDescription"
                      value={itemForm.description}
                      onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="وصف الصنف..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="itemPrice">السعر</Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        step="0.01"
                        value={itemForm.price}
                        onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemCategory">الفئة</Label>
                      <Select 
                        value={itemForm.category_id} 
                        onValueChange={(value) => setItemForm(prev => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر فئة" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {restaurant && (editingItem || tempItemId) && (
                    <ImageUploader
                      label="صورة الصنف"
                      currentImageUrl={itemForm.image_url}
                      currentPublicId={itemForm.image_public_id}
                      publicId={getMenuItemPublicId(restaurant.username, editingItem?.id || tempItemId!)}
                      aspectRatio="square"
                      imageType="product"
                      onUploadComplete={(url, publicId) => {
                        setItemForm(prev => ({
                          ...prev,
                          image_url: url,
                          image_public_id: publicId
                        }));
                      }}
                      onDelete={() => {
                        setItemForm(prev => ({
                          ...prev,
                          image_url: '',
                          image_public_id: ''
                        }));
                      }}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleSaveItem} disabled={saving}>
                      <Save className="w-4 h-4 ml-2" />
                      {editingItem ? 'تحديث' : 'حفظ'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowItemForm(false);
                        setEditingItem(null);
                        setTempItemId(null);
                        setItemForm({
                          name: '',
                          description: '',
                          price: '',
                          category_id: '',
                          image_url: '',
                          image_public_id: '',
                          is_available: true,
                          display_order: 0
                        });
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleItemDragEnd}
              >
                <SortableContext
                  items={menuItems
                    .filter(item => {
                      const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                        item.description?.toLowerCase().includes(itemSearchQuery.toLowerCase());
                      const matchesCategory = categoryFilter === 'all' || 
                        (categoryFilter === 'none' && !item.category_id) ||
                        item.category_id === categoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {menuItems
                      .filter(item => {
                        const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                          item.description?.toLowerCase().includes(itemSearchQuery.toLowerCase());
                        const matchesCategory = categoryFilter === 'all' || 
                          (categoryFilter === 'none' && !item.category_id) ||
                          item.category_id === categoryFilter;
                        return matchesSearch && matchesCategory;
                      })
                      .map((item) => (
                        <SortableItem key={item.id} id={item.id}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                              <p className="text-sm font-bold text-green-600">{item.price} ج.م</p>
                              <p className="text-xs text-gray-400">
                                {item.category_id ? categories.find(c => c.id === item.category_id)?.name : 'بدون فئة'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSizesDialog(item.id)}
                                title="إدارة الأحجام"
                              >
                                <Ruler className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingItem(item);
                                  setTempItemId(null);
                                  setItemForm({
                                    name: item.name,
                                    description: item.description || '',
                                    price: item.price.toString(),
                                    category_id: item.category_id || '',
                                    image_url: item.image_url || '',
                                    image_public_id: item.image_public_id || '',
                                    is_available: item.is_available,
                                    display_order: item.display_order
                                  });
                                  setShowItemForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'item',
                                  id: item.id,
                                  name: item.name
                                })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </SortableItem>
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Extras Management */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>إدارة الإضافات</CardTitle>
                  <CardDescription>أضف إضافات اختيارية للوجبات (جبنة إضافية، صوص، إلخ)</CardDescription>
                </div>
                <Button onClick={() => setShowExtrasDialog(true)}>
                  <Cookie className="w-4 h-4 ml-2" />
                  إدارة الإضافات
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <span className="font-medium">{extra.name}</span>
                    <span className="text-sm text-green-600">+{extra.price} ج.م</span>
                  </div>
                ))}
                {extras.length === 0 && (
                  <p className="text-gray-500">لا توجد إضافات بعد</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sizes Management Dialog */}
      <Dialog open={showSizesDialog} onOpenChange={setShowSizesDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة الأحجام</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Size Form */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div>
                <Label htmlFor="sizeName">اسم الحجم</Label>
                <Input
                  id="sizeName"
                  value={sizeForm.name}
                  onChange={(e) => setSizeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: صغير، وسط، كبير"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sizePrice">السعر</Label>
                  <Input
                    id="sizePrice"
                    type="number"
                    step="0.01"
                    value={sizeForm.price}
                    onChange={(e) => setSizeForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="sizeOrder">ترتيب العرض</Label>
                  <Input
                    id="sizeOrder"
                    type="number"
                    value={sizeForm.display_order}
                    onChange={(e) => setSizeForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSize} disabled={saving}>
                  <Save className="w-4 h-4 ml-2" />
                  {editingSize ? 'تحديث' : 'حفظ'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSizeForm({ name: '', price: '', display_order: 0 });
                    setEditingSize(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
            
            {/* Existing Sizes */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedItemId && getSizesForItem(selectedItemId).map((size) => (
                <div key={size.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div>
                    <p className="font-medium">{size.name}</p>
                    <p className="text-sm text-gray-500">{size.price} ج.م</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSize(size);
                        setSizeForm({
                          name: size.name,
                          price: size.price.toString(),
                          display_order: size.display_order
                        });
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteDialog({
                        open: true,
                        type: 'size',
                        id: size.id,
                        name: size.name
                      })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {selectedItemId && getSizesForItem(selectedItemId).length === 0 && (
                <p className="text-gray-500 text-center py-4">لا توجد أحجام مضافة بعد</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extras Management Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة الإضافات</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Extra Form */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div>
                <Label htmlFor="extraName">اسم الإضافة</Label>
                <Input
                  id="extraName"
                  value={extraForm.name}
                  onChange={(e) => setExtraForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: جبنة موتزاريلا، صوص حار"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extraPrice">السعر الإضافي</Label>
                  <Input
                    id="extraPrice"
                    type="number"
                    step="0.01"
                    value={extraForm.price}
                    onChange={(e) => setExtraForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="extraOrder">ترتيب العرض</Label>
                  <Input
                    id="extraOrder"
                    type="number"
                    value={extraForm.display_order}
                    onChange={(e) => setExtraForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveExtra} disabled={saving}>
                  <Save className="w-4 h-4 ml-2" />
                  {editingExtra ? 'تحديث' : 'حفظ'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setExtraForm({ name: '', price: '', display_order: 0 });
                    setEditingExtra(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleExtraDragEnd}
            >
              <SortableContext
                items={extras.map(e => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {extras.map((extra) => (
                    <SortableItem key={extra.id} id={extra.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{extra.name}</p>
                          <p className="text-sm text-green-600">+{extra.price} ج.م</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingExtra(extra);
                              setExtraForm({
                                name: extra.name,
                                price: extra.price.toString(),
                                display_order: extra.display_order
                              });
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteDialog({
                              open: true,
                              type: 'extra',
                              id: extra.id,
                              name: extra.name
                            })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </SortableItem>
                  ))}
                  {extras.length === 0 && (
                    <p className="text-gray-500 text-center py-4">لا توجد إضافات بعد</p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        onConfirm={() => {
          switch (deleteDialog.type) {
            case 'category':
              handleDeleteCategory(deleteDialog.id);
              break;
            case 'item':
              handleDeleteItem(deleteDialog.id);
              break;
            case 'size':
              handleDeleteSize(deleteDialog.id);
              break;
            case 'extra':
              handleDeleteExtra(deleteDialog.id);
              break;
          }
        }}
        title={
          deleteDialog.type === 'category' ? 'حذف القسم' :
          deleteDialog.type === 'item' ? 'حذف الصنف' :
          deleteDialog.type === 'size' ? 'حذف الحجم' : 'حذف الإضافة'
        }
        description={`هل أنت متأكد من حذف \"${deleteDialog.name}\"؟ لا يمكن التراجع عن هذا الإجراء.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
