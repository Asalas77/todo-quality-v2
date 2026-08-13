import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
  DuplicateEmailError,
  DuplicateRutError,
} from '../domain/ports/auth-repository.port';
import {
  PASSWORD_HASHER,
  PasswordHasherPort,
} from '../domain/ports/password-hasher.port';
import { normalizeRut, isValidRut } from '../../shared/rut';

export interface RegisterTenantCommand {
  empresaNombre: string;
  empresaRut: string;
  adminNombre: string;
  adminApellido: string;
  adminEmail: string;
  password: string;
}

export interface RegisterTenantResult {
  tenantId: string;
  userId: string;
}

@Injectable()
export class RegisterTenantUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(command: RegisterTenantCommand): Promise<RegisterTenantResult> {
    if (!isValidRut(command.empresaRut)) {
      throw new ConflictException('El RUT de la empresa no es válido');
    }

    const passwordHash = await this.hasher.hash(command.password);

    try {
      return await this.authRepo.registerTenant({
        nombre: command.empresaNombre,
        rut: normalizeRut(command.empresaRut),
        adminNombre: command.adminNombre,
        adminApellido: command.adminApellido,
        adminEmail: command.adminEmail,
        passwordHash,
      });
    } catch (error) {
      if (
        error instanceof DuplicateEmailError ||
        error instanceof DuplicateRutError
      ) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
