-- Las respuestas de formulario ganan estado BORRADOR/ENVIADA, igual que una inspección
-- puede guardarse a medias — hasta ahora un formulario era todo o nada: se entraba a
-- completar, se enviaba de un tirón, sin forma de guardar y volver después.

CREATE TYPE form_response_status AS ENUM ('BORRADOR', 'ENVIADA');

-- Las respuestas ya existentes se crearon con el flujo anterior (todo o nada), así que
-- fueron enviadas de una — el default BORRADOR aplica solo hacia adelante.
ALTER TABLE formulario_respuesta ADD COLUMN estado form_response_status NOT NULL DEFAULT 'BORRADOR';
UPDATE formulario_respuesta SET estado = 'ENVIADA';

ALTER TABLE formulario_respuesta ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Como mucho un borrador vigente por persona y formulario — reabrir "completar" retoma
-- ese borrador en vez de crear uno nuevo. Único porque es parcial (solo mientras
-- estado = 'BORRADOR'): una vez enviada, la fila deja de contar para esta restricción.
CREATE UNIQUE INDEX formulario_respuesta_borrador_unique
  ON formulario_respuesta (form_id, creado_por)
  WHERE estado = 'BORRADOR';
