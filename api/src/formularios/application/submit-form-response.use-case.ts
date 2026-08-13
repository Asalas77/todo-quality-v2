import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FORM_REPOSITORY, FormRepositoryPort } from '../domain/ports/form-repository.port';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseDetail,
  FormResponseRepositoryPort,
  FormResponseValueInput,
} from '../domain/ports/form-response-repository.port';

export interface SubmitFormResponseCommand {
  formId: string;
  centroId?: string;
  creadoPor: string;
  valores: FormResponseValueInput[];
}

@Injectable()
export class SubmitFormResponseUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  async execute(command: SubmitFormResponseCommand): Promise<FormResponseDetail> {
    const form = await this.forms.findById(command.formId);
    if (!form) throw new NotFoundException('El formulario no existe');

    const valuesByField = new Map(command.valores.map((v) => [v.campoId, v]));
    const missing = form.fields.filter((field) => {
      if (!field.requerido) return false;
      const value = valuesByField.get(field.id);
      if (!value) return true;
      return !value.valorTexto && !value.valorFecha && !value.valorOpciones?.length && !value.archivoUrl;
    });
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan campos obligatorios: ${missing.map((f) => f.etiqueta).join(', ')}`,
      );
    }

    return this.responses.submit({
      formId: command.formId,
      centroId: command.centroId,
      creadoPor: command.creadoPor,
      valores: command.valores,
    });
  }
}
