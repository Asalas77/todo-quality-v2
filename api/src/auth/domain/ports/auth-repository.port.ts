export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthCredentials {
  userId: string;
  tenantId: string;
  passwordHash: string;
  activo: boolean;
}

export interface RegisteredTenant {
  tenantId: string;
  userId: string;
}

export interface PasswordResetRequested {
  userId: string;
  tenantId: string;
}

export interface AuthRepositoryPort {
  /** Resuelve credenciales por email sin tenant en contexto. Null si el email no existe. */
  findCredentialsByEmail(email: string): Promise<AuthCredentials | null>;

  /** Códigos de permiso del usuario, resueltos ya con el tenant en contexto. */
  findPermissions(tenantId: string, userId: string): Promise<string[]>;

  /** Null solo si el tenant fue borrado entre la emisión del token y esta consulta. */
  getTenantNombre(tenantId: string): Promise<string | null>;

  /** Lanza DuplicateEmailError o DuplicateRutError si la empresa o el correo ya existen. */
  registerTenant(input: {
    nombre: string;
    rut: string;
    adminNombre: string;
    adminApellido: string;
    adminEmail: string;
    passwordHash: string;
  }): Promise<RegisteredTenant>;

  /**
   * Null si el email no existe, o si el usuario/tenant está inactivo — el llamador nunca
   * debe distinguir ese caso de un envío exitoso, para no filtrar qué correos existen.
   */
  requestPasswordReset(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetRequested | null>;

  /** Lanza PasswordResetTokenInvalidError si el token no existe, expiró o ya se usó. */
  consumePasswordReset(
    tokenHash: string,
    newPasswordHash: string,
  ): Promise<PasswordResetRequested>;

  /** Tenant-scoped: requiere contexto de tenant ya establecido (usuario autenticado). */
  getPasswordHash(userId: string): Promise<string | null>;

  /** Tenant-scoped: requiere contexto de tenant ya establecido (usuario autenticado). */
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('El correo electrónico ya está registrado');
  }
}

export class DuplicateRutError extends Error {
  constructor() {
    super('Ya existe una empresa registrada con ese RUT');
  }
}

export class PasswordResetTokenInvalidError extends Error {
  constructor() {
    super('El enlace de recuperación no es válido o expiró');
  }
}
