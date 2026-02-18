import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface PendingRestaurant {
  username: string;
  restaurantName: string;
}

interface BranchStaffInfo {
  user_id: string;
  branch_id: string;
  restaurant_id: string;
  email: string;
  restaurantUsername: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  username: string | null;
  branchStaffInfo: BranchStaffInfo | null;
  isBranchStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, restaurantName: string) => Promise<{ error: any; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  ensureRestaurantExists: () => Promise<{ created: boolean; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// مفتاح التخزين المحلي لبيانات المطعم المعلقة
const PENDING_RESTAURANT_KEY = 'pending_restaurant_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [branchStaffInfo, setBranchStaffInfo] = useState<BranchStaffInfo | null>(null);

  // دالة مساعدة لجلب اسم المستخدم (لصاحب المطعم)
  const fetchUsername = async (userId: string) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('username')
      .eq('owner_id', userId)
      .single();
    
    if (!error && data) {
      setUsername(data.username);
    } else {
      setUsername(null);
    }
  };

  // دالة لجلب بيانات موظف الفرع إذا كان المستخدم موظفاً
  const fetchBranchStaffInfo = async (userId: string): Promise<BranchStaffInfo | null> => {
    const { data, error } = await supabase
      .from('branch_staff')
      .select('*, restaurants(username)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      user_id: data.user_id,
      branch_id: data.branch_id,
      restaurant_id: data.restaurant_id,
      email: data.email,
      restaurantUsername: (data.restaurants as any)?.username ?? null,
    };
  };

  // دالة لتحديد نوع المستخدم (موظف فرع أم صاحب مطعم)
  const resolveUserType = async (userId: string) => {
    const staffInfo = await fetchBranchStaffInfo(userId);
    if (staffInfo) {
      setBranchStaffInfo(staffInfo);
      setUsername(null);
    } else {
      setBranchStaffInfo(null);
      await fetchUsername(userId);
    }
  };

  // دالة لإنشاء المطعم إذا لم يكن موجوداً (idempotent)
  const ensureRestaurantExists = async (): Promise<{ created: boolean; error: any }> => {
    if (!user) {
      return { created: false, error: { message: 'No authenticated user' } };
    }

    const { data: existingRestaurant, error: checkError } = await supabase
      .from('restaurants')
      .select('id, username')
      .eq('owner_id', user.id)
      .single();

    if (existingRestaurant) {
      setUsername(existingRestaurant.username);
      return { created: false, error: null };
    }

    const pendingDataStr = localStorage.getItem(PENDING_RESTAURANT_KEY);
    if (!pendingDataStr) {
      return { created: false, error: { message: 'No pending restaurant data found' } };
    }

    let pendingData: PendingRestaurant;
    try {
      pendingData = JSON.parse(pendingDataStr);
    } catch {
      localStorage.removeItem(PENDING_RESTAURANT_KEY);
      return { created: false, error: { message: 'Invalid pending restaurant data' } };
    }

    const { error: insertError } = await supabase
      .from('restaurants')
      .insert({
        owner_id: user.id,
        name: pendingData.restaurantName,
        username: pendingData.username,
        description: `مطعم ${pendingData.restaurantName} - نقدم أفضل الأطباق الشهية`,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        localStorage.removeItem(PENDING_RESTAURANT_KEY);
        await fetchUsername(user.id);
        return { created: false, error: null };
      }
      return { created: false, error: insertError };
    }

    localStorage.removeItem(PENDING_RESTAURANT_KEY);
    setUsername(pendingData.username);
    return { created: true, error: null };
  };

  // Auth Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          setTimeout(() => {
            resolveUserType(session.user.id);
          }, 0);
        } else {
          setUsername(null);
          setBranchStaffInfo(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          resolveUserType(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, restaurantName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) return { error, needsEmailConfirmation: false };

    const identities = data.user?.identities;
    const isAlreadyRegistered = Array.isArray(identities) && identities.length === 0;
    if (isAlreadyRegistered) {
      return { error: { message: 'User already registered' }, needsEmailConfirmation: false };
    }

    if (!data.user) {
      return { error: { message: 'Unexpected signup response' }, needsEmailConfirmation: false };
    }

    const pendingData: PendingRestaurant = { username, restaurantName };
    localStorage.setItem(PENDING_RESTAURANT_KEY, JSON.stringify(pendingData));

    const needsEmailConfirmation = !data.session;
    return { error: null, needsEmailConfirmation };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    username,
    branchStaffInfo,
    isBranchStaff: !!branchStaffInfo,
    signIn,
    signUp,
    signOut,
    ensureRestaurantExists,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
