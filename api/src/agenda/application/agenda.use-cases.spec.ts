import { ConflictException, NotFoundException } from '@nestjs/common';
import { ListScheduleUseCase } from './list-schedule.use-case';
import { CreateScheduleUseCase } from './create-schedule.use-case';
import { CancelScheduleUseCase } from './cancel-schedule.use-case';
import { StartInspectionFromScheduleUseCase } from './start-inspection-from-schedule.use-case';
import { StartInspectionUseCase } from '../../inspecciones/application/start-inspection.use-case';
import {
  Inspection,
  InspectionRepositoryPort,
} from '../../inspecciones/domain/ports/inspection-repository.port';
import {
  CreateScheduleInput,
  ListScheduleFilter,
  Schedule,
  ScheduleCentroInactiveError,
  ScheduleNotFoundError,
  ScheduleNotPendingError,
  ScheduleRepositoryPort,
  ScheduleTemplateInactiveError,
} from '../domain/ports/schedule-repository.port';

function buildSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    templateId: 'tpl-1',
    templateNombre: 'Higiene diaria',
    centroId: 'centro-1',
    centroNombre: 'Planta Norte',
    asignadoA: 'user-1',
    asignadoNombre: 'Ana Salas',
    asunto: null,
    fecha: '2026-02-01',
    estado: 'PENDIENTE',
    inspectionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeScheduleRepo implements ScheduleRepositoryPort {
  items: Schedule[] = [];
  throwOnCreate: Error | null = null;

  async findAll(filter: ListScheduleFilter) {
    return this.items
      .filter((s) => !filter.estado || s.estado === filter.estado)
      .filter((s) => !filter.centroId || s.centroId === filter.centroId)
      .filter((s) => !filter.asignadoA || s.asignadoA === filter.asignadoA);
  }

  async findById(id: string) {
    return this.items.find((s) => s.id === id) ?? null;
  }

  async create(input: CreateScheduleInput) {
    if (this.throwOnCreate) throw this.throwOnCreate;
    const schedule = buildSchedule({ id: `sched-${this.items.length + 1}`, ...input });
    this.items.push(schedule);
    return schedule;
  }

  async cancel(id: string) {
    const schedule = this.items.find((s) => s.id === id);
    if (!schedule) throw new ScheduleNotFoundError();
    if (schedule.estado !== 'PENDIENTE') throw new ScheduleNotPendingError();
    schedule.estado = 'CANCELADA';
    return schedule;
  }

  async markStarted(id: string, inspectionId: string) {
    const schedule = this.items.find((s) => s.id === id);
    if (!schedule) throw new ScheduleNotFoundError();
    if (schedule.estado !== 'PENDIENTE') throw new ScheduleNotPendingError();
    schedule.estado = 'COMPLETADA';
    schedule.inspectionId = inspectionId;
    return schedule;
  }
}

