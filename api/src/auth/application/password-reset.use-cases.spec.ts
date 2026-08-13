import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { ChangeOwnPasswordUseCase } from './change-own-password.use-case';
import {
  AuthRepositoryPort,
  PasswordResetRequested,
  PasswordResetTokenInvalidError,
} from '../domain/ports/auth-repository.port';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import { RefreshTokenRepositoryPort } from '../domain/ports/refresh-token-repository.port';
import { tenantContext } from '../../shared/tenant/tenant-context';

class FakeAuthRepo implements Partial<AuthRepositoryPort> {
  requested: PasswordResetRequested | null = { userId: 'user-1', tenantId: 'tenant-1' };
  throwOnConsume: Error | null = null;
  passwordHashes = new Map<string, string>([['user-1', 'hash-actual']]);
  lastNewHash: string | null = null;

  async requestPasswordReset() {
    return this.requested;
  }
  async consumePasswordReset(): Promise<never> {
    if (this.throwOnConsume) throw this.throwOnConsume;
    throw new Error('no configurado');
  }
  async getPasswordHash(userId: string) {
    return this.passwordHashes.get(userId) ?? null;
  }
  async updatePassword(userId: string, newHash: string) {
    this.lastNewHash = newHash;
    this.passwordHashes.set(userId, newHash);
  }
}

class FakeHasher implements PasswordHasherPort {
  async hash(plain: string) {
    return `hashed:${plain}`;
  }
  async verify(hash: string, plain: string) {
    return hash === 'hash-actual' && plain === 'correcta';
  }
}

class FakeConfig {
  values: Record<string, string> = {};
  get(key: string, fallback?: string) {
    return this.values[key] ?? fallback;
  }
}

class FakeRefreshTokens implements Partial<RefreshTokenRepositoryPort> {
  revoked: Array<{ tenantId: string; userId: string }> = [];
  async revokeAllForUser(tenantId: string, userId: string) {
    this.revoked.push({ tenantId, userId });
  }
}

describe('RequestPasswordResetUseCase', () => {
  it('en desarrollo, devuelve el enlace cuando el correo existe', async () => {
    const repo = new FakeAuthRepo();
    const config = new FakeConfig();
    const useCase = new RequestPasswordResetUseCase(
      repo as unknown as AuthRepositoryPort,
      config as unknown as ConfigService,
    );

    const result = await useCase.execute({ email: 'ana@empresa.test' });
    expect(result.devResetUrl).toContain('/restablecer-contrasena?token=');
  });

  it('no devuelve enlace si el correo no existe, sin revelarlo por otro medio', async () => {
    const repo = new FakeAuthRepo();
    repo.requested = null;
    const config = new FakeConfig();
    const useCase = new RequestPasswordResetUseCase(
      repo as unknown as AuthRepositoryPort,
      config as unknown as ConfigService,
    );

    const result = await useCase.execute({ email: 'nadie@empresa.test' });
    expect(result.devResetUrl).toBeUndefined();
  });

  it('en producción, nunca devuelve el enlace aunque el correo exista', async () => {
    const repo = new FakeAuthRepo();
    const config = new FakeConfig();
    config.values.NODE_ENV = 'production';
    const useCase = new RequestPasswordResetUseCase(
      repo as unknown as AuthRepositoryPort,
      config as unknown as ConfigService,
    );

    const result = await useCase.execute({ email: 'ana@empresa.test' });
    expect(result.devResetUrl).toBeUndefined();
  });
});

describe('ResetPasswordUseCase', () => {
  it('traduce token inválido o expirado a 400', async () => {
    const repo = new FakeAuthRepo();
    repo.throwOnConsume = new PasswordResetTokenInvalidError();
    const useCase = new ResetPasswordUseCase(
      repo as unknown as AuthRepositoryPort,
      new FakeHasher(),
    );

    await expect(
      useCase.execute({ token: 'x', newPassword: 'nueva-contrasena-larga' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ChangeOwnPasswordUseCase', () => {
  it('rechaza si la contraseña actual no coincide', async () => {
    const repo = new FakeAuthRepo();
    const refreshTokens = new FakeRefreshTokens();
    const useCase = new ChangeOwnPasswordUseCase(
      repo as unknown as AuthRepositoryPort,
      new FakeHasher(),
      refreshTokens as unknown as RefreshTokenRepositoryPort,
    );

    await tenantContext.run({ tenantId: 'tenant-1' }, () =>
      expect(
        useCase.execute({
          userId: 'user-1',
          currentPassword: 'incorrecta',
          newPassword: 'nueva-contrasena-larga',
        }),
      ).rejects.toBeInstanceOf(BadRequestException),
    );

    expect(refreshTokens.revoked).toHaveLength(0);
  });

  it('actualiza la contraseña y cierra las demás sesiones', async () => {
    const repo = new FakeAuthRepo();
    const refreshTokens = new FakeRefreshTokens();
    const useCase = new ChangeOwnPasswordUseCase(
      repo as unknown as AuthRepositoryPort,
      new FakeHasher(),
      refreshTokens as unknown as RefreshTokenRepositoryPort,
    );

    await tenantContext.run({ tenantId: 'tenant-1' }, () =>
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'correcta',
        newPassword: 'nueva-contrasena-larga',
      }),
    );

    expect(repo.lastNewHash).toBe('hashed:nueva-contrasena-larga');
    expect(refreshTokens.revoked).toEqual([{ tenantId: 'tenant-1', userId: 'user-1' }]);
  });
});
