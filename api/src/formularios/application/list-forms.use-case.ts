import { Inject, Injectable } from '@nestjs/common';
import {
  FORM_REPOSITORY,
  FormRepositoryPort,
  FormSummary,
} from '../domain/ports/form-repository.port';

@Injectable()
export class ListFormsUseCase {
  constructor(@Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort) {}

  execute(includeInactive: boolean): Promise<FormSummary[]> {
    return this.forms.findAll(includeInactive);
  }
}
