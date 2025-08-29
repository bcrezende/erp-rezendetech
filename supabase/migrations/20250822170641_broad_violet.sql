/*
  # Schema ERP Multi-tenant com RLS

  1. Novas Tabelas
    - `empresas` - Dados das empresas/assinantes
    - `perfis` - Perfis de usuários vinculados às empresas
    - `clientes` - Gestão de clientes por empresa
    - `fornecedores` - Gestão de fornecedores por empresa
    - `produtos_servicos` - Catálogo de produtos/serviços por empresa
    - `categorias` - Categorias de transações financeiras por empresa
    - `transacoes` - Lançamentos financeiros por empresa

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de isolamento por empresa (multi-tenant)
    - Controle de acesso baseado em perfis de usuário

  3. Funcionalidades
    - IDs sequenciais usando sequences
    - Relacionamentos com foreign keys
    - Timestamps automáticos
    - Validações de dados
*/

-- Criar sequências para IDs sequenciais
CREATE SEQUENCE IF NOT EXISTS empresas_id_seq;
CREATE SEQUENCE IF NOT EXISTS clientes_id_seq;
CREATE SEQUENCE IF NOT EXISTS fornecedores_id_seq;
CREATE SEQUENCE IF NOT EXISTS produtos_servicos_id_seq;
CREATE SEQUENCE IF NOT EXISTS categorias_id_seq;
CREATE SEQUENCE IF NOT EXISTS transacoes_id_seq;

-- Tabela de empresas (assinantes)
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('empresas_id_seq'),
  nome text NOT NULL,
  cnpj text,
  email text,
  telefone text,
  endereco text,
  plano text DEFAULT 'basico',
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  id_empresa uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  papel text DEFAULT 'usuario' CHECK (papel IN ('admin', 'usuario', 'financeiro')),
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('clientes_id_seq'),
  id_empresa uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  documento text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('fornecedores_id_seq'),
  id_empresa uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  pessoa_contato text,
  email text,
  telefone text,
  documento text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela de produtos e serviços
CREATE TABLE IF NOT EXISTS public.produtos_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('produtos_servicos_id_seq'),
  id_empresa uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  preco numeric(10,2) DEFAULT 0,
  sku text,
  e_servico boolean DEFAULT false,
  estoque_atual integer DEFAULT 0,
  estoque_minimo integer DEFAULT 0,
  categoria text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(id_empresa, sku)
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('categorias_id_seq'),
  id_empresa uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor text DEFAULT '#6B7280',
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(id_empresa, nome, tipo)
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS public.transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer DEFAULT nextval('transacoes_id_seq'),
  id_empresa uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  descricao text NOT NULL,
  data_transacao date NOT NULL,
  id_categoria uuid REFERENCES public.categorias(id),
  id_cliente uuid REFERENCES public.clientes(id),
  id_fornecedor uuid REFERENCES public.fornecedores(id),
  status text DEFAULT 'concluida' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
  origem text DEFAULT 'manual' CHECK (origem IN ('manual', 'whatsapp_ia', 'api')),
  observacoes text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(id_empresa);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(id_empresa);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON public.fornecedores(id_empresa);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON public.produtos_servicos(id_empresa);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa ON public.categorias(id_empresa);
CREATE INDEX IF NOT EXISTS idx_transacoes_empresa ON public.transacoes(id_empresa);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON public.transacoes(tipo);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empresas
CREATE POLICY "Empresas podem ser visualizadas por seus usuários"
  ON public.empresas
  FOR SELECT
  TO authenticated
  USING (id = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

-- Políticas RLS para perfis
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.perfis
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins podem ver perfis da empresa"
  ON public.perfis
  FOR SELECT
  TO authenticated
  USING (
    id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()) AND
    (SELECT papel FROM public.perfis WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.perfis
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Políticas RLS para clientes
CREATE POLICY "Clientes visíveis apenas para usuários da mesma empresa"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir clientes em sua empresa"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar clientes de sua empresa"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar clientes de sua empresa"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

-- Políticas RLS para fornecedores
CREATE POLICY "Fornecedores visíveis apenas para usuários da mesma empresa"
  ON public.fornecedores
  FOR SELECT
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir fornecedores em sua empresa"
  ON public.fornecedores
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar fornecedores de sua empresa"
  ON public.fornecedores
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar fornecedores de sua empresa"
  ON public.fornecedores
  FOR DELETE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

-- Políticas RLS para produtos/serviços
CREATE POLICY "Produtos visíveis apenas para usuários da mesma empresa"
  ON public.produtos_servicos
  FOR SELECT
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir produtos em sua empresa"
  ON public.produtos_servicos
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar produtos de sua empresa"
  ON public.produtos_servicos
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar produtos de sua empresa"
  ON public.produtos_servicos
  FOR DELETE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

-- Políticas RLS para categorias
CREATE POLICY "Categorias visíveis apenas para usuários da mesma empresa"
  ON public.categorias
  FOR SELECT
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir categorias em sua empresa"
  ON public.categorias
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar categorias de sua empresa"
  ON public.categorias
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar categorias de sua empresa"
  ON public.categorias
  FOR DELETE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

-- Políticas RLS para transações
CREATE POLICY "Transações visíveis apenas para usuários da mesma empresa"
  ON public.transacoes
  FOR SELECT
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir transações em sua empresa"
  ON public.transacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar transações de sua empresa"
  ON public.transacoes
  FOR UPDATE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar transações de sua empresa"
  ON public.transacoes
  FOR DELETE
  TO authenticated
  USING (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()));

-- Inserir categorias padrão (será executado via trigger após criação de empresa)
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Categorias de Receita
  INSERT INTO public.categorias (id_empresa, nome, tipo, cor) VALUES
    (NEW.id, 'Vendas de Produtos', 'receita', '#10B981'),
    (NEW.id, 'Prestação de Serviços', 'receita', '#059669'),
    (NEW.id, 'Juros e Rendimentos', 'receita', '#047857'),
    (NEW.id, 'Outras Receitas', 'receita', '#065F46');

  -- Categorias de Despesa
  INSERT INTO public.categorias (id_empresa, nome, tipo, cor) VALUES
    (NEW.id, 'Fornecedores', 'despesa', '#EF4444'),
    (NEW.id, 'Salários e Encargos', 'despesa', '#DC2626'),
    (NEW.id, 'Aluguel e Condomínio', 'despesa', '#B91C1C'),
    (NEW.id, 'Energia e Telecomunicações', 'despesa', '#991B1B'),
    (NEW.id, 'Material de Escritório', 'despesa', '#7F1D1D'),
    (NEW.id, 'Marketing e Publicidade', 'despesa', '#F97316'),
    (NEW.id, 'Impostos e Taxas', 'despesa', '#EA580C'),
    (NEW.id, 'Outras Despesas', 'despesa', '#C2410C');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar categorias padrão
DROP TRIGGER IF EXISTS trigger_create_default_categories ON public.empresas;
CREATE TRIGGER trigger_create_default_categories
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories();

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos_servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON public.transacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();