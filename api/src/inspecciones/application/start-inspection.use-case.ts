import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CentroInactiveError,
  INSPECTION_REPOSITORY,
  Inspection,
  InspectionRepositoryPort,
  StartInspectionInput,
  TemplateInactiveError,
} from '../domain/ports/inspection-repository.port';

@Injectable()
export class StartInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  async execute(input: StartInspectionInput): Promise<Inspection> {
    try {
      return await this.inspections.start(input);
    } catch (error) {
      if (error instanceof TemplateInactiveError || error instanceof CentroInactiveError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
