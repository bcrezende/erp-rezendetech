/*
  # Remove criação automática de categorias padrão

  1. Mudanças
    - Remove o trigger que cria categorias automaticamente para novas empresas
    - Remove a função create_default_categories()
    - Isso evita duplicação de categorias padrão entre empresas

  2. Impacto
    - Novas empresas não receberão mais categorias padrão automaticamente
    - Administradores poderão importar categorias padrão manualmente se desejarem
    - Reduz duplicação desnecessária de dados
*/

-- Remove o trigger de criação automática de categorias
DROP TRIGGER IF EXISTS trigger_create_default_categories ON public.empresas;

-- Remove a função de criação de categorias padrão
DROP FUNCTION IF EXISTS create_default_categories();