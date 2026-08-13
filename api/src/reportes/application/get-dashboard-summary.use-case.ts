import { Inject, Injectable } from '@nestjs/common';
import {
  DashboardSummary,
  DateRangeFilter,
  REPORTS_REPOSITORY,
  ReportsRepositoryPort,
} from '../domain/ports/reports-repository.port';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reports: ReportsRepositoryPort,
  ) {}

  execute(filter: DateRangeFilter): Promise<DashboardSummary> {
    return this.reports.getSummary(filter);
  }
}
