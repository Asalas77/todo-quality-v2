import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { AuthRepositoryPort } from '../domain/ports/auth-repository.port';
import {
  RefreshTokenRepositoryPort,
  StoredRefreshToken,
} from '../domain/ports/refresh-token-repository.port';
import { TokenServicePort } from '../domain/ports/token-service.port';

class FakeAuthRepo implements AuthRepositoryPort {
  permissions: string[] = ['inspecciones.ver'];

  async findCredentialsByEmail() {
    return null;
  }
  async findPermissions() {
    return this.permissions;
  }
  async registerTenant(): Promise<never> {
    throw new Error('no usado');
  }
  async getTenantNombre(): Promise<never> {
    throw new Error('no usado');
  }
  async requestPasswordReset(): Promise<never> {
    throw new Error('no usado');
  }
  async consumePasswordReset(): Promise<never> {
    throw new Error('no usado');
  }
  async getPasswordHash(): Promise<never> {
    throw new Error('no usado');
  }
  async updatePassword(): Promise<never> {
    throw new Error('no usado');
  }
}

class FakeRefreshRepo implements RefreshTokenRepositoryPort {
  valid: StoredRefreshToken | null = {
    id: 'rt-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
  };
  revoked: string[] = [];
  saved: string[] = [];

  async save(input: { tokenHash: string }) {
    this.saved.push(input.tokenHash);
  }
  async findValidByHash() {
    return this.valid;
  }
  async revokeByHash(hash: string) {
    this.revoked.push(hash);
  }
  async revokeAllForUser() {}
}

class FakeTokens implements TokenServicePort {
  readonly accessTokenTtlSeconds = 900;
  issued: Array<{ permissions: string[] }> = [];
  private counter = 0;

  async issueAccessToken(payload: { sub: string; tenantId: string; permissions: string[] }) {
    this.issued.push(payload);
    return 'access-token';
  }
  async verifyAccessToken(): Promise<never> {
    throw new Error('no usado');
  }
  issueRefreshToken() {
    this.counter += 1;
    return {
      token: `refresh-${this.counter}`,
      tokenHash: `hash:refresh-${this.counter}`,
      expiresAt: new Date('2030-01-01'),
    };
  }
  hashRefreshToken(token: string) {
    return `hash:${token}`;
  }
}

describe('RefreshTokenUseCase', () => {
  let authRepo: FakeAuthRepo;
  let refreshRepo: FakeRefreshRepo;
  let tokens: FakeTokens;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    authRepo = new FakeAuthRepo();
    refreshRepo = new FakeRefreshRepo();
    tokens = new FakeTokens();
    useCase = new RefreshTokenUseCase(authRepo, refreshRepo, tokens);
  });

  it('rota el refresh token: revoca el usado y emite uno nuevo', async () => {
    const result = await useCase.execute({ refreshToken: 'refresh-viejo' });

    expect(refreshRepo.revoked).toEqual(['hash:refresh-viejo']);
    expect(result.refreshToken).toBe('refresh-1');
    expect(refreshRepo.saved).toEqual(['hash:refresh-1']);
  });

  it('relee los permisos, de modo que una revocación surte efecto al refrescar', async () => {
    authRepo.permissions = ['inspecciones.ver'];
    await useCase.execute({ refreshToken: 'r1' });
    expect(tokens.issued[0].permissions).toEqual(['inspecciones.ver']);

    authRepo.permissions = [];
    await useCase.execute({ refreshToken: 'r2' });
    expect(tokens.issued[1].permissions).toEqual([]);
  });

  it('rechaza un token desconocido, revocado o expirado', async () => {
    refreshRepo.valid = null;

    await expect(
      useCase.execute({ refreshToken: 'inventado' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('no emite nada cuando el token no es válido', async () => {
    refreshRepo.valid = null;

    await expect(useCase.execute({ refreshToken: 'x' })).rejects.toThrow();

    expect(tokens.issued).toHaveLength(0);
    expect(refreshRepo.saved).toHaveLength(0);
  });
});
