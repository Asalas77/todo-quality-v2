import { Inject, Injectable } from '@nestjs/common';
import {
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

  execute(command: CreateFormCommand): Promise<Form> {
    const { createdBy, ...input } = command;
    return this.forms.create(input, createdBy);
  }
}
