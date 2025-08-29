import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

const getUserProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

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
        plano
      )
    `)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

const getCompanyId = async (): Promise<string | null> => {
  const profile = await getUserProfile();
  return profile?.id_empresa || null;
};