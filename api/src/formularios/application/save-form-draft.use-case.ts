import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FORM_REPOSITORY, FormRepositoryPort } from '../domain/ports/form-repository.port';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseDetail,
  FormResponseRepositoryPort,
  FormResponseValueInput,
} from '../domain/ports/form-response-repository.port';

export interface SaveFormDraftCommand {
  formId: string;
  centroId?: string;
  creadoPor: string;
  valores: FormResponseValueInput[];
}

/**
 * A diferencia de SubmitFormResponseUseCase, no exige campos obligatorios — ese es
 * justamente el punto de un borrador: guardar lo que hay y seguir después.
 */
@Injectable()
export class SaveFormDraftUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  async execute(command: SaveFormDraftCommand): Promise<FormResponseDetail> {
    const form = await this.forms.findById(command.formId);
    if (!form) throw new NotFoundException('El formulario no existe');

    return this.responses.saveDraft({
      formId: command.formId,
      centroId: command.centroId,
      creadoPor: command.creadoPor,
      valores: command.valores,
    });
  }
}
