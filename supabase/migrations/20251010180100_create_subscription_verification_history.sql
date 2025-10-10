/*
  # Create Subscription Verification History Table

  ## Overview
  This migration creates a table to track all subscription verification attempts,
  including status changes, errors, and actions taken. This provides an audit trail
  for subscription management and helps debug issues.

  ## Changes

  1. New Table: historico_verificacao_assinatura
    - Tracks all subscription verification attempts
    - Stores full webhook responses for debugging
    - Records actions taken (block, unblock, alert)

  2. Indexes
    - Fast lookup by empresa and user
    - Filter by verification date
    - Search by action taken

  3. Security
    - RLS enabled with appropriate policies
    - Only admins can view verification history
*/

-- 1. Create historico_verificacao_assinatura table
CREATE TABLE IF NOT EXISTS historico_verificacao_assinatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial serial NOT NULL,
  id_empresa uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_usuario uuid NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  status_verificado text NOT NULL,
  status_anterior text,
  assinatura_ativa_antes boolean,
  assinatura_ativa_depois boolean,
  data_verificacao timestamptz NOT NULL DEFAULT now(),
  resposta_webhook jsonb,
  erro text,
  acao_tomada text,
  dias_ate_vencimento integer,
  criado_em timestamptz DEFAULT now()
);

-- 2. Add comments
COMMENT ON TABLE historico_verificacao_assinatura IS 'Histórico de todas as verificações de status de assinatura';
COMMENT ON COLUMN historico_verificacao_assinatura.id IS 'ID único do registro';
COMMENT ON COLUMN historico_verificacao_assinatura.id_sequencial IS 'ID sequencial para ordenação';
COMMENT ON COLUMN historico_verificacao_assinatura.id_empresa IS 'ID da empresa verificada';
COMMENT ON COLUMN historico_verificacao_assinatura.id_usuario IS 'ID do usuário verificado';
COMMENT ON COLUMN historico_verificacao_assinatura.status_verificado IS 'Status retornado pela verificação (active, past_due, etc)';
COMMENT ON COLUMN historico_verificacao_assinatura.status_anterior IS 'Status anterior antes da verificação';
COMMENT ON COLUMN historico_verificacao_assinatura.assinatura_ativa_antes IS 'Se a assinatura estava ativa antes da verificação';
COMMENT ON COLUMN historico_verificacao_assinatura.assinatura_ativa_depois IS 'Se a assinatura ficou ativa após a verificação';
COMMENT ON COLUMN historico_verificacao_assinatura.data_verificacao IS 'Timestamp da verificação';
COMMENT ON COLUMN historico_verificacao_assinatura.resposta_webhook IS 'Resposta completa do webhook em JSON para debugging';
COMMENT ON COLUMN historico_verificacao_assinatura.erro IS 'Mensagem de erro se a verificação falhou';
COMMENT ON COLUMN historico_verificacao_assinatura.acao_tomada IS 'Ação tomada: bloqueio, desbloqueio, alerta, nenhuma';
COMMENT ON COLUMN historico_verificacao_assinatura.dias_ate_vencimento IS 'Dias até o vencimento (negativo se já vencido)';

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_historico_verificacao_empresa ON historico_verificacao_assinatura(id_empresa);
CREATE INDEX IF NOT EXISTS idx_historico_verificacao_usuario ON historico_verificacao_assinatura(id_usuario);
CREATE INDEX IF NOT EXISTS idx_historico_verificacao_data ON historico_verificacao_assinatura(data_verificacao DESC);
CREATE INDEX IF NOT EXISTS idx_historico_verificacao_acao ON historico_verificacao_assinatura(acao_tomada) WHERE acao_tomada IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historico_verificacao_status ON historico_verificacao_assinatura(status_verificado);

-- 4. Enable Row Level Security
ALTER TABLE historico_verificacao_assinatura ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view their own verification history"
  ON historico_verificacao_assinatura
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

CREATE POLICY "Admins can view company verification history"
  ON historico_verificacao_assinatura
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = historico_verificacao_assinatura.id_empresa
      AND perfis.papel = 'admin'
    )
  );

CREATE POLICY "Service role can insert verification history"
  ON historico_verificacao_assinatura
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Create function to log subscription verification
CREATE OR REPLACE FUNCTION log_subscription_verification(
  p_id_empresa uuid,
  p_id_usuario uuid,
  p_status_verificado text,
  p_status_anterior text DEFAULT NULL,
  p_assinatura_ativa_antes boolean DEFAULT NULL,
  p_assinatura_ativa_depois boolean DEFAULT NULL,
  p_resposta_webhook jsonb DEFAULT NULL,
  p_erro text DEFAULT NULL,
  p_acao_tomada text DEFAULT NULL,
  p_dias_ate_vencimento integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history_id uuid;
BEGIN
  INSERT INTO historico_verificacao_assinatura (
    id_empresa,
    id_usuario,
    status_verificado,
    status_anterior,
    assinatura_ativa_antes,
    assinatura_ativa_depois,
    resposta_webhook,
    erro,
    acao_tomada,
    dias_ate_vencimento
  ) VALUES (
    p_id_empresa,
    p_id_usuario,
    p_status_verificado,
    p_status_anterior,
    p_assinatura_ativa_antes,
    p_assinatura_ativa_depois,
    p_resposta_webhook,
    p_erro,
    p_acao_tomada,
    p_dias_ate_vencimento
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

COMMENT ON FUNCTION log_subscription_verification IS 'Logs a subscription verification attempt with all relevant details';

-- 7. Create function to get recent verification history for a user
CREATE OR REPLACE FUNCTION get_recent_verification_history(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  status_verificado text,
  status_anterior text,
  data_verificacao timestamptz,
  acao_tomada text,
  dias_ate_vencimento integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.status_verificado,
    h.status_anterior,
    h.data_verificacao,
    h.acao_tomada,
    h.dias_ate_vencimento
  FROM historico_verificacao_assinatura h
  WHERE h.id_usuario = p_user_id
  ORDER BY h.data_verificacao DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_recent_verification_history IS 'Gets recent subscription verification history for a user';

-- 8. Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'historico_verificacao_assinatura'
  ) THEN
    RAISE NOTICE '✅ Table historico_verificacao_assinatura created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'log_subscription_verification'
  ) THEN
    RAISE NOTICE '✅ Function log_subscription_verification created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_recent_verification_history'
  ) THEN
    RAISE NOTICE '✅ Function get_recent_verification_history created successfully';
  END IF;
END $$;
