import { Inject, Injectable } from '@nestjs/common';
import {
  DateRangeFilter,
  FormulariosActividad,
  REPORTS_REPOSITORY,
  ReportsRepositoryPort,
} from '../domain/ports/reports-repository.port';

@Injectable()
export class GetFormulariosActividadUseCase {
  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reports: ReportsRepositoryPort,
  ) {}

  execute(filter: DateRangeFilter): Promise<FormulariosActividad> {
    return this.reports.getFormulariosActividad(filter);
  }
}
