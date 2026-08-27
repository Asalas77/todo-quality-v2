import { Module } from '@nestjs/common';
import { ComentariosController } from './infrastructure/comentarios.controller';
import { CreateComentarioUseCase } from './application/create-comentario.use-case';
import { ListComentariosUseCase } from './application/list-comentarios.use-case';
import { COMENTARIO_REPOSITORY } from './domain/ports/comentario-repository.port';
import { PostgresComentarioRepository } from './infrastructure/postgres-comentario.repository';
import { EMAIL_NOTIFIER } from './domain/ports/email-notifier.port';
import { SmtpEmailNotifier } from './infrastructure/smtp-email-notifier';

@Module({
  controllers: [ComentariosController],
  providers: [
    CreateComentarioUseCase,
    ListComentariosUseCase,
    { provide: COMENTARIO_REPOSITORY, useClass: PostgresComentarioRepository },
    { provide: EMAIL_NOTIFIER, useClass: SmtpEmailNotifier },
  ],
})
export class ComentariosModule {}
