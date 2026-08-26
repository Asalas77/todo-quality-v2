import { Module } from '@nestjs/common';
import { ReportesController } from './infrastructure/reportes.controller';
import { GetDashboardSummaryUseCase } from './application/get-dashboard-summary.use-case';
import { GetDashboardTrendUseCase } from './application/get-dashboard-trend.use-case';
import { GetConformidadPorCentroUseCase } from './application/get-conformidad-por-centro.use-case';
import { GetHallazgosAbiertosUseCase } from './application/get-hallazgos-abiertos.use-case';
import { GetFormulariosActividadUseCase } from './application/get-formularios-actividad.use-case';
import { REPORTS_REPOSITORY } from './domain/ports/reports-repository.port';
import { PostgresReportsRepository } from './infrastructure/postgres-reports.repository';

@Module({
  controllers: [ReportesController],
  providers: [
    GetDashboardSummaryUseCase,
    GetDashboardTrendUseCase,
    GetConformidadPorCentroUseCase,
    GetHallazgosAbiertosUseCase,
    GetFormulariosActividadUseCase,
    { provide: REPORTS_REPOSITORY, useClass: PostgresReportsRepository },
  ],
})
export class ReportesModule {}
