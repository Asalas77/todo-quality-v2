# API — TO DO QUALITY

NestJS + TypeORM sobre PostgreSQL, en arquitectura hexagonal.

## Arrancar

```bash
npm install
cp .env.example .env
npm run start:dev
```

Requiere la base creada y migrada (ver `../db/README.md`).

## Estructura

```
src/
  shared/tenant/     contexto de tenant y transacción que activa RLS
  auth/
    domain/          entidades y puertos, sin NestJS ni TypeORM
    application/     casos de uso
    infrastructure/  controlador, DTOs, guards, adaptadores de Postgres y JWT
```

Los casos de uso dependen de puertos (`AUTH_REPOSITORY`, `TOKEN_SERVICE`…), nunca de
clases concretas, y se testean con dobles en memoria sin base de datos ni framework.

## Cómo se aplica el aislamiento

1. `TenantContextMiddleware` verifica el JWT y abre el contexto con el `tenantId` firmado.
   Es un middleware y no un guard porque `AsyncLocalStorage.run()` solo mantiene el
   contexto durante su callback: un guard no envuelve la ejecución del handler.
2. `JwtAuthGuard` exige identidad salvo en rutas marcadas con `@Public()`.
3. `PermissionsGuard` compara los códigos de `@RequirePermissions(...)` con los del token.
4. `TenantTransaction.run()` fija `app.current_tenant` en la transacción, que es lo que
   activa las políticas RLS.

El tenant sale exclusivamente del token firmado. Un header o un campo del body que declare
otro tenant se ignora — así es como el sistema legacy filtraba datos entre empresas.

## Endpoints

| Método | Ruta                 | Auth    | Descripción                              |
|--------|----------------------|---------|-------------------------------------------|
| POST   | `/api/auth/register` | pública | Alta de empresa + usuario admin            |
| POST   | `/api/auth/login`    | pública | Devuelve `{ accessToken, expiresIn }`      |
| POST   | `/api/auth/refresh`  | cookie  | Rota el refresh token, devuelve access nuevo |
| POST   | `/api/auth/logout`   | cookie  | Revoca el refresh token (idempotente)      |
| GET    | `/api/auth/me`       | token   | Usuario, tenant y permisos vigentes        |

**Transporte de los tokens**: el access token va en el body de la respuesta y lo maneja
el cliente en memoria (nunca en `localStorage`, para acotar la ventana de robo por XSS).
El refresh token nunca llega al body — viaja como cookie `refresh_token`
(`httpOnly`, `SameSite=Lax`, `path=/api/auth`), así que JavaScript no puede leerlo ni
aunque haya XSS en el frontend. `login` y `refresh` la fijan; `logout` la limpia.
Por eso el cliente debe llamar con `credentials: 'include'` (o `withCredentials: true`
en axios) y `CORS_ORIGIN` debe listar explícitamente los orígenes permitidos — con
cookies de por medio, reflejar cualquier origen dejaría que otro sitio dispare estos
endpoints con las credenciales del usuario.

## Proteger un endpoint nuevo

```typescript
@RequirePermissions('inspecciones.completar')
@Post()
async completar(@Body() dto: CompletarInspeccionDto) { ... }
```

Reglas que dependen de los datos ("solo puede editar la inspección que él completó") no
van en el guard: son lógica de negocio y viven en el caso de uso.
