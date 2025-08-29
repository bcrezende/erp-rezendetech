/*
  # Corrigir Sistema Automático de Criação de Perfis e Empresas

  1. Verificações e Limpeza
    - Remove trigger e função existentes se houver
    - Verifica permissões necessárias

  2. Nova Função Robusta
    - `handle_new_user()` com tratamento de erros melhorado
    - Logs detalhados para debug
    - Fallbacks para dados ausentes

  3. Trigger Atualizado
    - Trigger `on_auth_user_created` na tabela `auth.users`
    - Execução após INSERT

  4. Função de Teste
    - `create_profile_for_existing_user()` para usuários já existentes
    - Permite corrigir usuários que não tiveram perfil criado

  5. Verificações Finais
    - Confirma criação do trigger e função
    - Testa com usuário existente
*/

-- 1. LIMPEZA: Remover trigger e função existentes se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_auth_user();
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. CRIAR FUNÇÃO ROBUSTA PARA CRIAÇÃO AUTOMÁTICA
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
    -- Se falhar ao criar empresa, não podemos continuar
    RETURN NEW;
  END;

  -- 2. CRIAR PERFIL DO USUÁRIO
  BEGIN
    INSERT INTO public.perfis (
      id,
      nome_completo,
      id_empresa,
      papel,
      telefone,
      ativo
    ) VALUES (
      NEW.id,
      nome_completo_user,
      empresa_id,
      'admin',
      telefone_user,
      true
    );

    RAISE LOG 'handle_new_user: Perfil criado para usuário %', NEW.email;

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

-- 3. CRIAR TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. FUNÇÃO PARA CORRIGIR USUÁRIOS EXISTENTES
CREATE OR REPLACE FUNCTION create_profile_for_existing_user(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record record;
  empresa_id uuid;
  result json;
BEGIN
  -- Buscar usuário pelo email
  SELECT * INTO user_record
  FROM auth.users
  WHERE email = user_email;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Verificar se já tem perfil
  IF EXISTS (SELECT 1 FROM public.perfis WHERE id = user_record.id) THEN
    RETURN json_build_object('success', false, 'error', 'Usuário já possui perfil');
  END IF;

  -- Criar empresa
  INSERT INTO public.empresas (
    nome,
    email,
    plano,
    ativo
  ) VALUES (
    split_part(user_email, '@', 1) || ' - Empresa',
    user_email,
    'basico',
    true
  ) RETURNING id INTO empresa_id;

  -- Criar perfil
  INSERT INTO public.perfis (
    id,
    nome_completo,
    id_empresa,
    papel,
    ativo
  ) VALUES (
    user_record.id,
    split_part(user_email, '@', 1),
    empresa_id,
    'admin',
    true
  );

  RETURN json_build_object(
    'success', true, 
    'empresa_id', empresa_id,
    'user_id', user_record.id,
    'message', 'Perfil e empresa criados com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. VERIFICAÇÕES FINAIS
DO $$
BEGIN
  -- Verificar se o trigger foi criado
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created criado com sucesso!';
  ELSE
    RAISE NOTICE 'ERRO: Trigger on_auth_user_created NÃO foi criado!';
  END IF;

  -- Verificar se a função foi criada
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'Função handle_new_user criada com sucesso!';
  ELSE
    RAISE NOTICE 'ERRO: Função handle_new_user NÃO foi criada!';
  END IF;

  -- Verificar se a função de correção foi criada
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_profile_for_existing_user'
  ) THEN
    RAISE NOTICE 'Função create_profile_for_existing_user criada com sucesso!';
  ELSE
    RAISE NOTICE 'ERRO: Função create_profile_for_existing_user NÃO foi criada!';
  END IF;
END $$;

-- 6. CORRIGIR O USUÁRIO EXISTENTE IMEDIATAMENTE
SELECT create_profile_for_existing_user('bcrezende19@hotmail.com') as resultado;