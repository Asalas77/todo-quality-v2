import { http } from './http';

export interface DashboardSummary {
  inspeccionesCompletadas: number;
  inspeccionesConformes: number;
  inspeccionesNoConformes: number;
  porcentajeConformidad: number;
  hallazgosAbiertos: number;
  hallazgosVencidos: number;
}

export interface TrendPoint {
  fecha: string;
  conformes: number;
  noConformes: number;
}

export interface CentroConformidad {
  centroId: string;
  centroNombre: string;
  total: number;
  conformes: number;
  porcentajeConformidad: number;
}

export interface OpenFinding {
  inspectionId: string;
  centroNombre: string;
  templateNombre: string;
  itemDescripcion: string;
  responsable: string | null;
  fechaControl: string | null;
  vencido: boolean;
}

export interface DateRangeFilter {
  desde: string;
  hasta: string;
  centroId?: string;
}

export const reportesApi = {
  getSummary: (filter: DateRangeFilter) =>
    http.get<DashboardSummary>('/reportes/resumen', { params: filter }).then((r) => r.data),

  getTrend: (filter: DateRangeFilter) =>
    http.get<TrendPoint[]>('/reportes/tendencia', { params: filter }).then((r) => r.data),

  getConformidadPorCentro: (filter: DateRangeFilter) =>
    http.get<CentroConformidad[]>('/reportes/centros', { params: filter }).then((r) => r.data),

  getHallazgosAbiertos: (centroId?: string) =>
    http
      .get<OpenFinding[]>('/reportes/hallazgos-abiertos', { params: { centroId } })
      .then((r) => r.data),
};
