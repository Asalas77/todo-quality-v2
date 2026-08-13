import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
  PasswordResetTokenInvalidError,
} from '../domain/ports/auth-repository.port';
import { PASSWORD_HASHER, PasswordHasherPort } from '../domain/ports/password-hasher.port';

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const tokenHash = createHash('sha256').update(command.token).digest('hex');
    const newPasswordHash = await this.hasher.hash(command.newPassword);

    try {
      await this.authRepo.consumePasswordReset(tokenHash, newPasswordHash);
    } catch (error) {
      if (error instanceof PasswordResetTokenInvalidError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
