import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/auth';

/**
 * El refresh token vive solo en una cookie httpOnly: JavaScript nunca puede leerlo, así
 * que un XSS en el frontend no puede robarlo, a diferencia del access token (en memoria,
 * de vida corta) o de un token guardado en localStorage.
 */
function cookieOptions(config: ConfigService, maxAgeMs: number): CookieOptions {
  // Un túnel (ej. devtunnels) sirve la API y el frontend en dos orígenes distintos, así
  // que la cookie viaja cross-site — SameSite=Lax no se manda en esos POST y rompe login.
  // SameSite=None exige Secure=true (el navegador la descarta si no), por eso viene junto.
  // Nunca activar en despliegues reales: solo para probar contra un túnel HTTPS en dev.
  const crossSite = config.get('COOKIE_CROSS_SITE') === 'true';
  return {
    httpOnly: true,
    secure: crossSite || config.get('NODE_ENV') === 'production',
    sameSite: crossSite ? 'none' : 'lax',
    path: COOKIE_PATH,
    maxAge: maxAgeMs,
  };
}

export function setRefreshCookie(
  res: Response,
  config: ConfigService,
  token: string,
): void {
  const ttlDays = Number(config.get('REFRESH_TOKEN_TTL_DAYS', 30));
  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    cookieOptions(config, ttlDays * 24 * 60 * 60 * 1000),
  );
}

export function clearRefreshCookie(res: Response, config: ConfigService): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(config, 0));
}
