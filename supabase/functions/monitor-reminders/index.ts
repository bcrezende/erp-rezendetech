import { createClient } from 'npm:@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    console.log('🔍 Monitoring reminders for notifications...');

    // Obter data e hora atuais
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    // Calcular tempo limite (próximos 15 minutos)
    const futureTime = new Date(now.getTime() + 15 * 60 * 1000);
    const futureTimeStr = futureTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    console.log(`⏰ Current time: ${currentTime}, checking until: ${futureTimeStr}`);

    // Buscar lembretes pendentes que precisam de notificação
    const { data: lembretes, error: lembretesError } = await supabaseAdmin
      .from('lembretes')
      .select(`
        id,
        id_empresa,
        titulo,
        descricao,
        data_lembrete,
        hora_lembrete,
        perfis!inner(id, nome_completo)
      `)
      .eq('status', 'pendente')
      .eq('ativo', true)
      .or(`data_lembrete.eq.${currentDate},data_lembrete.eq.${futureTime.toISOString().split('T')[0]}`);

    if (lembretesError) {
      console.error('❌ Error fetching reminders:', lembretesError);
      throw lembretesError;
    }

    console.log(`📋 Found ${lembretes?.length || 0} pending reminders`);

    let notificationsCreated = 0;

    for (const lembrete of lembretes || []) {
      try {
        // Verificar se já existe notificação para este lembrete
        const { data: existingNotification, error: checkError } = await supabaseAdmin
          .from('notificacoes')
          .select('id')
          .eq('id_lembrete', lembrete.id)
          .eq('tipo', 'lembrete')
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.warn(`⚠️ Error checking existing notification for reminder ${lembrete.id}:`, checkError);
          continue;
        }

        if (existingNotification) {
          console.log(`⏭️ Notification already exists for reminder ${lembrete.id}`);
          continue;
        }

        // Verificar se o lembrete deve gerar notificação
        let shouldNotify = false;
        let timeUntilReminder = '';

        if (lembrete.data_lembrete === currentDate) {
          if (lembrete.hora_lembrete) {
            // Lembrete com horário específico
            const reminderDateTime = new Date(`${lembrete.data_lembrete}T${lembrete.hora_lembrete}:00`);
            const timeDiff = reminderDateTime.getTime() - now.getTime();
            const minutesUntil = Math.floor(timeDiff / (1000 * 60));

            if (minutesUntil >= 0 && minutesUntil <= 15) {
              shouldNotify = true;
              timeUntilReminder = minutesUntil === 0 ? 'agora' : `em ${minutesUntil} minuto(s)`;
            }
          } else {
            // Lembrete apenas com data (notificar no início do dia)
            const startOfDay = new Date(`${currentDate}T00:00:00`);
            const timeDiff = now.getTime() - startOfDay.getTime();
            const hoursFromStart = timeDiff / (1000 * 60 * 60);

            // Notificar se ainda não passou muito tempo do início do dia (primeiras 2 horas)
            if (hoursFromStart <= 2) {
              shouldNotify = true;
              timeUntilReminder = 'hoje';
            }
          }
        }

        if (shouldNotify) {
          // Criar mensagem da notificação
          const mensagem = lembrete.hora_lembrete 
            ? `🔔 Lembrete: "${lembrete.titulo}" está programado para ${timeUntilReminder}`
            : `🔔 Lembrete para hoje: "${lembrete.titulo}"`;

          // Criar notificação
          const { error: notificationError } = await supabaseAdmin
            .from('notificacoes')
            .insert({
              id_empresa: lembrete.id_empresa,
              id_usuario: (lembrete as any).perfis.id,
              mensagem,
              tipo: 'lembrete',
              id_lembrete: lembrete.id,
              lida: false
            });

          if (notificationError) {
            console.error(`❌ Error creating notification for reminder ${lembrete.id}:`, notificationError);
            continue;
          }

          console.log(`✅ Notification created for reminder: ${lembrete.titulo}`);
          notificationsCreated++;
        }
      } catch (error) {
        console.error(`❌ Error processing reminder ${lembrete.id}:`, error);
        continue;
      }
    }

    console.log(`🎯 Monitoring completed. Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          lembretes_verificados: lembretes?.length || 0,
          notificacoes_criadas: notificationsCreated,
          timestamp: now.toISOString()
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
    console.error('❌ Error in monitor-reminders function:', error);
    
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