-- Catálogo de permisos. Los códigos derivan de las funcionalidades reales del legacy.
-- Agregar uno nuevo es una migración; los tenants no los inventan, solo los agrupan en roles.

INSERT INTO permission (code, descripcion) VALUES
  ('centros.ver',            'Ver centros'),
  ('centros.gestionar',      'Crear, editar y eliminar centros'),
  ('usuarios.ver',           'Ver usuarios'),
  ('usuarios.gestionar',     'Crear, editar y eliminar usuarios'),
  ('roles.gestionar',        'Crear y editar roles y sus permisos'),
  ('plantillas.ver',         'Ver plantillas de checklist'),
  ('plantillas.gestionar',   'Crear, editar y eliminar plantillas de checklist'),
  ('inspecciones.ver',       'Ver las inspecciones propias'),
  ('inspecciones.ver_todas', 'Ver las inspecciones de todos los usuarios de la empresa'),
  ('inspecciones.completar', 'Completar y actualizar inspecciones'),
  ('inspecciones.eliminar',  'Eliminar inspecciones'),
  ('agenda.ver',             'Ver la agenda propia'),
  ('agenda.ver_todas',       'Ver la agenda de todos los usuarios de la empresa'),
  ('agenda.gestionar',       'Programar, reasignar y cancelar inspecciones'),
  ('reportes.ver',           'Ver reportes e indicadores'),
  ('formularios.ver',        'Ver formularios y sus respuestas'),
  ('formularios.gestionar',  'Crear, editar y eliminar formularios'),
  ('formularios.completar',  'Completar formularios');


-- Cada tenant nuevo arranca con estos tres roles. Son editables en sus permisos pero no
-- se pueden borrar ni renombrar, para que siempre exista un rol capaz de administrar.
-- Sin SECURITY DEFINER propio: se invoca desde register_tenant, que ya corre como owner.
CREATE FUNCTION provision_tenant_roles(p_tenant_id uuid)
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
    'formularios.ver', 'formularios.gestionar', 'formularios.completar'
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

-- Alta de una empresa: ocurre sin tenant en contexto, así que es el único camino por el
-- que la aplicación puede escribir cruzando el aislamiento. Atómico a propósito: una
-- empresa sin roles ni administrador quedaría inutilizable.
CREATE FUNCTION register_tenant(
  p_nombre         text,
  p_rut            text,
  p_admin_nombre   text,
  p_admin_apellido text,
  p_admin_email    citext,
  p_password_hash  text
)
RETURNS TABLE (tenant_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  admin_role_id uuid;
  new_user_id   uuid;
BEGIN
  -- Los duplicados se detectan por los constraints en vez de con un SELECT previo:
  -- comprobar antes de insertar deja una ventana en la que otro registro concurrente gana.
  BEGIN
    INSERT INTO tenant (nombre, rut) VALUES (p_nombre, p_rut)
    RETURNING id INTO new_tenant_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'RUT de empresa ya registrado' USING ERRCODE = 'TQ002';
  END;

  admin_role_id := provision_tenant_roles(new_tenant_id);

  BEGIN
    INSERT INTO app_user (tenant_id, role_id, nombre, apellido, email, password_hash)
    VALUES (new_tenant_id, admin_role_id, p_admin_nombre, p_admin_apellido,
            p_admin_email, p_password_hash)
    RETURNING id INTO new_user_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Correo electrónico ya registrado' USING ERRCODE = 'TQ001';
  END;

  RETURN QUERY SELECT new_tenant_id, new_user_id;
END;
$$;

ALTER FUNCTION register_tenant(text, text, text, text, citext, text)
  OWNER TO todo_quality_owner;
REVOKE EXECUTE ON FUNCTION register_tenant(text, text, text, text, citext, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_tenant(text, text, text, text, citext, text)
  TO todo_quality_app;


CREATE FUNCTION protect_system_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'No se puede eliminar un rol de sistema';
  END IF;
  IF NEW.nombre <> OLD.nombre OR NEW.es_sistema <> OLD.es_sistema THEN
    RAISE EXCEPTION 'No se puede renombrar un rol de sistema';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_protect_system
  BEFORE UPDATE OR DELETE ON role
  FOR EACH ROW
  WHEN (OLD.es_sistema)
  EXECUTE FUNCTION protect_system_roles();
