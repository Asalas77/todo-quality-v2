import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnswerInput,
  INSPECTION_REPOSITORY,
  Inspection,
  InspectionNotFoundError,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';

export interface SaveInspectionAnswersCommand {
  inspectionId: string;
  answers: AnswerInput[];
}

@Injectable()
export class SaveInspectionAnswersUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  async execute(command: SaveInspectionAnswersCommand): Promise<Inspection> {
    validateNoCumpleAnswers(command.answers);

    try {
      return await this.inspections.saveAnswers(command.inspectionId, command.answers);
    } catch (error) {
      if (error instanceof InspectionNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}

/**
 * Regla de negocio preservada del legacy (CompletarChecklist.vue: "Complete los campos
 * de No cumple"): un ítem marcado "no cumple" exige plan de acción, fecha de
 * compromiso, fecha de control y responsable. Se valida aquí para devolver un 400 claro
 * por ítem; la base de datos también lo exige como respaldo (CHECK constraint), pero
 * ese error no distingue qué ítem falló.
 */
function validateNoCumpleAnswers(answers: AnswerInput[]): void {
  const errors: string[] = [];

  answers.forEach((answer, index) => {
    if (answer.estado !== 'NO_CUMPLE') return;

    const missing: string[] = [];
    if (!answer.planAccion) missing.push('plan de acción');
    if (!answer.fechaCompromiso) missing.push('fecha de compromiso');
    if (!answer.fechaControl) missing.push('fecha de control');
    if (!answer.responsable) missing.push('responsable');

    if (missing.length > 0) {
      errors.push(`Ítem ${index + 1}: falta ${missing.join(', ')}`);
    }
  });

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }
}
