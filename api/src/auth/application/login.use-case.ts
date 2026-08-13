import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import {
  PASSWORD_HASHER,
  PasswordHasherPort,
} from '../domain/ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from '../domain/ports/refresh-token-repository.port';
import {
  TOKEN_SERVICE,
  TokenServicePort,
} from '../domain/ports/token-service.port';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const credentials = await this.authRepo.findCredentialsByEmail(command.email);

    // Se verifica la contraseña incluso cuando el email no existe, para que el tiempo de
    // respuesta no revele qué correos están registrados.
    const passwordMatches = await this.hasher.verify(
      credentials?.passwordHash ?? DUMMY_HASH,
      command.password,
    );

    if (!credentials || !passwordMatches || !credentials.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const permissions = await this.authRepo.findPermissions(
      credentials.tenantId,
      credentials.userId,
    );

    const accessToken = await this.tokens.issueAccessToken({
      sub: credentials.userId,
      tenantId: credentials.tenantId,
      permissions,
    });

    const refresh = this.tokens.issueRefreshToken();
    await this.refreshTokens.save({
      tenantId: credentials.tenantId,
      userId: credentials.userId,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      expiresIn: this.tokens.accessTokenTtlSeconds,
    };
  }
}

/** Hash argon2id de una cadena arbitraria; nunca coincide con una contraseña real. */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000';
