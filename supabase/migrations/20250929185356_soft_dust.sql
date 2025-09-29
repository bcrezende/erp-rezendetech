/*
  # Add recurring reminders functionality

  1. New Columns
    - `e_recorrente` (boolean) - Indicates if reminder is recurring
    - `frequencia_recorrencia` (text) - Frequency of recurrence (diaria, semanal, mensal, anual)
    - `data_fim_recorrencia` (date) - End date for recurrence (optional)
    - `dias_semana` (text) - Days of week for weekly recurrence (optional)
    - `dia_mes` (integer) - Day of month for monthly recurrence (optional)

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover new columns

  3. Constraints
    - Add check constraints for valid frequency values
    - Ensure end date is after start date when provided
*/

-- Add recurring reminder columns
DO $$
BEGIN
  -- Add e_recorrente column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lembretes' AND column_name = 'e_recorrente'
  ) THEN
    ALTER TABLE lembretes ADD COLUMN e_recorrente boolean DEFAULT false;
  END IF;

  -- Add frequencia_recorrencia column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lembretes' AND column_name = 'frequencia_recorrencia'
  ) THEN
    ALTER TABLE lembretes ADD COLUMN frequencia_recorrencia text;
  END IF;

  -- Add data_fim_recorrencia column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lembretes' AND column_name = 'data_fim_recorrencia'
  ) THEN
    ALTER TABLE lembretes ADD COLUMN data_fim_recorrencia date;
  END IF;

  -- Add dias_semana column for weekly recurrence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lembretes' AND column_name = 'dias_semana'
  ) THEN
    ALTER TABLE lembretes ADD COLUMN dias_semana text;
  END IF;

  -- Add dia_mes column for monthly recurrence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lembretes' AND column_name = 'dia_mes'
  ) THEN
    ALTER TABLE lembretes ADD COLUMN dia_mes integer;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  -- Check constraint for valid frequency values
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'lembretes' AND constraint_name = 'lembretes_frequencia_recorrencia_check'
  ) THEN
    ALTER TABLE lembretes ADD CONSTRAINT lembretes_frequencia_recorrencia_check
    CHECK (frequencia_recorrencia IS NULL OR frequencia_recorrencia IN ('diaria', 'semanal', 'mensal', 'anual'));
  END IF;

  -- Check constraint for end date after start date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'lembretes' AND constraint_name = 'lembretes_data_fim_after_start_check'
  ) THEN
    ALTER TABLE lembretes ADD CONSTRAINT lembretes_data_fim_after_start_check
    CHECK (data_fim_recorrencia IS NULL OR data_fim_recorrencia >= data_lembrete);
  END IF;

  -- Check constraint for valid day of month
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'lembretes' AND constraint_name = 'lembretes_dia_mes_check'
  ) THEN
    ALTER TABLE lembretes ADD CONSTRAINT lembretes_dia_mes_check
    CHECK (dia_mes IS NULL OR (dia_mes >= 1 AND dia_mes <= 31));
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lembretes_recorrente 
ON lembretes (e_recorrente, frequencia_recorrencia) 
WHERE e_recorrente = true AND ativo = true;

CREATE INDEX IF NOT EXISTS idx_lembretes_data_fim 
ON lembretes (data_fim_recorrencia) 
WHERE data_fim_recorrencia IS NOT NULL AND ativo = true;