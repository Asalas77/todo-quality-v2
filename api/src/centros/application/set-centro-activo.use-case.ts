import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CENTRO_REPOSITORY,
  Centro,
  CentroNotFoundError,
  CentroRepositoryPort,
} from '../domain/ports/centro-repository.port';

export interface SetCentroActivoCommand {
  id: string;
  activo: boolean;
}

/**
 * "Eliminar" un centro desactiva en vez de borrar la fila: inspection.centro_id y
 * schedule.centro_id referencian centro con ON DELETE RESTRICT, así que un centro con
 * historial no podría borrarse de todas formas. Desactivar es además reversible.
 */
@Injectable()
export class SetCentroActivoUseCase {
  constructor(
    @Inject(CENTRO_REPOSITORY) private readonly centros: CentroRepositoryPort,
  ) {}

  async execute(command: SetCentroActivoCommand): Promise<Centro> {
    try {
      return await this.centros.setActivo(command.id, command.activo);
    } catch (error) {
      if (error instanceof CentroNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
