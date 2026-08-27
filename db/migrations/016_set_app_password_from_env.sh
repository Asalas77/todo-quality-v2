#!/bin/sh
# Solo actúa en un despliegue real (docker-compose.prod.yml pasa APP_DB_PASSWORD).
# En desarrollo local (docker-compose.yml, o el Postgres instalado a mano) esta variable
# no existe y el script no hace nada — 004_app_role.sql deja su contraseña de siempre.
set -e

if [ -n "$APP_DB_PASSWORD" ]; then
  psql -v ON_ERROR_STOP=1 --username postgres --dbname todoquality \
    -c "ALTER ROLE todo_quality_app WITH PASSWORD '$APP_DB_PASSWORD';"
fi
