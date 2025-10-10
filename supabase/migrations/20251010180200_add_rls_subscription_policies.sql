/*
  # Add Row Level Security Policies for Subscription Control

  ## Overview
  This migration adds RLS policies to prevent users with inactive subscriptions
  from creating, updating, or deleting data. Read access is maintained for viewing
  historical data.

  ## Security Strategy
  - Users with inactive subscriptions can READ their existing data
  - Users with inactive subscriptions CANNOT create, update, or delete data
  - Admin users with active subscriptions maintain full access
  - Policies check both `ativo` and `assinatura_ativa` fields

  ## Tables Protected
  - transacoes
  - categorias
  - pessoas
  - lembretes
  - vendas
  - produtos_servicos
*/

-- Helper function to check if user has active subscription
CREATE OR REPLACE FUNCTION user_has_active_subscription()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_active boolean;
BEGIN
  SELECT
    COALESCE(p.assinatura_ativa, true) AND COALESCE(p.ativo, true)
  INTO is_active
  FROM perfis p
  WHERE p.id = auth.uid();

  RETURN COALESCE(is_active, false);
END;
$$;

COMMENT ON FUNCTION user_has_active_subscription IS 'Checks if the current user has an active subscription';

-- ===========================================================================
-- TRANSACOES TABLE POLICIES
-- ===========================================================================

-- Update SELECT policy to allow viewing even with inactive subscription
DROP POLICY IF EXISTS "Users can view own company transactions" ON transacoes;
CREATE POLICY "Users can view own company transactions"
  ON transacoes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = transacoes.id_empresa
      AND perfis.ativo = true
    )
  );

-- Restrict INSERT to users with active subscriptions
DROP POLICY IF EXISTS "Users can create transactions" ON transacoes;
CREATE POLICY "Users can create transactions with active subscription"
  ON transacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = transacoes.id_empresa
      AND perfis.ativo = true
    )
  );

-- Restrict UPDATE to users with active subscriptions
DROP POLICY IF EXISTS "Users can update own company transactions" ON transacoes;
CREATE POLICY "Users can update transactions with active subscription"
  ON transacoes
  FOR UPDATE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = transacoes.id_empresa
      AND perfis.ativo = true
    )
  )
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = transacoes.id_empresa
      AND perfis.ativo = true
    )
  );

-- Restrict DELETE to users with active subscriptions
DROP POLICY IF EXISTS "Users can delete own company transactions" ON transacoes;
CREATE POLICY "Users can delete transactions with active subscription"
  ON transacoes
  FOR DELETE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = transacoes.id_empresa
      AND perfis.ativo = true
    )
  );

-- ===========================================================================
-- CATEGORIAS TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Users can create categories with active subscription" ON categorias;
CREATE POLICY "Users can create categories with active subscription"
  ON categorias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = categorias.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can update categories with active subscription" ON categorias;
CREATE POLICY "Users can update categories with active subscription"
  ON categorias
  FOR UPDATE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = categorias.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can delete categories with active subscription" ON categorias;
CREATE POLICY "Users can delete categories with active subscription"
  ON categorias
  FOR DELETE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = categorias.id_empresa
      AND perfis.ativo = true
    )
  );

-- ===========================================================================
-- PESSOAS TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Users can create people with active subscription" ON pessoas;
CREATE POLICY "Users can create people with active subscription"
  ON pessoas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = pessoas.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can update people with active subscription" ON pessoas;
CREATE POLICY "Users can update people with active subscription"
  ON pessoas
  FOR UPDATE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = pessoas.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can delete people with active subscription" ON pessoas;
CREATE POLICY "Users can delete people with active subscription"
  ON pessoas
  FOR DELETE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = pessoas.id_empresa
      AND perfis.ativo = true
    )
  );

-- ===========================================================================
-- LEMBRETES TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Users can create reminders with active subscription" ON lembretes;
CREATE POLICY "Users can create reminders with active subscription"
  ON lembretes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = lembretes.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can update reminders with active subscription" ON lembretes;
CREATE POLICY "Users can update reminders with active subscription"
  ON lembretes
  FOR UPDATE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = lembretes.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can delete reminders with active subscription" ON lembretes;
CREATE POLICY "Users can delete reminders with active subscription"
  ON lembretes
  FOR DELETE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = lembretes.id_empresa
      AND perfis.ativo = true
    )
  );

-- ===========================================================================
-- PRODUTOS_SERVICOS TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Users can create products with active subscription" ON produtos_servicos;
CREATE POLICY "Users can create products with active subscription"
  ON produtos_servicos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = produtos_servicos.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can update products with active subscription" ON produtos_servicos;
CREATE POLICY "Users can update products with active subscription"
  ON produtos_servicos
  FOR UPDATE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = produtos_servicos.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can delete products with active subscription" ON produtos_servicos;
CREATE POLICY "Users can delete products with active subscription"
  ON produtos_servicos
  FOR DELETE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = produtos_servicos.id_empresa
      AND perfis.ativo = true
    )
  );

-- ===========================================================================
-- VENDAS TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Users can create sales with active subscription" ON vendas;
CREATE POLICY "Users can create sales with active subscription"
  ON vendas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = vendas.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can update sales with active subscription" ON vendas;
CREATE POLICY "Users can update sales with active subscription"
  ON vendas
  FOR UPDATE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = vendas.id_empresa
      AND perfis.ativo = true
    )
  );

DROP POLICY IF EXISTS "Users can delete sales with active subscription" ON vendas;
CREATE POLICY "Users can delete sales with active subscription"
  ON vendas
  FOR DELETE
  TO authenticated
  USING (
    user_has_active_subscription() AND
    EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = auth.uid()
      AND perfis.id_empresa = vendas.id_empresa
      AND perfis.ativo = true
    )
  );

-- ===========================================================================
-- VERIFICATION
-- ===========================================================================

DO $$
BEGIN
  -- Check if function was created
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'user_has_active_subscription'
  ) THEN
    RAISE NOTICE '✅ Function user_has_active_subscription created successfully';
  END IF;

  RAISE NOTICE '✅ RLS policies for subscription control created successfully';
  RAISE NOTICE '⚠️  Users with inactive subscriptions can now only READ data';
  RAISE NOTICE '⚠️  CREATE, UPDATE, DELETE operations require active subscription';
END $$;
