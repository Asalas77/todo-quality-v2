-- Aislamiento multitenant: segunda capa de defensa bajo el filtrado de la aplicación.
-- Requiere que cada transacción fije app.current_tenant vía set_config(..., true).
-- Sin tenant en contexto no se ve ninguna fila. El NULLIF es necesario además del
-- current_setting(..., true): al terminar una transacción que fijó el valor, Postgres lo
-- deja en cadena vacía (no sin definir), y ''::uuid lanzaría error en la siguiente
-- request que reutilice esa conexión del pool sin fijar tenant.

CREATE OR REPLACE FUNCTION enable_tenant_isolation(target_table regclass)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target_table);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target_table);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s
       USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)
       WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)',
    target_table
  );
END;
$$ LANGUAGE plpgsql;

SELECT enable_tenant_isolation(t) FROM unnest(ARRAY[
  'role',
  'role_permission',
  'app_user',
  'refresh_token',
  'centro',
  'question_category',
  'question_subcategory',
  'checklist_template',
  'template_item',
  'inspection',
  'inspection_answer',
  'schedule'
]::regclass[]) AS t;

-- tenant no lleva tenant_id: su propia PK es el discriminador.
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenant
  USING (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- permission es un catálogo global inmutable para los tenants: legible por todos,
-- escribible solo por migraciones (el rol de la app no recibe INSERT/UPDATE/DELETE).
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;

CREATE POLICY permission_readable ON permission FOR SELECT USING (true);
