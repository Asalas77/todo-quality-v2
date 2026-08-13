import { Inject, Injectable } from '@nestjs/common';
import {
  INSPECTION_REPOSITORY,
  InspectionRepositoryPort,
  InspectionSummary,
  ListInspectionsFilter,
} from '../domain/ports/inspection-repository.port';

@Injectable()
export class ListInspectionsUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  execute(filter: ListInspectionsFilter): Promise<InspectionSummary[]> {
    return this.inspections.findAll(filter);
  }
}
