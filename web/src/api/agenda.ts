import { http } from './http';

export type ScheduleStatus = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';

export const SCHEDULE_ESTADO_LABEL: Record<ScheduleStatus, string> = {
  PENDIENTE: 'Pendiente',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

export interface Schedule {
  id: string;
  templateId: string;
  templateNombre: string;
  centroId: string;
  centroNombre: string;
  asignadoA: string;
  asignadoNombre: string;
  asunto: string | null;
  fecha: string;
  estado: ScheduleStatus;
  inspectionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  templateId: string;
  centroId: string;
  fecha: string;
  asunto?: string;
}

export const agendaApi = {
  list: (filter: { estado?: ScheduleStatus; centroId?: string } = {}) =>
    http.get<Schedule[]>('/agenda', { params: filter }).then((r) => r.data),

  create: (input: CreateScheduleInput) =>
    http.post<Schedule>('/agenda', input).then((r) => r.data),

  cancel: (id: string) =>
    http.post<Schedule>(`/agenda/${id}/cancelar`).then((r) => r.data),

  start: (id: string) =>
    http.post<{ id: string }>(`/agenda/${id}/iniciar`).then((r) => r.data),
};
