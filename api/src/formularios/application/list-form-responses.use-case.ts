import { Inject, Injectable } from '@nestjs/common';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseRepositoryPort,
  FormResponseSummary,
} from '../domain/ports/form-response-repository.port';

@Injectable()
export class ListFormResponsesUseCase {
  constructor(
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  execute(formId: string): Promise<FormResponseSummary[]> {
    return this.responses.findByForm(formId);
  }
}
