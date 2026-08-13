import { http } from './http';

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
  createdAt: string;
  updatedAt: string;
}

export interface RoleInput {
  nombre: string;
  descripcion?: string;
  permissionCodes: string[];
}

export const rolesApi = {
  listPermissions: () => http.get<Permission[]>('/permisos').then((r) => r.data),

  list: () => http.get<Role[]>('/roles').then((r) => r.data),

  create: (input: RoleInput) => http.post<Role>('/roles', input).then((r) => r.data),

  update: (id: string, input: RoleInput) =>
    http.put<Role>(`/roles/${id}`, input).then((r) => r.data),

  remove: (id: string) => http.delete(`/roles/${id}`).then(() => undefined),
};
