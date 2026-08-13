import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FORM_RESPONSE_REPOSITORY,
  FormResponseDetail,
  FormResponseRepositoryPort,
} from '../domain/ports/form-response-repository.port';

@Injectable()
export class GetFormResponseUseCase {
  constructor(
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  async execute(id: string): Promise<FormResponseDetail> {
    const response = await this.responses.findById(id);
    if (!response) throw new NotFoundException('La respuesta no existe');
    return response;
  }
}
