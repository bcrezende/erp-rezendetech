/*
  # Fix empresas table INSERT policy

  1. Security Changes
    - Add INSERT policy for empresas table
    - Allow authenticated users to create companies
    - Required for automatic company creation during login

  2. Policy Details
    - Policy name: "Authenticated users can create companies"
    - Allows INSERT operations for any authenticated user
    - Uses auth.uid() IS NOT NULL to verify authentication
*/

-- Add INSERT policy for empresas table
CREATE POLICY "Authenticated users can create companies"
  ON empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);