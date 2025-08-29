/*
  # Criar tabela de configurações do DRE

  1. Nova Tabela
    - `configuracoes_dre`
      - `id` (uuid, primary key)
      - `id_empresa` (uuid, foreign key para empresas)
      - `percentual_deducao_receita` (decimal, padrão 10%)
      - `percentual_imposto_lucro` (decimal, padrão 15%)
      - `percentual_custos_vendas` (decimal, padrão 60%)
      - `percentual_despesas_operacionais` (decimal, padrão 30%)
      - `percentual_resultado_financeiro` (decimal, padrão 2%)
      - `ativo` (boolean, padrão true)
      - `criado_em` (timestamp)
      - `atualizado_em` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para usuários da mesma empresa
    - Garantir que cada empresa tenha apenas uma configuração ativa

  3. Índices
    - Índice na coluna id_empresa para consultas rápidas
*/

-- Criar tabela de configurações do DRE
CREATE TABLE IF NOT EXISTS configuracoes_dre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  percentual_deducao_receita decimal(5,2) DEFAULT 10.00 NOT NULL,
  percentual_imposto_lucro decimal(5,2) DEFAULT 15.00 NOT NULL,
  percentual_custos_vendas decimal(5,2) DEFAULT 60.00 NOT NULL,
  percentual_despesas_operacionais decimal(5,2) DEFAULT 30.00 NOT NULL,
  percentual_resultado_financeiro decimal(5,2) DEFAULT 2.00 NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  criado_em timestamptz DEFAULT now() NOT NULL,
  atualizado_em timestamptz DEFAULT now() NOT NULL,
  
  -- Constraint para garantir que cada empresa tenha apenas uma configuração ativa
  CONSTRAINT unique_active_config_per_company UNIQUE (id_empresa, ativo) DEFERRABLE INITIALLY DEFERRED
);

-- Criar índice para consultas por empresa
CREATE INDEX IF NOT EXISTS idx_configuracoes_dre_empresa 
ON configuracoes_dre(id_empresa) WHERE ativo = true;

-- Habilitar RLS
ALTER TABLE configuracoes_dre ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Configurações DRE visíveis apenas para usuários da mesma empresa"
  ON configuracoes_dre
  FOR SELECT
  TO authenticated
  USING (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir configurações DRE em sua empresa"
  ON configuracoes_dre
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar configurações DRE de sua empresa"
  ON configuracoes_dre
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ))
  WITH CHECK (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar configurações DRE de sua empresa"
  ON configuracoes_dre
  FOR DELETE
  TO authenticated
  USING (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_configuracoes_dre_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_configuracoes_dre_updated_at
  BEFORE UPDATE ON configuracoes_dre
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracoes_dre_updated_at();

-- Função para criar configuração padrão para novas empresas
CREATE OR REPLACE FUNCTION create_default_dre_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO configuracoes_dre (id_empresa)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar configuração padrão quando uma nova empresa é criada
CREATE TRIGGER trigger_create_default_dre_config
  AFTER INSERT ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION create_default_dre_config();

-- Inserir configurações padrão para empresas existentes que não têm configuração
INSERT INTO configuracoes_dre (id_empresa)
SELECT e.id
FROM empresas e
LEFT JOIN configuracoes_dre c ON e.id = c.id_empresa AND c.ativo = true
WHERE c.id IS NULL;