import { Injectable } from '@nestjs/common';
import {
  CentroConformidad,
  DashboardSummary,
  DateRangeFilter,
  FormulariosActividad,
  OpenFinding,
  ReportsRepositoryPort,
  TrendPoint,
} from '../domain/ports/reports-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';

interface SummaryRow {
  completadas: string;
  conformes: string;
  no_conformes: string;
  hallazgos_abiertos: string;
  hallazgos_vencidos: string;
}

interface TrendRow {
  fecha: string;
  conformes: string;
  no_conformes: string;
}

interface CentroConformidadRow {
  centro_id: string;
  centro_nombre: string;
  total: string;
  conformes: string;
}

interface FormulariosActividadRow {
  form_id: string;
  form_nombre: string;
  respuestas: string;
}

interface OpenFindingRow {
  inspection_id: string;
  template_item_id: string;
  centro_nombre: string;
  template_nombre: string;
  item_descripcion: string;
  responsable: string | null;
  fecha_control: string | null;
  vencido: boolean;
  resuelto_at: Date | null;
  resuelto_por_nombre: string | null;
}

@Injectable()
export class PostgresReportsRepository implements ReportsRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async getSummary(filter: DateRangeFilter): Promise<DashboardSummary> {
    const rows = await this.tx.run((manager) =>
      manager.query<SummaryRow[]>(
        `SELECT
           count(*) FILTER (WHERE i.estado IN ('CONFORME', 'NO_CONFORME')) AS completadas,
           count(*) FILTER (WHERE i.estado = 'CONFORME') AS conformes,
           count(*) FILTER (WHERE i.estado = 'NO_CONFORME') AS no_conformes,
           (SELECT count(*) FROM inspection_answer a
              JOIN inspection i2 ON i2.id = a.inspection_id
              WHERE a.estado = 'NO_CUMPLE' AND a.resuelto_at IS NULL
                AND ($3::uuid IS NULL OR i2.centro_id = $3)
           ) AS hallazgos_abiertos,
           (SELECT count(*) FROM inspection_answer a
              JOIN inspection i2 ON i2.id = a.inspection_id
              WHERE a.estado = 'NO_CUMPLE' AND a.resuelto_at IS NULL
                AND a.fecha_control < current_date
                AND ($3::uuid IS NULL OR i2.centro_id = $3)
           ) AS hallazgos_vencidos
         FROM inspection i
         WHERE i.fecha BETWEEN $1 AND $2
           AND ($3::uuid IS NULL OR i.centro_id = $3)`,
        [filter.desde, filter.hasta, filter.centroId ?? null],
      ),
    );

    const row = rows[0];
    const completadas = Number(row.completadas);
    const conformes = Number(row.conformes);

