import { http } from './http';

export interface Centro {
  id: string;
  nombre: string;
  direccion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CentroInput {
  nombre: string;
  direccion: string;
}

export const centrosApi = {
  list: (includeInactive: boolean) =>
    http
      .get<Centro[]>('/centros', { params: { incluirInactivos: includeInactive } })
      .then((r) => r.data),

  create: (input: CentroInput) =>
    http.post<Centro>('/centros', input).then((r) => r.data),

  update: (id: string, input: CentroInput) =>
    http.put<Centro>(`/centros/${id}`, input).then((r) => r.data),

  setActivo: (id: string, activo: boolean) =>
    http.patch<Centro>(`/centros/${id}/activo`, { activo }).then((r) => r.data),
};
