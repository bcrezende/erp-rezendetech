/*
  # Update User Creation Function to Handle Plans

  ## Overview
  Updates the handle_new_user() function to properly save plan information
  in both the perfis and empresas tables during user registration.

  ## Changes

  1. Function Update
    - Modified `handle_new_user()` to extract plan from user metadata
    - Saves plan to perfis table (which auto-syncs to empresas via trigger)
    - Defaults to 'basico' if no plan is specified
    - Handles assinatura_ativa and data_assinatura fields

  ## Flow
  User signs up with plan metadata -> handle_new_user() creates perfil with plan ->
  Trigger syncs plan to empresa automatically
*/

-- Drop and recreate the handle_new_user function with plan support
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  empresa_id uuid;
  nome_completo_user text;
  nome_empresa_user text;
  telefone_user text;
  assinatura_id_user text;
  plano_user text;
BEGIN
  -- Log do início da execução
  RAISE LOG 'handle_new_user: Iniciando para usuário %', NEW.email;

  -- Extrair dados dos metadados do usuário
  nome_completo_user := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  nome_empresa_user := COALESCE(
    NEW.raw_user_meta_data->>'nome_empresa',
    NEW.raw_user_meta_data->>'company_name',
    nome_completo_user || ' - Empresa'
  );

  telefone_user := COALESCE(
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'phone'
  );

  assinatura_id_user := COALESCE(
    NEW.raw_user_meta_data->>'assinatura_id',
    NEW.raw_user_meta_data->>'subscription_id'
  );

  -- Extract plan from metadata (default to 'basico' if not specified)
  plano_user := COALESCE(
    NEW.raw_user_meta_data->>'plano',
    NEW.raw_user_meta_data->>'plan',
    'basico'
  );

  -- Log dos dados extraídos
  RAISE LOG 'handle_new_user: Dados extraídos - nome: %, empresa: %, telefone: %, assinatura: %, plano: %',
    nome_completo_user, nome_empresa_user, telefone_user, assinatura_id_user, plano_user;

  -- 1. CRIAR EMPRESA
  BEGIN
    INSERT INTO public.empresas (
      nome,
      email,
      telefone,
      plano,
      assinatura_id,
      ativo
    ) VALUES (
      nome_empresa_user,
      NEW.email,
      telefone_user,
      plano_user,
      assinatura_id_user,
      true
    ) RETURNING id INTO empresa_id;

    RAISE LOG 'handle_new_user: Empresa criada com ID %', empresa_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERRO ao criar empresa - %', SQLERRM;
    RETURN NEW;
  END;

  -- 2. CRIAR PERFIL DO USUÁRIO (com plano)
  BEGIN
    INSERT INTO public.perfis (
      id,
      nome_completo,
      id_empresa,
      papel,
      telefone,
      plano,
      assinatura_ativa,
      data_assinatura,
      ativo
    ) VALUES (
      NEW.id,
      nome_completo_user,
      empresa_id,
      'admin',
      telefone_user,
      plano_user,
      true,
      now(),
      true
    );

    RAISE LOG 'handle_new_user: Perfil criado para usuário % com plano %', NEW.email, plano_user;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERRO ao criar perfil - %', SQLERRM;
    -- Se falhar ao criar perfil, tentar remover a empresa criada
    DELETE FROM public.empresas WHERE id = empresa_id;
    RETURN NEW;
  END;

  RAISE LOG 'handle_new_user: Processo concluído com sucesso para %', NEW.email;
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user: ERRO GERAL - %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger (it was dropped with CASCADE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✅ Function handle_new_user updated with plan support';
  ELSE
    RAISE NOTICE '❌ ERRO: Function handle_new_user not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created recreated successfully';
  ELSE
    RAISE NOTICE '❌ ERRO: Trigger on_auth_user_created not found';
  END IF;
END $$;
