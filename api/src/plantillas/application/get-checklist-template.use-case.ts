import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CHECKLIST_TEMPLATE_REPOSITORY,
  ChecklistTemplate,
  ChecklistTemplateRepositoryPort,
} from '../domain/ports/checklist-template-repository.port';

@Injectable()
export class GetChecklistTemplateUseCase {
  constructor(
    @Inject(CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ChecklistTemplateRepositoryPort,
  ) {}

  async execute(id: string): Promise<ChecklistTemplate> {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundException('La plantilla no existe');
    return template;
  }
}
