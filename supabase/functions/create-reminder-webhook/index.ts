import { createClient } from 'npm:@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateReminderRequest {
  id_empresa: string;
  id_usuario: string;
  titulo: string;
  descricao?: string;
  valor?: number;
  data_lembrete: string;
  status?: string;
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
    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Método não permitido. Use POST.' 
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    // Criar cliente Supabase com service role para bypass do RLS
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const requestData: CreateReminderRequest = await req.json();
    
    console.log('🔔 Creating reminder via webhook:', {
      empresa: requestData.id_empresa,
      usuario: requestData.id_usuario,
      titulo: requestData.titulo
    });

    // Validar campos obrigatórios
    if (!requestData.id_empresa || !requestData.id_usuario || !requestData.titulo || !requestData.data_lembrete) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campos obrigatórios: id_empresa, id_usuario, titulo, data_lembrete'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Validar formato da data
    const dataLembrete = new Date(requestData.data_lembrete);
    if (isNaN(dataLembrete.getTime())) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Formato de data inválido. Use YYYY-MM-DD'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Verificar se a empresa existe
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('id', requestData.id_empresa)
      .eq('ativo', true)
      .single();

    if (empresaError || !empresa) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Empresa não encontrada ou inativa'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Verificar se o usuário existe e pertence à empresa
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfis')
      .select('id, id_empresa')
      .eq('id', requestData.id_usuario)
      .eq('id_empresa', requestData.id_empresa)
      .eq('ativo', true)
      .single();

    if (perfilError || !perfil) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuário não encontrado ou não pertence à empresa especificada'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Criar o lembrete
    const { data: lembrete, error: lembreteError } = await supabaseAdmin
      .from('lembretes')
      .insert({
        id_empresa: requestData.id_empresa,
        id_usuario: requestData.id_usuario,
        titulo: requestData.titulo,
        descricao: requestData.descricao || null,
        valor: requestData.valor ? Number(requestData.valor) : null,
        data_lembrete: requestData.data_lembrete,
        status: requestData.status || 'pendente',
        ativo: true
      })
      .select()
      .single();

    if (lembreteError) {
      console.error('❌ Error creating reminder:', lembreteError);
      throw new Error(`Erro ao criar lembrete: ${lembreteError.message}`);
    }

    console.log('✅ Reminder created successfully:', lembrete.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          lembrete,
          message: 'Lembrete criado com sucesso!'
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
    console.error('❌ Error in create-reminder-webhook function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
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