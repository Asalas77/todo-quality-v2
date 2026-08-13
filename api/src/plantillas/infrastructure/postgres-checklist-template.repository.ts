import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  ChecklistTemplate,
  ChecklistTemplateInput,
  ChecklistTemplateNotFoundError,
  ChecklistTemplateRepositoryPort,
  ChecklistTemplateSummary,
  DuplicateIdentificadorError,
  TemplateItem,
  TemplateItemInput,
} from '../domain/ports/checklist-template-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';
import { isUniqueViolation } from '../../shared/pg-error-codes';

interface TemplateRow {
  id: string;
  identificador: string;
  nombre: string;
  frecuencia: ChecklistTemplate['frecuencia'];
  vigencia: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TemplateSummaryRow extends TemplateRow {
  item_count: string;
}

interface ItemRow {
  id: string;
  descripcion: string;
  criticidad: TemplateItem['criticidad'];
  orden: number;
}

function toSummary(row: TemplateSummaryRow): ChecklistTemplateSummary {
  return {
    id: row.id,
    identificador: row.identificador,
    nombre: row.nombre,
    frecuencia: row.frecuencia,
    vigencia: row.vigencia,
    activo: row.activo,
    itemCount: Number(row.item_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: ItemRow): TemplateItem {
  return {
    id: row.id,
    descripcion: row.descripcion,
    criticidad: row.criticidad,
    orden: row.orden,
  };
}

@Injectable()
export class PostgresChecklistTemplateRepository implements ChecklistTemplateRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findAll(includeInactive: boolean): Promise<ChecklistTemplateSummary[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<TemplateSummaryRow[]>(
        `SELECT t.*, count(i.id) AS item_count
         FROM checklist_template t
         LEFT JOIN template_item i ON i.template_id = t.id
         WHERE t.activo = true OR $1
         GROUP BY t.id
         ORDER BY t.nombre`,
        [includeInactive],
      ),
    );
    return rows.map(toSummary);
  }

  async findById(id: string): Promise<ChecklistTemplate | null> {
    return this.tx.run(async (manager) => {
      const templateRows = await manager.query<TemplateRow[]>(
        'SELECT * FROM checklist_template WHERE id = $1',
        [id],
      );
      const template = templateRows[0];
      if (!template) return null;

      const items = await this.fetchItems(manager, id);
      return { ...toSummary({ ...template, item_count: String(items.length) }), items };
    });
  }

  async create(input: ChecklistTemplateInput): Promise<ChecklistTemplate> {
    try {
      return await this.tx.run(async (manager) => {
        const rows = await manager.query<TemplateRow[]>(
          `INSERT INTO checklist_template (tenant_id, identificador, nombre, frecuencia, vigencia)
           VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3, $4)
           RETURNING *`,
          [input.identificador, input.nombre, input.frecuencia, input.vigencia],
        );
        const template = rows[0];
        const items = await this.insertItems(manager, template.id, input.items);
        return { ...toSummary({ ...template, item_count: String(items.length) }), items };
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateIdentificadorError();
      throw error;
    }
  }

  async update(id: string, input: ChecklistTemplateInput): Promise<ChecklistTemplate> {
    try {
      return await this.tx.run(async (manager) => {
        const result = await manager.query(
          `UPDATE checklist_template
           SET identificador = $1, nombre = $2, frecuencia = $3, vigencia = $4, updated_at = now()
           WHERE id = $5
           RETURNING *`,
          [input.identificador, input.nombre, input.frecuencia, input.vigencia, id],
        );
        const rows = rowsFromUpdate<TemplateRow>(result);
        const template = rows[0];
        if (!template) throw new ChecklistTemplateNotFoundError();

        await manager.query('DELETE FROM template_item WHERE template_id = $1', [id]);
        const items = await this.insertItems(manager, id, input.items);
        return { ...toSummary({ ...template, item_count: String(items.length) }), items };
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateIdentificadorError();
      throw error;
    }
  }

  async setActivo(id: string, activo: boolean): Promise<ChecklistTemplateSummary> {
    return this.tx.run(async (manager) => {
      const result = await manager.query(
        `UPDATE checklist_template SET activo = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [activo, id],
      );
      const rows = rowsFromUpdate<TemplateRow>(result);
      const template = rows[0];
      if (!template) throw new ChecklistTemplateNotFoundError();

      const items = await this.fetchItems(manager, id);
      return toSummary({ ...template, item_count: String(items.length) });
    });
  }

  private async fetchItems(manager: EntityManager, templateId: string): Promise<TemplateItem[]> {
    const rows = await manager.query<ItemRow[]>(
      'SELECT * FROM template_item WHERE template_id = $1 ORDER BY orden',
      [templateId],
    );
    return rows.map(toItem);
  }

  private async insertItems(
    manager: EntityManager,
    templateId: string,
    items: TemplateItemInput[],
  ): Promise<TemplateItem[]> {
    if (items.length === 0) return [];

    // $1 es siempre templateId; cada ítem ocupa 3 placeholders propios a partir de $2.
    const params: unknown[] = [templateId];
    const valueRows = items.map((item, index) => {
      const [descripcionParam, criticidadParam, ordenParam] = [
        params.push(item.descripcion),
        params.push(item.criticidad),
        params.push(index),
      ];
      return `(current_setting('app.current_tenant')::uuid, $1, $${descripcionParam}, $${criticidadParam}, $${ordenParam})`;
    });

    const rows = await manager.query<ItemRow[]>(
      `INSERT INTO template_item (tenant_id, template_id, descripcion, criticidad, orden)
       VALUES ${valueRows.join(', ')}
       RETURNING *`,
      params,
    );
    return rows.map(toItem).sort((a, b) => a.orden - b.orden);
  }
}
