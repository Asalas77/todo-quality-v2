import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { AuthRepositoryPort } from '../domain/ports/auth-repository.port';

class FakeAuthRepo implements Partial<AuthRepositoryPort> {
  tenantNombre: string | null = 'Alimentos del Sur';

  async getTenantNombre() {
    return this.tenantNombre;
  }
}

describe('GetCurrentUserUseCase', () => {
  it('agrega el nombre del tenant a la identidad ya resuelta del token', async () => {
    const repo = new FakeAuthRepo();
    const useCase = new GetCurrentUserUseCase(repo as unknown as AuthRepositoryPort);

    const result = await useCase.execute({
      userId: 'user-1',
      tenantId: 'tenant-1',
      permissions: ['centros.ver'],
    });

    expect(result).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-1',
      tenantNombre: 'Alimentos del Sur',
      permissions: ['centros.ver'],
    });
  });

  it('devuelve tenantNombre null si el tenant ya no existe', async () => {
    const repo = new FakeAuthRepo();
    repo.tenantNombre = null;
    const useCase = new GetCurrentUserUseCase(repo as unknown as AuthRepositoryPort);

    const result = await useCase.execute({
      userId: 'user-1',
      tenantId: 'tenant-1',
      permissions: [],
    });

    expect(result.tenantNombre).toBeNull();
  });
});
