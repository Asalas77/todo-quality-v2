import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CHECKLIST_TEMPLATE_REPOSITORY,
  ChecklistTemplate,
  ChecklistTemplateInput,
  ChecklistTemplateRepositoryPort,
  DuplicateIdentificadorError,
} from '../domain/ports/checklist-template-repository.port';

@Injectable()
export class CreateChecklistTemplateUseCase {
  constructor(
    @Inject(CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ChecklistTemplateRepositoryPort,
  ) {}

  async execute(input: ChecklistTemplateInput): Promise<ChecklistTemplate> {
    try {
      return await this.templates.create(input);
    } catch (error) {
      if (error instanceof DuplicateIdentificadorError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
