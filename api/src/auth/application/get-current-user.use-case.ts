import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, AuthRepositoryPort } from '../domain/ports/auth-repository.port';

export interface CurrentUserQuery {
  userId: string;
  tenantId: string;
  permissions: readonly string[];
}

export interface CurrentUser {
  userId: string;
  tenantId: string;
  tenantNombre: string | null;
  permissions: readonly string[];
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort) {}

  async execute(query: CurrentUserQuery): Promise<CurrentUser> {
    const tenantNombre = await this.authRepo.getTenantNombre(query.tenantId);
    return {
      userId: query.userId,
      tenantId: query.tenantId,
      tenantNombre,
      permissions: query.permissions,
    };
  }
}
