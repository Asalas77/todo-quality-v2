import { Module } from '@nestjs/common';
import { AgendaController } from './infrastructure/agenda.controller';
import { ListScheduleUseCase } from './application/list-schedule.use-case';
import { CreateScheduleUseCase } from './application/create-schedule.use-case';
import { CancelScheduleUseCase } from './application/cancel-schedule.use-case';
import { StartInspectionFromScheduleUseCase } from './application/start-inspection-from-schedule.use-case';
import { SCHEDULE_REPOSITORY } from './domain/ports/schedule-repository.port';
import { PostgresScheduleRepository } from './infrastructure/postgres-schedule.repository';
import { InspeccionesModule } from '../inspecciones/inspecciones.module';

@Module({
  imports: [InspeccionesModule],
  controllers: [AgendaController],
  providers: [
    ListScheduleUseCase,
    CreateScheduleUseCase,
    CancelScheduleUseCase,
    StartInspectionFromScheduleUseCase,
    { provide: SCHEDULE_REPOSITORY, useClass: PostgresScheduleRepository },
  ],
})
export class AgendaModule {}
