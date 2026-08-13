-- Formularios dinámicos: a diferencia de las Plantillas de checklist (ítems de forma fija
-- Cumple/No cumple/No aplica), un Formulario tiene campos de tipo variable definidos por el
-- usuario (texto, fecha, opciones, archivo) — pensado para registros libres (ej. recepción de
-- mercadería) que no encajan en la lógica de conformidad de un checklist.

CREATE TYPE form_field_type AS ENUM (
  'TEXTO_CORTO',
  'TEXTO_LARGO',
  'FECHA',
  'RADIO',
  'CHECKBOX',
  'DESPLEGABLE',
  'ARCHIVO'
);

CREATE TABLE formulario (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  descripcion text,
  activo      boolean     NOT NULL DEFAULT true,
  created_by  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE formulario_campo (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid            NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  form_id    uuid            NOT NULL REFERENCES formulario(id) ON DELETE CASCADE,
  tipo       form_field_type NOT NULL,
  etiqueta   text            NOT NULL,
  requerido  boolean         NOT NULL DEFAULT false,
  -- Solo aplica a RADIO/CHECKBOX/DESPLEGABLE; NULL para el resto.
  opciones   text[],
  orden      integer         NOT NULL DEFAULT 0,
  CONSTRAINT formulario_campo_orden_unique UNIQUE (form_id, orden) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX formulario_campo_form_idx ON formulario_campo (form_id);

CREATE TABLE formulario_respuesta (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  form_id     uuid        NOT NULL REFERENCES formulario(id) ON DELETE RESTRICT,
  centro_id   uuid REFERENCES centro(id) ON DELETE RESTRICT,
  creado_por  uuid        NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX formulario_respuesta_form_idx ON formulario_respuesta (form_id);

CREATE TABLE formulario_respuesta_valor (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  respuesta_id   uuid NOT NULL REFERENCES formulario_respuesta(id) ON DELETE CASCADE,
  campo_id       uuid NOT NULL REFERENCES formulario_campo(id) ON DELETE RESTRICT,
  valor_texto    text,
  valor_fecha    date,
  -- Selección de RADIO/CHECKBOX/DESPLEGABLE (RADIO y DESPLEGABLE usan un solo elemento).
  valor_opciones text[],
  archivo_url    text,
  CONSTRAINT formulario_respuesta_valor_campo_unique UNIQUE (respuesta_id, campo_id)
);

SELECT enable_tenant_isolation(t) FROM unnest(ARRAY[
  'formulario',
  'formulario_campo',
  'formulario_respuesta',
  'formulario_respuesta_valor'
]::regclass[]) AS t;
