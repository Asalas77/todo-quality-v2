# Desplegar Kontrol en Render (gratis, para pruebas)

Esta vía es mucho más simple que Oracle: no hay servidor que administrar, ni Docker que
instalar a mano, ni certificados que renovar — Render construye y corre todo por ti a
partir del repo de GitHub.

## Qué crea el Blueprint (`render.yaml`, en la raíz del repo)

| Servicio | Tipo | Qué hace |
|---|---|---|
| `kontrol-db` | PostgreSQL free | Base de datos. **Se borra automáticamente a los 30 días** — normal en el free tier, alcanza de sobra para probar. |
| `kontrol-api` | Web Service (Docker) | Corre `api/Dockerfile`. Duerme tras ~15 min sin tráfico; la siguiente visita tarda unos segundos en despertar. |
| `kontrol-web` | Static Site | El build de `web/` (Vite). Nunca duerme, HTTPS y dominio `*.onrender.com` gratis siempre. |

## Pasos

1. **Sube los archivos nuevos al repo** (`render.yaml`, este archivo) con `git push` a
   GitHub — Render lee directo desde ahí.
2. En [render.com](https://render.com), crea cuenta gratis (con GitHub, sin tarjeta).
3. **New → Blueprint** → conecta tu repo `Asalas77/todo-quality-v2` → Render detecta
   `render.yaml` y muestra los 3 servicios a crear → **Apply**.
4. Render pedirá completar dos variables marcadas `sync: false` (no se pueden saber de
   antemano porque dependen de las URLs que Render asigna):
   - En **kontrol-api**: `CORS_ORIGIN` y `FRONTEND_URL` — déjalas vacías por ahora, hay
     que volver después del primer deploy (paso 6).
   - En **kontrol-web**: `VITE_API_URL` — también vacío por ahora.
5. Espera a que los 3 servicios terminen de construirse (el primer build de `kontrol-api`
   tarda varios minutos porque compila TypeScript en Docker).
6. Una vez arriba, Render te da las URLs, algo como:
   - API: `https://kontrol-api.onrender.com`
   - Web: `https://kontrol-web.onrender.com`

   Vuelve a **Environment** de cada servicio y completa lo que quedó vacío:
   - `kontrol-api` → `CORS_ORIGIN` = `https://kontrol-web.onrender.com`,
     `FRONTEND_URL` = `https://kontrol-web.onrender.com`
   - `kontrol-web` → `VITE_API_URL` = `https://kontrol-api.onrender.com/api`

   Guardar cada variable dispara un redeploy automático de ese servicio.
7. **Aplicar las migraciones** — Render Postgres no ejecuta scripts de inicialización
   como Docker local, hay que correrlas a mano una vez. Desde tu PC, con Docker
   instalado (ya lo tienes) y la cadena de conexión externa que Render muestra en
   `kontrol-db → Connect → External Database URL`:
   ```bash
   cd /c/app/todo-quality-v2
   for f in db/migrations/*.sql; do
     docker run --rm -v "$(pwd)/db/migrations:/migrations" postgres:16 \
       psql "<EXTERNAL_DATABASE_URL>" -f "/migrations/$(basename "$f")"
   done
   ```
   (Los archivos `.sql` corren con `psql`; el único `.sh` — `016_set_app_password_from_env.sh`
   — es específico del arranque de Docker local y no aplica aquí, se puede omitir.)
8. Abre `https://kontrol-web.onrender.com` — debería verse el login de Kontrol.

## Limitaciones a tener presentes (por ser free tier, no por el código)

- **Subida de fotos/evidencia**: el disco de `kontrol-api` es efímero en el free tier —
  cualquier archivo subido se pierde si el servicio se reinicia o se vuelve a desplegar.
  Para pruebas puntuales no es problema; para algo más permanente habría que sumar un
  almacenamiento externo (ej. Cloudflare R2 o S3, ambos con capa gratuita).
- **Base de datos con caducidad de 30 días**: si el proyecto sigue en pruebas después de
  ese plazo, crea una `kontrol-db` nueva (o migra a un Postgres gratuito sin caducidad
  como [Neon](https://neon.tech)) y vuelve a correr el paso 7.
- **Primer request lento**: si `kontrol-api` estuvo dormido, la primera petición después
  de un rato de inactividad puede tardar 20-30 segundos en responder — es Render
  despertando el contenedor, no un error.

## Para actualizar después de un cambio de código

Con Blueprint, Render redepliega solo con cada `git push` a la rama conectada (por
defecto `master`). No hace falta ningún comando adicional.
