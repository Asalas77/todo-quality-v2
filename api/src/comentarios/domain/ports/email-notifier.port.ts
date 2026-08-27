export const EMAIL_NOTIFIER = Symbol('EMAIL_NOTIFIER');

export interface EmailNotifierPort {
  /**
   * Nunca debe lanzar: un correo de soporte que falla en enviarse no puede tumbar la
   * creación del comentario, que ya quedó guardado en la base de datos.
   */
  notifyNewComentario(input: {
    usuarioNombre: string;
    usuarioEmail: string;
    mensaje: string;
  }): Promise<void>;
}
