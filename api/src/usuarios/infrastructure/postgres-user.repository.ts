import { Injectable } from '@nestjs/common';
import {
  CreateUserInput,
  DuplicateUserEmailError,
  UpdateUserInput,
  User,
  UserNotFoundError,
  UserRepositoryPort,
  UserRoleNotFoundError,
} from '../domain/ports/user-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';
import { isForeignKeyViolation, isUniqueViolation } from '../../shared/pg-error-codes';

interface UserRow {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut: string | null;
  role_id: string;
  role_nombre: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    rut: row.rut,
    roleId: row.role_id,
    roleNombre: row.role_nombre,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT u.id, u.nombre, u.apellido, u.email, u.rut, u.role_id,
         r.nombre AS role_nombre, u.activo, u.created_at, u.updated_at
  FROM app_user u
  JOIN role r ON r.id = u.role_id
`;

@Injectable()
export class PostgresUserRepository implements UserRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findAll(includeInactive: boolean): Promise<User[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<UserRow[]>(
        `${SELECT} WHERE u.activo = true OR $1 ORDER BY u.nombre, u.apellido`,
        [includeInactive],
      ),
    );
    return rows.map(toDomain);
  }

  async create(input: CreateUserInput): Promise<User> {
    try {
      const rows = await this.tx.run((manager) =>
        manager.query<UserRow[]>(
          `WITH inserted AS (
             INSERT INTO app_user (tenant_id, role_id, nombre, apellido, email, rut, password_hash)
             VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3, $4, $5, $6)
             RETURNING *
           )
           SELECT inserted.id, inserted.nombre, inserted.apellido, inserted.email,
                  inserted.rut, inserted.role_id, r.nombre AS role_nombre,
                  inserted.activo, inserted.created_at, inserted.updated_at
           FROM inserted JOIN role r ON r.id = inserted.role_id`,
          [
            input.roleId,
            input.nombre,
            input.apellido,
            input.email,
            input.rut,
            input.passwordHash,
          ],
        ),
      );
      return toDomain(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateUserEmailError();
      if (isForeignKeyViolation(error)) throw new UserRoleNotFoundError();
      throw error;
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    let updateResult: unknown;
    try {
      updateResult = await this.tx.run((manager) =>
        manager.query(
          `UPDATE app_user
           SET nombre = $1, apellido = $2, rut = $3, role_id = $4, updated_at = now()
           WHERE id = $5
           RETURNING id`,
          [input.nombre, input.apellido, input.rut, input.roleId, id],
        ),
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new UserRoleNotFoundError();
      throw error;
    }

    if (!rowsFromUpdate<{ id: string }>(updateResult)[0]) throw new UserNotFoundError();

    const rows = await this.tx.run((manager) =>
      manager.query<UserRow[]>(`${SELECT} WHERE u.id = $1`, [id]),
    );
    return toDomain(rows[0]);
  }

  async setActivo(id: string, activo: boolean): Promise<User> {
    const result = await this.tx.run((manager) =>
      manager.query(
        `UPDATE app_user SET activo = $1, updated_at = now() WHERE id = $2 RETURNING id`,
        [activo, id],
      ),
    );
    const rows = rowsFromUpdate<{ id: string }>(result);
    if (!rows[0]) throw new UserNotFoundError();

    const updated = await this.tx.run((manager) =>
      manager.query<UserRow[]>(`${SELECT} WHERE u.id = $1`, [id]),
    );
    return toDomain(updated[0]);
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    const result = await this.tx.run((manager) =>
      manager.query(
        `UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING id`,
        [passwordHash, id],
      ),
    );
    if (!rowsFromUpdate<{ id: string }>(result)[0]) throw new UserNotFoundError();
  }
}
