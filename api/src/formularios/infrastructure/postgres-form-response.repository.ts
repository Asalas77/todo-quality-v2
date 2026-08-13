import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  FormResponseDetail,
  FormResponseRepositoryPort,
  FormResponseSummary,
  FormResponseValue,
  SubmitFormResponseInput,
} from '../domain/ports/form-response-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';

interface ResponseRow {
  id: string;
  form_id: string;
  centro_id: string | null;
  centro_nombre: string | null;
  creado_por_nombre: string;
  created_at: Date;
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
    creadoPorNombre: row.creado_por_nombre,
    createdAt: row.created_at,
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
         u.nombre || ' ' || u.apellido AS creado_por_nombre, r.created_at
  FROM formulario_respuesta r
  LEFT JOIN centro c ON c.id = r.centro_id
  JOIN app_user u ON u.id = r.creado_por
`;

@Injectable()
export class PostgresFormResponseRepository implements FormResponseRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async submit(input: SubmitFormResponseInput): Promise<FormResponseDetail> {
    return this.tx.run(async (manager) => {
      const responseRows = await manager.query<ResponseRow[]>(
        `INSERT INTO formulario_respuesta (tenant_id, form_id, centro_id, creado_por)
         VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3)
         RETURNING id, form_id, centro_id, created_at`,
        [input.formId, input.centroId ?? null, input.creadoPor],
      );
      const respuestaId = responseRows[0].id;

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

  async findByForm(formId: string): Promise<FormResponseSummary[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<ResponseRow[]>(
        `${RESPONSE_SELECT} WHERE r.form_id = $1 ORDER BY r.created_at DESC`,
        [formId],
      ),
    );
    return rows.map(toSummary);
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
