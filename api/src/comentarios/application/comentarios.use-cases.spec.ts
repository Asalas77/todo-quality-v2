import { BadRequestException } from '@nestjs/common';
import { CreateComentarioUseCase } from './create-comentario.use-case';
import { ListComentariosUseCase } from './list-comentarios.use-case';
import { Comentario, ComentarioRepositoryPort } from '../domain/ports/comentario-repository.port';
import { EmailNotifierPort } from '../domain/ports/email-notifier.port';

function buildComentario(overrides: Partial<Comentario> = {}): Comentario {
  return {
    id: 'comentario-1',
    mensaje: 'Todo funciona bien',
    usuarioNombre: 'Ana Soto',
    usuarioEmail: 'ana@demo.cl',
    createdAt: new Date(),
    ...overrides,
  };
}

class FakeComentarioRepo implements ComentarioRepositoryPort {
  comentarios: Comentario[] = [];

  async create(input: { usuarioId: string; mensaje: string }) {
    const comentario = buildComentario({
      id: `comentario-${this.comentarios.length + 1}`,
      mensaje: input.mensaje,
    });
    this.comentarios.push(comentario);
    return comentario;
  }

  async findAll() {
    return this.comentarios;
  }
}

class FakeEmailNotifier implements EmailNotifierPort {
  calls: Array<{ usuarioNombre: string; usuarioEmail: string; mensaje: string }> = [];
  throwOnNotify: Error | null = null;

  async notifyNewComentario(input: { usuarioNombre: string; usuarioEmail: string; mensaje: string }) {
    if (this.throwOnNotify) throw this.throwOnNotify;
    this.calls.push(input);
  }
}

describe('CreateComentarioUseCase', () => {
  it('guarda el comentario y notifica por correo', async () => {
    const repo = new FakeComentarioRepo();
    const email = new FakeEmailNotifier();
    const useCase = new CreateComentarioUseCase(repo, email);

    const result = await useCase.execute({ usuarioId: 'user-1', mensaje: '  Hola, tengo una duda  ' });

    expect(result.mensaje).toBe('Hola, tengo una duda');
    expect(repo.comentarios).toHaveLength(1);
    expect(email.calls).toHaveLength(1);
    expect(email.calls[0].mensaje).toBe('Hola, tengo una duda');
  });

  it('rechaza un mensaje vacío o solo espacios', async () => {
    const useCase = new CreateComentarioUseCase(new FakeComentarioRepo(), new FakeEmailNotifier());

    await expect(useCase.execute({ usuarioId: 'user-1', mensaje: '   ' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('guarda el comentario aunque el envío de correo falle', async () => {
    const repo = new FakeComentarioRepo();
    const email = new FakeEmailNotifier();
    email.throwOnNotify = new Error('SMTP caído');
    const useCase = new CreateComentarioUseCase(repo, email);

    const result = await useCase.execute({ usuarioId: 'user-1', mensaje: 'Se cayó el correo' });

    expect(result.id).toBeDefined();
    expect(repo.comentarios).toHaveLength(1);
  });
});

describe('ListComentariosUseCase', () => {
  it('devuelve todos los comentarios del tenant', async () => {
    const repo = new FakeComentarioRepo();
    await repo.create({ usuarioId: 'user-1', mensaje: 'Primero' });
    await repo.create({ usuarioId: 'user-2', mensaje: 'Segundo' });
    const useCase = new ListComentariosUseCase(repo);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
  });
});
