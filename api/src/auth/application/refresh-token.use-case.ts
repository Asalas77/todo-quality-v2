import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from '../domain/ports/refresh-token-repository.port';
import {
  TOKEN_SERVICE,
  TokenServicePort,
} from '../domain/ports/token-service.port';

export interface RefreshCommand {
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    const hash = this.tokens.hashRefreshToken(command.refreshToken);
    const stored = await this.refreshTokens.findValidByHash(hash);

    if (!stored) {
      throw new UnauthorizedException('Sesión expirada');
    }

    // Rotación: el token usado se revoca aquí mismo, de modo que uno robado sirve una
    // sola vez y su reutilización posterior falla.
    await this.refreshTokens.revokeByHash(hash);

    // Los permisos se releen en cada refresh: es lo que hace que revocar un permiso a
    // mitad de sesión surta efecto cuando el access token expira.
    const permissions = await this.authRepo.findPermissions(
      stored.tenantId,
      stored.userId,
    );

    const accessToken = await this.tokens.issueAccessToken({
      sub: stored.userId,
      tenantId: stored.tenantId,
      permissions,
    });

    const next = this.tokens.issueRefreshToken();
    await this.refreshTokens.save({
      tenantId: stored.tenantId,
      userId: stored.userId,
      tokenHash: next.tokenHash,
      expiresAt: next.expiresAt,
    });

    return {
      accessToken,
      refreshToken: next.token,
      expiresIn: this.tokens.accessTokenTtlSeconds,
    };
  }
}
