import { http } from './http';

export interface Comentario {
  id: string;
  mensaje: string;
  usuarioNombre: string;
  usuarioEmail: string;
  createdAt: string;
}

export const comentariosApi = {
  create: (mensaje: string) =>
    http.post<Comentario>('/comentarios', { mensaje }).then((r) => r.data),

  list: () => http.get<Comentario[]>('/comentarios').then((r) => r.data),
};
