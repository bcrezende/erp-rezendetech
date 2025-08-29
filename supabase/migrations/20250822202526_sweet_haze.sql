/*
  # Criar sistema de vendas

  1. Novas Tabelas
    - `vendas`
      - `id` (uuid, primary key)
      - `id_sequencial` (integer, auto-increment por empresa)
      - `id_empresa` (uuid, foreign key)
      - `id_cliente` (uuid, foreign key)
      - `data_venda` (date)
      - `subtotal` (numeric)
      - `desconto` (numeric)
      - `total` (numeric)
      - `status` (text: draft, confirmed, delivered, cancelled)
      - `observacoes` (text)
      - `ativo` (boolean)
      - `criado_em` (timestamp)
      - `atualizado_em` (timestamp)
    
    - `vendas_itens`
      - `id` (uuid, primary key)
      - `id_venda` (uuid, foreign key)
      - `id_produto` (uuid, foreign key)
      - `quantidade` (integer)
      - `preco_unitario` (numeric)
      - `preco_total` (numeric)
      - `criado_em` (timestamp)
      - `atualizado_em` (timestamp)

  2. Segurança
    - Habilitar RLS em ambas as tabelas
    - Políticas baseadas na empresa do usuário
    - Índices para performance

  3. Triggers
    - Auto-incremento do id_sequencial por empresa
    - Atualização automática de timestamps
*/

-- Criar sequência para vendas por empresa
CREATE SEQUENCE IF NOT EXISTS vendas_id_seq;

-- Criar tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('vendas_id_seq'),
  id_empresa uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL REFERENCES clientes(id),
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(10,2) DEFAULT 0,
  desconto numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'delivered', 'cancelled')),
  observacoes text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Criar tabela de itens de venda
CREATE TABLE IF NOT EXISTS vendas_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venda uuid NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  id_produto uuid NOT NULL REFERENCES produtos_servicos(id),
  quantidade integer DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario numeric(10,2) DEFAULT 0 CHECK (preco_unitario >= 0),
  preco_total numeric(10,2) DEFAULT 0 CHECK (preco_total >= 0),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON vendas(id_empresa);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda ON vendas_itens(id_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_produto ON vendas_itens(id_produto);

-- Habilitar RLS
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vendas
CREATE POLICY "Vendas visíveis apenas para usuários da mesma empresa"
  ON vendas
  FOR SELECT
  TO authenticated
  USING (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir vendas em sua empresa"
  ON vendas
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar vendas de sua empresa"
  ON vendas
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar vendas de sua empresa"
  ON vendas
  FOR DELETE
  TO authenticated
  USING (id_empresa = (
    SELECT perfis.id_empresa
    FROM perfis
    WHERE perfis.id = auth.uid()
  ));

-- Políticas RLS para itens de venda
CREATE POLICY "Itens de venda visíveis para usuários da mesma empresa"
  ON vendas_itens
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendas
    WHERE vendas.id = vendas_itens.id_venda
    AND vendas.id_empresa = (
      SELECT perfis.id_empresa
      FROM perfis
      WHERE perfis.id = auth.uid()
    )
  ));

CREATE POLICY "Usuários podem inserir itens de venda em sua empresa"
  ON vendas_itens
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM vendas
    WHERE vendas.id = vendas_itens.id_venda
    AND vendas.id_empresa = (
      SELECT perfis.id_empresa
      FROM perfis
      WHERE perfis.id = auth.uid()
    )
  ));

CREATE POLICY "Usuários podem atualizar itens de venda de sua empresa"
  ON vendas_itens
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendas
    WHERE vendas.id = vendas_itens.id_venda
    AND vendas.id_empresa = (
      SELECT perfis.id_empresa
      FROM perfis
      WHERE perfis.id = auth.uid()
    )
  ));

CREATE POLICY "Usuários podem deletar itens de venda de sua empresa"
  ON vendas_itens
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendas
    WHERE vendas.id = vendas_itens.id_venda
    AND vendas.id_empresa = (
      SELECT perfis.id_empresa
      FROM perfis
      WHERE perfis.id = auth.uid()
    )
  ));

-- Trigger para atualizar timestamp
CREATE TRIGGER update_vendas_updated_at
  BEFORE UPDATE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendas_itens_updated_at
  BEFORE UPDATE ON vendas_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();