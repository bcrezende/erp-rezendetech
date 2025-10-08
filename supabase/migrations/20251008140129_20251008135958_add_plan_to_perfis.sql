/*
  # Add Plan Management to User Profiles

  ## Overview
  This migration reorganizes the subscription plan flow to store plan information
  in the perfis (profiles) table first, which then propagates to the empresas table.

  ## Changes

  1. New Columns in perfis Table
    - `plano` (text) - User's subscription plan (basico, premium, enterprise)
    - `assinatura_ativa` (boolean) - Whether the subscription is active
    - `data_assinatura` (timestamptz) - When the subscription started

  2. Synchronization Function
    - `sync_plan_from_perfil_to_empresa()` - Syncs plan from profile to company
    - Automatically updates company plan when user plan changes

  3. Trigger
    - `on_perfil_plan_updated` - Executes sync function when perfil.plano changes

  4. Indexes
    - Index on perfis.plano for performance
    - Index on perfis.assinatura_ativa for filtering active subscriptions

  ## Flow
  Webhook updates perfis.plano -> Trigger fires -> Empresa inherits the plan
*/

-- 1. Add new columns to perfis table
DO $$
BEGIN
  -- Add plano column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'plano'
  ) THEN
    ALTER TABLE perfis ADD COLUMN plano text DEFAULT 'basico' CHECK (plano IN ('basico', 'premium', 'enterprise'));
    COMMENT ON COLUMN perfis.plano IS 'Plano de assinatura do usuário (basico, premium, enterprise)';
  END IF;

  -- Add assinatura_ativa column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'assinatura_ativa'
  ) THEN
    ALTER TABLE perfis ADD COLUMN assinatura_ativa boolean DEFAULT true;
    COMMENT ON COLUMN perfis.assinatura_ativa IS 'Indica se a assinatura do usuário está ativa';
  END IF;

  -- Add data_assinatura column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'data_assinatura'
  ) THEN
    ALTER TABLE perfis ADD COLUMN data_assinatura timestamptz DEFAULT now();
    COMMENT ON COLUMN perfis.data_assinatura IS 'Data de início da assinatura';
  END IF;
END $$;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_perfis_plano ON perfis(plano);
CREATE INDEX IF NOT EXISTS idx_perfis_assinatura_ativa ON perfis(assinatura_ativa) WHERE assinatura_ativa = true;

-- 3. Backfill existing perfis with plan from their empresas
UPDATE perfis p
SET plano = e.plano
FROM empresas e
WHERE p.id_empresa = e.id
  AND p.plano IS NULL OR p.plano = 'basico';

-- 4. Create function to sync plan from perfis to empresas
CREATE OR REPLACE FUNCTION sync_plan_from_perfil_to_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if plan actually changed (skip if UPDATE but plan didn't change)
  IF TG_OP = 'UPDATE' AND OLD.plano IS NOT DISTINCT FROM NEW.plano THEN
    RETURN NEW;
  END IF;

  -- Only sync if this is the admin user (the one who owns the company)
  IF NEW.papel = 'admin' THEN
    UPDATE empresas
    SET
      plano = NEW.plano,
      atualizado_em = now()
    WHERE id = NEW.id_empresa;

    RAISE LOG 'sync_plan_from_perfil_to_empresa: Updated empresa % with plan %', NEW.id_empresa, NEW.plano;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Create trigger to auto-sync plan changes
DROP TRIGGER IF EXISTS on_perfil_plan_updated ON perfis;
CREATE TRIGGER on_perfil_plan_updated
  AFTER INSERT OR UPDATE OF plano ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION sync_plan_from_perfil_to_empresa();

-- 6. Create function to get user's active plan
CREATE OR REPLACE FUNCTION get_user_plan(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plano text;
BEGIN
  SELECT plano INTO user_plano
  FROM perfis
  WHERE id = user_id
    AND ativo = true
    AND assinatura_ativa = true;

  RETURN COALESCE(user_plano, 'basico');
END;
$$;

-- 7. Create function to check if user has plan access
CREATE OR REPLACE FUNCTION user_has_plan_access(user_id uuid, required_plan text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plano text;
  plan_level integer;
  required_level integer;
BEGIN
  -- Get user's plan
  user_plano := get_user_plan(user_id);

  -- Define plan levels
  plan_level := CASE user_plano
    WHEN 'basico' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'enterprise' THEN 3
    ELSE 0
  END;

  required_level := CASE required_plan
    WHEN 'basico' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'enterprise' THEN 3
    ELSE 0
  END;

  -- User has access if their plan level is >= required level
  RETURN plan_level >= required_level;
END;
$$;

-- 8. Verification
DO $$
BEGIN
  -- Check if columns were added
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'plano'
  ) THEN
    RAISE NOTICE '✅ Column perfis.plano added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'assinatura_ativa'
  ) THEN
    RAISE NOTICE '✅ Column perfis.assinatura_ativa added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'data_assinatura'
  ) THEN
    RAISE NOTICE '✅ Column perfis.data_assinatura added successfully';
  END IF;

  -- Check if trigger was created
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_perfil_plan_updated'
  ) THEN
    RAISE NOTICE '✅ Trigger on_perfil_plan_updated created successfully';
  END IF;

  -- Check if functions were created
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'sync_plan_from_perfil_to_empresa'
  ) THEN
    RAISE NOTICE '✅ Function sync_plan_from_perfil_to_empresa created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_user_plan'
  ) THEN
    RAISE NOTICE '✅ Function get_user_plan created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'user_has_plan_access'
  ) THEN
    RAISE NOTICE '✅ Function user_has_plan_access created successfully';
  END IF;
END $$;
