import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { EmailNotifierPort } from '../domain/ports/email-notifier.port';

/**
 * Sin SMTP_HOST configurado (por ejemplo en desarrollo local o en un despliegue de
 * prueba sin correo), el envío se vuelve un no-op registrado en el log — mismo criterio
 * de degradación que RequestPasswordResetUseCase con devResetUrl: la funcionalidad
 * principal (guardar el comentario) nunca depende de que el correo esté configurado.
 */
@Injectable()
export class SmtpEmailNotifier implements EmailNotifierPort {
  private readonly logger = new Logger(SmtpEmailNotifier.name);
  private readonly transporter: Transporter | null;
  private readonly to: string | undefined;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.to = this.config.get<string>('SUPPORT_EMAIL_TO');
    this.from = this.config.get<string>('SMTP_FROM', 'Kontrol <no-reply@kontrol.app>');

    // SMTP_HOST puede venir fijo en el despliegue (ver render.yaml) mientras
    // SMTP_USER/SMTP_PASS todavía no se completan a mano — getOrThrow() tumbaría el
    // servicio entero al arrancar. Cualquiera de los tres faltando cae en modo no-op,
    // igual que RequestPasswordResetUseCase con devResetUrl.
    if (!host || !user || !pass) {
      this.transporter = null;
      return;
    }

    this.transporter = createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });
  }

  async notifyNewComentario(input: {
    usuarioNombre: string;
    usuarioEmail: string;
    mensaje: string;
  }): Promise<void> {
    if (!this.transporter || !this.to) {
      this.logger.log(
        `SMTP no configurado — comentario de ${input.usuarioNombre} solo quedó guardado en la base de datos.`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: this.to,
      replyTo: input.usuarioEmail,
      subject: `Nuevo comentario en Kontrol — ${input.usuarioNombre}`,
      text: `${input.usuarioNombre} (${input.usuarioEmail}) escribió:\n\n${input.mensaje}`,
      html: `<p><strong>${input.usuarioNombre}</strong> (${input.usuarioEmail}) escribió:</p><p>${input.mensaje.replace(/\n/g, '<br>')}</p>`,
    });
  }
}