function buildInspection(): Inspection {
  return {
    id: 'insp-1',
    templateId: 'tpl-1',
    templateNombre: 'Higiene diaria',
    centroId: 'centro-1',
    centroNombre: 'Planta Norte',
    inspectorId: 'user-1',
    inspectorNombre: 'Ana Salas',
    fecha: '2026-02-01',
    estado: 'BORRADOR',
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class FakeInspectionRepo implements InspectionRepositoryPort {
  async findAll() {
    return [];
  }
  async findById() {
    return null;
  }
  async start() {
    return buildInspection();
  }
  async saveAnswers(): Promise<Inspection> {
    throw new Error('no usado');
  }
  async setEvidencia(): Promise<never> {
    throw new Error('no usado');
  }
  async getEvidenciaStorageKey(): Promise<never> {
    throw new Error('no usado');
  }
}

describe('ListScheduleUseCase', () => {
  it('sin agenda.ver_todas, filtra por el usuario que consulta', async () => {
    const repo = new FakeScheduleRepo();
    repo.items = [
      buildSchedule({ id: '1', asignadoA: 'user-1' }),
      buildSchedule({ id: '2', asignadoA: 'user-2' }),
    ];
    const useCase = new ListScheduleUseCase(repo);

    const own = await useCase.execute({ requestedBy: 'user-1', canViewAll: false });
    expect(own).toHaveLength(1);
    expect(own[0].asignadoA).toBe('user-1');

    const all = await useCase.execute({ requestedBy: 'user-1', canViewAll: true });
    expect(all).toHaveLength(2);
  });
});

describe('CreateScheduleUseCase', () => {
  it('crea la programación', async () => {
    const repo = new FakeScheduleRepo();
    const useCase = new CreateScheduleUseCase(repo);

    const schedule = await useCase.execute({
      templateId: 'tpl-1',
      centroId: 'centro-1',
      asignadoA: 'user-1',
      asunto: null,
      fecha: '2026-02-01',
    });

    expect(schedule.estado).toBe('PENDIENTE');
  });

  it('traduce plantilla o centro inactivo a 409', async () => {
    const repo = new FakeScheduleRepo();
    repo.throwOnCreate = new ScheduleTemplateInactiveError();
    const useCase = new CreateScheduleUseCase(repo);

    await expect(
      useCase.execute({ templateId: 'x', centroId: 'x', asignadoA: 'x', asunto: null, fecha: '2026-02-01' }),
    ).rejects.toBeInstanceOf(ConflictException);

    repo.throwOnCreate = new ScheduleCentroInactiveError();
    await expect(
      useCase.execute({ templateId: 'x', centroId: 'x', asignadoA: 'x', asunto: null, fecha: '2026-02-01' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CancelScheduleUseCase', () => {
  it('cancela una programación pendiente', async () => {
    const repo = new FakeScheduleRepo();
    repo.items = [buildSchedule()];
    const useCase = new CancelScheduleUseCase(repo);

    const result = await useCase.execute('sched-1');
    expect(result.estado).toBe('CANCELADA');
  });

  it('traduce no encontrada a 404 y ya-no-pendiente a 409', async () => {
    const repo = new FakeScheduleRepo();
    const useCase = new CancelScheduleUseCase(repo);
    await expect(useCase.execute('no-existe')).rejects.toBeInstanceOf(NotFoundException);

    repo.items = [buildSchedule({ estado: 'CANCELADA' })];
    await expect(useCase.execute('sched-1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('StartInspectionFromScheduleUseCase', () => {
  it('crea la inspección y marca la programación como completada', async () => {
    const scheduleRepo = new FakeScheduleRepo();
    scheduleRepo.items = [buildSchedule()];
    const inspectionRepo = new FakeInspectionRepo();
    const startInspection = new StartInspectionUseCase(inspectionRepo);
    const useCase = new StartInspectionFromScheduleUseCase(scheduleRepo, startInspection);

    const inspection = await useCase.execute({ scheduleId: 'sched-1', inspectorId: 'user-1' });

    expect(inspection.id).toBe('insp-1');
    expect(scheduleRepo.items[0].estado).toBe('COMPLETADA');
    expect(scheduleRepo.items[0].inspectionId).toBe('insp-1');
  });

  it('rechaza iniciar una programación que ya no está pendiente', async () => {
    const scheduleRepo = new FakeScheduleRepo();
    scheduleRepo.items = [buildSchedule({ estado: 'CANCELADA' })];
    const inspectionRepo = new FakeInspectionRepo();
    const startInspection = new StartInspectionUseCase(inspectionRepo);
    const useCase = new StartInspectionFromScheduleUseCase(scheduleRepo, startInspection);

    await expect(
      useCase.execute({ scheduleId: 'sched-1', inspectorId: 'user-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza una programación inexistente', async () => {
    const scheduleRepo = new FakeScheduleRepo();
    const inspectionRepo = new FakeInspectionRepo();
    const startInspection = new StartInspectionUseCase(inspectionRepo);
    const useCase = new StartInspectionFromScheduleUseCase(scheduleRepo, startInspection);

    await expect(
      useCase.execute({ scheduleId: 'no-existe', inspectorId: 'user-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
