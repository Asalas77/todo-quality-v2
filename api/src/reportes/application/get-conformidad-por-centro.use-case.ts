import { Inject, Injectable } from '@nestjs/common';
import {
  CentroConformidad,
  DateRangeFilter,
  REPORTS_REPOSITORY,
  ReportsRepositoryPort,
} from '../domain/ports/reports-repository.port';

@Injectable()
export class GetConformidadPorCentroUseCase {
  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reports: ReportsRepositoryPort,
  ) {}

  execute(filter: DateRangeFilter): Promise<CentroConformidad[]> {
    return this.reports.getConformidadPorCentro(filter);
  }
}
