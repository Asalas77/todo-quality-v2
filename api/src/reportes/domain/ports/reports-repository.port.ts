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
  centroNombre: string;
  templateNombre: string;
  itemDescripcion: string;
  responsable: string | null;
  fechaControl: string | null;
  vencido: boolean;
}

export interface ReportsRepositoryPort {
  getSummary(filter: DateRangeFilter): Promise<DashboardSummary>;
  getTrend(filter: DateRangeFilter): Promise<TrendPoint[]>;
  getConformidadPorCentro(filter: DateRangeFilter): Promise<CentroConformidad[]>;
  /** No se filtra por rango de fechas: un hallazgo abierto de hace meses sigue siendo relevante hoy. */
  getHallazgosAbiertos(centroId?: string): Promise<OpenFinding[]>;
}
