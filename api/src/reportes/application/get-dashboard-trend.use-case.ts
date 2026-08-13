import { Inject, Injectable } from '@nestjs/common';
import {
  DateRangeFilter,
  REPORTS_REPOSITORY,
  ReportsRepositoryPort,
  TrendPoint,
} from '../domain/ports/reports-repository.port';

@Injectable()
export class GetDashboardTrendUseCase {
  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reports: ReportsRepositoryPort,
  ) {}

  execute(filter: DateRangeFilter): Promise<TrendPoint[]> {
    return this.reports.getTrend(filter);
  }
}
