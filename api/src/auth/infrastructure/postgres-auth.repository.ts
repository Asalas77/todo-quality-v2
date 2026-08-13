import { Injectable } from '@nestjs/common';
import {
  AuthCredentials,
  AuthRepositoryPort,
  DuplicateEmailError,
  DuplicateRutError,
  PasswordResetRequested,
  PasswordResetTokenInvalidError,
  RegisteredTenant,
} from '../domain/ports/auth-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';

@Injectable()
export class PostgresAuthRepository implements AuthRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findCredentialsByEmail(email: string): Promise<AuthCredentials | null> {
    const rows = await this.tx.runWithoutTenant((manager) =>
      manager.query<
        Array<{
          user_id: string;
          tenant_id: string;
          password_hash: string;
          activo: boolean;
        }>
      >('SELECT * FROM auth_lookup($1)', [email]),
    );

    if (rows.length === 0) return null;

    return {
      userId: rows[0].user_id,
      tenantId: rows[0].tenant_id,
      passwordHash: rows[0].password_hash,
      activo: rows[0].activo,
    };
  }

  async findPermissions(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.tx.runAs({ tenantId }, (manager) =>
      manager.query<Array<{ permission_code: string }>>(
        `SELECT rp.permission_code
         FROM app_user u
         JOIN role_permission rp ON rp.role_id = u.role_id
         WHERE u.id = $1`,
        [userId],
      ),
    );

    return rows.map((row) => row.permission_code);
  }

  async getTenantNombre(tenantId: string): Promise<string | null> {
    const rows = await this.tx.runAs({ tenantId }, (manager) =>
      manager.query<Array<{ nombre: string }>>(
        'SELECT nombre FROM tenant WHERE id = $1',
        [tenantId],
      ),
    );
    return rows[0]?.nombre ?? null;
  }

  async registerTenant(input: {
    nombre: string;
    rut: string;
    adminNombre: string;
    adminApellido: string;
    adminEmail: string;
    passwordHash: string;
  }): Promise<RegisteredTenant> {
    try {
      const rows = await this.tx.runWithoutTenant((manager) =>
        manager.query<Array<{ tenant_id: string; user_id: string }>>(
          'SELECT * FROM register_tenant($1, $2, $3, $4, $5, $6)',
          [
            input.nombre,
            input.rut,
            input.adminNombre,
            input.adminApellido,
            input.adminEmail,
            input.passwordHash,
          ],
        ),
      );

      return { tenantId: rows[0].tenant_id, userId: rows[0].user_id };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'TQ001') throw new DuplicateEmailError();
      if (code === 'TQ002') throw new DuplicateRutError();
      throw error;
    }
  }

  async requestPasswordReset(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetRequested | null> {
    const rows = await this.tx.runWithoutTenant((manager) =>
      manager.query<Array<{ user_id: string; tenant_id: string }>>(
        'SELECT * FROM request_password_reset($1, $2, $3)',
        [email, tokenHash, expiresAt],
      ),
    );
    if (!rows[0]) return null;
    return { userId: rows[0].user_id, tenantId: rows[0].tenant_id };
  }

  async consumePasswordReset(
    tokenHash: string,
    newPasswordHash: string,
  ): Promise<PasswordResetRequested> {
    try {
      const rows = await this.tx.runWithoutTenant((manager) =>
        manager.query<Array<{ user_id: string; tenant_id: string }>>(
          'SELECT * FROM consume_password_reset($1, $2)',
          [tokenHash, newPasswordHash],
        ),
      );
      return { userId: rows[0].user_id, tenantId: rows[0].tenant_id };
    } catch (error) {
      if ((error as { code?: string }).code === 'TQ005') {
        throw new PasswordResetTokenInvalidError();
      }
      throw error;
    }
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const rows = await this.tx.run((manager) =>
      manager.query<Array<{ password_hash: string }>>(
        'SELECT password_hash FROM app_user WHERE id = $1',
        [userId],
      ),
    );
    return rows[0]?.password_hash ?? null;
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.tx.run((manager) =>
      manager.query(
        'UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2',
        [newPasswordHash, userId],
      ),
    );
  }
}
