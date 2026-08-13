export type AnswerStatus = 'CUMPLE' | 'NO_CUMPLE' | 'NO_APLICA';
export type InspectionStatus = 'BORRADOR' | 'CONFORME' | 'NO_CONFORME';

/**
 * Regla de negocio central del módulo (preservada del legacy): si al menos un ítem
 * quedó "no cumple", la inspección completa es NO_CONFORME. Si aún faltan ítems por
 * responder, queda en BORRADOR. Solo es CONFORME si todos los ítems se respondieron y
 * ninguno quedó en no cumple.
 *
 * El backend recalcula esto en cada guardado en vez de confiar en un estado que declare
 * el cliente — así "guardar avance" y "finalizar" son la misma operación, y no hay forma
 * de que el cliente fuerce un estado inconsistente con las respuestas reales.
 */
export function deriveInspectionStatus(
  answers: ReadonlyArray<{ estado: AnswerStatus | null }>,
  totalItems: number,
): InspectionStatus {
  const answered = answers.filter((a) => a.estado !== null);

  if (answered.length < totalItems) return 'BORRADOR';
  if (answered.some((a) => a.estado === 'NO_CUMPLE')) return 'NO_CONFORME';
  return 'CONFORME';
}
