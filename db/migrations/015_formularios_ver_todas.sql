-- Formularios no distinguía "ver lo mío" de "ver todo": cualquiera con 'formularios.ver'
-- veía las respuestas de todos los usuarios, sin excepción. Se agrega el mismo patrón que
-- ya existe para inspecciones/agenda: un permiso 'ver_todas' que separa a Administrador y
-- Supervisor (supervisión real del equipo) de Inspector (solo lo suyo).

INSERT INTO permission (code, descripcion) VALUES
  ('formularios.ver_todas', 'Ver las respuestas de formularios de todos los usuarios de la empresa');

-- Redefine provision_tenant_roles (nuevos tenants) agregando el permiso al set de Supervisor.
-- Administrador sigue tomando todos los códigos vía "SELECT code FROM permission", así que
-- no necesita mención explícita.
CREATE OR REPLACE FUNCTION provision_tenant_roles(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  admin_role_id uuid;
  supervisor_role_id uuid;
  inspector_role_id uuid;
BEGIN
  INSERT INTO role (tenant_id, nombre, descripcion, es_sistema)
  VALUES (p_tenant_id, 'Administrador', 'Acceso completo a la empresa', true)
  RETURNING id INTO admin_role_id;

  INSERT INTO role (tenant_id, nombre, descripcion, es_sistema)
  VALUES (p_tenant_id, 'Supervisor', 'Supervisa inspecciones y agenda de todo el equipo', true)
  RETURNING id INTO supervisor_role_id;

  INSERT INTO role (tenant_id, nombre, descripcion, es_sistema)
  VALUES (p_tenant_id, 'Inspector', 'Completa las inspecciones que tiene asignadas', true)
  RETURNING id INTO inspector_role_id;

  INSERT INTO role_permission (tenant_id, role_id, permission_code)
  SELECT p_tenant_id, admin_role_id, code FROM permission;

  INSERT INTO role_permission (tenant_id, role_id, permission_code)
  SELECT p_tenant_id, supervisor_role_id, code FROM permission
  WHERE code IN (
    'centros.ver', 'usuarios.ver',
    'plantillas.ver', 'plantillas.gestionar',
    'inspecciones.ver', 'inspecciones.ver_todas', 'inspecciones.completar',
    'agenda.ver', 'agenda.ver_todas', 'agenda.gestionar',
    'reportes.ver',
    'formularios.ver', 'formularios.ver_todas', 'formularios.gestionar', 'formularios.completar'
  );

  INSERT INTO role_permission (tenant_id, role_id, permission_code)
  SELECT p_tenant_id, inspector_role_id, code FROM permission
  WHERE code IN (
    'centros.ver', 'plantillas.ver',
    'inspecciones.ver', 'inspecciones.completar',
    'agenda.ver',
    'formularios.ver', 'formularios.completar'
  );

  RETURN admin_role_id;
END;
$$;

-- Backfill para tenants que ya existían antes de esta migración: Administrador y
-- Supervisor de cada empresa reciben el permiso nuevo; Inspector no.
INSERT INTO role_permission (tenant_id, role_id, permission_code)
SELECT r.tenant_id, r.id, 'formularios.ver_todas'
FROM role r
WHERE r.nombre IN ('Administrador', 'Supervisor')
ON CONFLICT (role_id, permission_code) DO NOTHING;
