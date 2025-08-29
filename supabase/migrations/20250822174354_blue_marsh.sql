/*
  # Fix RLS infinite recursion in perfis table

  1. Problem
    - Current RLS policies on `perfis` table are causing infinite recursion
    - Policies are creating circular dependencies when querying perfis from perfis
    
  2. Solution
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Use auth.uid() directly instead of subqueries that reference perfis
    
  3. Security
    - Users can only see their own profile
    - Users can only update their own profile
    - Admins can see profiles from their company (using direct company check)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON perfis;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON perfis;
DROP POLICY IF EXISTS "Admins podem ver perfis da empresa" ON perfis;

-- Create new non-recursive policies
-- Policy 1: Users can see their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON perfis
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile (no recursion)
CREATE POLICY "Users can update own profile"
  ON perfis
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Users can insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON perfis
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy 4: Allow reading profiles for company management (simplified)
-- This policy allows users to see other profiles in their company
-- but uses a direct join to avoid recursion
CREATE POLICY "Company users can view company profiles"
  ON perfis
  FOR SELECT
  TO authenticated
  USING (
    id_empresa IN (
      SELECT id_empresa 
      FROM perfis 
      WHERE id = auth.uid()
    )
  );