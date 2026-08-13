/**
 * Validación de RUT chileno para feedback inmediato en el formulario. Es solo UX: el
 * backend vuelve a validar el RUT y es la fuente de verdad (ver api/src/shared/rut.ts).
 */
export function isValidRut(rut: string): boolean {
  const normalized = rut.replace(/[‐–—]/g, '-').replace(/[.\s]/g, '').toUpperCase();

  if (!/^\d{7,8}-[\dK]$/.test(normalized)) return false;

  const [body, checkDigit] = normalized.split('-');
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return expected === checkDigit;
}
