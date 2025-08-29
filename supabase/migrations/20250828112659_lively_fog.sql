/*
  # Add location fields to empresas table

  1. New Columns
    - `cidade` (text, nullable) - City where the company is located
    - `estado` (text, nullable) - State where the company is located  
    - `cep` (text, nullable) - ZIP code of the company

  2. Changes
    - Added three new location fields to empresas table to support complete address information
    - All fields are nullable to maintain backward compatibility
    - No security changes needed as existing RLS policies will apply to new columns
*/

-- Add location fields to empresas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'cidade'
  ) THEN
    ALTER TABLE empresas ADD COLUMN cidade text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'estado'
  ) THEN
    ALTER TABLE empresas ADD COLUMN estado text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'cep'
  ) THEN
    ALTER TABLE empresas ADD COLUMN cep text;
  END IF;
END $$;