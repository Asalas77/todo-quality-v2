import { Inject, Injectable } from '@nestjs/common';
import {
  Permission,
  ROLE_REPOSITORY,
  RoleRepositoryPort,
} from '../domain/ports/role-repository.port';

@Injectable()
export class ListPermissionsUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort) {}

  execute(): Promise<Permission[]> {
    return this.roles.listPermissions();
  }
}
