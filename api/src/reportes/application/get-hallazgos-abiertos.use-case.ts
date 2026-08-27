import { Inject, Injectable } from '@nestjs/common';
import {
  OpenFinding,
  REPORTS_REPOSITORY,
  ReportsRepositoryPort,
} from '../domain/ports/reports-repository.port';

@Injectable()
export class GetHallazgosAbiertosUseCase {
  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reports: ReportsRepositoryPort,
  ) {}

  execute(centroId?: string, incluirResueltos = false): Promise<OpenFinding[]> {
    return this.reports.getHallazgos(centroId, incluirResueltos);
  }
}
