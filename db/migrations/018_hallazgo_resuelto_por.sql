-- Auditoría de resolución de hallazgos: resuelto_at ya existía (usado por los conteos
-- de Reportes desde el inicio) pero nada lo escribía nunca y no había registro de QUIÉN
-- lo resolvió. resuelto_por completa ese historial.

ALTER TABLE inspection_answer
  ADD COLUMN resuelto_por uuid REFERENCES app_user(id) ON DELETE SET NULL;
