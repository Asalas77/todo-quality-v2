import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  Form,
  FormField,
  FormFieldInput,
  FormInput,
  FormNotFoundError,
  FormRepositoryPort,
  FormSummary,
} from '../domain/ports/form-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';

interface FormRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

interface FormSummaryRow extends FormRow {
  field_count: string;
}

interface FieldRow {
  id: string;
  tipo: FormField['tipo'];
  etiqueta: string;
  requerido: boolean;
  opciones: string[] | null;
  orden: number;
}

function toSummary(row: FormSummaryRow): FormSummary {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    activo: row.activo,
    fieldCount: Number(row.field_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toField(row: FieldRow): FormField {
  return {
    id: row.id,
    tipo: row.tipo,
    etiqueta: row.etiqueta,
    requerido: row.requerido,
    opciones: row.opciones,
    orden: row.orden,
  };
}

@Injectable()
export class PostgresFormRepository implements FormRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findAll(includeInactive: boolean): Promise<FormSummary[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<FormSummaryRow[]>(
        `SELECT f.*, count(c.id) AS field_count
         FROM formulario f
         LEFT JOIN formulario_campo c ON c.form_id = f.id
         WHERE f.activo = true OR $1
         GROUP BY f.id
         ORDER BY f.nombre`,
        [includeInactive],
      ),
    );
    return rows.map(toSummary);
  }

  async findById(id: string): Promise<Form | null> {
    return this.tx.run(async (manager) => {
      const formRows = await manager.query<FormRow[]>(
        'SELECT * FROM formulario WHERE id = $1',
        [id],
      );
      const form = formRows[0];
      if (!form) return null;

      const fields = await this.fetchFields(manager, id);
      return { ...toSummary({ ...form, field_count: String(fields.length) }), fields };
    });
  }

  async create(input: FormInput, createdBy: string): Promise<Form> {
    return this.tx.run(async (manager) => {
      const rows = await manager.query<FormRow[]>(
        `INSERT INTO formulario (tenant_id, nombre, descripcion, created_by)
         VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3)
         RETURNING *`,
        [input.nombre, input.descripcion ?? null, createdBy],
      );
      const form = rows[0];
      const fields = await this.insertFields(manager, form.id, input.fields);
      return { ...toSummary({ ...form, field_count: String(fields.length) }), fields };
    });
  }

  async update(id: string, input: FormInput): Promise<Form> {
    return this.tx.run(async (manager) => {
      const result = await manager.query(
        `UPDATE formulario
         SET nombre = $1, descripcion = $2, updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [input.nombre, input.descripcion ?? null, id],
      );
      const rows = rowsFromUpdate<FormRow>(result);
      const form = rows[0];
      if (!form) throw new FormNotFoundError();

      await manager.query('DELETE FROM formulario_campo WHERE form_id = $1', [id]);
      const fields = await this.insertFields(manager, id, input.fields);
      return { ...toSummary({ ...form, field_count: String(fields.length) }), fields };
    });
  }

  async setActivo(id: string, activo: boolean): Promise<FormSummary> {
    return this.tx.run(async (manager) => {
      const result = await manager.query(
        `UPDATE formulario SET activo = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [activo, id],
      );
      const rows = rowsFromUpdate<FormRow>(result);
      const form = rows[0];
      if (!form) throw new FormNotFoundError();

      const fields = await this.fetchFields(manager, id);
      return toSummary({ ...form, field_count: String(fields.length) });
    });
  }

  private async fetchFields(manager: EntityManager, formId: string): Promise<FormField[]> {
    const rows = await manager.query<FieldRow[]>(
      'SELECT * FROM formulario_campo WHERE form_id = $1 ORDER BY orden',
      [formId],
    );
    return rows.map(toField);
  }

  private async insertFields(
    manager: EntityManager,
    formId: string,
    fields: FormFieldInput[],
  ): Promise<FormField[]> {
    if (fields.length === 0) return [];

    // $1 es siempre formId; cada campo ocupa 4 placeholders propios a partir de $2.
    const params: unknown[] = [formId];
    const valueRows = fields.map((field, index) => {
      const [tipoParam, etiquetaParam, requeridoParam, opcionesParam, ordenParam] = [
        params.push(field.tipo),
        params.push(field.etiqueta),
        params.push(field.requerido),
        params.push(field.opciones ?? null),
        params.push(index),
      ];
      return `(current_setting('app.current_tenant')::uuid, $1, $${tipoParam}, $${etiquetaParam}, $${requeridoParam}, $${opcionesParam}, $${ordenParam})`;
    });

    const rows = await manager.query<FieldRow[]>(
      `INSERT INTO formulario_campo (tenant_id, form_id, tipo, etiqueta, requerido, opciones, orden)
       VALUES ${valueRows.join(', ')}
       RETURNING *`,
      params,
    );
    return rows.map(toField).sort((a, b) => a.orden - b.orden);
  }
}
