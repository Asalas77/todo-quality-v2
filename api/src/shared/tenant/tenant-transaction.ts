import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { requireTenantId, tenantContext } from './tenant-context';

/**
 * Único camino por el que la aplicación debe tocar datos de negocio.
 *
 * Fija app.current_tenant con is_local = true, de modo que el valor muere con la
 * transacción y no se filtra a la siguiente request que reutilice la conexión del pool.
 * Sin esto las políticas RLS quedan escritas pero nunca se activan.
 */
@Injectable()
export class TenantTransaction {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const tenantId = requireTenantId();

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT set_config($1, $2, true)', [
        'app.current_tenant',
        tenantId,
      ]);
      return work(manager);
    });
  }

  /**
   * Para operaciones que ocurren antes de conocer el tenant (login, alta de empresa).
   * Solo puede invocar funciones SECURITY DEFINER expuestas a propósito: sin tenant
   * fijado, RLS no devuelve ninguna fila de las tablas de negocio.
   */
  async runWithoutTenant<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }

  async runAs<T>(
    context: { tenantId: string; userId?: string; permissions?: string[] },
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return tenantContext.run(context, () => this.run(work));
  }
}
