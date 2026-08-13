-- El login ocurre antes de saber a qué tenant pertenece el usuario, así que necesita
-- leer app_user sin un tenant en contexto. En vez de darle a la app un rol que evada
-- RLS (una política permisiva extra se combinaría con OR y anularía el aislamiento),
-- se expone una única función que devuelve solo los campos necesarios para autenticar.

CREATE ROLE todo_quality_owner WITH NOLOGIN NOSUPERUSER BYPASSRLS;

-- El owner también posee las tablas que toca el alta de una empresa, que ocurre
-- necesariamente sin tenant en contexto (ver register_tenant en 005).
ALTER TABLE tenant          OWNER TO todo_quality_owner;
ALTER TABLE app_user        OWNER TO todo_quality_owner;
ALTER TABLE role            OWNER TO todo_quality_owner;
ALTER TABLE role_permission OWNER TO todo_quality_owner;
ALTER TABLE permission      OWNER TO todo_quality_owner;

-- Devuelve lo mínimo para verificar la contraseña y saber a qué tenant fijar el contexto.
-- Los permisos NO se resuelven aquí: una vez conocido el tenant, se consultan con RLS activo.
CREATE FUNCTION auth_lookup(p_email citext)
RETURNS TABLE (
  user_id       uuid,
  tenant_id     uuid,
  password_hash text,
  activo        boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.tenant_id, u.password_hash, (u.activo AND t.activo)
  FROM app_user u
  JOIN tenant t ON t.id = u.tenant_id
  WHERE u.email = p_email;
$$;

ALTER FUNCTION auth_lookup(citext) OWNER TO todo_quality_owner;
REVOKE EXECUTE ON FUNCTION auth_lookup(citext) FROM PUBLIC;
