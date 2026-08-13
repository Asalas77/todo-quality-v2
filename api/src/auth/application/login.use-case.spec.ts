import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';
import {
  AuthCredentials,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import { RefreshTokenRepositoryPort } from '../domain/ports/refresh-token-repository.port';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import { TokenServicePort } from '../domain/ports/token-service.port';

const CREDENTIALS: AuthCredentials = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  passwordHash: 'hash-correcto',
  activo: true,
};

class FakeAuthRepo implements AuthRepositoryPort {
  credentials: AuthCredentials | null = CREDENTIALS;
  permissions: string[] = ['inspecciones.ver'];

  async findCredentialsByEmail() {
    return this.credentials;
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
  saved: Array<{ tenantId: string; userId: string; tokenHash: string }> = [];

  async save(input: { tenantId: string; userId: string; tokenHash: string; expiresAt: Date }) {
    this.saved.push(input);
  }
  async findValidByHash() {
    return null;
  }
  async revokeByHash() {}
  async revokeAllForUser() {}
}

class FakeHasher implements PasswordHasherPort {
  verifyCalls: string[] = [];

  async hash(plain: string) {
    return `hashed:${plain}`;
  }
  async verify(hash: string, plain: string) {
    this.verifyCalls.push(hash);
    return hash === 'hash-correcto' && plain === 'secreta';
  }
}

class FakeTokens implements TokenServicePort {
  readonly accessTokenTtlSeconds = 900;
  issued: Array<{ sub: string; tenantId: string; permissions: string[] }> = [];

  async issueAccessToken(payload: { sub: string; tenantId: string; permissions: string[] }) {
    this.issued.push(payload);
    return 'access-token';
  }
  async verifyAccessToken(): Promise<never> {
    throw new Error('no usado');
  }
  issueRefreshToken() {
    return {
      token: 'refresh-plano',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
    };
  }
  hashRefreshToken(token: string) {
    return `hash:${token}`;
  }
}

describe('LoginUseCase', () => {
  let authRepo: FakeAuthRepo;
  let refreshRepo: FakeRefreshRepo;
  let hasher: FakeHasher;
  let tokens: FakeTokens;
  let useCase: LoginUseCase;

  beforeEach(() => {
    authRepo = new FakeAuthRepo();
    refreshRepo = new FakeRefreshRepo();
    hasher = new FakeHasher();
    tokens = new FakeTokens();
    useCase = new LoginUseCase(authRepo, refreshRepo, hasher, tokens);
  });

  it('emite tokens y persiste solo el hash del refresh', async () => {
    const result = await useCase.execute({
      email: 'ana@empresa.test',
      password: 'secreta',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-plano');
    expect(refreshRepo.saved).toEqual([
      expect.objectContaining({ tokenHash: 'refresh-hash', userId: 'user-1' }),
    ]);
    expect(refreshRepo.saved[0]).not.toHaveProperty('token');
  });

  it('firma el tenant y los permisos resueltos en el access token', async () => {
    authRepo.permissions = ['inspecciones.ver', 'agenda.gestionar'];

    await useCase.execute({ email: 'ana@empresa.test', password: 'secreta' });

    expect(tokens.issued[0]).toEqual({
      sub: 'user-1',
      tenantId: 'tenant-1',
      permissions: ['inspecciones.ver', 'agenda.gestionar'],
    });
  });

  it('rechaza una contraseña incorrecta', async () => {
    await expect(
      useCase.execute({ email: 'ana@empresa.test', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza a un usuario desactivado aunque la contraseña sea correcta', async () => {
    authRepo.credentials = { ...CREDENTIALS, activo: false };

    await expect(
      useCase.execute({ email: 'ana@empresa.test', password: 'secreta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('no revela si el correo existe: mismo error y misma verificación de hash', async () => {
    authRepo.credentials = null;

    await expect(
      useCase.execute({ email: 'nadie@empresa.test', password: 'secreta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // Se verificó igual contra el hash dummy, para no acortar el tiempo de respuesta.
    expect(hasher.verifyCalls).toHaveLength(1);
  });

  it('no emite tokens cuando la autenticación falla', async () => {
    authRepo.credentials = null;

    await expect(
      useCase.execute({ email: 'nadie@empresa.test', password: 'x' }),
    ).rejects.toThrow();

    expect(tokens.issued).toHaveLength(0);
    expect(refreshRepo.saved).toHaveLength(0);
  });
});
