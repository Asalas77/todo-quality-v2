import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';
import { SetUserActivoUseCase } from '../application/set-user-activo.use-case';
import { ResetUserPasswordUseCase } from '../application/reset-user-password.use-case';
import { CreateUserDto, SetUserActivoDto, UpdateUserDto } from './dto/user.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';
import { RequestWithUser } from '../../auth/infrastructure/tenant-context.middleware';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly setUserActivo: SetUserActivoUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
  ) {}

  @RequirePermissions('usuarios.ver')
  @Get()
  list(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.listUsers.execute(incluirInactivos === 'true');
  }

  @RequirePermissions('usuarios.gestionar')
  @Post()
  async create(@Body() dto: CreateUserDto) {
    const { user, temporaryPassword } = await this.createUser.execute({
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      rut: dto.rut ?? null,
      roleId: dto.roleId,
    });
    return { ...user, temporaryPassword };
  }

  @RequirePermissions('usuarios.gestionar')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.updateUser.execute({
      id,
      nombre: dto.nombre,
      apellido: dto.apellido,
      rut: dto.rut ?? null,
      roleId: dto.roleId,
    });
  }

  @RequirePermissions('usuarios.gestionar')
  @Patch(':id/activo')
  setActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserActivoDto,
    @Req() req: RequestWithUser,
  ) {
    return this.setUserActivo.execute({
      id,
      activo: dto.activo,
      requestedBy: req.user!.userId,
    });
  }

  @RequirePermissions('usuarios.gestionar')
  @Post(':id/resetear-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.resetUserPassword.execute(id);
  }
}
