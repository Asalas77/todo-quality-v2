import { Injectable } from '@nestjs/common';
import {
  RefreshTokenRepositoryPort,
  StoredRefreshToken,
} from '../domain/ports/refresh-token-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';

@Injectable()
export class PostgresRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async save(input: {
    tenantId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.tx.runAs({ tenantId: input.tenantId }, (manager) =>
      manager.query(
        `INSERT INTO refresh_token (tenant_id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [input.tenantId, input.userId, input.tokenHash, input.expiresAt],
      ),
    );
  }

  /**
   * Se resuelve sin tenant en contexto: al canjear un refresh token todavía no sabemos a
   * qué empresa pertenece. Por eso la consulta va por SECURITY DEFINER, igual que el login.
   */
  async findValidByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const rows = await this.tx.runWithoutTenant((manager) =>
      manager.query<Array<{ id: string; user_id: string; tenant_id: string }>>(
        'SELECT * FROM refresh_token_lookup($1)',
        [tokenHash],
      ),
    );

    if (rows.length === 0) return null;

    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      tenantId: rows[0].tenant_id,
    };
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.tx.runWithoutTenant((manager) =>
      manager.query('SELECT refresh_token_revoke($1)', [tokenHash]),
    );
  }

  async revokeAllForUser(tenantId: string, userId: string): Promise<void> {
    await this.tx.runAs({ tenantId }, (manager) =>
      manager.query(
        `UPDATE refresh_token SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      ),
    );
  }
}
