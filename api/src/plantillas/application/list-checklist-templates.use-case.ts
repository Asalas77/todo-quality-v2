import { Inject, Injectable } from '@nestjs/common';
import {
  CHECKLIST_TEMPLATE_REPOSITORY,
  ChecklistTemplateRepositoryPort,
  ChecklistTemplateSummary,
} from '../domain/ports/checklist-template-repository.port';

export interface ListChecklistTemplatesQuery {
  includeInactive: boolean;
}

@Injectable()
export class ListChecklistTemplatesUseCase {
  constructor(
    @Inject(CHECKLIST_TEMPLATE_REPOSITORY)
    private readonly templates: ChecklistTemplateRepositoryPort,
  ) {}

  execute(query: ListChecklistTemplatesQuery): Promise<ChecklistTemplateSummary[]> {
    return this.templates.findAll(query.includeInactive);
  }
}
