export const FORM_RESPONSE_REPOSITORY = Symbol('FORM_RESPONSE_REPOSITORY');

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
  creadoPorNombre: string;
  createdAt: Date;
}

export interface FormResponseDetail extends FormResponseSummary {
  valores: FormResponseValue[];
}

export interface FormResponseRepositoryPort {
  submit(input: SubmitFormResponseInput): Promise<FormResponseDetail>;
  findByForm(formId: string): Promise<FormResponseSummary[]>;
  findById(id: string): Promise<FormResponseDetail | null>;
}
