/*
  # Correção completa do sistema de autenticação

  1. Políticas RLS
    - Adiciona política INSERT para empresas
    - Adiciona política INSERT para perfis
    - Garante que usuários autenticados possam criar empresas e perfis

  2. Segurança
    - Mantém RLS habilitado
    - Permite operações necessárias para cadastro
    - Protege dados entre empresas
*/

-- Política para permitir INSERT em empresas
DROP POLICY IF EXISTS "Authenticated users can create companies" ON empresas;
CREATE POLICY "Authenticated users can create companies"
  ON empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir INSERT em perfis
DROP POLICY IF EXISTS "Users can insert own profile" ON perfis;
CREATE POLICY "Users can insert own profile"
  ON perfis
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Garantir que RLS está habilitado
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Política para permitir UPDATE em perfis (caso necessário)
DROP POLICY IF EXISTS "Users can update own profile" ON perfis;
CREATE POLICY "Users can update own profile"
  ON perfis
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política para permitir SELECT em perfis
DROP POLICY IF EXISTS "Users can read own profile" ON perfis;
CREATE POLICY "Users can read own profile"
  ON perfis
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());