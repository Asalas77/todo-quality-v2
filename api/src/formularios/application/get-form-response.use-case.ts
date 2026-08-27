import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseDetail,
  FormResponseRepositoryPort,
} from '../domain/ports/form-response-repository.port';

export interface GetFormResponseQuery {
  id: string;
  requestedBy: string;
  canViewAll: boolean;
}

@Injectable()
export class GetFormResponseUseCase {
  constructor(
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  async execute(query: GetFormResponseQuery): Promise<FormResponseDetail> {
    const response = await this.responses.findById(query.id);
    if (!response) throw new NotFoundException('La respuesta no existe');
    if (!query.canViewAll && response.creadoPor !== query.requestedBy) {
      throw new ForbiddenException('No tienes permiso para ver esta respuesta');
    }
    return response;
  }
}
