export const CHECKLIST_TEMPLATE_REPOSITORY = Symbol('CHECKLIST_TEMPLATE_REPOSITORY');

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
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistTemplate extends ChecklistTemplateSummary {
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

export interface ChecklistTemplateRepositoryPort {
  /** No incluye los ítems — la vista de lista solo necesita el resumen. */
  findAll(includeInactive: boolean): Promise<ChecklistTemplateSummary[]>;
  findById(id: string): Promise<ChecklistTemplate | null>;
  /** Lanza DuplicateIdentificadorError si ya existe una plantilla con ese identificador. */
  create(input: ChecklistTemplateInput): Promise<ChecklistTemplate>;
  /**
   * Reemplaza los campos y la lista completa de ítems (se borran los anteriores y se
   * insertan los nuevos) — no hay edición granular de ítems, igual que en el legacy la
   * plantilla se reconstruye entera al guardar.
   * Lanza DuplicateIdentificadorError o ChecklistTemplateNotFoundError.
   */
  update(id: string, input: ChecklistTemplateInput): Promise<ChecklistTemplate>;
  /** Lanza ChecklistTemplateNotFoundError si el id no existe en el tenant. */
  setActivo(id: string, activo: boolean): Promise<ChecklistTemplateSummary>;
}

export class DuplicateIdentificadorError extends Error {
  constructor() {
    super('Ya existe una plantilla con ese identificador');
  }
}

export class ChecklistTemplateNotFoundError extends Error {
  constructor() {
    super('La plantilla no existe');
  }
}
