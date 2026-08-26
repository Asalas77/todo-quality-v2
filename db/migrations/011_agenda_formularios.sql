-- La agenda nació programando solo checklists. Ahora también programa formularios, así que
-- lo agendado pasa a ser "una plantilla de checklist O un formulario", nunca ambos ni ninguno.
--
-- Migración forward (no se recrea la base) porque ya hay datos de prueba en uso: template_id
-- pasa de NOT NULL a nullable y se agrega form_id con un CHECK que preserva la exclusividad.

ALTER TABLE schedule ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE schedule
  ADD COLUMN form_id uuid REFERENCES formulario(id) ON DELETE CASCADE;

-- Al completar lo agendado se enlaza el resultado: una inspección (checklist) o una
-- respuesta de formulario. Igual que template_id/form_id, solo uno aplica.
ALTER TABLE schedule
  ADD COLUMN form_respuesta_id uuid REFERENCES formulario_respuesta(id) ON DELETE SET NULL;

ALTER TABLE schedule
  ADD CONSTRAINT schedule_target_exclusive CHECK (
    (template_id IS NOT NULL AND form_id IS NULL)
    OR
    (template_id IS NULL AND form_id IS NOT NULL)
  );

-- El resultado enlazado debe corresponder al tipo agendado: una inspección solo cuelga de un
-- checklist, una respuesta de formulario solo de un formulario.
ALTER TABLE schedule
  ADD CONSTRAINT schedule_result_matches_target CHECK (
    (inspection_id IS NULL OR template_id IS NOT NULL)
    AND
    (form_respuesta_id IS NULL OR form_id IS NOT NULL)
  );

CREATE INDEX schedule_form_idx ON schedule (form_id);
