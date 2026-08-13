import { Module } from '@nestjs/common';
import { RolesController } from './infrastructure/roles.controller';
import { ListRolesUseCase } from './application/list-roles.use-case';
import { ListPermissionsUseCase } from './application/list-permissions.use-case';
import { CreateRoleUseCase } from './application/create-role.use-case';
import { UpdateRoleUseCase } from './application/update-role.use-case';
import { DeleteRoleUseCase } from './application/delete-role.use-case';
import { ROLE_REPOSITORY } from './domain/ports/role-repository.port';
import { PostgresRoleRepository } from './infrastructure/postgres-role.repository';

@Module({
  controllers: [RolesController],
  providers: [
    ListRolesUseCase,
    ListPermissionsUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    { provide: ROLE_REPOSITORY, useClass: PostgresRoleRepository },
  ],
})
export class RolesModule {}
