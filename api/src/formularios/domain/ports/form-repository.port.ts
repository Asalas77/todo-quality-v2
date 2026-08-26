import type { ChecklistFrequency } from '../../../plantillas/domain/ports/checklist-template-repository.port';

export const FORM_REPOSITORY = Symbol('FORM_REPOSITORY');

export type FormFieldType =
  | 'TEXTO_CORTO'
  | 'TEXTO_LARGO'
  | 'FECHA'
  | 'RADIO'
  | 'CHECKBOX'
  | 'DESPLEGABLE'
  | 'ARCHIVO'
  | 'FOTO';

export interface FormField {
  id: string;
  tipo: FormFieldType;
  etiqueta: string;
  requerido: boolean;
  opciones: string[] | null;
  orden: number;
}

export interface FormSummary {
  id: string;
  identificador: string;
  nombre: string;
  descripcion: string | null;
  frecuencia: ChecklistFrequency;
  activo: boolean;
  fieldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Form extends FormSummary {
  fields: FormField[];
}

export interface FormFieldInput {
  tipo: FormFieldType;
  etiqueta: string;
  requerido: boolean;
  opciones?: string[];
}

export interface FormInput {
  identificador: string;
  nombre: string;
  descripcion?: string;
  frecuencia: ChecklistFrequency;
  fields: FormFieldInput[];
}

export interface FormRepositoryPort {
  findAll(includeInactive: boolean): Promise<FormSummary[]>;
  findById(id: string): Promise<Form | null>;
  /** Lanza DuplicateIdentificadorError si ya existe un formulario con ese identificador. */
  create(input: FormInput, createdBy: string): Promise<Form>;
  /**
   * Reemplaza los campos y la lista completa (se borran los anteriores y se insertan los
   * nuevos) — mismo criterio que las plantillas de checklist: no hay edición granular.
   * Lanza FormNotFoundError o DuplicateIdentificadorError.
   */
  update(id: string, input: FormInput): Promise<Form>;
  /** Lanza FormNotFoundError si el id no existe en el tenant. */
  setActivo(id: string, activo: boolean): Promise<FormSummary>;
}

export class FormNotFoundError extends Error {
  constructor() {
    super('El formulario no existe');
  }
}

export class DuplicateIdentificadorError extends Error {
  constructor() {
    super('Ya existe un formulario con ese identificador');
  }
}
