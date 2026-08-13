export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut: string | null;
  roleId: string;
  roleNombre: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  nombre: string;
  apellido: string;
  email: string;
  rut: string | null;
  roleId: string;
  passwordHash: string;
}

export interface UpdateUserInput {
  nombre: string;
  apellido: string;
  rut: string | null;
  roleId: string;
}

export interface UserRepositoryPort {
  findAll(includeInactive: boolean): Promise<User[]>;
  /** Lanza DuplicateUserEmailError o RoleNotFoundError. */
  create(input: CreateUserInput): Promise<User>;
  /** Lanza UserNotFoundError o RoleNotFoundError. */
  update(id: string, input: UpdateUserInput): Promise<User>;
  /** Lanza UserNotFoundError. */
  setActivo(id: string, activo: boolean): Promise<User>;
  /** Lanza UserNotFoundError. */
  setPassword(id: string, passwordHash: string): Promise<void>;
}

export class DuplicateUserEmailError extends Error {
  constructor() {
    super('El correo electrónico ya está registrado');
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('El usuario no existe');
  }
}

export class UserRoleNotFoundError extends Error {
  constructor() {
    super('El rol seleccionado no existe');
  }
}
