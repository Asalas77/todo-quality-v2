# Base de datos — TO DO QUALITY

PostgreSQL con aislamiento multitenant por Row Level Security. Probado en 16 y 18.

## Aplicar

Contra el Postgres instalado en la máquina (usuario con permisos de superusuario, porque
las migraciones crean roles y cambian propietarios de tablas):

```bash
createdb -U <admin> todoquality
```

Luego, en orden numérico:

```bash
for f in migrations/*.sql; do psql -U <admin> -d todoquality -v ON_ERROR_STOP=1 -f "$f"; done
```

Cambiar la contraseña de `todo_quality_app` en `004_app_role.sql` antes de cualquier
despliegue. Como alternativa hay un `docker-compose.yml` en la raíz que aplica todo esto
en el primer arranque; usa el puerto 55432 para no chocar con un Postgres local.

## Verificar el aislamiento

```bash
psql -U <admin> -d todoquality -f tests/seed_test_data.sql
psql "postgresql://todo_quality_app:...@localhost:5432/todoquality" -f tests/rls_isolation_test.sql
```

El test debe correr como `todo_quality_app`. Corriéndolo como superusuario pasa siempre y
no prueba nada, porque los superusuarios evaden RLS.

## Reglas que el backend debe respetar

- Conectarse como `todo_quality_app`. Nunca como un superusuario ni como
  `todo_quality_owner`: ambos evaden RLS y las políticas quedarían de adorno.
- Fijar el tenant en cada transacción con `set_config('app.current_tenant', <uuid>, true)`.
  El tercer argumento `true` lo limita a la transacción; sin él el valor se filtra a la
  siguiente request que reutilice la conexión del pool.
- Las operaciones que ocurren antes de conocer el tenant tienen funciones dedicadas
  (`auth_lookup`, `register_tenant`, `refresh_token_lookup`, `refresh_token_revoke`).
  Son el único camino para leer o escribir sin tenant en contexto, y devuelven solo lo
  imprescindible. No añadir políticas RLS permisivas para estos casos: se combinan con OR
  con la política de aislamiento y la anularían por completo.

## Roles y permisos

`permission` es un catálogo global e inmutable para los tenants. Cada empresa agrupa esos
códigos en roles propios; `register_tenant` aprovisiona tres de sistema (Administrador,
Supervisor, Inspector) que pueden cambiar sus permisos pero no borrarse ni renombrarse.

Las decisiones de autorización se toman contra los códigos de permiso, nunca contra el
nombre del rol: un tenant puede renombrar o crear roles y el código no debe enterarse.
