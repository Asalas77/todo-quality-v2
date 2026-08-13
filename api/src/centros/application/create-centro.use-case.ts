import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CENTRO_REPOSITORY,
  Centro,
  CentroRepositoryPort,
  DuplicateCentroNombreError,
} from '../domain/ports/centro-repository.port';

export interface CreateCentroCommand {
  nombre: string;
  direccion: string;
}

@Injectable()
export class CreateCentroUseCase {
  constructor(
    @Inject(CENTRO_REPOSITORY) private readonly centros: CentroRepositoryPort,
  ) {}

  async execute(command: CreateCentroCommand): Promise<Centro> {
    try {
      return await this.centros.create(command);
    } catch (error) {
      if (error instanceof DuplicateCentroNombreError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
