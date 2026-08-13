import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  DuplicateRoleNombreError,
  ROLE_REPOSITORY,
  Role,
  RoleInput,
  RoleRepositoryPort,
  UnknownPermissionCodeError,
} from '../domain/ports/role-repository.port';

@Injectable()
export class CreateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort) {}

  async execute(input: RoleInput): Promise<Role> {
    try {
      return await this.roles.create(input);
    } catch (error) {
      if (error instanceof DuplicateRoleNombreError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof UnknownPermissionCodeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
