import { Inject, Injectable } from '@nestjs/common';
import {
  COMENTARIO_REPOSITORY,
  Comentario,
  ComentarioRepositoryPort,
} from '../domain/ports/comentario-repository.port';

@Injectable()
export class ListComentariosUseCase {
  constructor(
    @Inject(COMENTARIO_REPOSITORY) private readonly comentarios: ComentarioRepositoryPort,
  ) {}

  execute(): Promise<Comentario[]> {
    return this.comentarios.findAll();
  }
}