    return {
      inspeccionesCompletadas: completadas,
      inspeccionesConformes: conformes,
      inspeccionesNoConformes: Number(row.no_conformes),
      porcentajeConformidad: completadas === 0 ? 0 : Math.round((conformes / completadas) * 1000) / 10,
      hallazgosAbiertos: Number(row.hallazgos_abiertos),
      hallazgosVencidos: Number(row.hallazgos_vencidos),
    };
  }

  async getTrend(filter: DateRangeFilter): Promise<TrendPoint[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<TrendRow[]>(
        `SELECT i.fecha::text AS fecha,
                count(*) FILTER (WHERE i.estado = 'CONFORME') AS conformes,
                count(*) FILTER (WHERE i.estado = 'NO_CONFORME') AS no_conformes
         FROM inspection i
         WHERE i.fecha BETWEEN $1 AND $2
           AND i.estado IN ('CONFORME', 'NO_CONFORME')
           AND ($3::uuid IS NULL OR i.centro_id = $3)
         GROUP BY i.fecha
         ORDER BY i.fecha`,
        [filter.desde, filter.hasta, filter.centroId ?? null],
      ),
    );

    return rows.map((row) => ({
      fecha: row.fecha,
      conformes: Number(row.conformes),
      noConformes: Number(row.no_conformes),
    }));
  }

  async getConformidadPorCentro(filter: DateRangeFilter): Promise<CentroConformidad[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<CentroConformidadRow[]>(
        `SELECT c.id AS centro_id, c.nombre AS centro_nombre,
                count(i.id) AS total,
                count(i.id) FILTER (WHERE i.estado = 'CONFORME') AS conformes
         FROM centro c
         LEFT JOIN inspection i
           ON i.centro_id = c.id
           AND i.fecha BETWEEN $1 AND $2
           AND i.estado IN ('CONFORME', 'NO_CONFORME')
         WHERE c.activo = true
           AND ($3::uuid IS NULL OR c.id = $3)
         GROUP BY c.id, c.nombre
         ORDER BY c.nombre`,
        [filter.desde, filter.hasta, filter.centroId ?? null],
      ),
    );

    return rows.map((row) => {
      const total = Number(row.total);
      const conformes = Number(row.conformes);
      return {
        centroId: row.centro_id,
        centroNombre: row.centro_nombre,
        total,
        conformes,
        porcentajeConformidad: total === 0 ? 0 : Math.round((conformes / total) * 1000) / 10,
      };
    });
  }

  async getHallazgos(centroId: string | undefined, incluirResueltos: boolean): Promise<OpenFinding[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<OpenFindingRow[]>(
        `SELECT i.id AS inspection_id, a.template_item_id,
                c.nombre AS centro_nombre, t.nombre AS template_nombre,
                ti.descripcion AS item_descripcion, a.responsable, a.fecha_control::text AS fecha_control,
                (a.fecha_control IS NOT NULL AND a.fecha_control < current_date AND a.resuelto_at IS NULL) AS vencido,
                a.resuelto_at, (ru.nombre || ' ' || ru.apellido) AS resuelto_por_nombre
         FROM inspection_answer a
         JOIN inspection i ON i.id = a.inspection_id
         JOIN centro c ON c.id = i.centro_id
         JOIN checklist_template t ON t.id = i.template_id
         JOIN template_item ti ON ti.id = a.template_item_id
         LEFT JOIN app_user ru ON ru.id = a.resuelto_por
         WHERE a.estado = 'NO_CUMPLE'
           AND ($1::boolean OR a.resuelto_at IS NULL)
           AND ($2::uuid IS NULL OR i.centro_id = $2)
         ORDER BY a.resuelto_at IS NOT NULL, a.fecha_control ASC NULLS LAST
         LIMIT 200`,
        [incluirResueltos, centroId ?? null],
      ),
    );

    return rows.map((row) => ({
      inspectionId: row.inspection_id,
      templateItemId: row.template_item_id,
      centroNombre: row.centro_nombre,
      templateNombre: row.template_nombre,
      itemDescripcion: row.item_descripcion,
      responsable: row.responsable,
      fechaControl: row.fecha_control,
      vencido: row.vencido,
      resuelto: row.resuelto_at !== null,
      resueltoAt: row.resuelto_at,
      resueltoPorNombre: row.resuelto_por_nombre,
    }));
  }

  async getFormulariosActividad(filter: DateRangeFilter): Promise<FormulariosActividad> {
    // created_at es timestamptz y el filtro son fechas: el rango se cierra en el día
    // siguiente a "hasta" con < para incluir todo ese día sin depender de la hora.
    const rows = await this.tx.run((manager) =>
      manager.query<FormulariosActividadRow[]>(
        `SELECT f.id AS form_id, f.nombre AS form_nombre, count(r.id) AS respuestas
         FROM formulario f
         LEFT JOIN formulario_respuesta r
           ON r.form_id = f.id
           AND r.created_at >= $1::date
           AND r.created_at < ($2::date + 1)
           AND ($3::uuid IS NULL OR r.centro_id = $3)
         WHERE f.activo = true
         GROUP BY f.id, f.nombre
         HAVING count(r.id) > 0
         ORDER BY count(r.id) DESC, f.nombre`,
        [filter.desde, filter.hasta, filter.centroId ?? null],
      ),
    );

    const porFormulario = rows.map((row) => ({
      formId: row.form_id,
      formNombre: row.form_nombre,
      respuestas: Number(row.respuestas),
    }));

    return {
      totalRespuestas: porFormulario.reduce((sum, f) => sum + f.respuestas, 0),
      porFormulario,
    };
  }
}
