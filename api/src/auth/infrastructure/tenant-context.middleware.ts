import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  TOKEN_SERVICE,
  TokenServicePort,
} from '../domain/ports/token-service.port';
import { AuthenticatedUser } from '../domain/entities/authenticated-user';
import { tenantContext } from '../../shared/tenant/tenant-context';

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Verifica el JWT y abre el contexto de tenant para todo el resto del pipeline.
 *
 * Tiene que ser un middleware y no un guard: AsyncLocalStorage.run() solo mantiene el
 * contexto durante su callback, y un guard no envuelve la ejecución del handler. Aquí
 * next() sí corre dentro del contexto, así que guards, interceptores, casos de uso y
 * repositorios lo ven.
 *
 * Un token ausente o inválido no se rechaza aquí — de eso se encarga JwtAuthGuard, que
 * sabe qué rutas son públicas. Este middleware solo resuelve identidad cuando la hay.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort) {}

  async use(req: RequestWithUser, _res: Response, next: NextFunction): Promise<void> {
    const token = extractBearerToken(req);

    if (!token) {
      return next();
    }

    let user: AuthenticatedUser;
    try {
      const payload = await this.tokens.verifyAccessToken(token);
      user = new AuthenticatedUser(
        payload.sub,
        payload.tenantId,
        payload.permissions ?? [],
      );
    } catch {
      return next();
    }

    req.user = user;
    tenantContext.run(
      {
        tenantId: user.tenantId,
        userId: user.userId,
        permissions: [...user.permissions],
      },
      () => next(),
    );
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;

  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}
