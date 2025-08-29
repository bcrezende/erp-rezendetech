/*
  # Adicionar coluna assinatura_id na tabela perfis

  1. Modificações na Tabela
    - `perfis`
      - Adicionar coluna `assinatura_id` (text, nullable)
      - Adicionar índice para consultas por assinatura_id
      - Adicionar comentário explicativo

  2. Funcionalidade
    - Permite armazenar ID da assinatura do sistema de pagamento
    - Facilita integração com n8n e webhooks de pagamento
    - Campo editável manualmente pelos administradores
*/

-- Adicionar coluna assinatura_id na tabela perfis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'assinatura_id'
  ) THEN
    ALTER TABLE perfis ADD COLUMN assinatura_id text;
    
    -- Adicionar comentário explicativo
    COMMENT ON COLUMN perfis.assinatura_id IS 'ID da assinatura no sistema de pagamento - usado para integração com n8n e webhooks';
    
    -- Adicionar índice para consultas por assinatura_id
    CREATE INDEX IF NOT EXISTS idx_perfis_assinatura_id 
    ON perfis(assinatura_id) 
    WHERE assinatura_id IS NOT NULL;
  END IF;
END $$;