/*
  # Sistema de Rastreamento de Versões do Sistema

  ## Descrição
  Este migration cria a infraestrutura para rastrear versões do sistema e 
  notificações de atualizações para os usuários.

  ## Tabelas Criadas

  ### 1. system_versions
  Armazena informações sobre cada versão do sistema lançada.
  - `id` (uuid, primary key) - Identificador único da versão
  - `version_number` (text, unique) - Número da versão (ex: "1.0.0", "1.1.0")
  - `version_name` (text) - Nome amigável da versão (ex: "Lançamento Inicial")
  - `release_date` (timestamptz) - Data de lançamento da versão
  - `description` (text) - Descrição geral das mudanças
  - `features` (jsonb) - Array de features/mudanças detalhadas
  - `is_major` (boolean) - Indica se é uma versão major (grandes mudanças)
  - `is_active` (boolean) - Indica se esta versão está ativa para notificações
  - `created_at` (timestamptz) - Data de criação do registro
  - `updated_at` (timestamptz) - Data de última atualização

  ### 2. user_version_views
  Rastreia quais versões cada usuário já visualizou.
  - `id` (uuid, primary key) - Identificador único
  - `user_id` (uuid, foreign key) - Referência ao usuário (auth.users)
  - `version_id` (uuid, foreign key) - Referência à versão do sistema
  - `viewed_at` (timestamptz) - Data/hora da visualização
  - `dismissed` (boolean) - Se o usuário dispensou a notificação
  - `created_at` (timestamptz) - Data de criação do registro

  ## Segurança (RLS)

  ### system_versions
  - Todos os usuários autenticados podem ler versões ativas
  - Apenas administradores podem criar/atualizar versões (implementação futura)

  ### user_version_views
  - Usuários podem ler apenas seus próprios registros
  - Usuários podem criar registros apenas para si mesmos
  - Usuários podem atualizar apenas seus próprios registros

  ## Índices
  - Índice em version_number para buscas rápidas
  - Índice composto em (user_id, version_id) para evitar duplicatas
  - Índice em release_date para ordenação cronológica
*/

-- Create system_versions table
CREATE TABLE IF NOT EXISTS system_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number text UNIQUE NOT NULL,
  version_name text NOT NULL,
  release_date timestamptz NOT NULL DEFAULT now(),
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  is_major boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_versions_release_date ON system_versions(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_system_versions_active ON system_versions(is_active) WHERE is_active = true;

-- Create user_version_views table
CREATE TABLE IF NOT EXISTS user_version_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES system_versions(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, version_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_version_views_user_id ON user_version_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_version_views_version_id ON user_version_views(version_id);
CREATE INDEX IF NOT EXISTS idx_user_version_views_viewed_at ON user_version_views(viewed_at DESC);

-- Enable Row Level Security
ALTER TABLE system_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_version_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_versions

-- All authenticated users can read active versions
CREATE POLICY "Authenticated users can view active versions"
  ON system_versions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_version_views

-- Users can view their own version views
CREATE POLICY "Users can view own version views"
  ON user_version_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own version views
CREATE POLICY "Users can insert own version views"
  ON user_version_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own version views
CREATE POLICY "Users can update own version views"
  ON user_version_views
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_system_versions_updated_at ON system_versions;
CREATE TRIGGER trigger_update_system_versions_updated_at
  BEFORE UPDATE ON system_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_system_versions_updated_at();