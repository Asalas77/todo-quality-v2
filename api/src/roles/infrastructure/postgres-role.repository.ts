import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
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
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';
import { isForeignKeyViolation, isUniqueViolation } from '../../shared/pg-error-codes';

interface RoleRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  created_at: Date;
  updated_at: Date;
}

const SYSTEM_ROLE_DELETE = 'TQ003';
const SYSTEM_ROLE_RENAME = 'TQ004';

@Injectable()
export class PostgresRoleRepository implements RoleRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async listPermissions(): Promise<Permission[]> {
    return this.tx.run((manager) =>
      manager.query<Permission[]>('SELECT code, descripcion FROM permission ORDER BY code'),
    );
  }

  async findAll(): Promise<Role[]> {
    return this.tx.run(async (manager) => {
      const roles = await manager.query<RoleRow[]>(
        'SELECT * FROM role ORDER BY es_sistema DESC, nombre',
      );
      const permissionsByRole = await this.fetchPermissionsByRole(manager);
      return roles.map((role) => toDomain(role, permissionsByRole.get(role.id) ?? []));
    });
  }

  async create(input: RoleInput): Promise<Role> {
    try {
      return await this.tx.run(async (manager) => {
        const rows = await manager.query<RoleRow[]>(
          `INSERT INTO role (tenant_id, nombre, descripcion)
           VALUES (current_setting('app.current_tenant')::uuid, $1, $2)
           RETURNING *`,
          [input.nombre, input.descripcion],
        );
        const role = rows[0];
        await this.replacePermissions(manager, role.id, input.permissionCodes);
        return toDomain(role, input.permissionCodes);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateRoleNombreError();
      if (isForeignKeyViolation(error)) throw new UnknownPermissionCodeError();
      throw error;
    }
  }

  async update(id: string, input: RoleInput): Promise<Role> {
    try {
      return await this.tx.run(async (manager) => {
        const result = await manager.query(
          `UPDATE role SET nombre = $1, descripcion = $2, updated_at = now()
           WHERE id = $3
           RETURNING *`,
          [input.nombre, input.descripcion, id],
        );
        const rows = rowsFromUpdate<RoleRow>(result);
        const role = rows[0];
        if (!role) throw new RoleNotFoundError();

        await this.replacePermissions(manager, id, input.permissionCodes);
        return toDomain(role, input.permissionCodes);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateRoleNombreError();
      if (isErrCode(error, SYSTEM_ROLE_RENAME)) throw new SystemRoleRenameError();
      if (isForeignKeyViolation(error)) throw new UnknownPermissionCodeError();
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.tx.run((manager) =>
        manager.query('DELETE FROM role WHERE id = $1 RETURNING id', [id]),
      );
      const rows = rowsFromUpdate<{ id: string }>(result);
      if (!rows[0]) throw new RoleNotFoundError();
    } catch (error) {
      if (isErrCode(error, SYSTEM_ROLE_DELETE)) throw new SystemRoleDeleteError();
      if (isForeignKeyViolation(error)) throw new RoleInUseError();
      throw error;
    }
  }

  private async replacePermissions(
    manager: EntityManager,
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    await manager.query('DELETE FROM role_permission WHERE role_id = $1', [roleId]);
    if (permissionCodes.length === 0) return;

    const params: unknown[] = [roleId];
    const valueRows = permissionCodes.map((code) => {
      const placeholder = params.push(code);
      return `(current_setting('app.current_tenant')::uuid, $1, $${placeholder})`;
    });
    await manager.query(
      `INSERT INTO role_permission (tenant_id, role_id, permission_code)
       VALUES ${valueRows.join(', ')}`,
      params,
    );
  }

  private async fetchPermissionsByRole(
    manager: EntityManager,
  ): Promise<Map<string, string[]>> {
    const rows = await manager.query<Array<{ role_id: string; permission_code: string }>>(
      'SELECT role_id, permission_code FROM role_permission',
    );
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.role_id) ?? [];
      list.push(row.permission_code);
      map.set(row.role_id, list);
    }
    return map;
  }
}

function toDomain(row: RoleRow, permissionCodes: string[]): Role {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    esSistema: row.es_sistema,
    permissionCodes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isErrCode(error: unknown, code: string): boolean {
  return (error as { code?: string })?.code === code;
}
