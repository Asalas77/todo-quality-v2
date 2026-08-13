import { ConflictException, NotFoundException } from '@nestjs/common';
import { ListCentrosUseCase } from './list-centros.use-case';
import { CreateCentroUseCase } from './create-centro.use-case';
import { UpdateCentroUseCase } from './update-centro.use-case';
import { SetCentroActivoUseCase } from './set-centro-activo.use-case';
import {
  Centro,
  CentroNotFoundError,
  CentroRepositoryPort,
  DuplicateCentroNombreError,
} from '../domain/ports/centro-repository.port';

function buildCentro(overrides: Partial<Centro> = {}): Centro {
  return {
    id: 'centro-1',
    nombre: 'Planta Norte',
    direccion: 'Calle A 100',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeCentroRepo implements CentroRepositoryPort {
  centros: Centro[] = [];
  throwOnCreate: Error | null = null;
  throwOnUpdate: Error | null = null;
  throwOnSetActivo: Error | null = null;

  async findAll(includeInactive: boolean) {
    return this.centros.filter((c) => includeInactive || c.activo);
  }

  async create(input: { nombre: string; direccion: string }) {
    if (this.throwOnCreate) throw this.throwOnCreate;
    const centro = buildCentro({ id: `centro-${this.centros.length + 1}`, ...input });
    this.centros.push(centro);
    return centro;
  }

  async update(id: string, input: { nombre: string; direccion: string }) {
    if (this.throwOnUpdate) throw this.throwOnUpdate;
    const centro = this.centros.find((c) => c.id === id);
    if (!centro) throw new CentroNotFoundError();
    Object.assign(centro, input);
    return centro;
  }

  async setActivo(id: string, activo: boolean) {
    if (this.throwOnSetActivo) throw this.throwOnSetActivo;
    const centro = this.centros.find((c) => c.id === id);
    if (!centro) throw new CentroNotFoundError();
    centro.activo = activo;
    return centro;
  }
}

describe('ListCentrosUseCase', () => {
  it('excluye inactivos por defecto y los incluye si se pide', async () => {
    const repo = new FakeCentroRepo();
    repo.centros = [buildCentro({ id: '1', activo: true }), buildCentro({ id: '2', activo: false })];
    const useCase = new ListCentrosUseCase(repo);

    expect(await useCase.execute({ includeInactive: false })).toHaveLength(1);
    expect(await useCase.execute({ includeInactive: true })).toHaveLength(2);
  });
});

describe('CreateCentroUseCase', () => {
  it('crea un centro', async () => {
    const repo = new FakeCentroRepo();
    const useCase = new CreateCentroUseCase(repo);

    const centro = await useCase.execute({ nombre: 'Planta Sur', direccion: 'Calle B 1' });

    expect(centro.nombre).toBe('Planta Sur');
    expect(repo.centros).toHaveLength(1);
  });

  it('traduce el nombre duplicado a un 409', async () => {
    const repo = new FakeCentroRepo();
    repo.throwOnCreate = new DuplicateCentroNombreError();
    const useCase = new CreateCentroUseCase(repo);

    await expect(
      useCase.execute({ nombre: 'Repetido', direccion: 'X' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('UpdateCentroUseCase', () => {
  it('actualiza nombre y dirección', async () => {
    const repo = new FakeCentroRepo();
    repo.centros = [buildCentro()];
    const useCase = new UpdateCentroUseCase(repo);

    const centro = await useCase.execute({
      id: 'centro-1',
      nombre: 'Planta Norte 2',
      direccion: 'Nueva dirección',
    });

    expect(centro.nombre).toBe('Planta Norte 2');
  });

  it('traduce centro inexistente a 404', async () => {
    const repo = new FakeCentroRepo();
    const useCase = new UpdateCentroUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', nombre: 'X', direccion: 'Y' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('traduce nombre duplicado a 409', async () => {
    const repo = new FakeCentroRepo();
    repo.centros = [buildCentro()];
    repo.throwOnUpdate = new DuplicateCentroNombreError();
    const useCase = new UpdateCentroUseCase(repo);

    await expect(
      useCase.execute({ id: 'centro-1', nombre: 'Otro', direccion: 'Y' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('SetCentroActivoUseCase', () => {
  it('desactiva un centro sin borrarlo', async () => {
    const repo = new FakeCentroRepo();
    repo.centros = [buildCentro({ activo: true })];
    const useCase = new SetCentroActivoUseCase(repo);

    const centro = await useCase.execute({ id: 'centro-1', activo: false });

    expect(centro.activo).toBe(false);
    expect(repo.centros).toHaveLength(1);
  });

  it('traduce centro inexistente a 404', async () => {
    const repo = new FakeCentroRepo();
    const useCase = new SetCentroActivoUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', activo: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
