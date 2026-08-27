import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INSPECTION_REPOSITORY,
  Inspection,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';

export interface GetInspectionQuery {
  id: string;
  requestedBy: string;
  canViewAll: boolean;
}

@Injectable()
export class GetInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  async execute(query: GetInspectionQuery): Promise<Inspection> {
    const inspection = await this.inspections.findById(query.id);
    if (!inspection) throw new NotFoundException('La inspección no existe');
    if (!query.canViewAll && inspection.inspectorId !== query.requestedBy) {
      throw new ForbiddenException('No tienes permiso para ver esta inspección');
    }
    return inspection;
  }
}
