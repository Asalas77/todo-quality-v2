import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ListScheduleUseCase } from '../application/list-schedule.use-case';
import { CreateScheduleUseCase } from '../application/create-schedule.use-case';
import { CancelScheduleUseCase } from '../application/cancel-schedule.use-case';
import { StartInspectionFromScheduleUseCase } from '../application/start-inspection-from-schedule.use-case';
import { CreateScheduleDto } from './dto/schedule.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';
import { RequestWithUser } from '../../auth/infrastructure/tenant-context.middleware';
import { ScheduleStatus } from '../domain/ports/schedule-repository.port';

@Controller('agenda')
export class AgendaController {
  constructor(
    private readonly listSchedule: ListScheduleUseCase,
    private readonly createSchedule: CreateScheduleUseCase,
    private readonly cancelSchedule: CancelScheduleUseCase,
    private readonly startInspectionFromSchedule: StartInspectionFromScheduleUseCase,
  ) {}

  @RequirePermissions('agenda.ver')
  @Get()
  list(
    @Req() req: RequestWithUser,
    @Query('estado') estado?: ScheduleStatus,
    @Query('centroId') centroId?: string,
    @Query('soloMios') soloMios?: string,
  ) {
    return this.listSchedule.execute({
      estado,
      centroId,
      soloMios: soloMios === 'true',
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('agenda.ver_todas'),
    });
  }

  @RequirePermissions('agenda.gestionar')
  @Post()
  create(@Body() dto: CreateScheduleDto, @Req() req: RequestWithUser) {
    return this.createSchedule.execute({
      templateId: dto.templateId,
      formId: dto.formId,
      centroId: dto.centroId,
      fecha: dto.fecha,
      asunto: dto.asunto ?? null,
      // Quien programa puede asignar a otro usuario del equipo (requiere agenda.gestionar,
      // que ya solo tienen Supervisor y Administrador); si no elige a nadie, queda a su
      // propio nombre — mismo comportamiento que antes de que existiera el selector.
      asignadoA: dto.asignadoA ?? req.user!.userId,
    });
  }

  @RequirePermissions('agenda.gestionar')
  @Post(':id/cancelar')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.cancelSchedule.execute(id);
  }

  @RequirePermissions('inspecciones.completar')
  @Post(':id/iniciar')
  start(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.startInspectionFromSchedule.execute({
      scheduleId: id,
      inspectorId: req.user!.userId,
    });
  }
}
