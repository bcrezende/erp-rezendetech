/*
  # Fix empresas table RLS policies

  1. Security Changes
    - Update INSERT policy for empresas table to allow authenticated users to create companies
    - Update UPDATE policy for empresas table to allow users to update their own company
    - Ensure proper RLS policies for company creation workflow

  2. Notes
    - These policies allow authenticated users to create companies
    - Users can only update companies they are associated with through their profile
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can create companies" ON empresas;
DROP POLICY IF EXISTS "Empresas podem ser visualizadas por seus usuários" ON empresas;

-- Create new INSERT policy that allows authenticated users to create companies
CREATE POLICY "Authenticated users can create companies"
  ON empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create new SELECT policy that allows users to view their company
CREATE POLICY "Users can view their company"
  ON empresas
  FOR SELECT
  TO authenticated
  USING (id = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

-- Create new UPDATE policy that allows users to update their company
CREATE POLICY "Users can update their company"
  ON empresas
  FOR UPDATE
  TO authenticated
  USING (id = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ))
  WITH CHECK (id = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));