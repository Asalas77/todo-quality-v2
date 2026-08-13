import { deriveInspectionStatus } from './derive-inspection-status';

describe('deriveInspectionStatus', () => {
  it('queda en BORRADOR si aún faltan ítems por responder', () => {
    const answers = [{ estado: 'CUMPLE' as const }, { estado: null }];
    expect(deriveInspectionStatus(answers, 2)).toBe('BORRADOR');
  });

  it('es BORRADOR incluso sin ninguna respuesta', () => {
    const answers = [{ estado: null }, { estado: null }];
    expect(deriveInspectionStatus(answers, 2)).toBe('BORRADOR');
  });

  it('es NO_CONFORME si algún ítem respondido quedó en no cumple, aunque falten otros', () => {
    const answers = [{ estado: 'NO_CUMPLE' as const }, { estado: null }];
    expect(deriveInspectionStatus(answers, 2)).toBe('BORRADOR');
  });

  it('es NO_CONFORME si todos están respondidos y al menos uno no cumple', () => {
    const answers = [
      { estado: 'CUMPLE' as const },
      { estado: 'NO_CUMPLE' as const },
      { estado: 'NO_APLICA' as const },
    ];
    expect(deriveInspectionStatus(answers, 3)).toBe('NO_CONFORME');
  });

  it('es CONFORME si todos están respondidos y ninguno no cumple', () => {
    const answers = [{ estado: 'CUMPLE' as const }, { estado: 'NO_APLICA' as const }];
    expect(deriveInspectionStatus(answers, 2)).toBe('CONFORME');
  });

  it('no cuenta respuestas de más allá del total de ítems de la plantilla', () => {
    // Si totalItems bajó (ítem eliminado de la plantilla) no debe quedar atascada en BORRADOR.
    const answers = [
      { estado: 'CUMPLE' as const },
      { estado: 'CUMPLE' as const },
      { estado: 'CUMPLE' as const },
    ];
    expect(deriveInspectionStatus(answers, 2)).toBe('CONFORME');
  });
});
