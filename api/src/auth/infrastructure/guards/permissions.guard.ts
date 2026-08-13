import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator';
import { RequestWithUser } from '../tenant-context.middleware';

/**
 * Responde una sola pregunta binaria: ¿tiene el usuario estos permisos?
 *
 * Cualquier regla que dependa de los datos ("solo puede editar la inspección que él
 * completó") es lógica de negocio y vive en el caso de uso, no aquí.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException('Sin permisos');
    }

    const missing = required.filter((permission) => !user.can(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Falta el permiso: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
