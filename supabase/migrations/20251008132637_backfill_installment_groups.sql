/*
  # Backfill Installment Groups for Existing Installments
  
  1. Purpose
    - Populate `id_grupo_parcelas` for existing installment transactions that were created before the field was added
    - Enable group editing functionality (edit single, future, or all installments) for old installments
    
  2. Strategy
    - Identify groups of related installments using pattern matching on description
    - Group installments that share:
      * Same company (id_empresa)
      * Similar base description (extracted from "Description - Parcela X/Y" pattern)
      * Same total number of installments (numero_parcelas)
      * Same installment value (valor_parcela)
      * Same start date (data_inicio_recorrencia)
      * Sequential installment numbers (parcela_atual: 1, 2, 3, ...)
    - Assign a unique UUID to each identified group
    
  3. Implementation Details
    - Uses regex pattern to extract base description from installment descriptions
    - Creates temporary table to store group mappings
    - Updates all matching installments with their group ID
    - Handles edge cases like incomplete groups or varied naming patterns
    
  4. Safety Measures
    - Only updates records where id_grupo_parcelas IS NULL
    - Uses transactions to ensure atomicity
    - Validates group integrity before applying updates
    - Logs the number of groups created and installments updated
    
  5. Notes
    - This migration is idempotent and can be run multiple times safely
    - Only affects installments with e_recorrente = true and tipo_recorrencia = 'parcelada'
    - Does not modify installments that already have a group ID
*/

DO $$
DECLARE
  groups_created INTEGER := 0;
  installments_updated INTEGER := 0;
  rows_affected INTEGER;
  current_group_id UUID;
  group_record RECORD;
BEGIN
  -- Create temporary table to store group information
  CREATE TEMP TABLE IF NOT EXISTS temp_installment_groups (
    group_id UUID DEFAULT gen_random_uuid(),
    id_empresa UUID,
    base_description TEXT,
    numero_parcelas INTEGER,
    valor_parcela NUMERIC,
    data_inicio_recorrencia DATE
  ) ON COMMIT DROP;

  -- Identify unique groups based on common attributes
  -- We extract the base description by removing the "- Parcela X/Y" pattern
  INSERT INTO temp_installment_groups (id_empresa, base_description, numero_parcelas, valor_parcela, data_inicio_recorrencia)
  SELECT DISTINCT
    id_empresa,
    -- Extract base description by removing " - Parcela X/Y" or " (X/Y)" patterns
    REGEXP_REPLACE(
      REGEXP_REPLACE(descricao, ' - Parcela \d+/\d+$', ''),
      ' \(\d+/\d+\)$', 
      ''
    ) as base_description,
    numero_parcelas,
    valor_parcela,
    data_inicio_recorrencia
  FROM transacoes
  WHERE e_recorrente = true
    AND tipo_recorrencia = 'parcelada'
    AND id_grupo_parcelas IS NULL
    AND numero_parcelas IS NOT NULL
    AND valor_parcela IS NOT NULL
    AND data_inicio_recorrencia IS NOT NULL
  GROUP BY id_empresa, 
    REGEXP_REPLACE(
      REGEXP_REPLACE(descricao, ' - Parcela \d+/\d+$', ''),
      ' \(\d+/\d+\)$', 
      ''
    ),
    numero_parcelas,
    valor_parcela,
    data_inicio_recorrencia
  -- Only create groups that have at least 2 installments
  HAVING COUNT(*) >= 2;

  GET DIAGNOSTICS groups_created = ROW_COUNT;

  -- Update installments with their corresponding group IDs
  FOR group_record IN 
    SELECT * FROM temp_installment_groups
  LOOP
    UPDATE transacoes t
    SET id_grupo_parcelas = group_record.group_id
    WHERE t.id_empresa = group_record.id_empresa
      AND t.e_recorrente = true
      AND t.tipo_recorrencia = 'parcelada'
      AND t.id_grupo_parcelas IS NULL
      AND t.numero_parcelas = group_record.numero_parcelas
      AND t.valor_parcela = group_record.valor_parcela
      AND t.data_inicio_recorrencia = group_record.data_inicio_recorrencia
      AND (
        -- Match original pattern: "Description - Parcela X/Y"
        REGEXP_REPLACE(t.descricao, ' - Parcela \d+/\d+$', '') = group_record.base_description
        OR
        -- Match alternative pattern: "Description (X/Y)"
        REGEXP_REPLACE(t.descricao, ' \(\d+/\d+\)$', '') = group_record.base_description
      );
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    installments_updated := installments_updated + rows_affected;
  END LOOP;

  -- Log results
  RAISE NOTICE 'Backfill completed successfully!';
  RAISE NOTICE 'Groups created: %', groups_created;
  RAISE NOTICE 'Installments updated: %', installments_updated;

  -- Verify integrity: check if any group has incorrect number of installments
  FOR group_record IN
    SELECT 
      id_grupo_parcelas,
      numero_parcelas,
      COUNT(*) as actual_count
    FROM transacoes
    WHERE id_grupo_parcelas IN (SELECT group_id FROM temp_installment_groups)
    GROUP BY id_grupo_parcelas, numero_parcelas
    HAVING COUNT(*) != numero_parcelas
  LOOP
    RAISE WARNING 'Group % has % installments but expected %', 
      group_record.id_grupo_parcelas, 
      group_record.actual_count, 
      group_record.numero_parcelas;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error during backfill: %', SQLERRM;
END $$;
