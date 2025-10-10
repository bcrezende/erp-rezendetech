/*
  # Add Subscription Status Tracking Fields

  ## Overview
  This migration adds detailed subscription status tracking fields to the perfis table
  to enable proper subscription expiration control and monitoring.

  ## Changes

  1. New Columns in perfis Table
    - `status_assinatura` (text) - Detailed Stripe subscription status
    - `proxima_data_pagamento` (date) - Next payment due date for alerts
    - `ultima_verificacao_assinatura` (timestamptz) - Last subscription check timestamp
    - `data_vencimento_assinatura` (date) - When subscription expired (if applicable)
    - `assinatura_id` (text) - Stripe subscription ID for API calls

  2. Indexes
    - Index on assinatura_id for fast lookups
    - Index on status_assinatura for filtering
    - Index on proxima_data_pagamento for expiration alerts

  3. Constraints
    - Valid Stripe status values constraint

  ## Status Mapping to assinatura_ativa
  - 'active' → true
  - 'trialing' → true
  - 'past_due' → false (payment overdue)
  - 'canceled' → false
  - 'unpaid' → false
  - 'incomplete' → false
  - 'incomplete_expired' → false
*/

-- 1. Add new subscription tracking columns to perfis table
DO $$
BEGIN
  -- Add status_assinatura column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'status_assinatura'
  ) THEN
    ALTER TABLE perfis ADD COLUMN status_assinatura text;
    COMMENT ON COLUMN perfis.status_assinatura IS 'Status detalhado da assinatura no Stripe (active, past_due, canceled, etc)';
  END IF;

  -- Add proxima_data_pagamento column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'proxima_data_pagamento'
  ) THEN
    ALTER TABLE perfis ADD COLUMN proxima_data_pagamento date;
    COMMENT ON COLUMN perfis.proxima_data_pagamento IS 'Próxima data de vencimento do pagamento';
  END IF;

  -- Add ultima_verificacao_assinatura column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'ultima_verificacao_assinatura'
  ) THEN
    ALTER TABLE perfis ADD COLUMN ultima_verificacao_assinatura timestamptz;
    COMMENT ON COLUMN perfis.ultima_verificacao_assinatura IS 'Timestamp da última verificação do status da assinatura';
  END IF;

  -- Add data_vencimento_assinatura column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'data_vencimento_assinatura'
  ) THEN
    ALTER TABLE perfis ADD COLUMN data_vencimento_assinatura date;
    COMMENT ON COLUMN perfis.data_vencimento_assinatura IS 'Data em que a assinatura venceu (se aplicável)';
  END IF;

  -- Add assinatura_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'assinatura_id'
  ) THEN
    ALTER TABLE perfis ADD COLUMN assinatura_id text;
    COMMENT ON COLUMN perfis.assinatura_id IS 'ID da assinatura no Stripe';
  END IF;
END $$;

-- 2. Add constraint for valid Stripe status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'perfis_status_assinatura_check'
  ) THEN
    ALTER TABLE perfis ADD CONSTRAINT perfis_status_assinatura_check
    CHECK (status_assinatura IS NULL OR status_assinatura IN (
      'active', 'trialing', 'past_due', 'canceled', 'unpaid',
      'incomplete', 'incomplete_expired'
    ));
  END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_perfis_assinatura_id ON perfis(assinatura_id) WHERE assinatura_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perfis_status_assinatura ON perfis(status_assinatura) WHERE status_assinatura IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perfis_proxima_data_pagamento ON perfis(proxima_data_pagamento) WHERE proxima_data_pagamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perfis_subscription_check ON perfis(ultima_verificacao_assinatura);

-- 4. Create function to map Stripe status to assinatura_ativa
CREATE OR REPLACE FUNCTION map_stripe_status_to_active(stripe_status text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN stripe_status IN ('active', 'trialing');
END;
$$;

COMMENT ON FUNCTION map_stripe_status_to_active IS 'Maps Stripe subscription status to boolean active flag';

-- 5. Create function to check if subscription needs verification
CREATE OR REPLACE FUNCTION subscription_needs_verification(perfil_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_check timestamptz;
BEGIN
  SELECT ultima_verificacao_assinatura INTO last_check
  FROM perfis
  WHERE id = perfil_id;

  -- Need verification if never checked or last check was more than 24 hours ago
  RETURN last_check IS NULL OR last_check < (now() - interval '24 hours');
END;
$$;

COMMENT ON FUNCTION subscription_needs_verification IS 'Checks if a subscription status needs to be re-verified (24h interval)';

-- 6. Create function to get days until subscription expiration
CREATE OR REPLACE FUNCTION days_until_expiration(perfil_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_payment_date date;
  days_remaining integer;
BEGIN
  SELECT proxima_data_pagamento INTO next_payment_date
  FROM perfis
  WHERE id = perfil_id;

  IF next_payment_date IS NULL THEN
    RETURN NULL;
  END IF;

  days_remaining := next_payment_date - CURRENT_DATE;
  RETURN days_remaining;
END;
$$;

COMMENT ON FUNCTION days_until_expiration IS 'Returns number of days until subscription payment is due (negative if overdue)';

-- 7. Backfill assinatura_id from empresas to perfis (for existing data)
UPDATE perfis p
SET assinatura_id = e.assinatura_id
FROM empresas e
WHERE p.id_empresa = e.id
  AND e.assinatura_id IS NOT NULL
  AND p.assinatura_id IS NULL;

-- 8. Verification
DO $$
BEGIN
  -- Check if columns were added
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'status_assinatura'
  ) THEN
    RAISE NOTICE '✅ Column perfis.status_assinatura added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'proxima_data_pagamento'
  ) THEN
    RAISE NOTICE '✅ Column perfis.proxima_data_pagamento added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'ultima_verificacao_assinatura'
  ) THEN
    RAISE NOTICE '✅ Column perfis.ultima_verificacao_assinatura added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'data_vencimento_assinatura'
  ) THEN
    RAISE NOTICE '✅ Column perfis.data_vencimento_assinatura added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'assinatura_id'
  ) THEN
    RAISE NOTICE '✅ Column perfis.assinatura_id added successfully';
  END IF;

  -- Check if functions were created
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'map_stripe_status_to_active'
  ) THEN
    RAISE NOTICE '✅ Function map_stripe_status_to_active created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'subscription_needs_verification'
  ) THEN
    RAISE NOTICE '✅ Function subscription_needs_verification created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'days_until_expiration'
  ) THEN
    RAISE NOTICE '✅ Function days_until_expiration created successfully';
  END IF;
END $$;
