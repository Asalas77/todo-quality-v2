import { Module } from '@nestjs/common';
import { UsuariosController } from './infrastructure/usuarios.controller';
import { ListUsersUseCase } from './application/list-users.use-case';
import { CreateUserUseCase } from './application/create-user.use-case';
import { UpdateUserUseCase } from './application/update-user.use-case';
import { SetUserActivoUseCase } from './application/set-user-activo.use-case';
import { ResetUserPasswordUseCase } from './application/reset-user-password.use-case';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';
import { PostgresUserRepository } from './infrastructure/postgres-user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController],
  providers: [
    ListUsersUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    SetUserActivoUseCase,
    ResetUserPasswordUseCase,
    { provide: USER_REPOSITORY, useClass: PostgresUserRepository },
  ],
})
export class UsuariosModule {}
