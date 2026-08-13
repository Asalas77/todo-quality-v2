import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';

/**
 * El legacy hasheaba con SHA-256 sin sal, en el cliente. Argon2id es resistente a GPU y
 * lleva sal por diseño; el hasheo ocurre solo en el servidor.
 */
@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // Un hash con formato inválido (incluido el dummy del login) no es un error:
      // simplemente no coincide.
      return false;
    }
  }
}
