-- TO DO QUALITY — esquema inicial
-- Multitenant por tenant_id compartido; el aislamiento se aplica en 002_rls_policies.sql
-- Un usuario pertenece a exactamente un tenant, por lo que su rol vive en app_user.role_id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Frecuencias confirmadas contra el código legacy (CrearChecklist.vue): no incluye
-- Mensual ni Anual, aunque pudiera parecer una omisión.
CREATE TYPE checklist_frequency AS ENUM ('DIARIO', 'SEMANAL', 'BIMESTRAL', 'TRIMESTRAL');
CREATE TYPE item_criticality AS ENUM ('BASICO', 'CRITICO');
CREATE TYPE inspection_status AS ENUM ('BORRADOR', 'CONFORME', 'NO_CONFORME');
CREATE TYPE answer_status AS ENUM ('CUMPLE', 'NO_CUMPLE', 'NO_APLICA');
CREATE TYPE schedule_status AS ENUM ('PENDIENTE', 'COMPLETADA', 'CANCELADA');


CREATE TABLE tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  rut         text        NOT NULL UNIQUE,
  activo      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- Catálogo global e inmutable para los tenants: la unidad atómica de autorización.
-- Las decisiones de permiso se toman contra estos códigos, nunca contra nombres de rol.
CREATE TABLE permission (
  code        text PRIMARY KEY,
  descripcion text NOT NULL
);


CREATE TABLE role (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  descripcion text,
  -- Los roles de sistema se aprovisionan con cada tenant y no se pueden borrar ni renombrar.
  es_sistema  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_nombre_unique UNIQUE (tenant_id, nombre)
);

CREATE INDEX role_tenant_idx ON role (tenant_id);


CREATE TABLE role_permission (
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  role_id         uuid NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permission(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE INDEX role_permission_tenant_idx ON role_permission (tenant_id);


CREATE TABLE app_user (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  role_id        uuid        NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
  nombre         text        NOT NULL,
  apellido       text        NOT NULL,
  email          citext      NOT NULL,
  password_hash  text        NOT NULL,
  rut            text,
  activo         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_user_email_unique UNIQUE (email)
);

CREATE INDEX app_user_tenant_idx ON app_user (tenant_id);
CREATE INDEX app_user_role_idx ON app_user (role_id);


-- Se guarda solo el hash: un volcado de esta tabla no permite suplantar sesiones.
CREATE TABLE refresh_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_token_user_idx ON refresh_token (user_id) WHERE revoked_at IS NULL;


CREATE TABLE centro (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  direccion   text,
  activo      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT centro_nombre_unique UNIQUE (tenant_id, nombre)
);

CREATE INDEX centro_tenant_idx ON centro (tenant_id);


CREATE TABLE question_category (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  descripcion text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_category_unique UNIQUE (tenant_id, descripcion)
);

CREATE TABLE question_subcategory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  category_id  uuid        NOT NULL REFERENCES question_category(id) ON DELETE CASCADE,
  descripcion  text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_subcategory_unique UNIQUE (category_id, descripcion)
);

CREATE INDEX question_subcategory_category_idx ON question_subcategory (category_id);


CREATE TABLE checklist_template (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid                NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nombre         text                NOT NULL,
  identificador  text                NOT NULL,
  frecuencia     checklist_frequency NOT NULL,
  vigencia       date,
  activo         boolean             NOT NULL DEFAULT true,
  created_by     uuid REFERENCES app_user(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at     timestamptz         NOT NULL DEFAULT now(),
  updated_at     timestamptz         NOT NULL DEFAULT now(),
  CONSTRAINT checklist_template_identificador_unique UNIQUE (tenant_id, identificador)
);

CREATE INDEX checklist_template_tenant_idx ON checklist_template (tenant_id);


CREATE TABLE template_item (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid             NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  template_id      uuid             NOT NULL REFERENCES checklist_template(id) ON DELETE CASCADE,
  category_id      uuid REFERENCES question_category(id) ON DELETE SET NULL,
  subcategory_id   uuid REFERENCES question_subcategory(id) ON DELETE SET NULL,
  descripcion      text             NOT NULL,
  criticidad       item_criticality NOT NULL DEFAULT 'BASICO',
  orden            integer          NOT NULL DEFAULT 0,
  created_at       timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT template_item_orden_unique UNIQUE (template_id, orden) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX template_item_template_idx ON template_item (template_id);


CREATE TABLE inspection (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid              NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  template_id  uuid              NOT NULL REFERENCES checklist_template(id) ON DELETE RESTRICT,
  centro_id    uuid              NOT NULL REFERENCES centro(id) ON DELETE RESTRICT,
  inspector_id uuid              NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  fecha        date              NOT NULL,
  estado       inspection_status NOT NULL DEFAULT 'BORRADOR',
  created_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at   timestamptz       NOT NULL DEFAULT now(),
  updated_at   timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX inspection_tenant_fecha_idx ON inspection (tenant_id, fecha DESC);
CREATE INDEX inspection_centro_idx ON inspection (centro_id);
CREATE INDEX inspection_estado_idx ON inspection (tenant_id, estado);
CREATE INDEX inspection_inspector_idx ON inspection (inspector_id);


CREATE TABLE inspection_answer (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  inspection_id     uuid          NOT NULL REFERENCES inspection(id) ON DELETE CASCADE,
  template_item_id  uuid          NOT NULL REFERENCES template_item(id) ON DELETE RESTRICT,
  estado            answer_status,
  observacion       text,
  evidencia_url     text,
  plan_accion       text,
  fecha_compromiso  date,
  fecha_control     date,
  responsable       text,
  resuelto_at       timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT inspection_answer_item_unique UNIQUE (inspection_id, template_item_id),
  -- Un hallazgo "no cumple" no existe sin sus 4 campos (confirmado en el legacy:
  -- CompletarChecklist.vue exige plan, fecha de compromiso, fecha de control y
  -- responsable antes de aceptar la respuesta); el resto de estados no los llevan.
  CONSTRAINT inspection_answer_plan_accion_check CHECK (
    estado <> 'NO_CUMPLE'
    OR (
      plan_accion IS NOT NULL
      AND fecha_compromiso IS NOT NULL
      AND fecha_control IS NOT NULL
      AND responsable IS NOT NULL
    )
  )
);

CREATE INDEX inspection_answer_inspection_idx ON inspection_answer (inspection_id);
CREATE INDEX inspection_answer_pendientes_idx ON inspection_answer (tenant_id, fecha_compromiso)
  WHERE estado = 'NO_CUMPLE' AND resuelto_at IS NULL;


CREATE TABLE schedule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid            NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  template_id   uuid            NOT NULL REFERENCES checklist_template(id) ON DELETE CASCADE,
  centro_id     uuid            NOT NULL REFERENCES centro(id) ON DELETE CASCADE,
  asignado_a    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  asunto        text,
  fecha         date            NOT NULL,
  estado        schedule_status NOT NULL DEFAULT 'PENDIENTE',
  inspection_id uuid REFERENCES inspection(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX schedule_tenant_fecha_idx ON schedule (tenant_id, fecha);
CREATE INDEX schedule_asignado_idx ON schedule (asignado_a, estado);
