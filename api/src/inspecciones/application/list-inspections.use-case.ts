import { Inject, Injectable } from '@nestjs/common';
import {
  INSPECTION_REPOSITORY,
  InspectionRepositoryPort,
  InspectionSummary,
} from '../domain/ports/inspection-repository.port';
import { InspectionStatus } from '../domain/derive-inspection-status';

export interface ListInspectionsQuery {
  estado?: InspectionStatus;
  centroId?: string;
  /** Usuario que consulta y si puede ver la inspecciones de todos o solo las propias. */
  requestedBy: string;
  canViewAll: boolean;
}

@Injectable()
export class ListInspectionsUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  execute(query: ListInspectionsQuery): Promise<InspectionSummary[]> {
    return this.inspections.findAll({
      estado: query.estado,
      centroId: query.centroId,
      // Sin inspecciones.ver_todas, un usuario solo ve las inspecciones que le
      // pertenecen — igual que "Mi agenda" en el módulo de Agenda.
      inspectorId: query.canViewAll ? undefined : query.requestedBy,
    });
  }
}
