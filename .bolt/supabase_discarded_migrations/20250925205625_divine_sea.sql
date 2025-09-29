```sql
-- CreateTable
CREATE TABLE "public"."notificacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_sequencial" SERIAL,
    "id_empresa" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'sistema',
    "id_lembrete" UUID,
    "lida" BOOLEAN NOT NULL DEFAULT FALSE,
    "data_envio" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "criado_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."notificacoes" ADD CONSTRAINT "notificacoes_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "public"."empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notificacoes" ADD CONSTRAINT "notificacoes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notificacoes" ADD CONSTRAINT "notificacoes_id_lembrete_fkey" FOREIGN KEY ("id_lembrete") REFERENCES "public"."lembretes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_notificacoes_empresa" ON "public"."notificacoes"("id_empresa");

-- CreateIndex
CREATE INDEX "idx_notificacoes_usuario" ON "public"."notificacoes"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_notificacoes_lida" ON "public"."notificacoes"("lida");

-- Enable RLS
ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Notificacoes visiveis apenas para o usuario e empresa" ON "public"."notificacoes"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (id_usuario = auth.uid()) AND
  (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()))
);

CREATE POLICY "Usuarios podem inserir suas proprias notificacoes" ON "public"."notificacoes"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (id_usuario = auth.uid()) AND
  (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()))
);

CREATE POLICY "Usuarios podem atualizar suas proprias notificacoes" ON "public"."notificacoes"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  (id_usuario = auth.uid()) AND
  (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()))
)
WITH CHECK (
  (id_usuario = auth.uid()) AND
  (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()))
);

CREATE POLICY "Usuarios podem deletar suas proprias notificacoes" ON "public"."notificacoes"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  (id_usuario = auth.uid()) AND
  (id_empresa = (SELECT id_empresa FROM public.perfis WHERE id = auth.uid()))
);
```