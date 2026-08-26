export const SCHEDULE_REPOSITORY = Symbol('SCHEDULE_REPOSITORY');

export type ScheduleStatus = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';

/** Lo agendado es una plantilla de checklist o un formulario, nunca ambos. */
export type ScheduleTargetType = 'CHECKLIST' | 'FORMULARIO';

export interface Schedule {
  id: string;
  tipo: ScheduleTargetType;
  /** Null cuando tipo === 'FORMULARIO'. */
  templateId: string | null;
  /** Null cuando tipo === 'CHECKLIST'. */
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduleInput {
  /** Exactamente uno de templateId / formId. */
  templateId?: string;
  formId?: string;
  centroId: string;
  asignadoA: string;
  asunto: string | null;
  fecha: string;
}

export interface ListScheduleFilter {
  estado?: ScheduleStatus;
  centroId?: string;
  /** Si se omite, no se filtra por asignado (requiere agenda.ver_todas en el caso de uso). */
  asignadoA?: string;
}

export interface ScheduleRepositoryPort {
  findAll(filter: ListScheduleFilter): Promise<Schedule[]>;
  /** Lanza TemplateInactiveError o CentroInactiveError si corresponde. */
  create(input: CreateScheduleInput): Promise<Schedule>;
  /** Lanza ScheduleNotFoundError o ScheduleNotPendingError. */
  cancel(id: string): Promise<Schedule>;
  /**
   * Vincula la programación con la inspección recién creada y la marca COMPLETADA.
   * Lanza ScheduleNotFoundError o ScheduleNotPendingError.
   */
  markStarted(id: string, inspectionId: string): Promise<Schedule>;
  /**
   * Equivalente a markStarted para lo agendado de tipo FORMULARIO: enlaza la respuesta
   * recién enviada y marca COMPLETADA.
   */
  markFormSubmitted(id: string, formRespuestaId: string): Promise<Schedule>;
  /** Necesario para que el caso de uso valide el estado antes de iniciar la inspección. */
  findById(id: string): Promise<Schedule | null>;
}

export class ScheduleNotFoundError extends Error {
  constructor() {
    super('La programación no existe');
  }
}

export class ScheduleNotPendingError extends Error {
  constructor() {
    super('Esta programación ya no está pendiente');
  }
}

export class ScheduleTemplateInactiveError extends Error {
  constructor() {
    super('La plantilla seleccionada no está activa');
  }
}

export class ScheduleCentroInactiveError extends Error {
  constructor() {
    super('El centro seleccionado no está activo');
  }
}

/** Iniciar una inspección solo aplica a lo agendado de tipo CHECKLIST. */
export class ScheduleWrongTargetTypeError extends Error {
  constructor(esperado: ScheduleTargetType) {
    super(
      esperado === 'CHECKLIST'
        ? 'Esta programación es de un formulario, no de un checklist'
        : 'Esta programación es de un checklist, no de un formulario',
    );
  }
}
