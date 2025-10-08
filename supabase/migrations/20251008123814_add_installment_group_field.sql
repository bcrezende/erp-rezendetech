/*
  # Add Installment Group Field to Transactions

  1. Changes
    - Add `id_grupo_parcelas` field to `transacoes` table
    - This field will link all installments from the same payment plan
    - Allows grouped operations on installments (edit all, edit future, etc.)
    
  2. Details
    - Field type: UUID (nullable)
    - Used to group related installment transactions
    - When creating installments, all will share the same id_grupo_parcelas
    - Facilitates batch updates and installment management
    
  3. Notes
    - Existing transactions will have NULL value (not part of any installment group)
    - Only new installments created after this migration will have the group ID
    - This enables better control when editing installments (single, future, or all)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'id_grupo_parcelas'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN id_grupo_parcelas uuid;
    
    CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_parcelas 
    ON transacoes(id_grupo_parcelas) 
    WHERE id_grupo_parcelas IS NOT NULL;
  END IF;
END $$;