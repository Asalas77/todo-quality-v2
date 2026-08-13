import { Module } from '@nestjs/common';
import { PlantillasController } from './infrastructure/plantillas.controller';
import { ListChecklistTemplatesUseCase } from './application/list-checklist-templates.use-case';
import { GetChecklistTemplateUseCase } from './application/get-checklist-template.use-case';
import { CreateChecklistTemplateUseCase } from './application/create-checklist-template.use-case';
import { UpdateChecklistTemplateUseCase } from './application/update-checklist-template.use-case';
import { SetChecklistTemplateActivoUseCase } from './application/set-checklist-template-activo.use-case';
import { CHECKLIST_TEMPLATE_REPOSITORY } from './domain/ports/checklist-template-repository.port';
import { PostgresChecklistTemplateRepository } from './infrastructure/postgres-checklist-template.repository';

@Module({
  controllers: [PlantillasController],
  providers: [
    ListChecklistTemplatesUseCase,
    GetChecklistTemplateUseCase,
    CreateChecklistTemplateUseCase,
    UpdateChecklistTemplateUseCase,
    SetChecklistTemplateActivoUseCase,
    {
      provide: CHECKLIST_TEMPLATE_REPOSITORY,
      useClass: PostgresChecklistTemplateRepository,
    },
  ],
})
export class PlantillasModule {}
