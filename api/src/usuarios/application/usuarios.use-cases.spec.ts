import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ListUsersUseCase } from './list-users.use-case';
import { CreateUserUseCase } from './create-user.use-case';
import { UpdateUserUseCase } from './update-user.use-case';
import { SetUserActivoUseCase } from './set-user-activo.use-case';
import { ResetUserPasswordUseCase } from './reset-user-password.use-case';
import {
  CreateUserInput,
  DuplicateUserEmailError,
  UpdateUserInput,
  User,
  UserNotFoundError,
  UserRepositoryPort,
  UserRoleNotFoundError,
} from '../domain/ports/user-repository.port';
import { PasswordHasherPort } from '../../auth/domain/ports/password-hasher.port';
import { RefreshTokenRepositoryPort } from '../../auth/domain/ports/refresh-token-repository.port';
import { tenantContext } from '../../shared/tenant/tenant-context';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    nombre: 'Carla',
    apellido: 'Vidal',
    email: 'carla@empresa.test',
    rut: null,
    roleId: 'role-1',
    roleNombre: 'Inspector',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeUserRepo implements UserRepositoryPort {
  users: User[] = [];
  throwOnCreate: Error | null = null;

  async findAll(includeInactive: boolean) {
    return this.users.filter((u) => includeInactive || u.activo);
  }

  async create(input: CreateUserInput) {
    if (this.throwOnCreate) throw this.throwOnCreate;
    const { passwordHash: _passwordHash, ...rest } = input;
    const user = buildUser({ id: `user-${this.users.length + 1}`, ...rest });
    this.users.push(user);
    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new UserNotFoundError();
    Object.assign(user, input);
    return user;
  }

  async setActivo(id: string, activo: boolean) {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new UserNotFoundError();
    user.activo = activo;
    return user;
  }

  async setPassword(id: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new UserNotFoundError();
  }
}

class FakeHasher implements PasswordHasherPort {
  async hash(plain: string) {
    return `hashed:${plain}`;
  }
  async verify() {
    return false;
  }
}

class FakeRefreshTokens implements Partial<RefreshTokenRepositoryPort> {
  revoked: Array<{ tenantId: string; userId: string }> = [];
  async revokeAllForUser(tenantId: string, userId: string) {
    this.revoked.push({ tenantId, userId });
  }
}

describe('ResetUserPasswordUseCase', () => {
  it('genera una contraseña temporal nueva y cierra las sesiones del usuario', async () => {
    const repo = new FakeUserRepo();
    repo.users = [buildUser({ id: 'user-1' })];
    const refreshTokens = new FakeRefreshTokens();
    const useCase = new ResetUserPasswordUseCase(repo, new FakeHasher(), refreshTokens as unknown as RefreshTokenRepositoryPort);

    const result = await tenantContext.run({ tenantId: 'tenant-1' }, () => useCase.execute('user-1'));

    expect(result.temporaryPassword).toHaveLength(12);
    expect(refreshTokens.revoked).toEqual([{ tenantId: 'tenant-1', userId: 'user-1' }]);
  });

  it('traduce usuario inexistente a 404', async () => {
    const repo = new FakeUserRepo();
    const refreshTokens = new FakeRefreshTokens();
    const useCase = new ResetUserPasswordUseCase(repo, new FakeHasher(), refreshTokens as unknown as RefreshTokenRepositoryPort);

    await tenantContext.run({ tenantId: 'tenant-1' }, () =>
      expect(useCase.execute('no-existe')).rejects.toBeInstanceOf(NotFoundException),
    );
  });
});

describe('CreateUserUseCase', () => {
  it('genera una contraseña temporal y la devuelve en texto plano solo una vez', async () => {
    const repo = new FakeUserRepo();
    const useCase = new CreateUserUseCase(repo, new FakeHasher());

    const result = await useCase.execute({
      nombre: 'Carla',
      apellido: 'Vidal',
      email: 'carla@empresa.test',
      rut: null,
      roleId: 'role-1',
    });

    expect(result.temporaryPassword).toHaveLength(12);
    expect(repo.users[0]).not.toHaveProperty('temporaryPassword');
    expect(repo.users[0]).not.toHaveProperty('passwordHash');
  });

  it('traduce email duplicado a 409 y rol inexistente a 404', async () => {
    const repo = new FakeUserRepo();
    const useCase = new CreateUserUseCase(repo, new FakeHasher());

    repo.throwOnCreate = new DuplicateUserEmailError();
    await expect(
      useCase.execute({ nombre: 'X', apellido: 'Y', email: 'x@x.test', rut: null, roleId: 'r' }),
    ).rejects.toBeInstanceOf(ConflictException);

    repo.throwOnCreate = new UserRoleNotFoundError();
    await expect(
      useCase.execute({ nombre: 'X', apellido: 'Y', email: 'x@x.test', rut: null, roleId: 'r' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SetUserActivoUseCase', () => {
  it('desactiva a otro usuario', async () => {
    const repo = new FakeUserRepo();
    repo.users = [buildUser({ id: 'user-1' })];
    const useCase = new SetUserActivoUseCase(repo);

    const result = await useCase.execute({ id: 'user-1', activo: false, requestedBy: 'admin-1' });
    expect(result.activo).toBe(false);
  });

  it('impide que un usuario se desactive a sí mismo', async () => {
    const repo = new FakeUserRepo();
    repo.users = [buildUser({ id: 'user-1' })];
    const useCase = new SetUserActivoUseCase(repo);

    await expect(
      useCase.execute({ id: 'user-1', activo: false, requestedBy: 'user-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('traduce usuario inexistente a 404', async () => {
    const repo = new FakeUserRepo();
    const useCase = new SetUserActivoUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', activo: false, requestedBy: 'admin-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ListUsersUseCase / UpdateUserUseCase', () => {
  it('excluye inactivos por defecto', async () => {
    const repo = new FakeUserRepo();
    repo.users = [buildUser({ id: '1', activo: true }), buildUser({ id: '2', activo: false })];
    const useCase = new ListUsersUseCase(repo);

    expect(await useCase.execute(false)).toHaveLength(1);
    expect(await useCase.execute(true)).toHaveLength(2);
  });

  it('actualiza nombre, apellido, rut y rol', async () => {
    const repo = new FakeUserRepo();
    repo.users = [buildUser()];
    const useCase = new UpdateUserUseCase(repo);

    const updated = await useCase.execute({
      id: 'user-1',
      nombre: 'Carla',
      apellido: 'Vidal Soto',
      rut: '11.111.111-1',
      roleId: 'role-2',
    });

    expect(updated.apellido).toBe('Vidal Soto');
    expect(updated.roleId).toBe('role-2');
  });
});
