import { createClient } from 'npm:@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateCompanyRequest {
  userId: string;
  nomeEmpresa: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
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
    // Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not configured');
    }
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not configured');
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const requestData: CreateCompanyRequest = await req.json();
    
    console.log('🔄 Creating and linking company for user:', requestData.userId);

    // Validate required fields
    if (!requestData.userId || !requestData.nomeEmpresa) {
      throw new Error('userId e nomeEmpresa são obrigatórios');
    }

    // 1. Create company
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        nome: requestData.nomeEmpresa,
        cnpj: requestData.cnpj || null,
        email: requestData.email || null,
        telefone: requestData.telefone || null,
        endereco: requestData.endereco || null,
        cidade: requestData.cidade || null,
        estado: requestData.estado || null,
        cep: requestData.cep || null,
        plano: requestData.plano || 'basico',
        ativo: true
      })
      .select()
      .single();

    if (empresaError) {
      console.error('❌ Error creating company:', empresaError);
      throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
    }

    console.log('✅ Company created:', empresa.id);

    // 2. Update user profile to link with the company
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .update({
        id_empresa: empresa.id
      })
      .eq('id', requestData.userId);

    if (perfilError) {
      console.error('❌ Error linking profile to company:', perfilError);
      
      // Rollback: delete the company if profile update fails
      await supabaseAdmin
        .from('empresas')
        .delete()
        .eq('id', empresa.id);
      
      throw new Error(`Erro ao vincular perfil à empresa: ${perfilError.message}`);
    }

    console.log('✅ Profile linked to company for user:', requestData.userId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          empresa,
          message: 'Empresa criada e vinculada com sucesso!'
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('❌ Error in create-and-link-company function:', error);
    
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