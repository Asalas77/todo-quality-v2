import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { CreateComentarioUseCase } from '../application/create-comentario.use-case';
import { ListComentariosUseCase } from '../application/list-comentarios.use-case';
import { CreateComentarioDto } from './dto/comentario.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';
import { RequestWithUser } from '../../auth/infrastructure/tenant-context.middleware';

@Controller('comentarios')
export class ComentariosController {
  constructor(
    private readonly createComentario: CreateComentarioUseCase,
    private readonly listComentarios: ListComentariosUseCase,
  ) {}

  // Sin @RequirePermissions: cualquier usuario autenticado puede dejar un comentario.
  @Post()
  create(@Body() dto: CreateComentarioDto, @Req() req: RequestWithUser) {
    return this.createComentario.execute({
      usuarioId: req.user!.userId,
      mensaje: dto.mensaje,
    });
  }

  // Reutiliza el permiso de administración de usuarios: solo Administrador ve los
  // comentarios de su empresa, sin necesitar un permiso nuevo (la tabla `permission`
  // solo se puede insertar como superusuario de la base de datos).
  @RequirePermissions('usuarios.gestionar')
  @Get()
  list() {
    return this.listComentarios.execute();
  }
}
