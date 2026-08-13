import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, AuthRepositoryPort } from '../domain/ports/auth-repository.port';
import { PASSWORD_HASHER, PasswordHasherPort } from '../domain/ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from '../domain/ports/refresh-token-repository.port';
import { requireTenantId } from '../../shared/tenant/tenant-context';

export interface ChangeOwnPasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class ChangeOwnPasswordUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
  ) {}

  async execute(command: ChangeOwnPasswordCommand): Promise<void> {
    const currentHash = await this.authRepo.getPasswordHash(command.userId);
    const matches = currentHash
      ? await this.hasher.verify(currentHash, command.currentPassword)
      : false;

    if (!matches) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const newHash = await this.hasher.hash(command.newPassword);
    await this.authRepo.updatePassword(command.userId, newHash);

    // Cierra cualquier otra sesión abierta con la contraseña anterior — incluida esta
    // misma pestaña una vez que su access token expire; el frontend cierra sesión de
    // inmediato después de esto en vez de esperar a que falle sola.
    await this.refreshTokens.revokeAllForUser(requireTenantId(), command.userId);
  }
}
