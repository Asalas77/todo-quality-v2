export const COMENTARIO_REPOSITORY = Symbol('COMENTARIO_REPOSITORY');

export interface Comentario {
  id: string;
  mensaje: string;
  usuarioNombre: string;
  usuarioEmail: string;
  createdAt: Date;
}

export interface ComentarioRepositoryPort {
  create(input: { usuarioId: string; mensaje: string }): Promise<Comentario>;
  findAll(): Promise<Comentario[]>;
}
