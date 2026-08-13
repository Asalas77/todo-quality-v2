import { http } from './http';
import type { ItemCriticality } from './plantillas';

export type AnswerStatus = 'CUMPLE' | 'NO_CUMPLE' | 'NO_APLICA';
export type InspectionStatus = 'BORRADOR' | 'CONFORME' | 'NO_CONFORME';

export const ESTADO_LABEL: Record<InspectionStatus, string> = {
  BORRADOR: 'Borrador',
  CONFORME: 'Conforme',
  NO_CONFORME: 'No conforme',
};

export const RESPUESTA_LABEL: Record<AnswerStatus, string> = {
  CUMPLE: 'Cumple',
  NO_CUMPLE: 'No cumple',
  NO_APLICA: 'No aplica',
};

export interface InspectionAnswer {
  templateItemId: string;
  itemDescripcion: string;
  itemCriticidad: ItemCriticality;
  itemOrden: number;
  estado: AnswerStatus | null;
  observacion: string | null;
  evidenciaUrl: string | null;
  planAccion: string | null;
  fechaCompromiso: string | null;
  fechaControl: string | null;
  responsable: string | null;
}

export interface InspectionSummary {
  id: string;
  templateId: string;
  templateNombre: string;
  centroId: string;
  centroNombre: string;
  inspectorId: string;
  inspectorNombre: string;
  fecha: string;
  estado: InspectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionDetail extends InspectionSummary {
  answers: InspectionAnswer[];
}

export interface StartInspectionInput {
  templateId: string;
  centroId: string;
  fecha: string;
}

export interface AnswerInput {
  templateItemId: string;
  estado: AnswerStatus;
  observacion?: string;
  planAccion?: string;
  fechaCompromiso?: string;
  fechaControl?: string;
  responsable?: string;
}

export const inspeccionesApi = {
  list: (filter: { estado?: InspectionStatus; centroId?: string } = {}) =>
    http
      .get<InspectionSummary[]>('/inspecciones', { params: filter })
      .then((r) => r.data),

  get: (id: string) =>
    http.get<InspectionDetail>(`/inspecciones/${id}`).then((r) => r.data),

  start: (input: StartInspectionInput) =>
    http.post<InspectionDetail>('/inspecciones', input).then((r) => r.data),

  saveAnswers: (id: string, answers: AnswerInput[]) =>
    http
      .put<InspectionDetail>(`/inspecciones/${id}/respuestas`, { answers })
      .then((r) => r.data),

  uploadEvidencia: (inspectionId: string, templateItemId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post(`/inspecciones/${inspectionId}/respuestas/${templateItemId}/evidencia`, formData)
      .then(() => undefined);
  },

  /** URL para pedir la imagen vía fetch con el token (un <img src> directo no lo enviaría). */
  evidenciaEndpoint: (inspectionId: string, templateItemId: string) =>
    `/inspecciones/${inspectionId}/respuestas/${templateItemId}/evidencia`,
};
