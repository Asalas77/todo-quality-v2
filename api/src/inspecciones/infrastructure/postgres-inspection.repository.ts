import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  AnswerInput,
  AnswerNotFoundError,
  CentroInactiveError,
  Inspection,
  InspectionAnswer,
  InspectionNotFoundError,
  InspectionRepositoryPort,
  InspectionSummary,
  ListInspectionsFilter,
  StartInspectionInput,
  TemplateInactiveError,
} from '../domain/ports/inspection-repository.port';
import { deriveInspectionStatus } from '../domain/derive-inspection-status';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';

interface InspectionSummaryRow {
  id: string;
  template_id: string;
  template_nombre: string;
  centro_id: string;
  centro_nombre: string;
  inspector_id: string;
  inspector_nombre: string;
  fecha: string;
  estado: Inspection['estado'];
  created_at: Date;
  updated_at: Date;
}

interface AnswerRow {
  template_item_id: string;
  item_descripcion: string;
  item_criticidad: InspectionAnswer['itemCriticidad'];
  item_orden: number;
  estado: InspectionAnswer['estado'];
  observacion: string | null;
  evidencia_url: string | null;
  plan_accion: string | null;
  fecha_compromiso: string | null;
  fecha_control: string | null;
  responsable: string | null;
}

function toSummary(row: InspectionSummaryRow): InspectionSummary {
  return {
    id: row.id,
    templateId: row.template_id,
    templateNombre: row.template_nombre,
    centroId: row.centro_id,
    centroNombre: row.centro_nombre,
    inspectorId: row.inspector_id,
    inspectorNombre: row.inspector_nombre,
    fecha: row.fecha,
    estado: row.estado,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAnswer(row: AnswerRow): InspectionAnswer {
  return {
    templateItemId: row.template_item_id,
    itemDescripcion: row.item_descripcion,
    itemCriticidad: row.item_criticidad,
    itemOrden: row.item_orden,
    estado: row.estado,
    observacion: row.observacion,
    evidenciaUrl: row.evidencia_url,
    planAccion: row.plan_accion,
    fechaCompromiso: row.fecha_compromiso,
    fechaControl: row.fecha_control,
    responsable: row.responsable,
  };
}

const SUMMARY_SELECT = `
  SELECT
    i.id, i.template_id, t.nombre AS template_nombre,
    i.centro_id, c.nombre AS centro_nombre,
    i.inspector_id, (u.nombre || ' ' || u.apellido) AS inspector_nombre,
    i.fecha, i.estado, i.created_at, i.updated_at
  FROM inspection i
  JOIN checklist_template t ON t.id = i.template_id
  JOIN centro c ON c.id = i.centro_id
  JOIN app_user u ON u.id = i.inspector_id
`;

@Injectable()
export class PostgresInspectionRepository implements InspectionRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findAll(filter: ListInspectionsFilter): Promise<InspectionSummary[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.estado) {
      params.push(filter.estado);
      conditions.push(`i.estado = $${params.length}`);
    }
    if (filter.centroId) {
      params.push(filter.centroId);
      conditions.push(`i.centro_id = $${params.length}`);
    }
    if (filter.inspectorId) {
      params.push(filter.inspectorId);
      conditions.push(`i.inspector_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.tx.run((manager) =>
      manager.query<InspectionSummaryRow[]>(
        `${SUMMARY_SELECT} ${where} ORDER BY i.fecha DESC, i.created_at DESC`,
        params,
      ),
    );
    return rows.map(toSummary);
  }

  async findById(id: string): Promise<Inspection | null> {
    return this.tx.run(async (manager) => {
      const rows = await manager.query<InspectionSummaryRow[]>(
        `${SUMMARY_SELECT} WHERE i.id = $1`,
        [id],
      );
      const summary = rows[0];
      if (!summary) return null;

      const answers = await this.fetchAnswers(manager, id);
      return { ...toSummary(summary), answers };
    });
  }

  async start(input: StartInspectionInput): Promise<Inspection> {
    return this.tx.run(async (manager) => {
      const templateRows = await manager.query<Array<{ activo: boolean }>>(
        'SELECT activo FROM checklist_template WHERE id = $1',
        [input.templateId],
      );
      if (!templateRows[0]?.activo) throw new TemplateInactiveError();

      const centroRows = await manager.query<Array<{ activo: boolean }>>(
        'SELECT activo FROM centro WHERE id = $1',
        [input.centroId],
      );
      if (!centroRows[0]?.activo) throw new CentroInactiveError();

      const inserted = await manager.query<Array<{ id: string }>>(
        `INSERT INTO inspection (tenant_id, template_id, centro_id, inspector_id, fecha, estado)
         VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3, $4, 'BORRADOR')
         RETURNING id`,
        [input.templateId, input.centroId, input.inspectorId, input.fecha],
      );
      const inspectionId = inserted[0].id;

      const items = await manager.query<Array<{ id: string }>>(
        'SELECT id FROM template_item WHERE template_id = $1 ORDER BY orden',
        [input.templateId],
      );

      if (items.length > 0) {
        const params: unknown[] = [inspectionId];
        const valueRows = items.map((item) => {
          const placeholder = params.push(item.id);
          return `(current_setting('app.current_tenant')::uuid, $1, $${placeholder})`;
        });
        await manager.query(
          `INSERT INTO inspection_answer (tenant_id, inspection_id, template_item_id)
           VALUES ${valueRows.join(', ')}`,
          params,
        );
      }

      const summaryRows = await manager.query<InspectionSummaryRow[]>(
        `${SUMMARY_SELECT} WHERE i.id = $1`,
        [inspectionId],
      );
      const answers = await this.fetchAnswers(manager, inspectionId);
      return { ...toSummary(summaryRows[0]), answers };
    });
  }

  async saveAnswers(inspectionId: string, answers: AnswerInput[]): Promise<Inspection> {
    return this.tx.run(async (manager) => {
      const existing = await manager.query<Array<{ id: string; template_id: string }>>(
        'SELECT id, template_id FROM inspection WHERE id = $1',
        [inspectionId],
      );
      if (!existing[0]) throw new InspectionNotFoundError();

      for (const answer of answers) {
        // evidencia_url no se toca aquí a propósito: la gestiona setEvidencia() por
        // separado, para que guardar otros campos del ítem nunca la borre sin querer.
        await manager.query(
          `UPDATE inspection_answer
           SET estado = $1, observacion = $2, plan_accion = $3,
               fecha_compromiso = $4, fecha_control = $5, responsable = $6, updated_at = now()
           WHERE inspection_id = $7 AND template_item_id = $8`,
          [
            answer.estado,
            answer.observacion ?? null,
            answer.planAccion ?? null,
            answer.fechaCompromiso ?? null,
            answer.fechaControl ?? null,
            answer.responsable ?? null,
            inspectionId,
            answer.templateItemId,
          ],
        );
      }

      const allAnswers = await this.fetchAnswers(manager, inspectionId);
      const totalItems = await manager.query<Array<{ count: string }>>(
        'SELECT count(*) FROM template_item WHERE template_id = $1',
        [existing[0].template_id],
      );

      const nextStatus = deriveInspectionStatus(
        allAnswers,
        Number(totalItems[0].count),
      );

      const updateResult = await manager.query(
        `UPDATE inspection SET estado = $1, updated_at = now() WHERE id = $2 RETURNING id`,
        [nextStatus, inspectionId],
      );
      rowsFromUpdate<{ id: string }>(updateResult);

      const summaryRows = await manager.query<InspectionSummaryRow[]>(
        `${SUMMARY_SELECT} WHERE i.id = $1`,
        [inspectionId],
      );
      return { ...toSummary(summaryRows[0]), answers: allAnswers };
    });
  }

  async setEvidencia(
    inspectionId: string,
    templateItemId: string,
    storageKey: string,
  ): Promise<{ previousStorageKey: string | null }> {
    return this.tx.run(async (manager) => {
      // Se lee el valor anterior ANTES del UPDATE a propósito: una subconsulta dentro
      // de RETURNING vería el valor ya actualizado, no el que había antes.
      const before = await manager.query<Array<{ evidencia_url: string | null }>>(
        `SELECT evidencia_url FROM inspection_answer
         WHERE inspection_id = $1 AND template_item_id = $2`,
        [inspectionId, templateItemId],
      );
      if (!before[0]) throw new AnswerNotFoundError();

      await manager.query(
        `UPDATE inspection_answer SET evidencia_url = $1, updated_at = now()
         WHERE inspection_id = $2 AND template_item_id = $3`,
        [storageKey, inspectionId, templateItemId],
      );

      return { previousStorageKey: before[0].evidencia_url };
    });
  }

  async getEvidenciaStorageKey(
    inspectionId: string,
    templateItemId: string,
  ): Promise<string | null> {
    return this.tx.run(async (manager) => {
      const rows = await manager.query<Array<{ evidencia_url: string | null }>>(
        `SELECT evidencia_url FROM inspection_answer
         WHERE inspection_id = $1 AND template_item_id = $2`,
        [inspectionId, templateItemId],
      );
      if (!rows[0]) throw new AnswerNotFoundError();
      return rows[0].evidencia_url;
    });
  }

  private async fetchAnswers(
    manager: EntityManager,
    inspectionId: string,
  ): Promise<InspectionAnswer[]> {
    const rows = await manager.query<AnswerRow[]>(
      `SELECT a.template_item_id, ti.descripcion AS item_descripcion,
              ti.criticidad AS item_criticidad, ti.orden AS item_orden,
              a.estado, a.observacion, a.evidencia_url, a.plan_accion,
              a.fecha_compromiso, a.fecha_control, a.responsable
       FROM inspection_answer a
       JOIN template_item ti ON ti.id = a.template_item_id
       WHERE a.inspection_id = $1
       ORDER BY ti.orden`,
      [inspectionId],
    );
    return rows.map(toAnswer);
  }
}
