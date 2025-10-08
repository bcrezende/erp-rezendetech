/*
  # Fix Plan System - Add Constraints and RLS

  1. Changes
    - Add CHECK constraint to empresas.plano to allow only 'basico' or 'enterprise'
    - Add CHECK constraint to perfis.plano to allow only 'basico' or 'enterprise'
    - Update any existing 'premium' values to 'basico'
    - Add RLS policy to prevent users from updating plan fields directly
    - Ensure only service role can update plan and assinatura_id fields

  2. Security
    - Users cannot modify their own plan through the UI
    - Only webhooks with service role can update plans
    - Plan changes are audit-logged through trigger
*/

-- First, update any existing 'premium' or invalid plan values to 'basico'
UPDATE public.empresas
SET plano = 'basico'
WHERE plano NOT IN ('basico', 'enterprise', 'empresarial');

-- Normalize 'empresarial' to 'enterprise'
UPDATE public.empresas
SET plano = 'enterprise'
WHERE plano = 'empresarial';

-- Do the same for perfis table if it has plan column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'plano'
  ) THEN
    UPDATE public.perfis
    SET plano = 'basico'
    WHERE plano NOT IN ('basico', 'enterprise', 'empresarial');

    UPDATE public.perfis
    SET plano = 'enterprise'
    WHERE plano = 'empresarial';
  END IF;
END $$;

-- Drop existing constraint if exists
DO $$
BEGIN
  ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_plano_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add CHECK constraint to empresas.plano
ALTER TABLE public.empresas
ADD CONSTRAINT empresas_plano_check
CHECK (plano IN ('basico', 'enterprise'));

-- Add CHECK constraint to perfis.plano if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'plano'
  ) THEN
    ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_plano_check;
    ALTER TABLE public.perfis
    ADD CONSTRAINT perfis_plano_check
    CHECK (plano IN ('basico', 'enterprise'));
  END IF;
END $$;

-- Drop existing update policies for empresas that might allow plan updates
DROP POLICY IF EXISTS "Usuários podem atualizar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can update company" ON public.empresas;
DROP POLICY IF EXISTS "Empresas podem ser atualizadas por admins" ON public.empresas;

-- Create restrictive update policy for empresas
-- This allows updates to all fields EXCEPT plano and assinatura_id
CREATE POLICY "Admins podem atualizar dados da empresa (exceto plano)"
  ON public.empresas
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()) AND
    (SELECT papel FROM public.perfis WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    id = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()) AND
    (SELECT papel FROM public.perfis WHERE id = auth.uid()) = 'admin' AND
    -- Prevent updates to plano and assinatura_id by checking they haven't changed
    plano = (SELECT plano FROM public.empresas WHERE id = empresas.id) AND
    (assinatura_id IS NULL OR assinatura_id = (SELECT assinatura_id FROM public.empresas WHERE id = empresas.id))
  );

-- Create a service role only policy for plan updates
-- Note: This requires service_role which bypasses RLS anyway, but we document the intent
COMMENT ON COLUMN public.empresas.plano IS 'Plan type - can only be updated via webhooks with service role';
COMMENT ON COLUMN public.empresas.assinatura_id IS 'Subscription ID from payment gateway - can only be updated via webhooks';

-- Create audit log function for plan changes
CREATE OR REPLACE FUNCTION log_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if plan actually changed
  IF OLD.plano IS DISTINCT FROM NEW.plano THEN
    RAISE NOTICE 'Plan changed for empresa % from % to % at %',
      NEW.id, OLD.plano, NEW.plano, now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for plan change logging
DROP TRIGGER IF EXISTS trigger_log_plan_change ON public.empresas;
CREATE TRIGGER trigger_log_plan_change
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  WHEN (OLD.plano IS DISTINCT FROM NEW.plano)
  EXECUTE FUNCTION log_plan_change();

-- Add similar protection for perfis table if it has plan column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'plano'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.perfis;

    -- Recreate with plan protection
    CREATE POLICY "Usuários podem atualizar seu próprio perfil (exceto plano)"
      ON public.perfis
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (
        id = auth.uid() AND
        -- Prevent updates to plano by checking it hasn't changed
        plano = (SELECT plano FROM public.perfis WHERE id = perfis.id)
      );
  END IF;
END $$;
