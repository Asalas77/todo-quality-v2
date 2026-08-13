import { Inject, Injectable } from '@nestjs/common';
import {
  CENTRO_REPOSITORY,
  Centro,
  CentroRepositoryPort,
} from '../domain/ports/centro-repository.port';

export interface ListCentrosQuery {
  includeInactive: boolean;
}

@Injectable()
export class ListCentrosUseCase {
  constructor(
    @Inject(CENTRO_REPOSITORY) private readonly centros: CentroRepositoryPort,
  ) {}

  execute(query: ListCentrosQuery): Promise<Centro[]> {
    return this.centros.findAll(query.includeInactive);
  }
}
