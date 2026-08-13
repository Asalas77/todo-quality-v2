import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  RoleInUseError,
  RoleNotFoundError,
  RoleRepositoryPort,
  SystemRoleDeleteError,
} from '../domain/ports/role-repository.port';

@Injectable()
export class DeleteRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort) {}

  async execute(id: string): Promise<void> {
    try {
      await this.roles.delete(id);
    } catch (error) {
      if (error instanceof SystemRoleDeleteError || error instanceof RoleInUseError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
