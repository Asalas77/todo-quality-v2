import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { AUTH_REPOSITORY, AuthRepositoryPort } from '../domain/ports/auth-repository.port';

export interface RequestPasswordResetCommand {
  email: string;
}

export interface RequestPasswordResetResult {
  /**
   * Solo presente en desarrollo y solo si el correo existe — no hay servicio de email
   * configurado todavía, así que el enlace se devuelve directo en la respuesta como
   * solución provisional. El mensaje al usuario debe ser siempre el mismo genérico,
   * exista o no la cuenta, para no revelar qué correos están registrados.
   */
  devResetUrl?: string;
}

const TOKEN_TTL_HOURS = 1;

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    private readonly config: ConfigService,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<RequestPasswordResetResult> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

    const requested = await this.authRepo.requestPasswordReset(
      command.email,
      tokenHash,
      expiresAt,
    );

    if (!requested || this.config.get('NODE_ENV') === 'production') {
      return {};
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    return { devResetUrl: `${frontendUrl}/restablecer-contrasena?token=${token}` };
  }
}
