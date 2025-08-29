/*
  # Adicionar coluna nome_razao_social à tabela transacoes

  1. Alterações na Tabela
    - `transacoes`
      - Adicionar coluna `nome_razao_social` (text, nullable)
      - Criar índice para otimizar buscas por nome
      - Criar trigger para sincronizar automaticamente com a tabela pessoas

  2. Funcionalidades
    - Sincronização automática do nome quando id_pessoa for alterado
    - Índice para buscas rápidas por nome
    - Trigger para manter dados consistentes

  3. Benefícios
    - Consultas mais rápidas sem necessidade de JOINs
    - Facilita relatórios e buscas
    - Mantém histórico do nome mesmo se a pessoa for alterada
*/

-- Adicionar coluna nome_razao_social à tabela transacoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacoes' AND column_name = 'nome_razao_social'
  ) THEN
    ALTER TABLE transacoes ADD COLUMN nome_razao_social text;
  END IF;
END $$;

-- Criar índice para otimizar buscas por nome
CREATE INDEX IF NOT EXISTS idx_transacoes_nome_razao_social 
ON transacoes USING btree (nome_razao_social) 
WHERE nome_razao_social IS NOT NULL;

-- Função para sincronizar nome_razao_social
CREATE OR REPLACE FUNCTION sync_transacao_nome_pessoa()
RETURNS TRIGGER AS $$
BEGIN
  -- Se id_pessoa foi alterado ou é um INSERT, buscar o nome da pessoa
  IF (TG_OP = 'INSERT' AND NEW.id_pessoa IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.id_pessoa IS DISTINCT FROM NEW.id_pessoa AND NEW.id_pessoa IS NOT NULL) THEN
    
    SELECT nome_razao_social INTO NEW.nome_razao_social
    FROM pessoas 
    WHERE id = NEW.id_pessoa;
    
  END IF;
  
  -- Se id_pessoa foi removido, limpar nome_razao_social
  IF TG_OP = 'UPDATE' AND NEW.id_pessoa IS NULL THEN
    NEW.nome_razao_social = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_transacao_nome_pessoa ON transacoes;
CREATE TRIGGER trigger_sync_transacao_nome_pessoa
  BEFORE INSERT OR UPDATE ON transacoes
  FOR EACH ROW
  EXECUTE FUNCTION sync_transacao_nome_pessoa();

-- Atualizar registros existentes com os nomes das pessoas
UPDATE transacoes 
SET nome_razao_social = pessoas.nome_razao_social
FROM pessoas 
WHERE transacoes.id_pessoa = pessoas.id 
AND transacoes.nome_razao_social IS NULL;

-- Função para atualizar transações quando o nome da pessoa mudar
CREATE OR REPLACE FUNCTION update_transacoes_when_pessoa_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o nome da pessoa mudou, atualizar todas as transações relacionadas
  IF OLD.nome_razao_social IS DISTINCT FROM NEW.nome_razao_social THEN
    UPDATE transacoes 
    SET nome_razao_social = NEW.nome_razao_social
    WHERE id_pessoa = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela pessoas para sincronizar mudanças de nome
DROP TRIGGER IF EXISTS trigger_update_transacoes_pessoa_name ON pessoas;
CREATE TRIGGER trigger_update_transacoes_pessoa_name
  AFTER UPDATE ON pessoas
  FOR EACH ROW
  EXECUTE FUNCTION update_transacoes_when_pessoa_changes();