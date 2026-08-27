# Desplegar Kontrol en Oracle Cloud (Always Free) con Docker

Todo lo de acá corre dentro del tier "Always Free" de Oracle Cloud, sin costo, siempre y
cuando no superes los límites del tier (esta app no se acerca ni de lejos).

## 1. Crear la instancia en Oracle Cloud

1. Entra a la consola de Oracle Cloud (cloud.oracle.com) → **Compute → Instances → Create instance**.
2. **Image and shape**:
   - Imagen: **Canonical Ubuntu 22.04** (o la que venga marcada por defecto).
   - Shape: cambia a **Ampere (ARM) → VM.Standard.A1.Flex**, y bájala a **1 OCPU / 6 GB RAM**
     (el tier Always Free te da hasta 4 OCPU / 24 GB en total entre todas tus instancias A1;
     con 1 OCPU/6GB sobra para esta app y dejas margen para más adelante).
     Debe decir "Always Free eligible" al lado.

   > **Si aparece "Out of host capacity"** — es el problema más común del tier gratuito, no
   > es un error tuyo: las máquinas Ampere están muy demandadas y Oracle no siempre tiene
   > libres. Opciones, en orden:
   > 1. Cambiar el **Availability Domain** (AD-1 / AD-2 / AD-3) en el mismo asistente y reintentar.
   > 2. Reintentar más tarde — la disponibilidad va rotando durante el día.
   > 3. Usar el shape **VM.Standard.E2.1.Micro** (AMD), que también es Always Free y casi
   >    siempre está disponible. **Ojo**: solo trae 1 OCPU y 1 GB de RAM. La app corre, pero
   >    construir la imagen del frontend ahí se queda sin memoria. Si terminas en este shape,
   >    agrégale swap antes de construir:
   >    ```bash
   >    sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
   >    sudo mkswap /swapfile && sudo swapon /swapfile
   >    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   >    ```
3. **Networking**: deja la VCN por defecto que Oracle ofrece crear (ya trae un Internet
   Gateway). Que quede marcado "Assign a public IPv4 address".
4. **Add SSH keys**: sube tu llave pública (el archivo `.pub` de las llaves que ya
   tienes). Si tus llaves están en este PC, la pública normalmente vive en algo como
   `C:\Users\<tu-usuario>\.ssh\id_ed25519.pub` o `id_rsa.pub`.
5. Crear. Espera a que el estado quede "Running" y copia la **Public IP address**.

## 2. Abrir los puertos 80 y 443

Por defecto Oracle solo deja pasar el 22 (SSH). Hay que abrirlo en **dos lugares**, si
falta cualquiera de los dos no entra tráfico:

**a) Security List de la VCN** (firewall de la nube):
- Consola → **Networking → Virtual Cloud Networks** → tu VCN → **Security Lists** → la lista por defecto → **Add Ingress Rules**.
- Agrega dos reglas, Source CIDR `0.0.0.0/0`, protocolo TCP, puerto destino `80` y otra con `443`.

**b) Firewall del sistema operativo** (dentro de la VM, por SSH):
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4
```
(En Ubuntu 22.04 de Oracle a veces no viene `netfilter-persistent`; si el comando falla,
solo faltará re-ejecutar las dos reglas de `iptables -I` si la VM se reinicia — no es
grave, se nota enseguida porque el sitio deja de responder.)

## 3. Apuntar tu dominio

En el proveedor de tu dominio, crea un registro **A** apuntando al IP público de la
instancia (ej. `kontrol.tudominio.com` → `123.45.67.89`). Espera a que propague (unos
minutos a un par de horas) — puedes revisar con `nslookup tudominio.com` antes de seguir.

## 4. Instalar Docker en la instancia

Conéctate por SSH (usuario `ubuntu` en Ubuntu de Oracle):
```bash
ssh -i /ruta/a/tu/llave_privada ubuntu@<IP_PUBLICA>
```
Ya adentro:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

## 5. Copiar el proyecto y configurar

Desde tu PC, copia el repo a la instancia (o clónalo ahí directo si está en un remoto):
```bash
rsync -avz --exclude node_modules --exclude dist -e "ssh -i /ruta/a/tu/llave_privada" \
  C:/app/todo-quality-v2/ ubuntu@<IP_PUBLICA>:~/todo-quality-v2/
```
En la instancia:
```bash
cd ~/todo-quality-v2
cp deploy/.env.prod.example .env.prod
nano .env.prod   # completa DOMAIN, LETSENCRYPT_EMAIL, y las 3 contraseñas/secreto
```
Genera las contraseñas/secreto con, por ejemplo:
```bash
openssl rand -base64 32   # repite para cada valor que pide "cambiar-por-..."
```

## 6. Levantar todo y pedir el certificado

```bash
chmod +x deploy/init-letsencrypt.sh
./deploy/init-letsencrypt.sh
```
Este script: crea un certificado de mentira para que nginx pueda arrancar, levanta
`db` + `api` + `web`, pide el certificado real a Let's Encrypt validando por HTTP, y
reinicia `web` ya con el certificado bueno. Al final deja corriendo `certbot` en un loop
que renueva solo cuando corresponde (Let's Encrypt dura 90 días).

Si algo falla la primera vez, corre primero con `LETSENCRYPT_STAGING=1` en `.env.prod`
para no gastar los intentos reales de Let's Encrypt (tiene límite semanal), y una vez que
el flujo completo funcione, vuelve a `0` y corre el script de nuevo.

## 7. Verificar

Abre `https://tudominio.com` — deberías ver el login de Kontrol con candado válido.

## Para actualizar después de un cambio de código

```bash
cd ~/todo-quality-v2
git pull   # o volver a copiar con rsync
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
(`db` no se reconstruye — sus migraciones nuevas hay que aplicarlas a mano igual que en
desarrollo, conectándote con `psql` desde la instancia o vía un túnel SSH.)

## Notas

- **Nada de esto genera costo** dentro de los límites del Always Free tier: 1 instancia
  Ampere A1 pequeña, tráfico saliente hasta 10 TB/mes, y los certificados de Let's
  Encrypt son gratis siempre.
- El `docker-compose.yml` de la raíz (sin `.prod`) sigue siendo solo la alternativa de
  Postgres para desarrollo local — no se toca ni se usa en este flujo.
- `COOKIE_CROSS_SITE` queda en `false` en producción a propósito: web y API comparten el
  mismo dominio (todo pasa por `web`, que hace de proxy hacia `api`), así que la cookie de
  sesión nunca es cross-site — ese problema solo existía al probar por dos túneles con
  orígenes distintos.
