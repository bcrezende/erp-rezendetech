import { createClient } from 'npm:@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface WebhookPayload {
  id_empresa: string;
  id_usuario: string;
  plano: string;
  assinatura_id: string;
  status: string;
  valor?: number;
  data_pagamento?: string;
  data_vencimento?: string;
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

    const webhookData: WebhookPayload = await req.json();
    
    console.log('💳 Processing subscription webhook:', {
      empresa: webhookData.id_empresa,
      usuario: webhookData.id_usuario,
      plano: webhookData.plano,
      status: webhookData.status
    });

    // Validar campos obrigatórios
    if (!webhookData.id_empresa || !webhookData.plano || !webhookData.assinatura_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campos obrigatórios: id_empresa, plano, assinatura_id'
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
      .select('id, nome, plano')
      .eq('id', webhookData.id_empresa)
      .eq('ativo', true)
      .single();

    if (empresaError || !empresa) {
      console.error('❌ Empresa não encontrada:', empresaError);
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

    // Mapear planos recebidos do webhook para os planos do sistema
    let planoDB = 'basico';
    if (webhookData.plano === 'empresarial' || webhookData.plano === 'enterprise') {
      planoDB = 'enterprise';
    } else if (webhookData.plano === 'premium') {
      planoDB = 'premium';
    }

    // Atualizar plano da empresa
    const { error: updateError } = await supabaseAdmin
      .from('empresas')
      .update({
        plano: planoDB,
        assinatura_id: webhookData.assinatura_id
      })
      .eq('id', webhookData.id_empresa);

    if (updateError) {
      console.error('❌ Error updating company plan:', updateError);
      throw new Error(`Erro ao atualizar plano da empresa: ${updateError.message}`);
    }

    console.log('✅ Company plan updated successfully:', {
      empresa: empresa.nome,
      planoAnterior: empresa.plano,
      planoNovo: planoDB,
      assinaturaId: webhookData.assinatura_id
    });

    // Se há um usuário específico, atualizar também o perfil
    if (webhookData.id_usuario) {
      const { error: perfilError } = await supabaseAdmin
        .from('perfis')
        .update({
          assinatura_id: webhookData.assinatura_id
        })
        .eq('id', webhookData.id_usuario);

      if (perfilError) {
        console.warn('⚠️ Warning updating user profile:', perfilError);
        // Não falhar se não conseguir atualizar o perfil do usuário
      } else {
        console.log('✅ User profile updated with subscription ID');
      }
    }

    // Registrar transação de pagamento se fornecida
    if (webhookData.valor && webhookData.data_pagamento) {
      try {
        await supabaseAdmin
          .from('transacoes')
          .insert({
            id_empresa: webhookData.id_empresa,
            valor: Number(webhookData.valor),
            tipo: 'despesa',
            descricao: `Assinatura ${planoDB === 'enterprise' ? 'Empresarial' : 'Premium'} - ${webhookData.assinatura_id}`,
            data_transacao: webhookData.data_pagamento,
            data_vencimento: webhookData.data_vencimento || webhookData.data_pagamento,
            status: 'concluida',
            origem: 'api'
          });
        
        console.log('✅ Payment transaction recorded');
      } catch (transactionError) {
        console.warn('⚠️ Warning recording payment transaction:', transactionError);
        // Não falhar se não conseguir registrar a transação
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          empresa_id: webhookData.id_empresa,
          plano_anterior: empresa.plano,
          plano_novo: planoDB,
          assinatura_id: webhookData.assinatura_id,
          message: 'Plano da empresa atualizado com sucesso!'
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
    console.error('❌ Error in asaas-subscription-webhook function:', error);
    
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