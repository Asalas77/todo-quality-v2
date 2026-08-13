import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

function buildService(env: Record<string, string | number | undefined>) {
  const jwt = new JwtService({ secret: 'secreto-de-pruebas' });
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;

  return new JwtTokenService(jwt, config);
}

describe('JwtTokenService', () => {
  it('trata el TTL como segundos aunque llegue como string desde el entorno', async () => {
    // Regresión: con expiresIn: "900" (string), jsonwebtoken interpreta milisegundos
    // y emite tokens ya vencidos.
    const service = buildService({ ACCESS_TOKEN_TTL_SECONDS: '900' });

    const token = await service.issueAccessToken({
      sub: 'user-1',
      tenantId: 'tenant-1',
      permissions: [],
    });

    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('el token recién emitido es verificable', async () => {
    const service = buildService({ ACCESS_TOKEN_TTL_SECONDS: '900' });

    const token = await service.issueAccessToken({
      sub: 'user-1',
      tenantId: 'tenant-1',
      permissions: ['centros.ver'],
    });

    const payload = await service.verifyAccessToken(token);
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.permissions).toEqual(['centros.ver']);
  });

  it('calcula la expiración del refresh en días, no concatenando strings', () => {
    const service = buildService({ REFRESH_TOKEN_TTL_DAYS: '30' });

    const { expiresAt } = service.issueRefreshToken();
    const days = Math.round(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    expect(days).toBe(30);
  });

  it('emite refresh tokens opacos, distintos y guardados como hash', () => {
    const service = buildService({});

    const first = service.issueRefreshToken();
    const second = service.issueRefreshToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(first.token);
    expect(first.tokenHash).toBe(service.hashRefreshToken(first.token));
  });

  it('usa los valores por defecto cuando la variable no está definida', () => {
    const service = buildService({});
    expect(service.accessTokenTtlSeconds).toBe(900);
  });

  it('falla al arrancar si el TTL configurado no es un entero positivo', () => {
    expect(() => buildService({ ACCESS_TOKEN_TTL_SECONDS: 'quince minutos' })).toThrow(
      /entero positivo/,
    );
    expect(() => buildService({ ACCESS_TOKEN_TTL_SECONDS: '0' })).toThrow();
  });
});
