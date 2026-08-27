import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListFormResponsesUseCase } from './list-form-responses.use-case';
import { ListAllFormResponsesUseCase } from './list-all-form-responses.use-case';
import { GetFormResponseUseCase } from './get-form-response.use-case';
import {
  FormResponseDetail,
  FormResponseRepositoryPort,
  FormResponseSummary,
  FormResponseWithForm,
  ListAllFormResponsesFilter,
  ListFormResponsesFilter,
} from '../domain/ports/form-response-repository.port';

function buildSummary(overrides: Partial<FormResponseSummary> = {}): FormResponseSummary {
  return {
    id: 'resp-1',
    formId: 'form-1',
    centroId: null,
    centroNombre: null,
    creadoPor: 'user-1',
    creadoPorNombre: 'Ana Soto',
    estado: 'ENVIADA',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeFormResponseRepo implements Partial<FormResponseRepositoryPort> {
  responses: FormResponseSummary[] = [];

  async findByForm(formId: string, filter: ListFormResponsesFilter = {}) {
    return this.responses
      .filter((r) => r.formId === formId)
      .filter((r) => !filter.creadoPor || r.creadoPor === filter.creadoPor);
  }

  async findById(id: string): Promise<FormResponseDetail | null> {
    const found = this.responses.find((r) => r.id === id);
    return found ? { ...found, valores: [] } : null;
  }

  async findAllSubmitted(
    filter: ListAllFormResponsesFilter = {},
  ): Promise<FormResponseWithForm[]> {
    return this.responses
      .filter((r) => !filter.centroId || r.centroId === filter.centroId)
      .filter((r) => !filter.creadoPor || r.creadoPor === filter.creadoPor)
      .map((r) => ({ ...r, formNombre: 'Registro de temperatura' }));
  }
}

describe('ListFormResponsesUseCase', () => {
  it('sin formularios.ver_todas, solo lista las respuestas propias', async () => {
    const repo = new FakeFormResponseRepo();
    repo.responses = [
      buildSummary({ id: '1', creadoPor: 'user-1' }),
      buildSummary({ id: '2', creadoPor: 'otro-user' }),
    ];
    const useCase = new ListFormResponsesUseCase(repo as unknown as FormResponseRepositoryPort);

    const result = await useCase.execute({
      formId: 'form-1',
      requestedBy: 'user-1',
      canViewAll: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('con formularios.ver_todas, lista las respuestas de todos', async () => {
    const repo = new FakeFormResponseRepo();
    repo.responses = [
      buildSummary({ id: '1', creadoPor: 'user-1' }),
      buildSummary({ id: '2', creadoPor: 'otro-user' }),
    ];
    const useCase = new ListFormResponsesUseCase(repo as unknown as FormResponseRepositoryPort);

    const result = await useCase.execute({
      formId: 'form-1',
      requestedBy: 'supervisor-1',
      canViewAll: true,
    });

    expect(result).toHaveLength(2);
  });
});

describe('GetFormResponseUseCase', () => {
  it('devuelve 404 si la respuesta no existe', async () => {
    const repo = new FakeFormResponseRepo();
    const useCase = new GetFormResponseUseCase(repo as unknown as FormResponseRepositoryPort);

    await expect(
      useCase.execute({ id: 'no-existe', requestedBy: 'user-1', canViewAll: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza con 403 ver una respuesta ajena sin ver_todas', async () => {
    const repo = new FakeFormResponseRepo();
    repo.responses = [buildSummary({ id: '1', creadoPor: 'user-1' })];
    const useCase = new GetFormResponseUseCase(repo as unknown as FormResponseRepositoryPort);

    await expect(
      useCase.execute({ id: '1', requestedBy: 'otro-user', canViewAll: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite ver una respuesta ajena con formularios.ver_todas', async () => {
    const repo = new FakeFormResponseRepo();
    repo.responses = [buildSummary({ id: '1', creadoPor: 'user-1' })];
    const useCase = new GetFormResponseUseCase(repo as unknown as FormResponseRepositoryPort);

    const result = await useCase.execute({
      id: '1',
      requestedBy: 'supervisor-1',
      canViewAll: true,
    });

    expect(result.id).toBe('1');
  });
});

describe('ListAllFormResponsesUseCase', () => {
  it('sin ver_todas, solo lista las respuestas propias de cualquier formulario', async () => {
    const repo = new FakeFormResponseRepo();
    repo.responses = [
      buildSummary({ id: '1', formId: 'form-a', creadoPor: 'user-1' }),
      buildSummary({ id: '2', formId: 'form-b', creadoPor: 'otro-user' }),
    ];
    const useCase = new ListAllFormResponsesUseCase(
      repo as unknown as FormResponseRepositoryPort,
    );

    const result = await useCase.execute({ requestedBy: 'user-1', canViewAll: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].formNombre).toBe('Registro de temperatura');
  });

  it('con ver_todas, lista las respuestas de todos', async () => {
    const repo = new FakeFormResponseRepo();
    repo.responses = [
      buildSummary({ id: '1', formId: 'form-a', creadoPor: 'user-1' }),
      buildSummary({ id: '2', formId: 'form-b', creadoPor: 'otro-user' }),
    ];
    const useCase = new ListAllFormResponsesUseCase(
      repo as unknown as FormResponseRepositoryPort,
    );

    const result = await useCase.execute({ requestedBy: 'supervisor-1', canViewAll: true });
    expect(result).toHaveLength(2);
  });
});
