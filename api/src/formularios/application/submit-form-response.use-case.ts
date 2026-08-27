import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FORM_REPOSITORY, FormRepositoryPort } from '../domain/ports/form-repository.port';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseDetail,
  FormResponseRepositoryPort,
  FormResponseValueInput,
} from '../domain/ports/form-response-repository.port';
import {
  SCHEDULE_REPOSITORY,
  ScheduleRepositoryPort,
} from '../../agenda/domain/ports/schedule-repository.port';

export interface SubmitFormResponseCommand {
  formId: string;
  centroId?: string;
  creadoPor: string;
  valores: FormResponseValueInput[];
  /** Presente cuando la respuesta nace de una programación de agenda, para cerrarla. */
  scheduleId?: string;
}

@Injectable()
export class SubmitFormResponseUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
    @Inject(SCHEDULE_REPOSITORY) private readonly schedules: ScheduleRepositoryPort,
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

    // El frontend de "completar desde agenda" no manda centroId (solo conoce el
    // scheduleId): sin esto la respuesta queda con centro_id NULL y desaparece de la
    // Agenda en cuanto hay un centro seleccionado en el filtro, porque `= NULL` nunca
    // matchea. La programación es la fuente de verdad del centro en ese flujo.
    let centroId = command.centroId;
    if (command.scheduleId && !centroId) {
      const schedule = await this.schedules.findById(command.scheduleId);
      centroId = schedule?.centroId ?? centroId;
    }

    const respuesta = await this.responses.submit({
      formId: command.formId,
      centroId,
      creadoPor: command.creadoPor,
      valores: command.valores,
    });

    if (command.scheduleId) {
      // La respuesta ya quedó guardada: si cerrar la programación falla (por ejemplo, otro
      // usuario la canceló mientras se completaba), no se pierde lo que la persona escribió.
      // Mismo criterio que StartInspectionFromSchedule: dos transacciones, no una.
      try {
        await this.schedules.markFormSubmitted(command.scheduleId, respuesta.id);
      } catch {
        // Silencioso a propósito: la programación queda pendiente y se puede cerrar a mano.
      }
    }

    return respuesta;
  }
}
