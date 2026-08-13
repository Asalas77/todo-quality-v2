import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from '../domain/ports/refresh-token-repository.port';
import {
  TOKEN_SERVICE,
  TokenServicePort,
} from '../domain/ports/token-service.port';

export interface LogoutCommand {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  /** Idempotente: cerrar sesión con un token ya revocado o inexistente no es un error. */
  async execute(command: LogoutCommand): Promise<void> {
    await this.refreshTokens.revokeByHash(
      this.tokens.hashRefreshToken(command.refreshToken),
    );
  }
}
