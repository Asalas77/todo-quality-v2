import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StartInspectionUseCase } from '../../inspecciones/application/start-inspection.use-case';
import { Inspection } from '../../inspecciones/domain/ports/inspection-repository.port';
import {
  SCHEDULE_REPOSITORY,
  ScheduleNotFoundError,
  ScheduleNotPendingError,
  ScheduleRepositoryPort,
} from '../domain/ports/schedule-repository.port';

export interface StartInspectionFromScheduleCommand {
  scheduleId: string;
  inspectorId: string;
}

/**
 * Convierte una programación pendiente en una inspección real. Reutiliza
 * StartInspectionUseCase del módulo de inspecciones en vez de duplicar la lógica de
 * creación — el legacy sí la duplicaba (ListadoAgendados.vue reimplementaba el flujo
 * completo de "completar checklist" en vez de reusar el de CompletarChecklist.vue).
 */
@Injectable()
export class StartInspectionFromScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly schedule: ScheduleRepositoryPort,
    private readonly startInspection: StartInspectionUseCase,
  ) {}

  async execute(command: StartInspectionFromScheduleCommand): Promise<Inspection> {
    const scheduled = await this.schedule.findById(command.scheduleId);
    if (!scheduled) throw new NotFoundException('La programación no existe');
    if (scheduled.estado !== 'PENDIENTE') {
      throw new ConflictException('Esta programación ya no está pendiente');
    }

    const inspection = await this.startInspection.execute({
      templateId: scheduled.templateId,
      centroId: scheduled.centroId,
      inspectorId: command.inspectorId,
      fecha: scheduled.fecha,
    });

    try {
      // markStarted vuelve a exigir PENDIENTE de forma atómica en su propio UPDATE, así
      // que dos clics concurrentes en la misma programación no la vinculan dos veces.
      // Queda una inspección BORRADOR huérfana en ese caso (dos transacciones separadas,
      // no una sola) — aceptable: no corrompe datos, solo deja un registro sin usar.
      await this.schedule.markStarted(scheduled.id, inspection.id);
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ScheduleNotPendingError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }

    return inspection;
  }
}
