import { http } from './http';

export type ScheduleStatus = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';

export const SCHEDULE_ESTADO_LABEL: Record<ScheduleStatus, string> = {
  PENDIENTE: 'Pendiente',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

/** Lo agendado es una plantilla de checklist o un formulario. */
export type ScheduleTargetType = 'CHECKLIST' | 'FORMULARIO';

export interface Schedule {
  id: string;
  tipo: ScheduleTargetType;
  templateId: string | null;
  formId: string | null;
  /** Nombre de la plantilla o del formulario, según el tipo. */
  templateNombre: string;
  centroId: string;
  centroNombre: string;
  asignadoA: string;
  asignadoNombre: string;
  asunto: string | null;
  fecha: string;
  estado: ScheduleStatus;
  inspectionId: string | null;
  formRespuestaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  /** Exactamente uno de templateId / formId. */
  templateId?: string;
  formId?: string;
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
