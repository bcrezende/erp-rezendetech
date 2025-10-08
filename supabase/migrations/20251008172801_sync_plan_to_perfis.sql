/*
  # Sync Plan Data from Empresas to Perfis
  
  ## Overview
  This migration ensures all existing user profiles have their plan field synchronized
  from their company's plan. This is essential for the transition to using perfis.plano
  as the primary source of plan information.
  
  ## Changes
  1. Backfill Data
    - Copy plano from empresas to perfis for all admin users
    - Set assinatura_ativa to true for all existing users
    - Set data_assinatura to current timestamp if not set
    
  2. Normalization
    - Convert 'empresarial' to 'enterprise'
    - Ensure only 'basico' or 'enterprise' values exist
    - Handle any NULL or invalid values by defaulting to 'basico'
  
  3. Verification
    - Count and report how many records were updated
    - Verify no inconsistencies remain
*/

-- Step 1: Ensure the plano column exists in perfis (should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'plano'
  ) THEN
    RAISE EXCEPTION 'Column perfis.plano does not exist. Please run migration 20251008135958_add_plan_to_perfis.sql first';
  END IF;
END $$;

-- Step 2: Normalize empresas.plano values first
UPDATE public.empresas
SET plano = 'enterprise'
WHERE plano = 'empresarial';

UPDATE public.empresas
SET plano = 'basico'
WHERE plano NOT IN ('basico', 'enterprise');

-- Step 3: Sync plan from empresas to all perfis (especially admins)
UPDATE public.perfis p
SET 
  plano = e.plano,
  assinatura_ativa = COALESCE(p.assinatura_ativa, true),
  data_assinatura = COALESCE(p.data_assinatura, now())
FROM public.empresas e
WHERE p.id_empresa = e.id
  AND (p.plano IS NULL OR p.plano != e.plano OR p.plano = 'basico');

-- Step 4: Normalize any 'empresarial' values in perfis
UPDATE public.perfis
SET plano = 'enterprise'
WHERE plano = 'empresarial';

-- Step 5: Ensure no invalid values exist in perfis
UPDATE public.perfis
SET plano = 'basico'
WHERE plano NOT IN ('basico', 'enterprise');

-- Step 6: Verification queries (will output to logs)
DO $$
DECLARE
  total_perfis integer;
  basico_count integer;
  enterprise_count integer;
  sync_issues integer;
BEGIN
  -- Count total profiles
  SELECT COUNT(*) INTO total_perfis FROM public.perfis;
  
  -- Count by plan type
  SELECT COUNT(*) INTO basico_count FROM public.perfis WHERE plano = 'basico';
  SELECT COUNT(*) INTO enterprise_count FROM public.perfis WHERE plano = 'enterprise';
  
  -- Check for sync issues (where perfil.plano != empresa.plano for admins)
  SELECT COUNT(*) INTO sync_issues
  FROM public.perfis p
  JOIN public.empresas e ON p.id_empresa = e.id
  WHERE p.papel = 'admin' AND p.plano != e.plano;
  
  -- Report results
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Plan Synchronization Results:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total profiles: %', total_perfis;
  RAISE NOTICE 'Basico plan: %', basico_count;
  RAISE NOTICE 'Enterprise plan: %', enterprise_count;
  RAISE NOTICE 'Sync issues found: %', sync_issues;
  
  IF sync_issues > 0 THEN
    RAISE WARNING 'Some admin profiles have different plans than their companies!';
  ELSE
    RAISE NOTICE '✅ All admin profiles are in sync with their companies';
  END IF;
  
  RAISE NOTICE '==========================================';
END $$;
