import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FORM_REPOSITORY,
  FormNotFoundError,
  FormRepositoryPort,
  FormSummary,
} from '../domain/ports/form-repository.port';

@Injectable()
export class SetFormActivoUseCase {
  constructor(@Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort) {}

  async execute(id: string, activo: boolean): Promise<FormSummary> {
    try {
      return await this.forms.setActivo(id, activo);
    } catch (error) {
      if (error instanceof FormNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }
}
