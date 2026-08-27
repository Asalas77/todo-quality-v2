import { Injectable } from '@nestjs/common';
import { Comentario, ComentarioRepositoryPort } from '../domain/ports/comentario-repository.port';
import { TenantTransaction } from '../../shared/tenant/tenant-transaction';

interface ComentarioRow {
  id: string;
  mensaje: string;
  usuario_nombre: string;
  usuario_email: string;
  created_at: Date;
}

function toDomain(row: ComentarioRow): Comentario {
  return {
    id: row.id,
    mensaje: row.mensaje,
    usuarioNombre: row.usuario_nombre,
    usuarioEmail: row.usuario_email,
    createdAt: row.created_at,
  };
}

const SELECT = `
  SELECT c.id, c.mensaje, c.created_at,
         u.nombre || ' ' || u.apellido AS usuario_nombre,
         u.email AS usuario_email
  FROM comentario c
  JOIN app_user u ON u.id = c.usuario_id
`;

@Injectable()
export class PostgresComentarioRepository implements ComentarioRepositoryPort {
  constructor(private readonly tx: TenantTransaction) {}

  async create(input: { usuarioId: string; mensaje: string }): Promise<Comentario> {
    const rows = await this.tx.run((manager) =>
      manager.query<{ id: string }[]>(
        `INSERT INTO comentario (tenant_id, usuario_id, mensaje)
         VALUES (current_setting('app.current_tenant')::uuid, $1, $2)
         RETURNING id`,
        [input.usuarioId, input.mensaje],
      ),
    );
    const id = rows[0].id;

    const detail = await this.tx.run((manager) =>
      manager.query<ComentarioRow[]>(`${SELECT} WHERE c.id = $1`, [id]),
    );
    return toDomain(detail[0]);
  }

  async findAll(): Promise<Comentario[]> {
    const rows = await this.tx.run((manager) =>
      manager.query<ComentarioRow[]>(`${SELECT} ORDER BY c.created_at DESC`),
    );
    return rows.map(toDomain);
  }
}
