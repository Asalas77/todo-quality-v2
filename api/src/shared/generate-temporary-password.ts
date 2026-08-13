import { randomInt } from 'node:crypto';

// Sin caracteres ambiguos (0/O, 1/l/I) para que se puedan transcribir a mano sin error,
// igual que el generador del legacy — pero usando crypto.randomInt (uniforme y
// criptográficamente seguro) en vez de Math.random(), que no lo es.
const ALPHABET = 'abcdefghjkmnpqrtuvwxyzABCDEFGHJKMNPQRTUVWXYZ2346789';
const LENGTH = 12;

/**
 * Contraseña temporal para un usuario recién creado por un administrador. Se muestra
 * una sola vez en la respuesta del alta y se comunica fuera de banda — el backend nunca
 * la guarda en texto plano, solo su hash.
 */
export function generateTemporaryPassword(): string {
  let password = '';
  for (let i = 0; i < LENGTH; i++) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}
