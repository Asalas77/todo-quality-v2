import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  User,
  UserNotFoundError,
  UserRepositoryPort,
} from '../domain/ports/user-repository.port';

export interface SetUserActivoCommand {
  id: string;
  activo: boolean;
  requestedBy: string;
}

@Injectable()
export class SetUserActivoUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort) {}

  async execute(command: SetUserActivoCommand): Promise<User> {
    if (!command.activo && command.id === command.requestedBy) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }

    try {
      return await this.users.setActivo(command.id, command.activo);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
