import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  COMENTARIO_REPOSITORY,
  Comentario,
  ComentarioRepositoryPort,
} from '../domain/ports/comentario-repository.port';
import { EMAIL_NOTIFIER, EmailNotifierPort } from '../domain/ports/email-notifier.port';

export interface CreateComentarioCommand {
  usuarioId: string;
  mensaje: string;
}

@Injectable()
export class CreateComentarioUseCase {
  private readonly logger = new Logger(CreateComentarioUseCase.name);

  constructor(
    @Inject(COMENTARIO_REPOSITORY) private readonly comentarios: ComentarioRepositoryPort,
    @Inject(EMAIL_NOTIFIER) private readonly email: EmailNotifierPort,
  ) {}

  async execute(command: CreateComentarioCommand): Promise<Comentario> {
    const mensaje = command.mensaje.trim();
    if (!mensaje) throw new BadRequestException('El comentario no puede estar vacío');

    const comentario = await this.comentarios.create({
      usuarioId: command.usuarioId,
      mensaje,
    });

    // El comentario ya quedó guardado: si el correo falla (SMTP no configurado, caído,
    // etc.), no debe perderse ni fallar la respuesta al usuario — solo queda registrado
    // en el log para diagnosticar.
    try {
      await this.email.notifyNewComentario({
        usuarioNombre: comentario.usuarioNombre,
        usuarioEmail: comentario.usuarioEmail,
        mensaje: comentario.mensaje,
      });
    } catch (error) {
      this.logger.warn(`No se pudo enviar el correo de aviso: ${(error as Error).message}`);
    }

    return comentario;
  }
}
