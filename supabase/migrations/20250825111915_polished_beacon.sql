/*
  # Adicionar classificação de categorias para DRE

  1. Modificações na tabela categorias
    - Adicionar campo `classificacao_dre` para categorias de despesa
    - Valores possíveis: 'custo_fixo', 'custo_variavel', 'despesa_operacional'
    - Campo opcional para manter compatibilidade

  2. Atualizar categorias existentes
    - Definir classificação padrão como 'despesa_operacional'
    - Permitir que usuário reclassifique conforme necessário

  3. Índices e constraints
    - Adicionar constraint para valores válidos
    - Manter performance das consultas
*/

-- Adicionar coluna de classificação DRE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categorias' AND column_name = 'classificacao_dre'
  ) THEN
    ALTER TABLE categorias ADD COLUMN classificacao_dre text DEFAULT 'despesa_operacional';
  END IF;
END $$;

-- Adicionar constraint para valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'categorias_classificacao_dre_check'
  ) THEN
    ALTER TABLE categorias ADD CONSTRAINT categorias_classificacao_dre_check 
    CHECK (classificacao_dre IS NULL OR classificacao_dre = ANY (ARRAY['custo_fixo'::text, 'custo_variavel'::text, 'despesa_operacional'::text]));
  END IF;
END $$;

-- Atualizar categorias existentes de despesa para ter classificação padrão
UPDATE categorias 
SET classificacao_dre = 'despesa_operacional' 
WHERE tipo = 'despesa' AND classificacao_dre IS NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_categorias_classificacao_dre 
ON categorias (classificacao_dre) 
WHERE tipo = 'despesa' AND ativo = true;