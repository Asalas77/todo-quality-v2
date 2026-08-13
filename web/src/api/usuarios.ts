import { http } from './http';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut: string | null;
  roleId: string;
  roleNombre: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  nombre: string;
  apellido: string;
  email: string;
  rut?: string;
  roleId: string;
}

export interface UpdateUserInput {
  nombre: string;
  apellido: string;
  rut?: string;
  roleId: string;
}

export interface CreatedUser extends User {
  temporaryPassword: string;
}

export const usuariosApi = {
  list: (includeInactive: boolean) =>
    http
      .get<User[]>('/usuarios', { params: { incluirInactivos: includeInactive } })
      .then((r) => r.data),

  create: (input: CreateUserInput) =>
    http.post<CreatedUser>('/usuarios', input).then((r) => r.data),

  update: (id: string, input: UpdateUserInput) =>
    http.put<User>(`/usuarios/${id}`, input).then((r) => r.data),

  setActivo: (id: string, activo: boolean) =>
    http.patch<User>(`/usuarios/${id}/activo`, { activo }).then((r) => r.data),

  resetPassword: (id: string) =>
    http
      .post<{ temporaryPassword: string }>(`/usuarios/${id}/resetear-password`)
      .then((r) => r.data),
};
