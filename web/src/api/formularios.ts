import { http } from './http';
import type { ChecklistFrequency } from './plantillas';

export type FormFieldType =
  | 'TEXTO_CORTO'
  | 'TEXTO_LARGO'
  | 'FECHA'
  | 'RADIO'
  | 'CHECKBOX'
  | 'DESPLEGABLE'
  | 'ARCHIVO'
  | 'FOTO';

export const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  TEXTO_CORTO: 'Texto corto',
  TEXTO_LARGO: 'Texto largo',
  FECHA: 'Fecha',
  RADIO: 'Opción única',
  CHECKBOX: 'Opción múltiple',
  DESPLEGABLE: 'Desplegable',
  ARCHIVO: 'Archivo',
  FOTO: 'Foto',
};

export const OPTION_FIELD_TYPES: FormFieldType[] = ['RADIO', 'CHECKBOX', 'DESPLEGABLE'];

export interface FormField {
  id: string;
  tipo: FormFieldType;
  etiqueta: string;
  requerido: boolean;
  opciones: string[] | null;
  orden: number;
}

export interface FormFieldInput {
  tipo: FormFieldType;
  etiqueta: string;
  requerido: boolean;
  opciones?: string[];
}

export interface FormSummary {
  id: string;
  identificador: string;
  nombre: string;
  descripcion: string | null;
  frecuencia: ChecklistFrequency;
  activo: boolean;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormDetail extends FormSummary {
  fields: FormField[];
}

export interface FormInput {
  identificador: string;
  nombre: string;
  descripcion?: string;
  frecuencia: ChecklistFrequency;
  fields: FormFieldInput[];
}

export interface FormResponseValue {
  campoId: string;
  campoEtiqueta: string;
  campoTipo: FormFieldType;
  valorTexto: string | null;
  valorFecha: string | null;
  valorOpciones: string[] | null;
  archivoUrl: string | null;
}

export type FormResponseStatus = 'BORRADOR' | 'ENVIADA';

export interface FormResponseSummary {
  id: string;
  formId: string;
  centroId: string | null;
  centroNombre: string | null;
  creadoPorNombre: string;
  estado: FormResponseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponseDetail extends FormResponseSummary {
  valores: FormResponseValue[];
}

export interface FormResponseWithForm extends FormResponseSummary {
  formNombre: string;
}

export interface FormResponseValueInput {
  campoId: string;
  valorTexto?: string;
  valorFecha?: string;
  valorOpciones?: string[];
  archivoUrl?: string;
}

export interface SubmitFormResponseInput {
  centroId?: string;
  valores: FormResponseValueInput[];
  /** Cuando la respuesta nace de la agenda, cierra esa programación al guardarse. */
  scheduleId?: string;
}

export interface SaveFormDraftInput {
  centroId?: string;
  valores: FormResponseValueInput[];
}

export const formulariosApi = {
  list: (includeInactive: boolean) =>
    http
      .get<FormSummary[]>('/formularios', { params: { includeInactive } })
      .then((r) => r.data),

  get: (id: string) => http.get<FormDetail>(`/formularios/${id}`).then((r) => r.data),

  create: (input: FormInput) =>
    http.post<FormDetail>('/formularios', input).then((r) => r.data),

  update: (id: string, input: FormInput) =>
    http.put<FormDetail>(`/formularios/${id}`, input).then((r) => r.data),

  setActivo: (id: string, activo: boolean) =>
    http.put<FormSummary>(`/formularios/${id}/activo`, { activo }).then((r) => r.data),

  submit: (formId: string, input: SubmitFormResponseInput) =>
    http
      .post<FormResponseDetail>(`/formularios/${formId}/respuestas`, input)
      .then((r) => r.data),

  saveDraft: (formId: string, input: SaveFormDraftInput) =>
    http
      .post<FormResponseDetail>(`/formularios/${formId}/borrador`, input)
      .then((r) => r.data),

  getDraft: (formId: string) =>
    http
      .get<FormResponseDetail | null>(`/formularios/${formId}/borrador`)
      .then((r) => r.data),

  listResponses: (formId: string) =>
    http.get<FormResponseSummary[]>(`/formularios/${formId}/respuestas`).then((r) => r.data),

  /** Todas las respuestas enviadas del tenant, de cualquier formulario — para Agenda. */
  listAllResponses: (filter: { centroId?: string } = {}) =>
    http
      .get<FormResponseWithForm[]>('/formularios/respuestas', { params: filter })
      .then((r) => r.data),

  getResponse: (id: string) =>
    http.get<FormResponseDetail>(`/formularios/respuestas/${id}`).then((r) => r.data),

  uploadArchivo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<{ url: string }>('/formularios/archivos', formData)
      .then((r) => r.data.url);
  },

  archivoEndpoint: (responseId: string, campoId: string) =>
    `/formularios/respuestas/${responseId}/archivos/${campoId}`,
};
