import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INSPECTION_REPOSITORY,
  Inspection,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';

@Injectable()
export class GetInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  async execute(id: string): Promise<Inspection> {
    const inspection = await this.inspections.findById(id);
    if (!inspection) throw new NotFoundException('La inspección no existe');
    return inspection;
  }
}
