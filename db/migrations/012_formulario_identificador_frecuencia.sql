-- Los formularios ganan identificador y frecuencia, igual que las plantillas de checklist,
-- para que ambos se administren con el mismo criterio dentro de "Plantillas". Reusa el enum
-- checklist_frequency en vez de crear uno propio: es la misma noción de "cada cuánto".
--
-- Migración forward (no se recrea la base): ya hay formularios de prueba en uso. Se agregan
-- las columnas nullable, se backfillea con un identificador derivado del nombre, y recién
-- ahí se exige NOT NULL + unicidad — mismo patrón de tres pasos que cualquier columna nueva
-- sobre una tabla con filas existentes.

CREATE EXTENSION IF NOT EXISTS "unaccent";

ALTER TABLE formulario ADD COLUMN identificador text;
ALTER TABLE formulario ADD COLUMN frecuencia checklist_frequency;

-- Backfill determinístico a partir del nombre (mayúsculas, sin acentos ni espacios, con un
-- sufijo numérico si dos formularios generan el mismo slug) — solo corre una vez, sobre las
-- filas que ya existían al momento de esta migración.
WITH numerado AS (
  SELECT
    id,
    upper(regexp_replace(unaccent(nombre), '[^a-zA-Z0-9]+', '-', 'g')) AS base,
    row_number() OVER (
      PARTITION BY upper(regexp_replace(unaccent(nombre), '[^a-zA-Z0-9]+', '-', 'g'))
      ORDER BY created_at
    ) AS n
  FROM formulario
)
UPDATE formulario f
SET identificador = numerado.base || CASE WHEN numerado.n > 1 THEN '-' || numerado.n ELSE '' END
FROM numerado
WHERE f.id = numerado.id;

UPDATE formulario SET frecuencia = 'DIARIO' WHERE frecuencia IS NULL;

ALTER TABLE formulario ALTER COLUMN identificador SET NOT NULL;
ALTER TABLE formulario ALTER COLUMN frecuencia SET NOT NULL;

ALTER TABLE formulario
  ADD CONSTRAINT formulario_identificador_unique UNIQUE (tenant_id, identificador);
