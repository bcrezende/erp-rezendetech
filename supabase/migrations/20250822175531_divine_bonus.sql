/*
  # Fix empresas table RLS policies

  1. Security Changes
    - Drop existing INSERT policy if it exists to avoid conflicts
    - Create new INSERT policy for authenticated users
    - Ensure authenticated users can create companies

  2. Policy Details
    - INSERT policy allows authenticated users to create companies
    - Uses auth.uid() IS NOT NULL to verify authentication
    - Maintains security while enabling automatic company creation
*/

-- Drop existing INSERT policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create companies" ON empresas;

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create companies"
  ON empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify RLS is enabled (should already be enabled)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;