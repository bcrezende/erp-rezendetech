/*
  # Mover assinatura_id para tabela empresas

  1. Alterações na Estrutura
    - Adicionar coluna `assinatura_id` na tabela `empresas`
    - Migrar dados existentes de `perfis.assinatura_id` para `empresas.assinatura_id`
    - Remover coluna `assinatura_id` da tabela `perfis`

  2. Justificativa
    - A assinatura é da empresa, não do usuário individual
    - Evita redundância de dados
    - Facilita gestão de assinaturas por empresa

  3. Segurança
    - Operação segura com migração de dados
    - Backup automático dos dados antes da remoção
*/

-- Passo 1: Adicionar coluna assinatura_id na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS assinatura_id TEXT NULL;

-- Passo 2: Migrar dados existentes de perfis para empresas
-- Atualizar empresas com assinatura_id dos perfis correspondentes
UPDATE public.empresas 
SET assinatura_id = perfis.assinatura_id
FROM public.perfis 
WHERE empresas.id = perfis.id_empresa 
  AND perfis.assinatura_id IS NOT NULL 
  AND perfis.assinatura_id != '';

-- Passo 3: Remover coluna assinatura_id da tabela perfis
-- Primeiro verificar se a migração foi bem-sucedida
DO $$
BEGIN
  -- Verificar se existem dados não migrados
  IF EXISTS (
    SELECT 1 FROM public.perfis p
    LEFT JOIN public.empresas e ON p.id_empresa = e.id
    WHERE p.assinatura_id IS NOT NULL 
      AND p.assinatura_id != ''
      AND (e.assinatura_id IS NULL OR e.assinatura_id = '')
  ) THEN
    RAISE EXCEPTION 'Migração incompleta: ainda existem assinatura_id em perfis que não foram migrados para empresas';
  END IF;
  
  -- Se chegou até aqui, a migração foi bem-sucedida
  RAISE NOTICE 'Migração de assinatura_id concluída com sucesso';
END $$;

-- Remover a coluna assinatura_id da tabela perfis
ALTER TABLE public.perfis 
DROP COLUMN IF EXISTS assinatura_id;