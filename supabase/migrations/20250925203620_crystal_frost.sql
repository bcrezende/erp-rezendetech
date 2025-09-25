/*
  # Adicionar campo de horário aos lembretes

  1. Alterações na Tabela
    - Adiciona coluna `hora_lembrete` (time) à tabela `lembretes`
    - Campo opcional para permitir lembretes apenas com data
    - Valor padrão: null (sem horário específico)

  2. Funcionalidades
    - Permite definir horário específico para lembretes
    - Mantém compatibilidade com lembretes existentes
    - Suporte para notificações futuras baseadas em data e hora
*/

-- Adicionar coluna hora_lembrete à tabela lembretes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lembretes' AND column_name = 'hora_lembrete'
  ) THEN
    ALTER TABLE lembretes ADD COLUMN hora_lembrete time DEFAULT NULL;
  END IF;
END $$;

-- Adicionar comentário à coluna
COMMENT ON COLUMN lembretes.hora_lembrete IS 'Horário específico do lembrete (opcional)';

-- Criar índice para consultas por data e hora
CREATE INDEX IF NOT EXISTS idx_lembretes_data_hora 
ON lembretes (data_lembrete, hora_lembrete) 
WHERE (status = 'pendente' AND ativo = true);