/*
  # Atualizar classificações de despesa

  1. Mudanças
    - Reclassificar todas as despesas operacionais como custo variável
    - Manter custos fixos como estão
    - Remover a opção 'despesa_operacional' do sistema

  2. Segurança
    - Atualizar registros existentes antes de alterar constraints
    - Manter integridade dos dados
*/

-- Primeiro, atualizar todas as categorias que estão como 'despesa_operacional' para 'custo_variavel'
UPDATE categorias 
SET classificacao_dre = 'custo_variavel' 
WHERE classificacao_dre = 'despesa_operacional';

-- Atualizar a constraint para aceitar apenas 'custo_fixo' e 'custo_variavel'
DO $$
BEGIN
  -- Remover constraint existente se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'categorias' AND constraint_name = 'categorias_classificacao_dre_check'
  ) THEN
    ALTER TABLE categorias DROP CONSTRAINT categorias_classificacao_dre_check;
  END IF;
  
  -- Adicionar nova constraint
  ALTER TABLE categorias ADD CONSTRAINT categorias_classificacao_dre_check 
  CHECK ((classificacao_dre IS NULL) OR (classificacao_dre = ANY (ARRAY['custo_fixo'::text, 'custo_variavel'::text])));
END $$;