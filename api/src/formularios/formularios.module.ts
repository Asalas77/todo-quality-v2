import { Module } from '@nestjs/common';
import { FormulariosController } from './infrastructure/formularios.controller';
import { ListFormsUseCase } from './application/list-forms.use-case';
import { GetFormUseCase } from './application/get-form.use-case';
import { CreateFormUseCase } from './application/create-form.use-case';
import { UpdateFormUseCase } from './application/update-form.use-case';
import { SetFormActivoUseCase } from './application/set-form-activo.use-case';
import { SubmitFormResponseUseCase } from './application/submit-form-response.use-case';
import { ListFormResponsesUseCase } from './application/list-form-responses.use-case';
import { GetFormResponseUseCase } from './application/get-form-response.use-case';
import { FORM_REPOSITORY } from './domain/ports/form-repository.port';
import { FORM_RESPONSE_REPOSITORY } from './domain/ports/form-response-repository.port';
import { PostgresFormRepository } from './infrastructure/postgres-form.repository';
import { PostgresFormResponseRepository } from './infrastructure/postgres-form-response.repository';
import { FormFileStorage } from './infrastructure/form-file-storage';

@Module({
  controllers: [FormulariosController],
  providers: [
    ListFormsUseCase,
    GetFormUseCase,
    CreateFormUseCase,
    UpdateFormUseCase,
    SetFormActivoUseCase,
    SubmitFormResponseUseCase,
    ListFormResponsesUseCase,
    GetFormResponseUseCase,
    FormFileStorage,
    { provide: FORM_REPOSITORY, useClass: PostgresFormRepository },
    { provide: FORM_RESPONSE_REPOSITORY, useClass: PostgresFormResponseRepository },
  ],
})
export class FormulariosModule {}
