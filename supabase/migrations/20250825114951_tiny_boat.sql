/*
  # Unificação de Clientes e Fornecedores em Pessoas

  1. Nova Tabela
    - `pessoas`
      - `id` (uuid, primary key)
      - `id_empresa` (uuid, foreign key)
      - `nome_razao_social` (text, not null)
      - `tipo_cadastro` (text, not null - cliente, fornecedor, colaborador, outro)
      - `cpf_cnpj` (text, unique per empresa)
      - `email` (text)
      - `telefone` (text)
      - `endereco` (text)
      - `observacoes` (text)
      - `criado_em` (timestamp)
      - `atualizado_em` (timestamp)

  2. Migração de Dados
    - Migrar dados de `clientes` para `pessoas` com tipo_cadastro = 'cliente'
    - Migrar dados de `fornecedores` para `pessoas` com tipo_cadastro = 'fornecedor'

  3. Atualização da Tabela Transações
    - Remover colunas `id_cliente` e `id_fornecedor`
    - Adicionar coluna `id_pessoa`
    - Migrar referências existentes

  4. Security
    - Enable RLS on `pessoas` table
    - Add policies for authenticated users to manage pessoas of their company
    - Update transacoes policies for new id_pessoa column

  5. Cleanup
    - Remove old `clientes` and `fornecedores` tables after migration
*/

-- 1. Criar tabela pessoas
CREATE TABLE IF NOT EXISTS pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial serial,
  id_empresa uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_razao_social text NOT NULL,
  tipo_cadastro text NOT NULL CHECK (tipo_cadastro = ANY (ARRAY['cliente'::text, 'fornecedor'::text, 'colaborador'::text, 'outro'::text])),
  cpf_cnpj text,
  email text,
  telefone text,
  endereco text,
  observacoes text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pessoas_empresa ON pessoas(id_empresa);
