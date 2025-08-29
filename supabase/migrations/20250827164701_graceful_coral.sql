/*
  # Adicionar coluna telefone na tabela perfis

  1. Nova Coluna
    - `telefone` (text) - Número de telefone do usuário
    - Campo opcional para permitir edição manual

  2. Índice
    - Adicionar índice para consultas por telefone se necessário

  3. Segurança
    - Manter as políticas RLS existentes
    - Usuários podem atualizar seu próprio telefone
*/

-- Adicionar coluna telefone na tabela perfis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfis' AND column_name = 'telefone'
  ) THEN
    ALTER TABLE perfis ADD COLUMN telefone text;
  END IF;
END $$;

-- Criar índice para consultas por telefone (opcional)
CREATE INDEX IF NOT EXISTS idx_perfis_telefone ON perfis(telefone) WHERE telefone IS NOT NULL;

-- Comentário para documentar a mudança
COMMENT ON COLUMN perfis.telefone IS 'Número de telefone do usuário - editável manualmente';