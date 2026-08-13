import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  CreateScheduleInput,
  ListScheduleFilter,
  Schedule,
  ScheduleCentroInactiveError,
  ScheduleNotFoundError,
  ScheduleNotPendingError,
  ScheduleRepositoryPort,
  ScheduleTemplateInactiveError,
} from '../domain/ports/schedule-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';

interface ScheduleRow {
  id: string;
  template_id: string;
  template_nombre: string;
  centro_id: string;
  centro_nombre: string;
  asignado_a: string;
  asignado_nombre: string;
  asunto: string | null;
  fecha: string;
  estado: Schedule['estado'];
  inspection_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function toDomain(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    templateId: row.template_id,
    templateNombre: row.template_nombre,
    centroId: row.centro_id,
    centroNombre: row.centro_nombre,
    asignadoA: row.asignado_a,
    asignadoNombre: row.asignado_nombre,
    asunto: row.asunto,
    fecha: row.fecha,
    estado: row.estado,
    inspectionId: row.inspection_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT
    s.id, s.template_id, t.nombre AS template_nombre,
    s.centro_id, c.nombre AS centro_nombre,
    s.asignado_a, (u.nombre || ' ' || u.apellido) AS asignado_nombre,
    s.asunto, s.fecha, s.estado, s.inspection_id, s.created_at, s.updated_at
  FROM schedule s
  JOIN checklist_template t ON t.id = s.template_id
  JOIN centro c ON c.id = s.centro_id
  JOIN app_user u ON u.id = s.asignado_a
`;

@Injectable()
export class PostgresScheduleRepository implements ScheduleRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findAll(filter: ListScheduleFilter): Promise<Schedule[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.estado) {
      params.push(filter.estado);
      conditions.push(`s.estado = $${params.length}`);
    }
    if (filter.centroId) {
      params.push(filter.centroId);
      conditions.push(`s.centro_id = $${params.length}`);
    }
    if (filter.asignadoA) {
      params.push(filter.asignadoA);
      conditions.push(`s.asignado_a = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.tx.run((manager) =>
      manager.query<ScheduleRow[]>(`${SELECT} ${where} ORDER BY s.fecha`, params),
    );
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Schedule | null> {
    const rows = await this.tx.run((manager) =>
      manager.query<ScheduleRow[]>(`${SELECT} WHERE s.id = $1`, [id]),
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(input: CreateScheduleInput): Promise<Schedule> {
    return this.tx.run(async (manager) => {
      const templateRows = await manager.query<Array<{ activo: boolean }>>(
        'SELECT activo FROM checklist_template WHERE id = $1',
        [input.templateId],
      );
      if (!templateRows[0]?.activo) throw new ScheduleTemplateInactiveError();

      const centroRows = await manager.query<Array<{ activo: boolean }>>(
        'SELECT activo FROM centro WHERE id = $1',
        [input.centroId],
      );
      if (!centroRows[0]?.activo) throw new ScheduleCentroInactiveError();

      const inserted = await manager.query<Array<{ id: string }>>(
        `INSERT INTO schedule (tenant_id, template_id, centro_id, asignado_a, asunto, fecha)
         VALUES (current_setting('app.current_tenant')::uuid, $1, $2, $3, $4, $5)
         RETURNING id`,
        [input.templateId, input.centroId, input.asignadoA, input.asunto, input.fecha],
      );

      const rows = await manager.query<ScheduleRow[]>(`${SELECT} WHERE s.id = $1`, [
        inserted[0].id,
      ]);
      return toDomain(rows[0]);
    });
  }

  async cancel(id: string): Promise<Schedule> {
    return this.tx.run(async (manager) => {
      const result = await manager.query(
        `UPDATE schedule SET estado = 'CANCELADA', updated_at = now()
         WHERE id = $1 AND estado = 'PENDIENTE'
         RETURNING id`,
        [id],
      );
      await this.assertUpdateSucceeded(manager, id, result);

      const rows = await manager.query<ScheduleRow[]>(`${SELECT} WHERE s.id = $1`, [id]);
      return toDomain(rows[0]);
    });
  }

  async markStarted(id: string, inspectionId: string): Promise<Schedule> {
    return this.tx.run(async (manager) => {
      const result = await manager.query(
        `UPDATE schedule SET estado = 'COMPLETADA', inspection_id = $1, updated_at = now()
         WHERE id = $2 AND estado = 'PENDIENTE'
         RETURNING id`,
        [inspectionId, id],
      );
      await this.assertUpdateSucceeded(manager, id, result);

      const rows = await manager.query<ScheduleRow[]>(`${SELECT} WHERE s.id = $1`, [id]);
      return toDomain(rows[0]);
    });
  }

  /**
   * El UPDATE exige estado = 'PENDIENTE' en el WHERE para que el chequeo y el cambio
   * sean atómicos (evita la carrera de "leer PENDIENTE, luego actualizar" con dos
   * requests concurrentes). 0 filas afectadas puede significar "no existe" o "existe
   * pero ya no está pendiente" — hay que distinguirlos con una segunda consulta.
   */
  private async assertUpdateSucceeded(
    manager: EntityManager,
    id: string,
    updateResult: unknown,
  ): Promise<void> {
    const rows = rowsFromUpdate<{ id: string }>(updateResult);
    if (rows[0]) return;

    const exists = await manager.query<Array<{ id: string }>>(
      'SELECT id FROM schedule WHERE id = $1',
      [id],
    );
    throw exists[0] ? new ScheduleNotPendingError() : new ScheduleNotFoundError();
  }
}