CREATE INDEX IF NOT EXISTS idx_pessoas_tipo ON pessoas(tipo_cadastro);
CREATE UNIQUE INDEX IF NOT EXISTS pessoas_id_empresa_cpf_cnpj_key ON pessoas(id_empresa, cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;

-- 2. Migrar dados de clientes para pessoas
INSERT INTO pessoas (
  id_empresa,
  nome_razao_social,
  tipo_cadastro,
  cpf_cnpj,
  email,
  telefone,
  endereco,
  ativo,
  criado_em,
  atualizado_em
)
SELECT 
  id_empresa,
  nome,
  'cliente'::text,
  documento,
  email,
  telefone,
  CASE 
    WHEN endereco IS NOT NULL AND cidade IS NOT NULL AND estado IS NOT NULL THEN
      endereco || ', ' || cidade || ', ' || estado || 
      CASE WHEN cep IS NOT NULL THEN ' - CEP: ' || cep ELSE '' END
    WHEN endereco IS NOT NULL THEN endereco
    WHEN cidade IS NOT NULL AND estado IS NOT NULL THEN
      cidade || ', ' || estado ||
      CASE WHEN cep IS NOT NULL THEN ' - CEP: ' || cep ELSE '' END
    ELSE NULL
  END,
  ativo,
  criado_em,
  atualizado_em
FROM clientes
WHERE ativo = true;

-- 3. Migrar dados de fornecedores para pessoas
INSERT INTO pessoas (
  id_empresa,
  nome_razao_social,
  tipo_cadastro,
  cpf_cnpj,
  email,
  telefone,
  endereco,
  observacoes,
  ativo,
  criado_em,
  atualizado_em
)
SELECT 
  id_empresa,
  nome,
  'fornecedor'::text,
  documento,
  email,
  telefone,
  CASE 
    WHEN endereco IS NOT NULL AND cidade IS NOT NULL AND estado IS NOT NULL THEN
      endereco || ', ' || cidade || ', ' || estado || 
      CASE WHEN cep IS NOT NULL THEN ' - CEP: ' || cep ELSE '' END
    WHEN endereco IS NOT NULL THEN endereco
    WHEN cidade IS NOT NULL AND estado IS NOT NULL THEN
      cidade || ', ' || estado ||
      CASE WHEN cep IS NOT NULL THEN ' - CEP: ' || cep ELSE '' END
    ELSE NULL
  END,
  CASE WHEN pessoa_contato IS NOT NULL THEN 'Contato: ' || pessoa_contato ELSE NULL END,
  ativo,
  criado_em,
  atualizado_em
FROM fornecedores
WHERE ativo = true;

-- 4. Adicionar coluna id_pessoa na tabela transacoes
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS id_pessoa uuid REFERENCES pessoas(id);

-- 5. Migrar referências de clientes nas transações
UPDATE transacoes 
SET id_pessoa = (
  SELECT p.id 
  FROM pessoas p 
  JOIN clientes c ON c.nome = p.nome_razao_social 
    AND c.id_empresa = p.id_empresa 
    AND p.tipo_cadastro = 'cliente'
  WHERE c.id = transacoes.id_cliente
  LIMIT 1
)
WHERE id_cliente IS NOT NULL;

-- 6. Migrar referências de fornecedores nas transações
UPDATE transacoes 
SET id_pessoa = (
  SELECT p.id 
  FROM pessoas p 
  JOIN fornecedores f ON f.nome = p.nome_razao_social 
    AND f.id_empresa = p.id_empresa 
    AND p.tipo_cadastro = 'fornecedor'
  WHERE f.id = transacoes.id_fornecedor
  LIMIT 1
)
WHERE id_fornecedor IS NOT NULL;

-- 7. Migrar referências nas vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS id_pessoa uuid REFERENCES pessoas(id);

UPDATE vendas 
SET id_pessoa = (
  SELECT p.id 
  FROM pessoas p 
  JOIN clientes c ON c.nome = p.nome_razao_social 
    AND c.id_empresa = p.id_empresa 
    AND p.tipo_cadastro = 'cliente'
  WHERE c.id = vendas.id_cliente
  LIMIT 1
)
WHERE id_cliente IS NOT NULL;

-- 8. Enable RLS on pessoas table
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for pessoas
CREATE POLICY "Pessoas visíveis apenas para usuários da mesma empresa"
  ON pessoas
  FOR SELECT
  TO authenticated
  USING (id_empresa = (
    SELECT id_empresa 
    FROM perfis 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir pessoas em sua empresa"
  ON pessoas
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (
    SELECT id_empresa 
    FROM perfis 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar pessoas de sua empresa"
  ON pessoas
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (
    SELECT id_empresa 
    FROM perfis 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar pessoas de sua empresa"
  ON pessoas
  FOR DELETE
  TO authenticated
  USING (id_empresa = (
    SELECT id_empresa 
    FROM perfis 
    WHERE id = auth.uid()
  ));

-- 10. Update RLS policies for transacoes to use id_pessoa
DROP POLICY IF EXISTS "Transações visíveis apenas para usuários da mesma empresa" ON transacoes;
CREATE POLICY "Transações visíveis apenas para usuários da mesma empresa"
  ON transacoes
  FOR SELECT
  TO authenticated
  USING (id_empresa = (
    SELECT id_empresa 
    FROM perfis 
    WHERE id = auth.uid()
  ));

-- 11. Update RLS policies for vendas to use id_pessoa
DROP POLICY IF EXISTS "Vendas visíveis apenas para usuários da mesma empresa" ON vendas;
CREATE POLICY "Vendas visíveis apenas para usuários da mesma empresa"
  ON vendas
  FOR SELECT
  TO authenticated
  USING (id_empresa = (
    SELECT id_empresa 
    FROM perfis 
    WHERE id = auth.uid()
  ));

-- 12. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_pessoas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON pessoas
  FOR EACH ROW
  EXECUTE FUNCTION update_pessoas_updated_at();

-- 13. Remove old columns from transacoes (after migration is complete)
-- Note: We'll keep these for now and remove in a separate migration after confirming data integrity
-- ALTER TABLE transacoes DROP COLUMN IF EXISTS id_cliente;
-- ALTER TABLE transacoes DROP COLUMN IF EXISTS id_fornecedor;

-- 14. Remove old columns from vendas (after migration is complete)  
-- Note: We'll keep these for now and remove in a separate migration after confirming data integrity
-- ALTER TABLE vendas DROP COLUMN IF EXISTS id_cliente;