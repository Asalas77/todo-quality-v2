-- Datos mínimos para la prueba de aislamiento: dos empresas dadas de alta por la vía real
-- (register_tenant), cada una con un centro y una inspección.

SELECT tenant_id AS tenant_a FROM register_tenant(
  'Empresa A', '11.111.111-1', 'Ana', 'Admin', 'admin@empresa-a.test', 'hash-a'
) \gset

SELECT tenant_id AS tenant_b FROM register_tenant(
  'Empresa B', '22.222.222-2', 'Beto', 'Admin', 'admin@empresa-b.test', 'hash-b'
) \gset

BEGIN;
SELECT set_config('app.current_tenant', :'tenant_a', true);

INSERT INTO centro (tenant_id, nombre, direccion)
VALUES (:'tenant_a', 'Planta Norte', 'Calle A 100');

INSERT INTO checklist_template (tenant_id, nombre, identificador, frecuencia)
VALUES (:'tenant_a', 'Higiene diaria', 'HIG-01', 'DIARIO');

INSERT INTO inspection (tenant_id, template_id, centro_id, inspector_id, fecha, estado)
SELECT :'tenant_a', t.id, c.id, u.id, current_date, 'CONFORME'
FROM checklist_template t, centro c, app_user u
WHERE t.tenant_id = :'tenant_a' AND c.tenant_id = :'tenant_a' AND u.tenant_id = :'tenant_a';
COMMIT;

BEGIN;
SELECT set_config('app.current_tenant', :'tenant_b', true);

INSERT INTO centro (tenant_id, nombre, direccion)
VALUES (:'tenant_b', 'Planta Sur', 'Calle B 200');

INSERT INTO checklist_template (tenant_id, nombre, identificador, frecuencia)
VALUES (:'tenant_b', 'Higiene diaria', 'HIG-01', 'DIARIO');

INSERT INTO inspection (tenant_id, template_id, centro_id, inspector_id, fecha, estado)
SELECT :'tenant_b', t.id, c.id, u.id, current_date, 'CONFORME'
FROM checklist_template t, centro c, app_user u
WHERE t.tenant_id = :'tenant_b' AND c.tenant_id = :'tenant_b' AND u.tenant_id = :'tenant_b';
COMMIT;
