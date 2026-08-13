import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FORM_REPOSITORY, Form, FormRepositoryPort } from '../domain/ports/form-repository.port';

@Injectable()
export class GetFormUseCase {
  constructor(@Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort) {}

  async execute(id: string): Promise<Form> {
    const form = await this.forms.findById(id);
    if (!form) throw new NotFoundException('El formulario no existe');
    return form;
  }
}
