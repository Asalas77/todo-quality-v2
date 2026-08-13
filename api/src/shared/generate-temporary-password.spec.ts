import { generateTemporaryPassword } from './generate-temporary-password';

describe('generateTemporaryPassword', () => {
  it('genera una contraseña de 12 caracteres', () => {
    expect(generateTemporaryPassword()).toHaveLength(12);
  });

  it('no usa caracteres ambiguos (0/O, 1/l/I)', () => {
    const password = generateTemporaryPassword();
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it('genera contraseñas distintas en llamadas sucesivas', () => {
    const passwords = new Set(Array.from({ length: 20 }, generateTemporaryPassword));
    expect(passwords.size).toBe(20);
  });
});
