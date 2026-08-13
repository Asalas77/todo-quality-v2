/**
 * Validación de RUT chileno con dígito verificador (módulo 11).
 * Portado de la implementación del sistema legacy.
 */

export function normalizeRut(rut: string): string {
  return rut
    .replace(/[‐–—]/g, '-')
    .replace(/[.\s]/g, '')
    .toUpperCase();
}

export function isValidRut(rut: string): boolean {
  const normalized = normalizeRut(rut);

  if (!/^\d{7,8}-[\dK]$/.test(normalized)) {
    return false;
  }

  const [body, checkDigit] = normalized.split('-');
  return computeCheckDigit(body) === checkDigit;
}

function computeCheckDigit(body: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}
