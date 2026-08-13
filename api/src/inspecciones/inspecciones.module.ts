import { Module } from '@nestjs/common';
import { InspeccionesController } from './infrastructure/inspecciones.controller';
import { ListInspectionsUseCase } from './application/list-inspections.use-case';
import { GetInspectionUseCase } from './application/get-inspection.use-case';
import { StartInspectionUseCase } from './application/start-inspection.use-case';
import { SaveInspectionAnswersUseCase } from './application/save-inspection-answers.use-case';
import { UploadEvidenceUseCase } from './application/upload-evidence.use-case';
import { GetEvidenceUseCase } from './application/get-evidence.use-case';
import { INSPECTION_REPOSITORY } from './domain/ports/inspection-repository.port';
import { EVIDENCE_STORAGE } from './domain/ports/evidence-storage.port';
import { PostgresInspectionRepository } from './infrastructure/postgres-inspection.repository';
import { DiskEvidenceStorage } from './infrastructure/disk-evidence-storage';

@Module({
  controllers: [InspeccionesController],
  providers: [
    ListInspectionsUseCase,
    GetInspectionUseCase,
    StartInspectionUseCase,
    SaveInspectionAnswersUseCase,
    UploadEvidenceUseCase,
    GetEvidenceUseCase,
    { provide: INSPECTION_REPOSITORY, useClass: PostgresInspectionRepository },
    { provide: EVIDENCE_STORAGE, useClass: DiskEvidenceStorage },
  ],
  // El módulo de agenda reusa este caso de uso al convertir una programación en
  // inspección real, en vez de duplicar la lógica de creación.
  exports: [StartInspectionUseCase],
})
export class InspeccionesModule {}
