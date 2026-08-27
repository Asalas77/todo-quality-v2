import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ListInspectionsUseCase } from './list-inspections.use-case';
import { GetInspectionUseCase } from './get-inspection.use-case';
import { StartInspectionUseCase } from './start-inspection.use-case';
import { SaveInspectionAnswersUseCase } from './save-inspection-answers.use-case';
import {
  AnswerInput,
  CentroInactiveError,
  Inspection,
  InspectionNotFoundError,
  InspectionRepositoryPort,
  InspectionSummary,
  ListInspectionsFilter,
  StartInspectionInput,
  TemplateInactiveError,
} from '../domain/ports/inspection-repository.port';

function buildInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: 'insp-1',
    templateId: 'tpl-1',
    templateNombre: 'Higiene diaria',
    centroId: 'centro-1',
    centroNombre: 'Planta Norte',
    inspectorId: 'user-1',
    inspectorNombre: 'Ana Salas',
    fecha: '2026-01-01',
    estado: 'BORRADOR',
    answers: [
      {
        templateItemId: 'item-1',
        itemDescripcion: '¿Manos limpias?',
        itemCriticidad: 'CRITICO',
        itemOrden: 0,
        estado: null,
        observacion: null,
        evidenciaUrl: null,
        planAccion: null,
        fechaCompromiso: null,
        fechaControl: null,
        responsable: null,
        resuelto: false,
        resueltoAt: null,
        resueltoPorNombre: null,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function toSummary(i: Inspection): InspectionSummary {
  const { answers: _answers, ...summary } = i;
  return summary;
}

class FakeInspectionRepo implements InspectionRepositoryPort {
  inspections: Inspection[] = [];
  throwOnStart: Error | null = null;

  async findAll(filter: ListInspectionsFilter) {
    return this.inspections
      .filter((i) => !filter.estado || i.estado === filter.estado)
      .filter((i) => !filter.centroId || i.centroId === filter.centroId)
      .filter((i) => !filter.inspectorId || i.inspectorId === filter.inspectorId)
      .map(toSummary);
  }

  async findById(id: string) {
    return this.inspections.find((i) => i.id === id) ?? null;
  }

  async start(input: StartInspectionInput) {
    if (this.throwOnStart) throw this.throwOnStart;
    const inspection = buildInspection({
      id: `insp-${this.inspections.length + 1}`,
      templateId: input.templateId,
      centroId: input.centroId,
      inspectorId: input.inspectorId,
      fecha: input.fecha,
      estado: 'BORRADOR',
    });
    this.inspections.push(inspection);
    return inspection;
  }

  async setEvidencia(): Promise<never> {
    throw new Error('no usado en estos tests');
  }

  async getEvidenciaStorageKey(): Promise<never> {
    throw new Error('no usado en estos tests');
  }

  async setResuelto(): Promise<never> {
    throw new Error('no usado en estos tests');
  }

  async saveAnswers(inspectionId: string, answers: AnswerInput[]) {
    const inspection = this.inspections.find((i) => i.id === inspectionId);
    if (!inspection) throw new InspectionNotFoundError();

    for (const answer of answers) {
      const existing = inspection.answers.find(
        (a) => a.templateItemId === answer.templateItemId,
      );
      if (existing) Object.assign(existing, answer);
    }

    const allAnswered = inspection.answers.every((a) => a.estado !== null);
    const anyNoCumple = inspection.answers.some((a) => a.estado === 'NO_CUMPLE');
    inspection.estado = !allAnswered ? 'BORRADOR' : anyNoCumple ? 'NO_CONFORME' : 'CONFORME';

    return inspection;
  }
}

describe('StartInspectionUseCase', () => {
  it('crea la inspección en BORRADOR', async () => {
    const repo = new FakeInspectionRepo();
    const useCase = new StartInspectionUseCase(repo);

    const inspection = await useCase.execute({
      templateId: 'tpl-1',
      centroId: 'centro-1',
      inspectorId: 'user-1',
      fecha: '2026-01-01',
    });

    expect(inspection.estado).toBe('BORRADOR');
  });

  it('traduce plantilla inactiva a 409', async () => {
    const repo = new FakeInspectionRepo();
    repo.throwOnStart = new TemplateInactiveError();
    const useCase = new StartInspectionUseCase(repo);

    await expect(
      useCase.execute({ templateId: 'x', centroId: 'x', inspectorId: 'x', fecha: '2026-01-01' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('traduce centro inactivo a 409', async () => {
    const repo = new FakeInspectionRepo();
    repo.throwOnStart = new CentroInactiveError();
    const useCase = new StartInspectionUseCase(repo);

    await expect(
      useCase.execute({ templateId: 'x', centroId: 'x', inspectorId: 'x', fecha: '2026-01-01' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('SaveInspectionAnswersUseCase', () => {
  it('guarda una respuesta simple y recalcula el estado', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [buildInspection()];
    const useCase = new SaveInspectionAnswersUseCase(repo);

    const result = await useCase.execute({
      inspectionId: 'insp-1',
      answers: [{ templateItemId: 'item-1', estado: 'CUMPLE' }],
      requestedBy: 'user-1',
      canViewAll: false,
    });

    expect(result.estado).toBe('CONFORME');
  });

  it('rechaza un NO_CUMPLE sin plan de acción, fecha de compromiso, fecha de control o responsable', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [buildInspection()];
    const useCase = new SaveInspectionAnswersUseCase(repo);

    await expect(
      useCase.execute({
        inspectionId: 'insp-1',
        answers: [{ templateItemId: 'item-1', estado: 'NO_CUMPLE' }],
        requestedBy: 'user-1',
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acepta un NO_CUMPLE con los 4 campos completos', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [buildInspection()];
    const useCase = new SaveInspectionAnswersUseCase(repo);

    const result = await useCase.execute({
      inspectionId: 'insp-1',
      answers: [
        {
          templateItemId: 'item-1',
          estado: 'NO_CUMPLE',
          planAccion: 'Reforzar lavado de manos',
          fechaCompromiso: '2026-01-05',
          fechaControl: '2026-01-10',
          responsable: 'Jefe de turno',
        },
      ],
      requestedBy: 'user-1',
      canViewAll: false,
    });

    expect(result.estado).toBe('NO_CONFORME');
  });

  it('traduce inspección inexistente a 404', async () => {
    const repo = new FakeInspectionRepo();
    const useCase = new SaveInspectionAnswersUseCase(repo);

    await expect(
      useCase.execute({
        inspectionId: 'no-existe',
        answers: [{ templateItemId: 'item-1', estado: 'CUMPLE' }],
        requestedBy: 'user-1',
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza con 403 modificar una inspección que no es propia sin ver_todas', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [buildInspection({ inspectorId: 'user-1' })];
    const useCase = new SaveInspectionAnswersUseCase(repo);

    await expect(
      useCase.execute({
        inspectionId: 'insp-1',
        answers: [{ templateItemId: 'item-1', estado: 'CUMPLE' }],
        requestedBy: 'otro-user',
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite modificar una inspección ajena si tiene inspecciones.ver_todas', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [buildInspection({ inspectorId: 'user-1' })];
    const useCase = new SaveInspectionAnswersUseCase(repo);

    const result = await useCase.execute({
      inspectionId: 'insp-1',
      answers: [{ templateItemId: 'item-1', estado: 'CUMPLE' }],
      requestedBy: 'supervisor-1',
      canViewAll: true,
    });

    expect(result.estado).toBe('CONFORME');
  });
});

describe('ListInspectionsUseCase / GetInspectionUseCase', () => {
  it('filtra por estado y centro', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [
      buildInspection({ id: '1', estado: 'CONFORME', centroId: 'a' }),
      buildInspection({ id: '2', estado: 'NO_CONFORME', centroId: 'b' }),
    ];
    const useCase = new ListInspectionsUseCase(repo);

    expect(
      await useCase.execute({ estado: 'CONFORME', requestedBy: 'user-1', canViewAll: true }),
    ).toHaveLength(1);
    expect(
      await useCase.execute({ centroId: 'b', requestedBy: 'user-1', canViewAll: true }),
    ).toHaveLength(1);
    expect(await useCase.execute({ requestedBy: 'user-1', canViewAll: true })).toHaveLength(2);
  });

  it('sin ver_todas, solo lista las inspecciones propias', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [
      buildInspection({ id: '1', inspectorId: 'user-1' }),
      buildInspection({ id: '2', inspectorId: 'otro-user' }),
    ];
    const useCase = new ListInspectionsUseCase(repo);

    const result = await useCase.execute({ requestedBy: 'user-1', canViewAll: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('devuelve 404 si la inspección no existe', async () => {
    const repo = new FakeInspectionRepo();
    const useCase = new GetInspectionUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', requestedBy: 'user-1', canViewAll: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza con 403 ver una inspección ajena sin ver_todas', async () => {
    const repo = new FakeInspectionRepo();
    repo.inspections = [buildInspection({ id: '1', inspectorId: 'user-1' })];
    const useCase = new GetInspectionUseCase(repo);

    await expect(
      useCase.execute({ id: '1', requestedBy: 'otro-user', canViewAll: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
