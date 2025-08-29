/*
  # Fix RLS infinite recursion in perfis table

  1. Problem
    - Current RLS policies on perfis table are causing infinite recursion
    - Policies are trying to query perfis table from within perfis policies
    - This creates a circular dependency

  2. Solution
    - Drop ALL existing policies on perfis table
    - Create simple, non-recursive policies using only auth.uid()
    - Avoid any subqueries that reference perfis table

  3. New Policies
    - Users can only read their own profile (id = auth.uid())
    - Users can only update their own profile (id = auth.uid())
    - Users can insert their own profile during signup (id = auth.uid())
*/

-- Drop all existing policies on perfis table
DROP POLICY IF EXISTS "Company users can view company profiles" ON perfis;
DROP POLICY IF EXISTS "Users can view own profile" ON perfis;
DROP POLICY IF EXISTS "Users can update own profile" ON perfis;
DROP POLICY IF EXISTS "Users can insert own profile" ON perfis;
DROP POLICY IF EXISTS "Admins podem ver perfis da empresa" ON perfis;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON perfis
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON perfis
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON perfis
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;