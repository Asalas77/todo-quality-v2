export const CENTRO_REPOSITORY = Symbol('CENTRO_REPOSITORY');

export interface Centro {
  id: string;
  nombre: string;
  direccion: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CentroRepositoryPort {
  findAll(includeInactive: boolean): Promise<Centro[]>;
  /** Lanza DuplicateCentroNombreError si ya existe un centro con ese nombre en el tenant. */
  create(input: { nombre: string; direccion: string }): Promise<Centro>;
  /** Lanza DuplicateCentroNombreError o CentroNotFoundError. */
  update(id: string, input: { nombre: string; direccion: string }): Promise<Centro>;
  /** Lanza CentroNotFoundError si el id no existe en el tenant. */
  setActivo(id: string, activo: boolean): Promise<Centro>;
}

export class DuplicateCentroNombreError extends Error {
  constructor() {
    super('Ya existe un centro con ese nombre');
  }
}

export class CentroNotFoundError extends Error {
  constructor() {
    super('El centro no existe');
  }
}
