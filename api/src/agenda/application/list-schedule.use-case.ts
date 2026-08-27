import { Inject, Injectable } from '@nestjs/common';
import {
  ListScheduleFilter,
  SCHEDULE_REPOSITORY,
  Schedule,
  ScheduleRepositoryPort,
} from '../domain/ports/schedule-repository.port';

export interface ListScheduleQuery {
  estado?: ListScheduleFilter['estado'];
  centroId?: string;
  /** Filtro explícito "solo lo mío", disponible incluso con agenda.ver_todas. */
  soloMios?: boolean;
  /** Usuario que consulta y si puede ver la agenda de todos o solo la propia. */
  requestedBy: string;
  canViewAll: boolean;
}

@Injectable()
export class ListScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly schedule: ScheduleRepositoryPort,
  ) {}

  execute(query: ListScheduleQuery): Promise<Schedule[]> {
    return this.schedule.findAll({
      estado: query.estado,
      centroId: query.centroId,
      // Sin agenda.ver_todas, un usuario solo ve lo que tiene asignado — igual que
      // "MiAgenda" en el legacy frente al listado completo que solo veía el admin. Con
      // agenda.ver_todas, "soloMios" deja elegir ese mismo recorte a propósito.
      asignadoA: query.canViewAll ? (query.soloMios ? query.requestedBy : undefined) : query.requestedBy,
    });
  }
}
