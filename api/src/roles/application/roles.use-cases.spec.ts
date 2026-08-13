import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ListRolesUseCase } from './list-roles.use-case';
import { CreateRoleUseCase } from './create-role.use-case';
import { UpdateRoleUseCase } from './update-role.use-case';
import { DeleteRoleUseCase } from './delete-role.use-case';
import {
  DuplicateRoleNombreError,
  Permission,
  Role,
  RoleInUseError,
  RoleInput,
  RoleNotFoundError,
  RoleRepositoryPort,
  SystemRoleDeleteError,
  SystemRoleRenameError,
  UnknownPermissionCodeError,
} from '../domain/ports/role-repository.port';

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    nombre: 'Inspector',
    descripcion: null,
    esSistema: true,
    permissionCodes: ['centros.ver'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeRoleRepo implements RoleRepositoryPort {
  roles: Role[] = [];
  throwOnCreate: Error | null = null;
  throwOnUpdate: Error | null = null;
  throwOnDelete: Error | null = null;

  async listPermissions(): Promise<Permission[]> {
    return [{ code: 'centros.ver', descripcion: 'Ver centros' }];
  }

  async findAll() {
    return this.roles;
  }

  async create(input: RoleInput) {
    if (this.throwOnCreate) throw this.throwOnCreate;
    const role = buildRole({ id: `role-${this.roles.length + 1}`, esSistema: false, ...input });
    this.roles.push(role);
    return role;
  }

  async update(id: string, input: RoleInput) {
    if (this.throwOnUpdate) throw this.throwOnUpdate;
    const role = this.roles.find((r) => r.id === id);
    if (!role) throw new RoleNotFoundError();
    Object.assign(role, input);
    return role;
  }

  async delete(id: string) {
    if (this.throwOnDelete) throw this.throwOnDelete;
    const index = this.roles.findIndex((r) => r.id === id);
    if (index === -1) throw new RoleNotFoundError();
    this.roles.splice(index, 1);
  }
}

describe('CreateRoleUseCase', () => {
  it('crea un rol personalizado', async () => {
    const repo = new FakeRoleRepo();
    const useCase = new CreateRoleUseCase(repo);

    const role = await useCase.execute({
      nombre: 'Auditor externo',
      descripcion: null,
      permissionCodes: ['centros.ver', 'plantillas.ver'],
    });

    expect(role.esSistema).toBe(false);
    expect(role.permissionCodes).toEqual(['centros.ver', 'plantillas.ver']);
  });

  it('traduce nombre duplicado a 409 y código de permiso desconocido a 400', async () => {
    const repo = new FakeRoleRepo();
    const useCase = new CreateRoleUseCase(repo);

    repo.throwOnCreate = new DuplicateRoleNombreError();
    await expect(
      useCase.execute({ nombre: 'X', descripcion: null, permissionCodes: [] }),
    ).rejects.toBeInstanceOf(ConflictException);

    repo.throwOnCreate = new UnknownPermissionCodeError();
    await expect(
      useCase.execute({ nombre: 'X', descripcion: null, permissionCodes: ['no.existe'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UpdateRoleUseCase', () => {
  it('permite reconfigurar los permisos de un rol de sistema sin renombrarlo', async () => {
    const repo = new FakeRoleRepo();
    repo.roles = [buildRole({ esSistema: true })];
    const useCase = new UpdateRoleUseCase(repo);

    const updated = await useCase.execute({
      id: 'role-1',
      nombre: 'Inspector',
      descripcion: 'Actualizado',
      permissionCodes: ['centros.ver', 'inspecciones.completar'],
    });

    expect(updated.permissionCodes).toContain('inspecciones.completar');
  });

  it('traduce el intento de renombrar un rol de sistema a 409', async () => {
    const repo = new FakeRoleRepo();
    repo.throwOnUpdate = new SystemRoleRenameError();
    const useCase = new UpdateRoleUseCase(repo);

    await expect(
      useCase.execute({ id: 'role-1', nombre: 'Otro nombre', descripcion: null, permissionCodes: [] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('traduce rol inexistente a 404', async () => {
    const repo = new FakeRoleRepo();
    const useCase = new UpdateRoleUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', nombre: 'X', descripcion: null, permissionCodes: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DeleteRoleUseCase', () => {
  it('elimina un rol personalizado sin usuarios asignados', async () => {
    const repo = new FakeRoleRepo();
    repo.roles = [buildRole({ id: 'role-1', esSistema: false })];
    const useCase = new DeleteRoleUseCase(repo);

    await useCase.execute('role-1');
    expect(repo.roles).toHaveLength(0);
  });

  it('traduce rol de sistema a 409', async () => {
    const repo = new FakeRoleRepo();
    repo.throwOnDelete = new SystemRoleDeleteError();
    const useCase = new DeleteRoleUseCase(repo);

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('traduce rol con usuarios asignados a 409', async () => {
    const repo = new FakeRoleRepo();
    repo.throwOnDelete = new RoleInUseError();
    const useCase = new DeleteRoleUseCase(repo);

    await expect(useCase.execute('role-1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ListRolesUseCase', () => {
  it('devuelve todos los roles del tenant', async () => {
    const repo = new FakeRoleRepo();
    repo.roles = [buildRole({ id: '1' }), buildRole({ id: '2', esSistema: false })];
    const useCase = new ListRolesUseCase(repo);

    expect(await useCase.execute()).toHaveLength(2);
  });
});
