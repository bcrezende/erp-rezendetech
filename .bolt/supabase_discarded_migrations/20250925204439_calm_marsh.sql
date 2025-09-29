/*
  # Criar tabela de notificações

  1. Nova Tabela
    - `notificacoes`
      - `id` (uuid, primary key)
      - `id_empresa` (uuid, foreign key para empresas)
      - `id_usuario` (uuid, foreign key para users)
      - `mensagem` (text, não nulo)
      - `tipo` (text, default 'lembrete')
      - `id_lembrete` (uuid, foreign key para lembretes, opcional)
      - `lida` (boolean, default false)
      - `data_envio` (timestamp, default now())
      - `criado_em` (timestamp, default now())

  2. Segurança
    - Habilitar RLS na tabela `notificacoes`
    - Políticas para usuários autenticados verem apenas suas notificações
    - Políticas para inserção e atualização

  3. Índices
    - Índice para consultas por usuário e status de leitura
    - Índice para consultas por empresa
*/

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sequencial integer GENERATED ALWAYS AS IDENTITY,
  id_empresa uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_usuario uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mensagem text NOT NULL,
  tipo text DEFAULT 'lembrete' CHECK (tipo IN ('lembrete', 'sistema', 'financeiro', 'vencimento')),
  id_lembrete uuid REFERENCES lembretes(id) ON DELETE CASCADE,
  lida boolean DEFAULT false,
  data_envio timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON notificacoes
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

CREATE POLICY "Sistema pode inserir notificações"
  ON notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id_empresa = (
      SELECT id_empresa 
      FROM perfis 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem marcar suas notificações como lidas"
  ON notificacoes
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida 
  ON notificacoes(id_usuario, lida) 
  WHERE lida = false;

CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa 
  ON notificacoes(id_empresa);

CREATE INDEX IF NOT EXISTS idx_notificacoes_data_envio 
  ON notificacoes(data_envio DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_lembrete 
  ON notificacoes(id_lembrete) 
  WHERE id_lembrete IS NOT NULL;