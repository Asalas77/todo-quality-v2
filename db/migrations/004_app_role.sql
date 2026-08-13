-- RLS no aplica a superusuarios ni a roles con BYPASSRLS.
-- La aplicación debe conectarse con este rol, nunca con postgres ni con todo_quality_owner.

CREATE ROLE todo_quality_app WITH LOGIN PASSWORD 'cambiar_en_despliegue' NOSUPERUSER NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO todo_quality_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO todo_quality_app;
GRANT EXECUTE ON FUNCTION auth_lookup(citext) TO todo_quality_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO todo_quality_app;
