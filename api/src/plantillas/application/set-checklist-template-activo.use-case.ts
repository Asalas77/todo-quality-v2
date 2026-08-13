import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CHECKLIST_TEMPLATE_REPOSITORY,
  ChecklistTemplateNotFoundError,
  ChecklistTemplateRepositoryPort,
  ChecklistTemplateSummary,
} from '../domain/ports/checklist-template-repository.port';

export interface SetChecklistTemplateActivoCommand {
  id: string;
  activo: boolean;
}

/**
 * "Eliminar" una plantilla desactiva en vez de borrar: inspection.template_id y
 * schedule.template_id la referencian con ON DELETE RESTRICT, así que una plantilla ya
 * usada no podría borrarse de todas formas — igual que en centros.
 */
@Injectable()
export class SetChecklistTemplateActivoUseCase {
  constructor(
    @Inject(CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ChecklistTemplateRepositoryPort,
  ) {}

  async execute(
    command: SetChecklistTemplateActivoCommand,
  ): Promise<ChecklistTemplateSummary> {
    try {
      return await this.templates.setActivo(command.id, command.activo);
    } catch (error) {
      if (error instanceof ChecklistTemplateNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
