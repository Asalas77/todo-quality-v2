import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  DuplicateIdentificadorError,
  FORM_REPOSITORY,
  Form,
  FormInput,
  FormRepositoryPort,
} from '../domain/ports/form-repository.port';

export interface CreateFormCommand extends FormInput {
  createdBy: string;
}

@Injectable()
export class CreateFormUseCase {
  constructor(@Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort) {}

  async execute(command: CreateFormCommand): Promise<Form> {
    const { createdBy, ...input } = command;
    try {
      return await this.forms.create(input, createdBy);
    } catch (error) {
      if (error instanceof DuplicateIdentificadorError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
