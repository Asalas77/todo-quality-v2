-- Comentarios y soporte: cualquier usuario autenticado puede dejar un comentario/reporte
-- desde el diálogo de "Soporte y comentarios" del frontend. Solo Administrador (permiso
-- usuarios.gestionar, ya existente) puede ver la tabla con los comentarios de su empresa.

CREATE TABLE comentario (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usuario_id  uuid        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  mensaje     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comentario_tenant_created_idx ON comentario (tenant_id, created_at DESC);

SELECT enable_tenant_isolation(t) FROM unnest(ARRAY[
  'comentario'
]::regclass[]) AS t;
