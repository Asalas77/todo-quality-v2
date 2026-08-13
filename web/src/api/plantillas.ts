import { http } from './http';

export type ChecklistFrequency = 'DIARIO' | 'SEMANAL' | 'BIMESTRAL' | 'TRIMESTRAL';
export type ItemCriticality = 'BASICO' | 'CRITICO';

export interface TemplateItem {
  id: string;
  descripcion: string;
  criticidad: ItemCriticality;
  orden: number;
}

export interface ChecklistTemplateSummary {
  id: string;
  identificador: string;
  nombre: string;
  frecuencia: ChecklistFrequency;
  vigencia: string;
  activo: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistTemplateDetail extends ChecklistTemplateSummary {
  items: TemplateItem[];
}

export interface TemplateItemInput {
  descripcion: string;
  criticidad: ItemCriticality;
}

export interface ChecklistTemplateInput {
  identificador: string;
  nombre: string;
  frecuencia: ChecklistFrequency;
  vigencia: string;
  items: TemplateItemInput[];
}

export const FRECUENCIA_LABEL: Record<ChecklistFrequency, string> = {
  DIARIO: 'Diario',
  SEMANAL: 'Semanal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
};

export const plantillasApi = {
  list: (includeInactive: boolean) =>
    http
      .get<ChecklistTemplateSummary[]>('/plantillas', {
        params: { incluirInactivos: includeInactive },
      })
      .then((r) => r.data),

  get: (id: string) =>
    http.get<ChecklistTemplateDetail>(`/plantillas/${id}`).then((r) => r.data),

  create: (input: ChecklistTemplateInput) =>
    http.post<ChecklistTemplateDetail>('/plantillas', input).then((r) => r.data),

  update: (id: string, input: ChecklistTemplateInput) =>
    http.put<ChecklistTemplateDetail>(`/plantillas/${id}`, input).then((r) => r.data),

  setActivo: (id: string, activo: boolean) =>
    http
      .patch<ChecklistTemplateSummary>(`/plantillas/${id}/activo`, { activo })
      .then((r) => r.data),
};
