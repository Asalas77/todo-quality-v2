import { AnswerStatus, InspectionStatus } from '../derive-inspection-status';

export const INSPECTION_REPOSITORY = Symbol('INSPECTION_REPOSITORY');

export interface InspectionAnswer {
  templateItemId: string;
  itemDescripcion: string;
  itemCriticidad: 'BASICO' | 'CRITICO';
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
  createdAt: Date;
  updatedAt: Date;
}

export interface Inspection extends InspectionSummary {
  answers: InspectionAnswer[];
}

export interface StartInspectionInput {
  templateId: string;
  centroId: string;
  inspectorId: string;
  fecha: string;
}

export interface AnswerInput {
  templateItemId: string;
  /** No nulo: solo se envían ítems ya contestados. Los pendientes no se incluyen. */
  estado: AnswerStatus;
  observacion?: string | null;
  planAccion?: string | null;
  fechaCompromiso?: string | null;
  fechaControl?: string | null;
  responsable?: string | null;
}

export interface ListInspectionsFilter {
  estado?: InspectionStatus;
  centroId?: string;
  /** Sin 'inspecciones.ver_todas', solo se listan las propias — igual que en Agenda. */
  inspectorId?: string;
}

export interface InspectionRepositoryPort {
  findAll(filter: ListInspectionsFilter): Promise<InspectionSummary[]>;
  findById(id: string): Promise<Inspection | null>;
  /** Crea la inspección con una fila de respuesta vacía por cada ítem activo de la plantilla. */
  start(input: StartInspectionInput): Promise<Inspection>;
  /**
   * Aplica las respuestas dadas (upsert por templateItemId) y recalcula+persiste el
   * estado de la inspección a partir del resultado.
   * Lanza InspectionNotFoundError si el id no existe en el tenant.
   */
  saveAnswers(inspectionId: string, answers: AnswerInput[]): Promise<Inspection>;

  /**
   * Guarda la referencia al archivo de evidencia de un ítem. Deliberadamente separado
   * de saveAnswers: si viviera en el guardado en bloque, editar cualquier otro campo del
   * ítem sin volver a enviar la evidencia la borraría (el DTO no la reenvía).
   * Devuelve la clave de almacenamiento anterior, si había una, para poder borrar ese
   * archivo del disco. Lanza AnswerNotFoundError si el par (inspección, ítem) no existe
   * en el tenant.
   */
  setEvidencia(
    inspectionId: string,
    templateItemId: string,
    storageKey: string,
  ): Promise<{ previousStorageKey: string | null }>;

  /** Lanza AnswerNotFoundError si el par (inspección, ítem) no existe en el tenant. */
  getEvidenciaStorageKey(inspectionId: string, templateItemId: string): Promise<string | null>;
}

export class InspectionNotFoundError extends Error {
  constructor() {
    super('La inspección no existe');
  }
}

export class AnswerNotFoundError extends Error {
  constructor() {
    super('El ítem no existe en esta inspección');
  }
}

export class TemplateInactiveError extends Error {
  constructor() {
    super('La plantilla seleccionada no está activa');
  }
}

export class CentroInactiveError extends Error {
  constructor() {
    super('El centro seleccionado no está activo');
  }
}

export class InspectionForbiddenError extends Error {
  constructor() {
    super('No tienes permiso para ver o modificar esta inspección');
  }
}
