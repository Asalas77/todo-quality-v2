import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DuplicateUserEmailError,
  USER_REPOSITORY,
  User,
  UserRepositoryPort,
  UserRoleNotFoundError,
} from '../domain/ports/user-repository.port';
import {
  PASSWORD_HASHER,
  PasswordHasherPort,
} from '../../auth/domain/ports/password-hasher.port';
import { generateTemporaryPassword } from '../../shared/generate-temporary-password';

export interface CreateUserCommand {
  nombre: string;
  apellido: string;
  email: string;
  rut: string | null;
  roleId: string;
}

export interface CreateUserResult {
  user: User;
  /** Contraseña en texto plano — solo existe en esta respuesta, nunca se persiste. */
  temporaryPassword: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.hasher.hash(temporaryPassword);

    try {
      const user = await this.users.create({ ...command, passwordHash });
      return { user, temporaryPassword };
    } catch (error) {
      if (error instanceof DuplicateUserEmailError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof UserRoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
