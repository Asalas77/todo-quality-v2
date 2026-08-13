import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  User,
  UserNotFoundError,
  UserRepositoryPort,
  UserRoleNotFoundError,
} from '../domain/ports/user-repository.port';

export interface UpdateUserCommand {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  roleId: string;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    const { id, ...input } = command;
    try {
      return await this.users.update(id, input);
    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof UserRoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
