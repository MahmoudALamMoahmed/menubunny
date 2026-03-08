import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useRestaurant } from '@/hooks/useRestaurantData';
import { useAdminBranches, useAdminDeliveryAreas, useBranchStaffList } from '@/hooks/useAdminData';
import {
  useSaveBranch, useDeleteBranch, useToggleBranchActive,
  useSaveDeliveryArea, useDeleteDeliveryArea,
  useReorderBranches, useReorderDeliveryAreas,
} from '@/hooks/useAdminMutations';
import type { Tables } from '@/integrations/supabase/types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Save,
  MapPin,
  Phone,
  Building2,
  Navigation,
  GripVertical,
  Search,
  Filter,
  UserPlus,
  Mail,
  Lock,
  UserX,
  User,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';

// واجهة props لكارت الفرع القابل للسحب (DnD)
interface SortableBranchCardProps {
  branch: Branch;
  onToggleActive: (branch: Branch) => void;
  onEdit: (branch: Branch) => void;
  onDelete: (branchId: string) => void;
  onOpenAreas: (branch: Branch) => void;
  onManageAccount: (branch: Branch) => void;
  areasCount: number;
  staffEmail: string | null;
}


// مكون كارت الفرع مع دعم السحب والإفلات (DnD) وأزرار التحكم
function SortableBranchCard({ 
  branch, 
  onToggleActive, 
  onEdit, 
  onDelete, 
  onOpenAreas,
  onManageAccount,
  areasCount,
  staffEmail,
}: SortableBranchCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: branch.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`${isDragging ? 'z-50 opacity-50' : ''}`}
    >
      <Card className={`${!branch.is_active ? 'opacity-60' : ''} transition-shadow duration-200 ${isDragging ? 'shadow-2xl ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="w-5 h-5" />
              </button>
              <CardTitle className="text-lg">{branch.name}</CardTitle>
            </div>
            <Switch
              checked={branch.is_active}
              onCheckedChange={() => onToggleActive(branch)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {branch.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{branch.address}</span>
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{branch.phone}</span>
            </div>
          )}
          {branch.delivery_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">دليفري: {branch.delivery_phone}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">
              {areasCount} مناطق توصيل
            </span>
          </div>

          {/* قسم حساب الفرع */}
          <div className="pt-2 border-t">
            {staffEmail ? (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{staffEmail}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0 mr-2">حساب موظف</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserPlus className="w-4 h-4" />
                <span>لا يوجد حساب للفرع</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onOpenAreas(branch)}
            >
              <Navigation className="w-4 h-4 ml-1" />
              المناطق
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onManageAccount(branch)}
              title={staffEmail ? 'إدارة حساب الفرع' : 'إضافة حساب للفرع'}
            >
              {staffEmail ? <UserX className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(branch)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDelete(branch.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// مكون طريقة الدفع القابل للسحب
interface SortablePaymentMethodProps {
  id: string;
  pm: { name: string; account_number: string; is_active: boolean };
  index: number;
  onUpdate: (index: number, field: 'name' | 'account_number', value: string) => void;
  onToggleActive: (index: number) => void;
  onDelete: (index: number) => void;
}

function SortablePaymentMethod({ id, pm, index, onUpdate, onToggleActive, onDelete }: SortablePaymentMethodProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex gap-2 items-start rounded-lg p-3 ${pm.is_active ? 'bg-muted/40' : 'bg-muted/20 opacity-60'}`}>
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none mt-2 flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 space-y-2">
        <Input
          value={pm.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          placeholder="اسم الطريقة (مثال: انستاباي)"
        />
        <Input
          value={pm.account_number}
          onChange={(e) => onUpdate(index, 'account_number', e.target.value)}
          placeholder="رقم الحساب أو المحفظة"
        />
      </div>
      <div className="flex flex-col items-center gap-1 mt-1">
        <Switch
          checked={pm.is_active}
          onCheckedChange={() => onToggleActive(index)}
        />
        <span className="text-[10px] text-muted-foreground">{pm.is_active ? 'مفعّل' : 'معطّل'}</span>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mt-1"
        onClick={() => onDelete(index)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}


type DeliveryArea = Tables<'delivery_areas'>;


// واجهة props لعنصر منطقة التوصيل القابل للسحب (DnD)
interface SortableAreaItemProps {
  area: DeliveryArea;
  onEdit: (area: DeliveryArea) => void;
  onDelete: (areaId: string) => void;
}

// مكون عنصر منطقة التوصيل مع دعم السحب والإفلات (DnD)
function SortableAreaItem({ area, onEdit, onDelete }: SortableAreaItemProps) {
  // DnD Hook - ربط العنصر بنظام السحب والإفلات
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: area.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
    >
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div>
          <span className="font-medium">{area.name}</span>
          <span className="text-primary mr-2">
            ({area.delivery_price} جنيه)
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEdit(area)}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => onDelete(area.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

type Branch = Tables<'branches'>;

export default function BranchesManagement() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isBranchStaff, branchStaffInfo, userTypeLoading } = useAuth();
  const { toast } = useToast();
  // React Query - للوصول المباشر للكاش عند التحديث المتفائل
  const queryClient = useQueryClient();
  
  // React Query - جلب بيانات المطعم
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(username);
  const restaurantId = restaurant?.id;
  
  // React Query - جلب الفروع ومناطق التوصيل الكاملة للإدارة
  const { data: branches = [], isLoading: branchesLoading } = useAdminBranches(restaurantId);
  const branchIds = branches.length > 0 ? branches.map(b => b.id) : undefined;
  const { data: deliveryAreas = [], isLoading: areasLoading } = useAdminDeliveryAreas(branchIds);
  const { data: staffList = [], refetch: refetchStaff } = useBranchStaffList(restaurantId);
  
  const dataLoading = branchesLoading || areasLoading;

  // React Query Mutation - عمليات CRUD وإعادة الترتيب
  const saveBranchMut = useSaveBranch(restaurantId);
  const deleteBranchMut = useDeleteBranch(restaurantId);
  const toggleActiveMut = useToggleBranchActive(restaurantId);
  const saveAreaMut = useSaveDeliveryArea(restaurantId);
  const deleteAreaMut = useDeleteDeliveryArea(restaurantId);
  const reorderBranchesMut = useReorderBranches(restaurantId);
  const reorderAreasMut = useReorderDeliveryAreas(restaurantId);
  
  // UI State - حالات النماذج والحوارات والبحث والفلترة
  const [showDialog, setShowDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    whatsapp_phone: '',
    delivery_phone: '',
    working_hours: '',
    is_active: true,
    order_mode: 'whatsapp'
  });

  // Payment methods state for editing branch
  const [branchPaymentMethods, setBranchPaymentMethods] = useState<{ id?: string; name: string; account_number: string }[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  
  // إدارة المناطق
  const [showAreasDialog, setShowAreasDialog] = useState(false);
  const [selectedBranchForAreas, setSelectedBranchForAreas] = useState<Branch | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', delivery_price: 0 });
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);

  // Delete confirmation dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [deleteAreaDialogOpen, setDeleteAreaDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Active dragging branch
  const [activeDragBranch, setActiveDragBranch] = useState<Branch | null>(null);

  // Staff account management state
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedBranchForAccount, setSelectedBranchForAccount] = useState<Branch | null>(null);
  const [accountForm, setAccountForm] = useState({ email: '', password: '' });
  const [accountLoading, setAccountLoading] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ userId: string; branchName: string } | null>(null);

  // Filtered branches
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (branch.address && branch.address.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && branch.is_active) ||
      (statusFilter === 'inactive' && !branch.is_active);
    
    return matchesSearch && matchesStatus;
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


  // إعادة تعيين نموذج الفرع
  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      whatsapp_phone: '',
      delivery_phone: '',
      working_hours: '',
      is_active: true,
      order_mode: 'whatsapp'
    });
    setBranchPaymentMethods([]);
    setEditingBranch(null);
  };

  // فتح حوار تعديل الفرع مع تعبئة البيانات الحالية
  const openEditDialog = async (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      whatsapp_phone: branch.whatsapp_phone || '',
      delivery_phone: branch.delivery_phone || '',
      working_hours: branch.working_hours || '',
      is_active: branch.is_active,
      order_mode: (branch as any).order_mode || 'whatsapp'
    });
    setShowDialog(true);
    // Fetch payment methods for this branch
    const { data } = await supabase
      .from('branch_payment_methods')
      .select('*')
      .eq('branch_id', branch.id)
      .order('display_order');
    setBranchPaymentMethods(data?.map(d => ({ id: d.id, name: d.name, account_number: d.account_number })) || []);
  };

  // حفظ/تعديل فرع عبر Mutation
  const handleSave = async () => {
    if (!restaurant || !formData.name.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم الفرع',
        variant: 'destructive',
      });
      return;
    }

    saveBranchMut.mutate(
      {
        id: editingBranch?.id,
        ...formData,
        restaurant_id: restaurant.id,
        display_order: editingBranch ? undefined : branches.length,
      },
      {
        onSuccess: async (_, vars) => {
          // Save payment methods
          const branchId = vars.id || editingBranch?.id;
          if (branchId) {
            // Delete existing then re-insert
            await supabase.from('branch_payment_methods').delete().eq('branch_id', branchId);
            if (branchPaymentMethods.length > 0) {
              const toInsert = branchPaymentMethods.map((pm, i) => ({
                branch_id: branchId,
                name: pm.name,
                account_number: pm.account_number,
                display_order: i,
              }));
              await supabase.from('branch_payment_methods').insert(toInsert);
            }
          }
          setShowDialog(false);
          resetForm();
        },
      }
    );
  };

  // فتح حوار تأكيد حذف الفرع
  const openDeleteDialog = (branchId: string) => {
    setBranchToDelete(branchId);
    setDeleteDialogOpen(true);
  };

  // تنفيذ حذف الفرع عبر Mutation
  const handleConfirmDelete = () => {
    if (!branchToDelete) return;
    deleteBranchMut.mutate(branchToDelete, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setBranchToDelete(null);
      },
    });
  };

  // تبديل حالة نشاط الفرع عبر Mutation
  const toggleActive = (branch: Branch) => {
    toggleActiveMut.mutate({ branchId: branch.id, isActive: !branch.is_active });
  };

  // DnD Kit sensors - إعداد حساسات السحب (PointerSensor + KeyboardSensor)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // بدء سحب فرع - حفظ الفرع النشط للـ DragOverlay
  const handleBranchDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const branch = branches.find(b => b.id === active.id);
    if (branch) {
      setActiveDragBranch(branch);
    }
  };

  // معالج DnD لإعادة ترتيب الفروع (Optimistic Update للكاش)
  const handleBranchDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragBranch(null);
    if (!over || active.id === over.id) return;
    
    const oldIndex = branches.findIndex((b) => b.id === active.id);
    const newIndex = branches.findIndex((b) => b.id === over.id);
    const newBranches = arrayMove(branches, oldIndex, newIndex);
    queryClient.setQueryData(['admin_branches', restaurantId], newBranches);
    
    const updates = newBranches.map((branch, index) => ({
      id: branch.id, name: branch.name, restaurant_id: restaurant!.id, display_order: index,
    }));
    reorderBranchesMut.mutate(updates, {
      onSuccess: () => toast({ title: 'تم الترتيب', description: 'تم تحديث ترتيب الفروع' }),
      onError: () => toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الترتيب', variant: 'destructive' }),
    });
  };

  // فتح حوار مناطق التوصيل لفرع معين
  const openAreasDialog = (branch: Branch) => {
    setSelectedBranchForAreas(branch);
    setShowAreasDialog(true);
  };

  // إعادة تعيين نموذج المنطقة
  const resetAreaForm = () => {
    setAreaForm({ name: '', delivery_price: 0 });
    setEditingArea(null);
  };

  // دالة مساعدة - فلترة مناطق التوصيل حسب الفرع
  const getBranchAreas = (branchId: string) => {
    return deliveryAreas.filter(area => area.branch_id === branchId);
  };

  // حفظ/تعديل منطقة توصيل عبر Mutation
  const handleSaveArea = () => {
    if (!selectedBranchForAreas || !areaForm.name.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم المنطقة',
        variant: 'destructive',
      });
      return;
    }

    const branchAreas = getBranchAreas(selectedBranchForAreas.id);
    saveAreaMut.mutate(
      {
        id: editingArea?.id,
        branch_id: selectedBranchForAreas.id,
        name: areaForm.name,
        delivery_price: areaForm.delivery_price,
        display_order: editingArea ? undefined : branchAreas.length,
      },
      {
        onSuccess: () => resetAreaForm(),
      }
    );
  };

  // معالج DnD لإعادة ترتيب مناطق التوصيل (Optimistic Update للكاش)
  const handleAreaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedBranchForAreas) return;
    
    const branchAreas = getBranchAreas(selectedBranchForAreas.id);
    const oldIndex = branchAreas.findIndex((a) => a.id === active.id);
    const newIndex = branchAreas.findIndex((a) => a.id === over.id);
    const newAreas = arrayMove(branchAreas, oldIndex, newIndex);
    
    const updatedAreas = deliveryAreas.filter(a => a.branch_id !== selectedBranchForAreas.id);
    const reorderedAreas = newAreas.map((area, index) => ({ ...area, display_order: index }));
    queryClient.setQueryData(['admin_delivery_areas', branchIds], [...updatedAreas, ...reorderedAreas]);
    
    const updates = newAreas.map((area, index) => ({
      id: area.id, name: area.name, branch_id: area.branch_id,
      delivery_price: area.delivery_price, display_order: index,
    }));
    reorderAreasMut.mutate(updates, {
      onSuccess: () => toast({ title: 'تم الترتيب', description: 'تم تحديث ترتيب المناطق' }),
      onError: () => toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الترتيب', variant: 'destructive' }),
    });
  };

  const openDeleteAreaDialog = (areaId: string) => {
    setAreaToDelete(areaId);
    setDeleteAreaDialogOpen(true);
  };

  const handleConfirmDeleteArea = () => {
    if (!areaToDelete) return;
    deleteAreaMut.mutate(areaToDelete, {
      onSuccess: () => {
        setDeleteAreaDialogOpen(false);
        setAreaToDelete(null);
      },
    });
  };

  const openEditArea = (area: DeliveryArea) => {
    setEditingArea(area);
    setAreaForm({ name: area.name, delivery_price: area.delivery_price });
  };

  // دالة مساعدة - إيجاد حساب موظف الفرع
  const getBranchStaffEmail = (branchId: string): string | null => {
    const staff = staffList.find(s => s.branch_id === branchId);
    return staff?.email ?? null;
  };

  // فتح حوار إدارة حساب الفرع
  const openManageAccountDialog = (branch: Branch) => {
    setSelectedBranchForAccount(branch);
    const staffEmail = getBranchStaffEmail(branch.id);
    if (staffEmail) {
      // يوجد حساب - عرض حوار الحذف
      const staff = staffList.find(s => s.branch_id === branch.id);
      if (staff) {
        setStaffToDelete({ userId: staff.user_id, branchName: branch.name });
        setDeleteAccountDialogOpen(true);
      }
    } else {
      // لا يوجد حساب - فتح حوار الإنشاء
      setAccountForm({ email: '', password: '' });
      setShowAccountDialog(true);
    }
  };

  // إنشاء حساب موظف فرع
  const handleCreateStaffAccount = async () => {
    if (!selectedBranchForAccount || !restaurant || !accountForm.email || !accountForm.password) {
      toast({ title: 'خطأ', description: 'يرجى إدخال الإيميل وكلمة المرور', variant: 'destructive' });
      return;
    }
    if (accountForm.password.length < 6) {
      toast({ title: 'خطأ', description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    setAccountLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-branch-staff', {
        body: {
          branch_id: selectedBranchForAccount.id,
          restaurant_id: restaurant.id,
          email: accountForm.email,
          password: accountForm.password,
        },
      });

      if (response.error || response.data?.error) {
        toast({
          title: 'خطأ',
          description: response.data?.error || 'حدث خطأ أثناء إنشاء الحساب',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'تم بنجاح', description: `تم إنشاء حساب للفرع ${selectedBranchForAccount.name}` });
        setShowAccountDialog(false);
        setAccountForm({ email: '', password: '' });
        refetchStaff();
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' });
    }
    setAccountLoading(false);
  };

  // حذف حساب موظف فرع
  const handleDeleteStaffAccount = async () => {
    if (!staffToDelete) return;
    setAccountLoading(true);
    try {
      const response = await supabase.functions.invoke('delete-branch-staff', {
        body: { staff_user_id: staffToDelete.userId },
      });

      if (response.error || response.data?.error) {
        toast({
          title: 'خطأ',
          description: response.data?.error || 'حدث خطأ أثناء حذف الحساب',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'تم الحذف', description: `تم حذف حساب فرع ${staffToDelete.branchName}` });
        setDeleteAccountDialogOpen(false);
        setStaffToDelete(null);
        refetchStaff();
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' });
    }
    setAccountLoading(false);
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
          <p className="text-gray-600">المطعم غير موجود</p>
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
                <h1 className="text-2xl font-bold text-gray-800">إدارة الفروع</h1>
                <p className="text-gray-600 text-sm">إدارة فروع {restaurant.name}</p>
              </div>
            </div>

            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة فرع
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن فرع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: 'all' | 'active' | 'inactive') => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="جميع الفروع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفروع</SelectItem>
              <SelectItem value="active">الفروع النشطة</SelectItem>
              <SelectItem value="inactive">الفروع غير النشطة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Branches Grid with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleBranchDragStart}
          onDragEnd={handleBranchDragEnd}
        >
          <SortableContext
            items={filteredBranches.map(b => b.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBranches.map((branch) => (
                <SortableBranchCard
                  key={branch.id}
                  branch={branch}
                  onToggleActive={toggleActive}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  onOpenAreas={openAreasDialog}
                  onManageAccount={openManageAccountDialog}
                  areasCount={getBranchAreas(branch.id).length}
                  staffEmail={getBranchStaffEmail(branch.id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeDragBranch ? (
              <Card className="shadow-2xl ring-2 ring-primary opacity-90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{activeDragBranch.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeDragBranch.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600">{activeDragBranch.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>

        {filteredBranches.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchQuery || statusFilter !== 'all' 
                ? 'لا توجد فروع مطابقة للبحث' 
                : 'لم يتم إضافة فروع بعد'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button className="mt-4" onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة فرع جديد
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Branch Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">اسم الفرع *</Label>
              <Input
                id="branchName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: فرع المعادي"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchAddress">العنوان</Label>
              <Input
                id="branchAddress"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="العنوان التفصيلي"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchPhone">رقم الهاتف</Label>
                <Input
                  id="branchPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchDeliveryPhone">رقم الدليفري</Label>
                <Input
                  id="branchDeliveryPhone"
                  value={formData.delivery_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, delivery_phone: e.target.value }))}
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchWhatsapp">رقم الواتساب</Label>
              <Input
                id="branchWhatsapp"
                value={formData.whatsapp_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_phone: e.target.value }))}
                placeholder="01xxxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchHours">مواعيد العمل</Label>
              <Input
                id="branchHours"
                value={formData.working_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, working_hours: e.target.value }))}
                placeholder="يومياً من 9 ص إلى 11 م"
              />
            </div>

            {/* Order Mode */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-base font-semibold">طريقة استقبال الطلبات</Label>
              <Select value={formData.order_mode} onValueChange={(value) => setFormData(prev => ({ ...prev, order_mode: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة استقبال الطلبات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">واتساب فقط</SelectItem>
                  <SelectItem value="dashboard">لوحة التحكم فقط</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.order_mode === 'whatsapp' && 'العميل يرسل الطلب عبر واتساب فقط'}
                {formData.order_mode === 'dashboard' && 'الطلبات تظهر في صفحة الطلبات بلوحة التحكم'}
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">طرق الدفع الإلكترونية</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBranchPaymentMethods(prev => [...prev, { name: '', account_number: '' }])}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة
                </Button>
              </div>
              {branchPaymentMethods.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">لم تتم إضافة طرق دفع بعد</p>
              )}
              {branchPaymentMethods.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      const oldIndex = branchPaymentMethods.findIndex((_, i) => `pm-${i}` === active.id);
                      const newIndex = branchPaymentMethods.findIndex((_, i) => `pm-${i}` === over.id);
                      setBranchPaymentMethods(prev => arrayMove(prev, oldIndex, newIndex));
                    }
                  }}
                >
                  <SortableContext items={branchPaymentMethods.map((_, i) => `pm-${i}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {branchPaymentMethods.map((pm, index) => (
                        <SortablePaymentMethod
                          key={`pm-${index}`}
                          id={`pm-${index}`}
                          pm={pm}
                          index={index}
                          onUpdate={(idx, field, value) => {
                            const updated = [...branchPaymentMethods];
                            updated[idx] = { ...updated[idx], [field]: value };
                            setBranchPaymentMethods(updated);
                          }}
                          onDelete={(idx) => setBranchPaymentMethods(prev => prev.filter((_, i) => i !== idx))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>الفرع نشط</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saveBranchMut.isPending}>
                {saveBranchMut.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {editingBranch ? 'تحديث' : 'إضافة'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Areas Dialog */}
      <Dialog open={showAreasDialog} onOpenChange={(open) => { setShowAreasDialog(open); if (!open) { resetAreaForm(); setSelectedBranchForAreas(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              مناطق التوصيل - {selectedBranchForAreas?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add/Edit Area Form */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="areaName">اسم المنطقة</Label>
                  <Input
                    id="areaName"
                    value={areaForm.name}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: المعادي"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="areaPrice">سعر التوصيل</Label>
                  <Input
                    id="areaPrice"
                    type="number"
                    value={areaForm.delivery_price}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, delivery_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveArea} disabled={saveAreaMut.isPending}>
                  <Save className="w-4 h-4 ml-1" />
                  {editingArea ? 'تحديث' : 'إضافة'}
                </Button>
                {editingArea && (
                  <Button size="sm" variant="outline" onClick={resetAreaForm}>
                    إلغاء
                  </Button>
                )}
              </div>
            </div>

            {/* Areas List with DnD */}
            {selectedBranchForAreas && (
              <ScrollArea className="max-h-[400px]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleAreaDragEnd}
                >
                  <SortableContext
                    items={getBranchAreas(selectedBranchForAreas.id).map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {getBranchAreas(selectedBranchForAreas.id).map((area) => (
                        <SortableAreaItem
                          key={area.id}
                          area={area}
                          onEdit={openEditArea}
                          onDelete={openDeleteAreaDialog}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {getBranchAreas(selectedBranchForAreas.id).length === 0 && (
                  <div className="text-center py-8">
                    <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">لا توجد مناطق توصيل بعد</p>
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="حذف الفرع"
        description="هل أنت متأكد من حذف هذا الفرع؟ سيتم حذف جميع مناطق التوصيل المرتبطة به."
        isLoading={deleteBranchMut.isPending}
      />

      {/* Delete Area Confirmation */}
      <DeleteConfirmDialog
        open={deleteAreaDialogOpen}
        onOpenChange={setDeleteAreaDialogOpen}
        onConfirm={handleConfirmDeleteArea}
        title="حذف منطقة التوصيل"
        description="هل أنت متأكد من حذف هذه المنطقة؟"
        isLoading={deleteAreaMut.isPending}
      />

      {/* Create Staff Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={(open) => { setShowAccountDialog(open); if (!open) setAccountForm({ email: '', password: '' }); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              إضافة حساب للفرع: {selectedBranchForAccount?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              سيتمكن صاحب هذا الحساب من تسجيل الدخول ورؤية طلبات هذا الفرع فقط.
            </p>
            <div className="space-y-2">
              <Label htmlFor="staffEmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </Label>
              <Input
                id="staffEmail"
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="branch@restaurant.com"
                disabled={accountLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                كلمة المرور
              </Label>
              <Input
                id="staffPassword"
                type="password"
                value={accountForm.password}
                onChange={(e) => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="6 أحرف على الأقل"
                disabled={accountLoading}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowAccountDialog(false)} disabled={accountLoading}>
                إلغاء
              </Button>
              <Button onClick={handleCreateStaffAccount} disabled={accountLoading}>
                {accountLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                ) : (
                  <UserPlus className="w-4 h-4 ml-2" />
                )}
                إنشاء الحساب
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Staff Account Confirmation */}
      <DeleteConfirmDialog
        open={deleteAccountDialogOpen}
        onOpenChange={(open) => { setDeleteAccountDialogOpen(open); if (!open) setStaffToDelete(null); }}
        onConfirm={handleDeleteStaffAccount}
        title="حذف حساب الفرع"
        description={`هل أنت متأكد من حذف حساب فرع "${staffToDelete?.branchName}"؟ لن يستطيع الموظف تسجيل الدخول بعد ذلك.`}
        isLoading={accountLoading}
      />
    </div>
  );
}

