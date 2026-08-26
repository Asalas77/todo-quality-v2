import { Inject, Injectable } from '@nestjs/common';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseDetail,
  FormResponseRepositoryPort,
} from '../domain/ports/form-response-repository.port';

@Injectable()
export class GetFormDraftUseCase {
  constructor(
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  /** null si el usuario no tiene un borrador vigente para este formulario. */
  execute(formId: string, userId: string): Promise<FormResponseDetail | null> {
    return this.responses.findDraft(formId, userId);
  }
}
