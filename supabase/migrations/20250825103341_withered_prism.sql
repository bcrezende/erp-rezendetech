/*
  # Atualização da tabela transacoes para Contas a Pagar e Receber

  1. Novas Colunas
    - `data_vencimento` (date, not null): Data limite para pagamento ou recebimento
    - Atualização da coluna `status` para incluir novos valores

  2. Índices
    - Adicionar índices para otimizar consultas por data de vencimento e status

  3. Constraints
    - Atualizar constraint de status para incluir novos valores
*/

-- Adicionar coluna data_vencimento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'data_vencimento'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN data_vencimento date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Remover constraint antiga de status se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'transacoes' AND constraint_name = 'transacoes_status_check'
  ) THEN
    ALTER TABLE transacoes DROP CONSTRAINT transacoes_status_check;
  END IF;
END $$;

-- Adicionar nova constraint de status com valores expandidos
ALTER TABLE transacoes ADD CONSTRAINT transacoes_status_check 
CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'recebido'::text, 'vencido'::text, 'cancelado'::text, 'concluida'::text]));

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_transacoes_data_vencimento ON transacoes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_transacoes_status_tipo ON transacoes(status, tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_vencimento_status ON transacoes(data_vencimento, status) WHERE status = 'pendente';

-- Atualizar transações existentes para ter data_vencimento igual à data_transacao se não definida
UPDATE transacoes 
SET data_vencimento = data_transacao 
WHERE data_vencimento = CURRENT_DATE AND data_transacao != CURRENT_DATE;

-- Atualizar status das transações existentes
UPDATE transacoes 
SET status = CASE 
  WHEN status = 'concluida' AND tipo = 'receita' THEN 'recebido'
  WHEN status = 'concluida' AND tipo = 'despesa' THEN 'pago'
  ELSE status
END
WHERE status = 'concluida';