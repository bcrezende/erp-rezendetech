/*
  # Função RPC para criar empresa e vincular perfil

  1. Nova Função
    - `create_empresa_and_link_profile` - Cria empresa e vincula ao perfil do usuário
  
  2. Funcionalidades
    - Cria empresa na tabela `empresas`
    - Vincula empresa ao perfil do usuário na tabela `perfis`
    - Retorna o ID da empresa criada
    - Trata erros e faz rollback se necessário
*/

CREATE OR REPLACE FUNCTION create_empresa_and_link_profile(
  p_user_id uuid,
  p_nome text,
  p_cnpj text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_endereco text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_plano text DEFAULT 'basico'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Verificar se o usuário já tem uma empresa vinculada
  IF EXISTS (SELECT 1 FROM perfis WHERE id = p_user_id AND id_empresa IS NOT NULL) THEN
    RAISE EXCEPTION 'Usuário já possui uma empresa vinculada';
  END IF;

  -- Criar a empresa
  INSERT INTO empresas (
    nome,
    cnpj,
    email,
    telefone,
    endereco,
    cidade,
    estado,
    cep,
    plano,
    ativo
  ) VALUES (
    p_nome,
    p_cnpj,
    p_email,
    p_telefone,
    p_endereco,
    p_cidade,
    p_estado,
    p_cep,
    p_plano,
    true
  ) RETURNING id INTO v_empresa_id;

  -- Vincular empresa ao perfil do usuário
  UPDATE perfis 
  SET id_empresa = v_empresa_id,
      atualizado_em = now()
  WHERE id = p_user_id;

  -- Verificar se a vinculação foi bem-sucedida
  IF NOT FOUND THEN
    -- Se não conseguiu vincular, deletar a empresa criada
    DELETE FROM empresas WHERE id = v_empresa_id;
    RAISE EXCEPTION 'Erro ao vincular empresa ao perfil do usuário';
  END IF;

  -- Retornar o ID da empresa criada
  RETURN v_empresa_id;
END;
$$;