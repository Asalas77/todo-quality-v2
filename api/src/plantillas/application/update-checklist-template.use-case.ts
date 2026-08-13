import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CHECKLIST_TEMPLATE_REPOSITORY,
  ChecklistTemplate,
  ChecklistTemplateInput,
  ChecklistTemplateNotFoundError,
  ChecklistTemplateRepositoryPort,
  DuplicateIdentificadorError,
} from '../domain/ports/checklist-template-repository.port';

export interface UpdateChecklistTemplateCommand extends ChecklistTemplateInput {
  id: string;
}

@Injectable()
export class UpdateChecklistTemplateUseCase {
  constructor(
    @Inject(CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ChecklistTemplateRepositoryPort,
  ) {}

  async execute(command: UpdateChecklistTemplateCommand): Promise<ChecklistTemplate> {
    const { id, ...input } = command;
    try {
      return await this.templates.update(id, input);
    } catch (error) {
      if (error instanceof DuplicateIdentificadorError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof ChecklistTemplateNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
