import { Controller, Get, Query } from '@nestjs/common';
import { GetDashboardSummaryUseCase } from '../application/get-dashboard-summary.use-case';
import { GetDashboardTrendUseCase } from '../application/get-dashboard-trend.use-case';
import { GetConformidadPorCentroUseCase } from '../application/get-conformidad-por-centro.use-case';
import { GetHallazgosAbiertosUseCase } from '../application/get-hallazgos-abiertos.use-case';
import { GetFormulariosActividadUseCase } from '../application/get-formularios-actividad.use-case';
import { CentroQueryDto, DateRangeQueryDto } from './dto/date-range-query.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';

@Controller('reportes')
@RequirePermissions('reportes.ver')
export class ReportesController {
  constructor(
    private readonly getSummary: GetDashboardSummaryUseCase,
    private readonly getTrend: GetDashboardTrendUseCase,
    private readonly getConformidadPorCentro: GetConformidadPorCentroUseCase,
    private readonly getHallazgosAbiertos: GetHallazgosAbiertosUseCase,
    private readonly getFormulariosActividad: GetFormulariosActividadUseCase,
  ) {}

  @Get('resumen')
  summary(@Query() query: DateRangeQueryDto) {
    return this.getSummary.execute(query);
  }

  @Get('tendencia')
  trend(@Query() query: DateRangeQueryDto) {
    return this.getTrend.execute(query);
  }

  @Get('centros')
  centros(@Query() query: DateRangeQueryDto) {
    return this.getConformidadPorCentro.execute(query);
  }

  @Get('hallazgos-abiertos')
  hallazgosAbiertos(
    @Query() query: CentroQueryDto,
    @Query('incluirResueltos') incluirResueltos?: string,
  ) {
    return this.getHallazgosAbiertos.execute(query.centroId, incluirResueltos === 'true');
  }

  @Get('formularios')
  formularios(@Query() query: DateRangeQueryDto) {
    return this.getFormulariosActividad.execute(query);
  }
}
