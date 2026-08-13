import { isValidRut, normalizeRut } from './rut';

describe('validación de RUT', () => {
  it('acepta RUTs válidos con y sin formato', () => {
    expect(isValidRut('11.111.111-1')).toBe(true);
    expect(isValidRut('11111111-1')).toBe(true);
    expect(isValidRut('12.345.678-5')).toBe(true);
    expect(isValidRut('9.876.543-3')).toBe(true);
  });

  it('acepta el dígito verificador K en cualquier caja', () => {
    expect(isValidRut('20.347.878-k')).toBe(isValidRut('20.347.878-K'));
  });

  it('rechaza un dígito verificador incorrecto', () => {
    expect(isValidRut('11.111.111-2')).toBe(false);
    expect(isValidRut('12.345.678-9')).toBe(false);
  });

  it('rechaza entradas mal formadas', () => {
    expect(isValidRut('')).toBe(false);
    expect(isValidRut('sin-rut')).toBe(false);
    expect(isValidRut('111-1')).toBe(false);
    expect(isValidRut('123456789012-1')).toBe(false);
  });

  it('normaliza guiones unicode que llegan desde formularios', () => {
    expect(normalizeRut('11.111.111‐1')).toBe('11111111-1');
    expect(isValidRut('11.111.111‐1')).toBe(true);
  });
});
