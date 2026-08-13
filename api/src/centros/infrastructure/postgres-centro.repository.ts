import { Injectable } from '@nestjs/common';
import {
  Centro,
  CentroNotFoundError,
  CentroRepositoryPort,
  DuplicateCentroNombreError,
} from '../domain/ports/centro-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';
import { rowsFromUpdate } from '../../shared/pg-query-result';
import { isUniqueViolation } from '../../shared/pg-error-codes';

interface CentroRow {
  id: string;
  nombre: string;
  direccion: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

function toDomain(row: CentroRow): Centro {
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class PostgresCentroRepository implements CentroRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async findAll(includeInactive: boolean): Promise<Centro[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<CentroRow[]>(
        `SELECT * FROM centro
         WHERE activo = true OR $1
         ORDER BY nombre`,
        [includeInactive],
      ),
    );
    return rows.map(toDomain);
  }

  async create(input: { nombre: string; direccion: string }): Promise<Centro> {
    try {
      const rows = await this.tx.run((manager) =>
        manager.query<CentroRow[]>(
          `INSERT INTO centro (tenant_id, nombre, direccion)
           VALUES (current_setting('app.current_tenant')::uuid, $1, $2)
           RETURNING *`,
          [input.nombre, input.direccion],
        ),
      );
      return toDomain(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateCentroNombreError();
      throw error;
    }
  }

  async update(
    id: string,
    input: { nombre: string; direccion: string },
  ): Promise<Centro> {
    try {
      const result = await this.tx.run((manager) =>
        manager.query(
          `UPDATE centro SET nombre = $1, direccion = $2, updated_at = now()
           WHERE id = $3
           RETURNING *`,
          [input.nombre, input.direccion, id],
        ),
      );
      const rows = rowsFromUpdate<CentroRow>(result);
      if (!rows[0]) throw new CentroNotFoundError();
      return toDomain(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateCentroNombreError();
      throw error;
    }
  }

  async setActivo(id: string, activo: boolean): Promise<Centro> {
    const result = await this.tx.run((manager) =>
      manager.query(
        `UPDATE centro SET activo = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [activo, id],
      ),
    );
    const rows = rowsFromUpdate<CentroRow>(result);
    if (!rows[0]) throw new CentroNotFoundError();
    return toDomain(rows[0]);
  }
}
