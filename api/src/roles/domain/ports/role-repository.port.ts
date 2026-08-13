export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface Permission {
  code: string;
  descripcion: string;
}

export interface Role {
  id: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  permissionCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleInput {
  nombre: string;
  descripcion: string | null;
  permissionCodes: string[];
}

export interface RoleRepositoryPort {
  listPermissions(): Promise<Permission[]>;
  findAll(): Promise<Role[]>;
  /** Lanza DuplicateRoleNombreError o UnknownPermissionCodeError. */
  create(input: RoleInput): Promise<Role>;
  /**
   * Actualiza descripción, nombre y permisos. Renombrar un rol de sistema lo bloquea la
   * base de datos (trigger `protect_system_roles`); ese error se traduce aquí.
   * Lanza RoleNotFoundError, DuplicateRoleNombreError, SystemRoleRenameError o
   * UnknownPermissionCodeError.
   */
  update(id: string, input: RoleInput): Promise<Role>;
  /**
   * Lanza RoleNotFoundError, SystemRoleDeleteError (bloqueado por el mismo trigger) o
   * RoleInUseError (hay usuarios con este rol — app_user.role_id es ON DELETE RESTRICT).
   */
  delete(id: string): Promise<void>;
}

export class DuplicateRoleNombreError extends Error {
  constructor() {
    super('Ya existe un rol con ese nombre');
  }
}

export class RoleNotFoundError extends Error {
  constructor() {
    super('El rol no existe');
  }
}

export class SystemRoleRenameError extends Error {
  constructor() {
    super('No se puede renombrar un rol de sistema');
  }
}

export class SystemRoleDeleteError extends Error {
  constructor() {
    super('No se puede eliminar un rol de sistema');
  }
}

export class RoleInUseError extends Error {
  constructor() {
    super('No se puede eliminar un rol con usuarios asignados');
  }
}

export class UnknownPermissionCodeError extends Error {
  constructor() {
    super('Uno o más códigos de permiso no existen');
  }
}
