import { createClient } from 'npm:@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateCompanyProfileRequest {
  userId: string;
  nomeCompleto: string;
  nomeEmpresa: string;
  cnpj?: string;
  telefone?: string;
  email: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  plano?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: CreateCompanyProfileRequest = await req.json();

    console.log('🔄 Creating company and profile for user:', requestData.userId);

    // Get user's plan from their metadata or use default
    const planToUse = requestData.plano || 'basico';

    // 1. Create company first
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        nome: requestData.nomeEmpresa,
        cnpj: requestData.cnpj || null,
        email: requestData.email,
        telefone: requestData.telefone || null,
        endereco: requestData.endereco || null,
        plano: planToUse,
        ativo: true
      })
      .select()
      .single();

    if (empresaError) {
      console.error('❌ Error creating company:', empresaError);
      throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
    }

    console.log('✅ Company created:', empresa.id);

    // 2. Create user profile with plan (this will sync to empresa via trigger)
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfis')
      .insert({
        id: requestData.userId,
        nome_completo: requestData.nomeCompleto,
        id_empresa: empresa.id,
        papel: 'admin',
        telefone: requestData.telefone || null,
        plano: planToUse,
        assinatura_ativa: true,
        data_assinatura: new Date().toISOString(),
        ativo: true
      })
      .select()
      .single();

    if (perfilError) {
      console.error('❌ Error creating profile:', perfilError);
      
      // Rollback: delete the company if profile creation fails
      await supabaseAdmin
        .from('empresas')
        .delete()
        .eq('id', empresa.id);
      
      throw new Error(`Erro ao criar perfil: ${perfilError.message}`);
    }

    console.log('✅ Profile created for user:', requestData.userId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          empresa,
          perfil
        },
        message: 'Empresa e perfil criados com sucesso!'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('❌ Error in create-company-profile function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});