import { Inject, Injectable } from '@nestjs/common';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseRepositoryPort,
  FormResponseWithForm,
} from '../domain/ports/form-response-repository.port';

export interface ListAllFormResponsesQuery {
  centroId?: string;
  requestedBy: string;
  canViewAll: boolean;
}

/** Todas las respuestas enviadas del tenant, de cualquier formulario — alimenta Agenda. */
@Injectable()
export class ListAllFormResponsesUseCase {
  constructor(
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  execute(query: ListAllFormResponsesQuery): Promise<FormResponseWithForm[]> {
    return this.responses.findAllSubmitted({
      centroId: query.centroId,
      creadoPor: query.canViewAll ? undefined : query.requestedBy,
    });
  }
}
