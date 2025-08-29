import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';

type Profile = Database['public']['Tables']['perfis']['Row'] & {
  empresas?: Database['public']['Tables']['empresas']['Row'];
};

interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  supabase: typeof supabase;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          
          // If refresh token is invalid, clear it by signing out
          if (error.message && error.message.includes('Invalid Refresh Token')) {
            console.log('🔄 Clearing invalid refresh token...');
            await supabase.auth.signOut();
          }
          
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        console.log('📋 Current session:', session?.user?.email || 'No session');

        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        
        if (mounted) {
          setInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || !initialized) return;
        
        console.log('🔄 Auth event:', event, session?.user?.email || 'No user');
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('perfis')
        .select(`
          *,
          empresas (
            id,
            nome,
            cnpj,
            email,
            telefone,
            endereco,
            plano,
            assinatura_id
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        setProfile(null);
      } else {
        console.log('✅ Profile data received:', data);
        console.log('✅ Profile loaded:', data?.nome_completo || 'No profile');
        setProfile(data);
      }
    } catch (error) {
      console.error('❌ Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthProvider.signIn chamado com:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('📊 Resposta do Supabase auth:', { data: data?.user?.email, error });
    return { data, error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  };

  const value = {
    user,
    profile,
    loading,
    supabase,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};