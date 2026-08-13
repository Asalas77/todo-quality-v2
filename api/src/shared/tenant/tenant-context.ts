import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  permissions?: string[];
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantContext.getStore();
}

export function requireTenantId(): string {
  const store = tenantContext.getStore();
  if (!store?.tenantId) {
    throw new Error(
      'No hay tenant en el contexto. Toda query de negocio debe ejecutarse dentro de runInTenantTransaction.',
    );
  }
  return store.tenantId;
}
