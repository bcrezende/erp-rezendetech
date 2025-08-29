/*
  # Adicionar suporte a despesas recorrentes

  1. Novas Colunas na Tabela transacoes
    - `e_recorrente` (boolean) - Indica se é uma despesa recorrente
    - `tipo_recorrencia` (text) - Tipo: 'parcelada' ou 'assinatura'
    - `numero_parcelas` (integer) - Número total de parcelas (apenas para parceladas)
    - `parcela_atual` (integer) - Número da parcela atual
    - `data_inicio_recorrencia` (date) - Data de início da recorrência
    - `valor_parcela` (numeric) - Valor de cada parcela/mensalidade
    - `id_transacao_pai` (uuid) - Referência à transação original que gerou as recorrências
    - `ativa_recorrencia` (boolean) - Se a recorrência ainda está ativa

  2. Índices
    - Índice para buscar transações recorrentes ativas
    - Índice para buscar por transação pai

  3. Constraints
    - Validação dos tipos de recorrência
    - Validação de parcelas
*/

-- Adicionar colunas para despesas recorrentes
DO $$
BEGIN
  -- e_recorrente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'e_recorrente'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN e_recorrente boolean DEFAULT false;
  END IF;

  -- tipo_recorrencia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'tipo_recorrencia'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN tipo_recorrencia text;
  END IF;

  -- numero_parcelas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'numero_parcelas'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN numero_parcelas integer;
  END IF;

  -- parcela_atual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'parcela_atual'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN parcela_atual integer;
  END IF;

  -- data_inicio_recorrencia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'data_inicio_recorrencia'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN data_inicio_recorrencia date;
  END IF;

  -- valor_parcela
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'valor_parcela'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN valor_parcela numeric(10,2);
  END IF;

  -- id_transacao_pai
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'id_transacao_pai'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN id_transacao_pai uuid;
  END IF;

  -- ativa_recorrencia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'ativa_recorrencia'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN ativa_recorrencia boolean DEFAULT true;
  END IF;
END $$;

-- Adicionar constraints
DO $$
BEGIN
  -- Constraint para tipo_recorrencia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transacoes_tipo_recorrencia_check'
  ) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_tipo_recorrencia_check 
    CHECK (tipo_recorrencia IS NULL OR tipo_recorrencia IN ('parcelada', 'assinatura'));
  END IF;

  -- Constraint para numero_parcelas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transacoes_numero_parcelas_check'
  ) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_numero_parcelas_check 
    CHECK (numero_parcelas IS NULL OR numero_parcelas > 1);
  END IF;

  -- Constraint para parcela_atual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transacoes_parcela_atual_check'
  ) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_parcela_atual_check 
    CHECK (parcela_atual IS NULL OR parcela_atual > 0);
  END IF;

  -- Constraint para valor_parcela
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transacoes_valor_parcela_check'
  ) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_valor_parcela_check 
    CHECK (valor_parcela IS NULL OR valor_parcela > 0);
  END IF;
END $$;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrente 
ON transacoes (e_recorrente, ativa_recorrencia) 
WHERE e_recorrente = true;

CREATE INDEX IF NOT EXISTS idx_transacoes_pai 
ON transacoes (id_transacao_pai) 
WHERE id_transacao_pai IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_assinatura_ativa 
ON transacoes (tipo_recorrencia, ativa_recorrencia, data_inicio_recorrencia) 
WHERE tipo_recorrencia = 'assinatura' AND ativa_recorrencia = true;

-- Adicionar foreign key para id_transacao_pai
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transacoes_id_transacao_pai_fkey'
  ) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_id_transacao_pai_fkey 
    FOREIGN KEY (id_transacao_pai) REFERENCES transacoes(id) ON DELETE CASCADE;
  END IF;
END $$;