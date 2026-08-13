import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CENTRO_REPOSITORY,
  Centro,
  CentroNotFoundError,
  CentroRepositoryPort,
  DuplicateCentroNombreError,
} from '../domain/ports/centro-repository.port';

export interface UpdateCentroCommand {
  id: string;
  nombre: string;
  direccion: string;
}

@Injectable()
export class UpdateCentroUseCase {
  constructor(
    @Inject(CENTRO_REPOSITORY) private readonly centros: CentroRepositoryPort,
  ) {}

  async execute(command: UpdateCentroCommand): Promise<Centro> {
    try {
      return await this.centros.update(command.id, {
        nombre: command.nombre,
        direccion: command.direccion,
      });
    } catch (error) {
      if (error instanceof DuplicateCentroNombreError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof CentroNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
