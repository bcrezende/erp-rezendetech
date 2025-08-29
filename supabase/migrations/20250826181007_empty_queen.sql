/*
  # Adicionar suporte a categorias pessoais

  1. Mudanças na Estrutura
    - Adiciona coluna id_usuario à tabela categorias
    - Permite que categorias sejam vinculadas a usuários específicos
    - Mantém compatibilidade com categorias da empresa (id_usuario = null)

  2. Políticas de Segurança
    - Usuários podem ver categorias da empresa E suas categorias pessoais
    - Usuários podem criar categorias pessoais ou da empresa
    - Usuários podem editar apenas suas categorias pessoais ou categorias da empresa

  3. Índices
    - Adiciona índice para melhorar performance de consultas por usuário
*/

-- Adicionar coluna id_usuario à tabela categorias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categorias' AND column_name = 'id_usuario'
  ) THEN
    ALTER TABLE public.categorias ADD COLUMN id_usuario uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON public.categorias(id_usuario) WHERE id_usuario IS NOT NULL;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Categorias visíveis apenas para usuários da mesma empresa" ON public.categorias;
DROP POLICY IF EXISTS "Usuários podem atualizar categorias de sua empresa" ON public.categorias;
DROP POLICY IF EXISTS "Usuários podem deletar categorias de sua empresa" ON public.categorias;
DROP POLICY IF EXISTS "Usuários podem inserir categorias em sua empresa" ON public.categorias;

-- Criar novas políticas para suportar categorias pessoais

-- SELECT: Usuários podem ver categorias da empresa OU suas categorias pessoais
CREATE POLICY "Usuários podem ver categorias da empresa e pessoais"
  ON public.categorias
  FOR SELECT
  TO authenticated
  USING (
    -- Categorias da empresa (id_usuario é null)
    (id_empresa = (SELECT id_empresa FROM perfis WHERE id = auth.uid()) AND id_usuario IS NULL)
    OR
    -- Categorias pessoais do usuário
    (id_usuario = auth.uid())
  );

-- INSERT: Usuários podem criar categorias da empresa ou pessoais
CREATE POLICY "Usuários podem criar categorias da empresa ou pessoais"
  ON public.categorias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Deve ser da empresa do usuário
    id_empresa = (SELECT id_empresa FROM perfis WHERE id = auth.uid())
    AND
    -- Se id_usuario for especificado, deve ser o próprio usuário
    (id_usuario IS NULL OR id_usuario = auth.uid())
  );

-- UPDATE: Usuários podem atualizar categorias da empresa (id_usuario null) ou suas categorias pessoais
CREATE POLICY "Usuários podem atualizar categorias da empresa ou pessoais"
  ON public.categorias
  FOR UPDATE
  TO authenticated
  USING (
    -- Categorias da empresa (id_usuario é null)
    (id_empresa = (SELECT id_empresa FROM perfis WHERE id = auth.uid()) AND id_usuario IS NULL)
    OR
    -- Categorias pessoais do usuário
    (id_usuario = auth.uid())
  )
  WITH CHECK (
    -- Deve ser da empresa do usuário
    id_empresa = (SELECT id_empresa FROM perfis WHERE id = auth.uid())
    AND
    -- Se id_usuario for especificado, deve ser o próprio usuário
    (id_usuario IS NULL OR id_usuario = auth.uid())
  );

-- DELETE: Usuários podem deletar apenas suas categorias pessoais (não podem deletar categorias da empresa)
CREATE POLICY "Usuários podem deletar apenas categorias pessoais"
  ON public.categorias
  FOR DELETE
  TO authenticated
  USING (id_usuario = auth.uid());