import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { assinatura_id } = await req.json()

    if (!assinatura_id) {
      return new Response(
        JSON.stringify({ error: 'assinatura_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Make request to N8N service with timeout and better error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const credentials = btoa('rezendetech:123123')
      const response = await fetch('https://n8n.rezendetech.com.br/webhook/assinatura/info', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assinatura_id: assinatura_id
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

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
        )
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
        )
      }

      const data = await response.json()

      return new Response(
        JSON.stringify(data),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
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
        )
      }

      throw fetchError
    }

  } catch (error) {
    console.error('Error fetching subscription info:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: 'Não foi possível consultar as informações da assinatura no momento'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})