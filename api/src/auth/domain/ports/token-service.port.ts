export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  permissions: string[];
}

export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface TokenServicePort {
  issueAccessToken(payload: AccessTokenPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;

  /** El refresh token es opaco y aleatorio: solo sirve para canjearlo, nunca para autorizar. */
  issueRefreshToken(): IssuedRefreshToken;
  hashRefreshToken(token: string): string;

  readonly accessTokenTtlSeconds: number;
}
