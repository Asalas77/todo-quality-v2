#!/bin/bash
# Arranque en dos pasos para el primer certificado real de Let's Encrypt: nginx no puede
# levantar el bloque HTTPS sin un certificado ya existente, así que primero se genera uno
# autofirmado "de mentira" solo para que arranque, se pide el real por HTTP (webroot), y
# recién ahí se reinicia nginx con el certificado de verdad.
#
# Basado en el patrón estándar de certbot+nginx+docker-compose (wmnnd/certbot-nginx).
# Uso: desde la raíz del repo, en el servidor: ./deploy/init-letsencrypt.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.prod ]; then
  echo "Falta .env.prod en la raíz del repo (copia deploy/.env.prod.example y completa los valores)." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env.prod
set +a

: "${DOMAIN:?Falta DOMAIN en .env.prod}"
: "${LETSENCRYPT_EMAIL:?Falta LETSENCRYPT_EMAIL en .env.prod}"
STAGING="${LETSENCRYPT_STAGING:-0}"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

echo "### Creando certificado autofirmado temporal para $DOMAIN ..."
# Se crea DENTRO del volumen certbot_conf (el mismo que 'web' monta en /etc/letsencrypt)
# corriendo un one-off contra el servicio 'certbot', así nunca hay que adivinar el
# nombre real del volumen con el que Compose lo prefija.
$COMPOSE run --rm --entrypoint sh certbot -c "
  apk add --no-cache openssl >/dev/null 2>&1
  mkdir -p /etc/letsencrypt/live/$DOMAIN
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj /CN=localhost
"

echo "### Levantando 'web' con el certificado temporal ..."
$COMPOSE up -d db api web

echo "### Esperando a que nginx responda ..."
sleep 5

echo "### Borrando el certificado temporal para pedir el real ..."
$COMPOSE run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf
"

STAGING_ARG=""
if [ "$STAGING" != "0" ]; then
  STAGING_ARG="--staging"
  echo "### Modo staging activo (certificado de prueba, no válido para el navegador) ###"
fi

echo "### Pidiendo el certificado real a Let's Encrypt ..."
$COMPOSE run --rm --entrypoint "certbot" certbot \
  certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email "$LETSENCRYPT_EMAIL" \
    -d "$DOMAIN" \
    --rsa-key-size 2048 \
    --agree-tos \
    --non-interactive

echo "### Reiniciando 'web' con el certificado real ..."
$COMPOSE restart web

echo "### Listo. Iniciando certbot (renovación automática) ..."
$COMPOSE up -d certbot

echo "### Todo arriba. Revisa https://$DOMAIN"
