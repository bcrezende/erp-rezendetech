import { createClient } from 'npm:@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SubscriptionInfoRequest {
  assinatura_id: string;
  user_id?: string;
}

interface N8NSubscriptionResponse {
  id: string;
  dataAssinatura: string;
  valor: number;
  ciclo: string;
  status: string;
  creditCard?: any;
  proximoPagamento: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { assinatura_id, user_id }: SubscriptionInfoRequest = await req.json();

    if (!assinatura_id) {
      return new Response(
        JSON.stringify({ error: 'assinatura_id é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const credentials = btoa('rezendetech:123123');
      const response = await fetch('https://n8n.rezendetech.com.br/webhook/assinatura/info', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: assinatura_id
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            error: 'Serviço de assinatura temporariamente indisponível',
            details: 'O endpoint de consulta não foi encontrado. Verifique se o serviço N8N está ativo.'
          }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: 'Erro no serviço de assinatura',
            details: `HTTP ${response.status}: ${response.statusText}`
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const data: N8NSubscriptionResponse = await response.json();

      console.log('📋 Subscription info retrieved:', {
        id: data.id,
        status: data.status,
        proximoPagamento: data.proximoPagamento
      });

      const isActive = data.status === 'active' || data.status === 'trialing';
      const proximoPagamento = data.proximoPagamento ? new Date(data.proximoPagamento) : null;
      const daysUntilExpiration = proximoPagamento
        ? Math.ceil((proximoPagamento.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      let acaoTomada = 'nenhuma';
      if (!isActive) {
        acaoTomada = 'bloqueio';
      } else if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
        acaoTomada = 'alerta';
      }

      if (user_id) {
        const { data: perfil, error: perfilError } = await supabaseAdmin
          .from('perfis')
          .select('status_assinatura, assinatura_ativa, id_empresa')
          .eq('id', user_id)
          .maybeSingle();

        if (!perfilError && perfil) {
          const statusAnterior = perfil.status_assinatura;
          const assinaturaAtivaAntes = perfil.assinatura_ativa;

          const { error: updateError } = await supabaseAdmin
            .from('perfis')
            .update({
              status_assinatura: data.status,
              assinatura_ativa: isActive,
              proxima_data_pagamento: proximoPagamento?.toISOString().split('T')[0] || null,
              ultima_verificacao_assinatura: new Date().toISOString(),
              data_vencimento_assinatura: !isActive ? new Date().toISOString().split('T')[0] : null
            })
            .eq('id', user_id);

          if (updateError) {
            console.error('❌ Error updating perfil:', updateError);
          } else {
            console.log('✅ Perfil updated successfully');

            await supabaseAdmin.rpc('log_subscription_verification', {
              p_id_empresa: perfil.id_empresa,
              p_id_usuario: user_id,
              p_status_verificado: data.status,
              p_status_anterior: statusAnterior,
              p_assinatura_ativa_antes: assinaturaAtivaAntes,
              p_assinatura_ativa_depois: isActive,
              p_resposta_webhook: data,
              p_erro: null,
              p_acao_tomada: acaoTomada,
              p_dias_ate_vencimento: daysUntilExpiration
            }).catch(err => {
              console.error('⚠️ Warning logging verification history:', err);
            });
          }
        }
      }

      const enrichedData = {
        ...data,
        assinatura_ativa: isActive,
        dias_ate_vencimento: daysUntilExpiration,
        requer_acao: !isActive || (daysUntilExpiration !== null && daysUntilExpiration <= 3)
      };

      return new Response(
        JSON.stringify(enrichedData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: 'Timeout na consulta da assinatura',
            details: 'O serviço demorou muito para responder'
          }),
          {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error fetching subscription info:', error);

    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Não foi possível consultar as informações da assinatura no momento'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
