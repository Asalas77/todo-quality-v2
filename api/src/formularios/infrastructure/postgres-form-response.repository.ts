import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  FormResponseDetail,
  FormResponseRepositoryPort,
  FormResponseSummary,
  FormResponseValue,
  FormResponseWithForm,
  ListAllFormResponsesFilter,
  ListFormResponsesFilter,
  SubmitFormResponseInput,
} from '../domain/ports/form-response-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';

interface ResponseRow {
  id: string;
  form_id: string;
  centro_id: string | null;
  centro_nombre: string | null;
  creado_por: string;
  creado_por_nombre: string;
  estado: FormResponseSummary['estado'];
  created_at: Date;
  updated_at: Date;
}

interface ValueRow {
  campo_id: string;
  campo_etiqueta: string;
  campo_tipo: string;
  valor_texto: string | null;
  valor_fecha: string | null;
  valor_opciones: string[] | null;
  archivo_url: string | null;
}

function toSummary(row: ResponseRow): FormResponseSummary {
  return {
    id: row.id,
    formId: row.form_id,
    centroId: row.centro_id,
    centroNombre: row.centro_nombre,
    creadoPor: row.creado_por,
    creadoPorNombre: row.creado_por_nombre,
    estado: row.estado,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toValue(row: ValueRow): FormResponseValue {
  return {
    campoId: row.campo_id,
    campoEtiqueta: row.campo_etiqueta,
    campoTipo: row.campo_tipo,
    valorTexto: row.valor_texto,
    valorFecha: row.valor_fecha,
    valorOpciones: row.valor_opciones,
    archivoUrl: row.archivo_url,
  };
}

const RESPONSE_SELECT = `
  SELECT r.id, r.form_id, r.centro_id, c.nombre AS centro_nombre,
         r.creado_por, u.nombre || ' ' || u.apellido AS creado_por_nombre,
         r.estado, r.created_at, r.updated_at
  FROM formulario_respuesta r
  LEFT JOIN centro c ON c.id = r.centro_id
  JOIN app_user u ON u.id = r.creado_por
`;

@Injectable()
export class PostgresFormResponseRepository implements FormResponseRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  submit(input: SubmitFormResponseInput): Promise<FormResponseDetail> {
    return this.upsert(input, 'ENVIADA');
  }

  saveDraft(input: SubmitFormResponseInput): Promise<FormResponseDetail> {
    return this.upsert(input, 'BORRADOR');
  }

  async findDraft(formId: string, userId: string): Promise<FormResponseDetail | null> {
    return this.tx.run(async (manager) => {
      const rows = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM formulario_respuesta
         WHERE form_id = $1 AND creado_por = $2 AND estado = 'BORRADOR'`,
        [formId, userId],
      );
      if (!rows[0]) return null;
      return this.findById(rows[0].id, manager);
    });
  }

  /**
   * Un solo camino para "enviar" y "guardar avance": si ya había un borrador de este
   * usuario para este formulario, lo retoma y reemplaza su estado y valores; si no había,
   * inserta una fila nueva.
   *
   * No se puede resolver con un solo INSERT ... ON CONFLICT: el índice único parcial solo
   * cubre filas con estado = 'BORRADOR', así que solo actúa de árbitro cuando la fila que
   * se está insertando también es BORRADOR (guardar avance). Al finalizar, la fila nueva
   * es ENVIADA — queda fuera del dominio del índice parcial y Postgres no la considera en
   * conflicto con el borrador existente, aunque comparta form_id/creado_por: sencillamente
   * inserta una fila aparte. Por eso acá se busca el borrador explícitamente primero.
   */
  private async upsert(
    input: SubmitFormResponseInput,
    estado: 'BORRADOR' | 'ENVIADA',
  ): Promise<FormResponseDetail> {
    return this.tx.run(async (manager) => {
      const draftRows = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM formulario_respuesta
         WHERE form_id = $1 AND creado_por = $2 AND estado = 'BORRADOR'`,
        [input.formId, input.creadoPor],
      );

      let respuestaId: string;
      if (draftRows[0]) {
        respuestaId = draftRows[0].id;
        await manager.query(
          `UPDATE formulario_respuesta
           SET centro_id = $1, estado = $2, updated_at = now()
           WHERE id = $3`,
          [input.centroId ?? null, estado, respuestaId],
        );
      } else {
        const inserted = await manager.query<Array<{ id: string }>>(
          `INSERT INTO formulario_respuesta (tenant_id, form_id, centro_id, creado_por, estado)
           VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3, $4)
           RETURNING id`,
          [input.formId, input.centroId ?? null, input.creadoPor, estado],
        );
        respuestaId = inserted[0].id;
      }

      // Reemplazo completo de valores, igual que "editar plantilla" reemplaza los ítems:
      // más simple que reconciliar campo por campo y el volumen por respuesta es chico.
      await manager.query('DELETE FROM formulario_respuesta_valor WHERE respuesta_id = $1', [
        respuestaId,
      ]);

      if (input.valores.length > 0) {
        const params: unknown[] = [respuestaId];
        const valueRows = input.valores.map((valor) => {
          const [campoParam, textoParam, fechaParam, opcionesParam, archivoParam] = [
            params.push(valor.campoId),
            params.push(valor.valorTexto ?? null),
            params.push(valor.valorFecha ?? null),
            params.push(valor.valorOpciones ?? null),
            params.push(valor.archivoUrl ?? null),
          ];
          return `(current_setting('app.current_tenant')::uuid, $1, $${campoParam}, $${textoParam}, $${fechaParam}, $${opcionesParam}, $${archivoParam})`;
        });
        await manager.query(
          `INSERT INTO formulario_respuesta_valor
             (tenant_id, respuesta_id, campo_id, valor_texto, valor_fecha, valor_opciones, archivo_url)
           VALUES ${valueRows.join(', ')}`,
          params,
        );
      }

      return (await this.findById(respuestaId, manager))!;
    });
  }

  async findByForm(
    formId: string,
    filter: ListFormResponsesFilter = {},
  ): Promise<FormResponseSummary[]> {
    const params: unknown[] = [formId];
    let where = `r.form_id = $1 AND r.estado = 'ENVIADA'`;
    if (filter.creadoPor) {
      params.push(filter.creadoPor);
      where += ` AND r.creado_por = $${params.length}`;
    }

    const rows = await this.tx.run((manager) =>
      manager.query<ResponseRow[]>(
        `${RESPONSE_SELECT} WHERE ${where} ORDER BY r.created_at DESC`,
        params,
      ),
    );
    return rows.map(toSummary);
  }

  async findAllSubmitted(
    filter: ListAllFormResponsesFilter = {},
  ): Promise<FormResponseWithForm[]> {
    const params: unknown[] = [];
    const conditions = [`r.estado = 'ENVIADA'`];
    if (filter.centroId) {
      params.push(filter.centroId);
      conditions.push(`r.centro_id = $${params.length}`);
    }
    if (filter.creadoPor) {
      params.push(filter.creadoPor);
      conditions.push(`r.creado_por = $${params.length}`);
    }

    const rows = await this.tx.run((manager) =>
      manager.query<Array<ResponseRow & { form_nombre: string }>>(
        `SELECT r.id, r.form_id, f.nombre AS form_nombre, r.centro_id, c.nombre AS centro_nombre,
                r.creado_por, u.nombre || ' ' || u.apellido AS creado_por_nombre,
                r.estado, r.created_at, r.updated_at
         FROM formulario_respuesta r
         JOIN formulario f ON f.id = r.form_id
         LEFT JOIN centro c ON c.id = r.centro_id
         JOIN app_user u ON u.id = r.creado_por
         WHERE ${conditions.join(' AND ')}
         ORDER BY r.created_at DESC`,
        params,
      ),
    );
    return rows.map((row) => ({ ...toSummary(row), formNombre: row.form_nombre }));
  }

  async findById(id: string, manager?: EntityManager): Promise<FormResponseDetail | null> {
    const run = <T>(fn: (m: EntityManager) => Promise<T>) =>
      manager ? fn(manager) : this.tx.run(fn);

    return run(async (m) => {
      const responseRows = await m.query<ResponseRow[]>(
        `${RESPONSE_SELECT} WHERE r.id = $1`,
        [id],
      );
      const response = responseRows[0];
      if (!response) return null;

      const valueRows = await m.query<ValueRow[]>(
        `SELECT v.campo_id, c.etiqueta AS campo_etiqueta, c.tipo AS campo_tipo,
                v.valor_texto, v.valor_fecha, v.valor_opciones, v.archivo_url
         FROM formulario_respuesta_valor v
         JOIN formulario_campo c ON c.id = v.campo_id
         WHERE v.respuesta_id = $1
         ORDER BY c.orden`,
        [id],
      );

      return { ...toSummary(response), valores: valueRows.map(toValue) };
    });
  }
}
