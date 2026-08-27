export const REPORTS_REPOSITORY = Symbol('REPORTS_REPOSITORY');

export interface DateRangeFilter {
  desde: string;
  hasta: string;
  centroId?: string;
}

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
  templateItemId: string;
  centroNombre: string;
  templateNombre: string;
  itemDescripcion: string;
  responsable: string | null;
  fechaControl: string | null;
  vencido: boolean;
  resuelto: boolean;
  resueltoAt: Date | null;
  resueltoPorNombre: string | null;
}

/**
 * Los formularios capturan datos libres, sin noción de cumple/no cumple, así que no entran
 * en las métricas de conformidad — se reportan aparte, por volumen completado.
 */
export interface FormulariosActividad {
  totalRespuestas: number;
  porFormulario: Array<{
    formId: string;
    formNombre: string;
    respuestas: number;
  }>;
}

export interface ReportsRepositoryPort {
  getSummary(filter: DateRangeFilter): Promise<DashboardSummary>;
  getTrend(filter: DateRangeFilter): Promise<TrendPoint[]>;
  getConformidadPorCentro(filter: DateRangeFilter): Promise<CentroConformidad[]>;
  /**
   * No se filtra por rango de fechas: un hallazgo abierto de hace meses sigue siendo
   * relevante hoy. incluirResueltos=true trae también los ya cerrados (para el
   * historial/auditoría de quién y cuándo los resolvió), en vez de solo los pendientes.
   */
  getHallazgos(centroId: string | undefined, incluirResueltos: boolean): Promise<OpenFinding[]>;
  getFormulariosActividad(filter: DateRangeFilter): Promise<FormulariosActividad>;
}
