const UNIQUE_VIOLATION = '23505';
// Postgres usa dos SQLSTATE distintos para lo que a simple vista parece el mismo tipo de
// error: 23503 (foreign_key_violation) para INSERT/UPDATE que referencian una fila que
// no existe, pero 23001 (restrict_violation) específicamente para un DELETE/UPDATE
// bloqueado por ON DELETE RESTRICT — el caso de "no se puede borrar, algo lo referencia
// todavía". Confirmado en vivo al borrar un rol con usuarios asignados: llegó 23001, no
// 23503 como cabría esperar por analogía con la violación de FK "normal".
const FOREIGN_KEY_VIOLATION = '23503';
const RESTRICT_VIOLATION = '23001';

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === UNIQUE_VIOLATION;
}

/** Cubre tanto FK inválida en INSERT/UPDATE como un DELETE bloqueado por RESTRICT. */
export function isForeignKeyViolation(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === FOREIGN_KEY_VIOLATION || code === RESTRICT_VIOLATION;
}
