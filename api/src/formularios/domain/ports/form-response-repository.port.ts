export const FORM_RESPONSE_REPOSITORY = Symbol('FORM_RESPONSE_REPOSITORY');

export type FormResponseStatus = 'BORRADOR' | 'ENVIADA';

export interface FormResponseValueInput {
  campoId: string;
  valorTexto?: string;
  valorFecha?: string;
  valorOpciones?: string[];
  archivoUrl?: string;
}

export interface SubmitFormResponseInput {
  formId: string;
  centroId?: string;
  creadoPor: string;
  valores: FormResponseValueInput[];
}

export interface FormResponseValue {
  campoId: string;
  campoEtiqueta: string;
  campoTipo: string;
  valorTexto: string | null;
  valorFecha: string | null;
  valorOpciones: string[] | null;
  archivoUrl: string | null;
}

export interface FormResponseSummary {
  id: string;
  formId: string;
  centroId: string | null;
  centroNombre: string | null;
  creadoPor: string;
  creadoPorNombre: string;
  estado: FormResponseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListFormResponsesFilter {
  /** Sin 'formularios.ver_todas', solo se listan las propias. */
  creadoPor?: string;
}

export interface FormResponseWithForm extends FormResponseSummary {
  formNombre: string;
}

export interface ListAllFormResponsesFilter {
  centroId?: string;
  /** Sin 'formularios.ver_todas', solo se listan las propias. */
  creadoPor?: string;
}

export interface FormResponseDetail extends FormResponseSummary {
  valores: FormResponseValue[];
}

export interface FormResponseRepositoryPort {
  /**
   * Envío final: valida (en la capa de aplicación) que estén los campos obligatorios.
   * Si ya existía un borrador de este usuario para este formulario, lo retoma y lo pasa
   * a ENVIADA en vez de crear una fila nueva — reemplaza sus valores por los definitivos.
   */
  submit(input: SubmitFormResponseInput): Promise<FormResponseDetail>;
  /**
   * Guarda avance sin exigir campos obligatorios, igual que "Guardar avance" en
   * inspecciones. Crea el borrador si no existe uno, o reemplaza sus valores si ya existía
   * (a lo más un borrador vigente por persona y formulario — ver índice único parcial).
   */
  saveDraft(input: SubmitFormResponseInput): Promise<FormResponseDetail>;
  /** El borrador vigente de este usuario para este formulario, si existe. */
  findDraft(formId: string, userId: string): Promise<FormResponseDetail | null>;
  findByForm(formId: string, filter?: ListFormResponsesFilter): Promise<FormResponseSummary[]>;
  /** Todas las respuestas ENVIADA del tenant, de cualquier formulario — para Agenda. */
  findAllSubmitted(filter?: ListAllFormResponsesFilter): Promise<FormResponseWithForm[]>;
  findById(id: string): Promise<FormResponseDetail | null>;
}
