import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FORM_REPOSITORY,
  Form,
  FormInput,
  FormNotFoundError,
  FormRepositoryPort,
} from '../domain/ports/form-repository.port';

@Injectable()
export class UpdateFormUseCase {
  constructor(@Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort) {}

  async execute(id: string, input: FormInput): Promise<Form> {
    try {
      return await this.forms.update(id, input);
    } catch (error) {
      if (error instanceof FormNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }
}
