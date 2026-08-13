import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import {
  AccessTokenPayload,
  IssuedRefreshToken,
  TokenServicePort,
} from '../domain/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlDays: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    // Las variables de entorno llegan como string. Sin convertirlas explícitamente,
    // jsonwebtoken lee expiresIn: "900" como 900 *milisegundos* y emite tokens ya
    // vencidos, y getDate() + "30" concatena en vez de sumar.
    this.accessTokenTtlSeconds = readPositiveInt(config, 'ACCESS_TOKEN_TTL_SECONDS', 900);
    this.refreshTokenTtlDays = readPositiveInt(config, 'REFRESH_TOKEN_TTL_DAYS', 30);
  }

  issueAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, { expiresIn: this.accessTokenTtlSeconds });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenTtlDays);

    return { token, tokenHash: this.hashRefreshToken(token), expiresAt };
  }

  /**
   * SHA-256 basta y sobra aquí: el token es aleatorio de 384 bits, no una contraseña
   * adivinable, así que no hay nada que un hash lento pueda proteger.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

function readPositiveInt(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = config.get<string | number>(key);
  if (raw === undefined || raw === null || raw === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} debe ser un entero positivo, se recibió: ${String(raw)}`);
  }
  return parsed;
}
