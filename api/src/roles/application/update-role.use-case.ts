import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DuplicateRoleNombreError,
  ROLE_REPOSITORY,
  Role,
  RoleInput,
  RoleNotFoundError,
  RoleRepositoryPort,
  SystemRoleRenameError,
  UnknownPermissionCodeError,
} from '../domain/ports/role-repository.port';

export interface UpdateRoleCommand extends RoleInput {
  id: string;
}

@Injectable()
export class UpdateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort) {}

  async execute(command: UpdateRoleCommand): Promise<Role> {
    const { id, ...input } = command;
    try {
      return await this.roles.update(id, input);
    } catch (error) {
      if (error instanceof DuplicateRoleNombreError || error instanceof SystemRoleRenameError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UnknownPermissionCodeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
