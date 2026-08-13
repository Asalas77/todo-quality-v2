import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, Role, RoleRepositoryPort } from '../domain/ports/role-repository.port';

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort) {}

  execute(): Promise<Role[]> {
    return this.roles.findAll();
  }
}
