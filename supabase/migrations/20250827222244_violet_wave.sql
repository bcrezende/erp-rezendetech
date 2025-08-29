/*
  # Sistema Automático de Criação de Perfis e Empresas

  1. Função para Criação Automática
    - `handle_new_auth_user()` - Função que cria empresa e perfil automaticamente
    - Executa quando um novo usuário é criado no auth.users
    - Cria empresa com nome baseado no email do usuário
    - Cria perfil vinculado à empresa

  2. Trigger de Criação
    - `on_auth_user_created` - Trigger que executa após inserção em auth.users
    - Chama a função handle_new_auth_user automaticamente

  3. Segurança
    - Função com SECURITY DEFINER para ter permissões adequadas
    - Tratamento de erros para evitar falhas na criação de usuários
*/

-- Criar função para lidar com novos usuários
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  empresa_id UUID;
  empresa_nome TEXT;
BEGIN
  -- Gerar nome da empresa baseado no email
  empresa_nome := COALESCE(
    NEW.raw_user_meta_data->>'nome_empresa',
    'Empresa de ' || SPLIT_PART(NEW.email, '@', 1)
  );

  -- Criar empresa
  INSERT INTO public.empresas (
    nome,
    email,
    telefone,
    endereco,
    cnpj,
    plano,
    assinatura_id
  ) VALUES (
    empresa_nome,
    COALESCE(NEW.raw_user_meta_data->>'email_empresa', NEW.email),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'endereco',
    NEW.raw_user_meta_data->>'cnpj',
    COALESCE(NEW.raw_user_meta_data->>'plano', 'basico'),
    NEW.raw_user_meta_data->>'assinatura_id'
  ) RETURNING id INTO empresa_id;

  -- Criar perfil do usuário
  INSERT INTO public.perfis (
    id,
    nome_completo,
    id_empresa,
    papel,
    telefone
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', SPLIT_PART(NEW.email, '@', 1)),
    empresa_id,
    'admin',
    NEW.raw_user_meta_data->>'telefone'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro (será visível nos logs do Supabase)
    RAISE LOG 'Erro ao criar perfil e empresa para usuário %: %', NEW.email, SQLERRM;
    -- Não falhar a criação do usuário mesmo se houver erro
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função quando um usuário for criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Verificar se o trigger foi criado corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created criado com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao criar trigger on_auth_user_created';
  END IF;
END $$;

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_auth_user'
  ) THEN
    RAISE NOTICE 'Função handle_new_auth_user criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao criar função handle_new_auth_user';
  END IF;
END $$;