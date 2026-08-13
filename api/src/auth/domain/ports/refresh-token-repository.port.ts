export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface StoredRefreshToken {
  id: string;
  userId: string;
  tenantId: string;
}

export interface RefreshTokenRepositoryPort {
  save(input: {
    tenantId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;

  /** Devuelve el token solo si existe, no está revocado y no ha expirado. */
  findValidByHash(tokenHash: string): Promise<StoredRefreshToken | null>;

  revokeByHash(tokenHash: string): Promise<void>;

  /** Se invoca al cambiar la contraseña o desactivar al usuario. */
  revokeAllForUser(tenantId: string, userId: string): Promise<void>;
}
