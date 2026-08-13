import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserNotFoundError, UserRepositoryPort } from '../domain/ports/user-repository.port';
import {
  PASSWORD_HASHER,
  PasswordHasherPort,
} from '../../auth/domain/ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from '../../auth/domain/ports/refresh-token-repository.port';
import { generateTemporaryPassword } from '../../shared/generate-temporary-password';
import { requireTenantId } from '../../shared/tenant/tenant-context';

export interface ResetUserPasswordResult {
  temporaryPassword: string;
}

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
  ) {}

  async execute(userId: string): Promise<ResetUserPasswordResult> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.hasher.hash(temporaryPassword);

    try {
      await this.users.setPassword(userId, passwordHash);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }

    // La contraseña anterior deja de servir para nada más que iniciar sesión de nuevo:
    // cualquier sesión abierta con ella se cierra.
    await this.refreshTokens.revokeAllForUser(requireTenantId(), userId);

    return { temporaryPassword };
  }
}
