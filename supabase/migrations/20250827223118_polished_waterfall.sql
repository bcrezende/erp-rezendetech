/*
  # Sistema Automático de Criação de Perfis e Empresas

  1. Nova Função
    - `handle_new_auth_user()` - Cria automaticamente empresa e perfil quando um usuário é registrado
    - Usa dados do `raw_user_meta_data` se disponíveis
    - Gera nome da empresa baseado no email se não fornecido
    - Define usuário como admin da empresa

  2. Novo Trigger
    - `on_auth_user_created` - Executa após inserção em `auth.users`
    - Chama a função `handle_new_auth_user()`

  3. Verificações
    - Confirma se trigger e função foram criados corretamente
*/

-- Criar função para lidar com novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  empresa_id uuid;
  nome_completo text;
  nome_empresa text;
  email_empresa text;
  telefone_empresa text;
  cnpj_empresa text;
  endereco_empresa text;
  cidade_empresa text;
  estado_empresa text;
  cep_empresa text;
  plano_empresa text;
  assinatura_id_empresa text;
BEGIN
  -- Log do início da função
  RAISE LOG 'handle_new_auth_user: Iniciando para usuário %', NEW.email;

  -- Extrair dados do raw_user_meta_data se disponível
  nome_completo := COALESCE(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'nomeCompleto',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1) -- Fallback: usar parte do email
  );

  nome_empresa := COALESCE(
    NEW.raw_user_meta_data->>'nome_empresa',
    NEW.raw_user_meta_data->>'nomeEmpresa',
    NEW.raw_user_meta_data->>'company_name',
    nome_completo || ' - Empresa' -- Fallback: nome + "Empresa"
  );

  email_empresa := COALESCE(
    NEW.raw_user_meta_data->>'email_empresa',
    NEW.raw_user_meta_data->>'emailEmpresa',
    NEW.email -- Usar email do usuário como fallback
  );

  telefone_empresa := NEW.raw_user_meta_data->>'telefone';
  cnpj_empresa := NEW.raw_user_meta_data->>'cnpj';
  endereco_empresa := NEW.raw_user_meta_data->>'endereco';
  cidade_empresa := NEW.raw_user_meta_data->>'cidade';
  estado_empresa := NEW.raw_user_meta_data->>'estado';
  cep_empresa := NEW.raw_user_meta_data->>'cep';
  plano_empresa := COALESCE(NEW.raw_user_meta_data->>'plano', 'basico');
  assinatura_id_empresa := NEW.raw_user_meta_data->>'assinatura_id';

  -- Log dos dados extraídos
  RAISE LOG 'handle_new_auth_user: Dados extraídos - nome_completo: %, nome_empresa: %', nome_completo, nome_empresa;

  BEGIN
    -- 1. Criar empresa
    INSERT INTO public.empresas (
      nome,
      cnpj,
      email,
      telefone,
      endereco,
      plano,
      assinatura_id,
      ativo
    ) VALUES (
      nome_empresa,
      cnpj_empresa,
      email_empresa,
      telefone_empresa,
      CASE 
        WHEN endereco_empresa IS NOT NULL THEN endereco_empresa
        WHEN cidade_empresa IS NOT NULL AND estado_empresa IS NOT NULL THEN 
          COALESCE(endereco_empresa, '') || 
          CASE WHEN cidade_empresa IS NOT NULL THEN ', ' || cidade_empresa ELSE '' END ||
          CASE WHEN estado_empresa IS NOT NULL THEN ', ' || estado_empresa ELSE '' END ||
          CASE WHEN cep_empresa IS NOT NULL THEN ', CEP: ' || cep_empresa ELSE '' END
        ELSE NULL
      END,
      plano_empresa,
      assinatura_id_empresa,
      true
    ) RETURNING id INTO empresa_id;

    RAISE LOG 'handle_new_auth_user: Empresa criada com ID %', empresa_id;

    -- 2. Criar perfil do usuário
    INSERT INTO public.perfis (
      id,
      nome_completo,
      id_empresa,
      papel,
      telefone,
      ativo
    ) VALUES (
      NEW.id,
      nome_completo,
      empresa_id,
      'admin', -- Primeiro usuário da empresa é sempre admin
      telefone_empresa,
      true
    );

    RAISE LOG 'handle_new_auth_user: Perfil criado para usuário %', NEW.email;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro mas não falha a criação do usuário
      RAISE LOG 'handle_new_auth_user: Erro ao criar empresa/perfil para %: %', NEW.email, SQLERRM;
      -- Não re-raise o erro para não impedir a criação do usuário
  END;

  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando um usuário for criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Verificações finais
DO $$
BEGIN
  -- Verificar se a função foi criada
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_auth_user' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE 'Função handle_new_auth_user criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Erro: Função handle_new_auth_user não foi criada!';
  END IF;

  -- Verificar se o trigger foi criado
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created criado com sucesso!';
  ELSE
    RAISE EXCEPTION 'Erro: Trigger on_auth_user_created não foi criado!';
  END IF;

  RAISE NOTICE 'Sistema de criação automática de perfis e empresas configurado com sucesso!';
  RAISE NOTICE 'Agora você pode excluir e recriar o usuário para testar o sistema.';
END $$;