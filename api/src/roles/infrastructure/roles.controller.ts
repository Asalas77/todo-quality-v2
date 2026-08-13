import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ListRolesUseCase } from '../application/list-roles.use-case';
import { ListPermissionsUseCase } from '../application/list-permissions.use-case';
import { CreateRoleUseCase } from '../application/create-role.use-case';
import { UpdateRoleUseCase } from '../application/update-role.use-case';
import { DeleteRoleUseCase } from '../application/delete-role.use-case';
import { RoleInputDto } from './dto/role.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';

@Controller()
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @RequirePermissions('roles.gestionar')
  @Get('permisos')
  listAvailablePermissions() {
    return this.listPermissions.execute();
  }

  @RequirePermissions('roles.gestionar')
  @Get('roles')
  list() {
    return this.listRoles.execute();
  }

  @RequirePermissions('roles.gestionar')
  @Post('roles')
  create(@Body() dto: RoleInputDto) {
    return this.createRole.execute({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      permissionCodes: dto.permissionCodes,
    });
  }

  @RequirePermissions('roles.gestionar')
  @Put('roles/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RoleInputDto) {
    return this.updateRole.execute({
      id,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      permissionCodes: dto.permissionCodes,
    });
  }

  @RequirePermissions('roles.gestionar')
  @Delete('roles/:id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteRole.execute(id);
  }
}
