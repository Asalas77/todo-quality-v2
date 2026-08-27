import { ResolveFindingUseCase } from './resolve-finding.use-case';
import { InspectionAnswer, InspectionRepositoryPort } from '../domain/ports/inspection-repository.port';

function buildAnswer(overrides: Partial<InspectionAnswer> = {}): InspectionAnswer {
  return {
    templateItemId: 'item-1',
    itemDescripcion: '¿Manos limpias?',
    itemCriticidad: 'CRITICO',
    itemOrden: 0,
    estado: 'NO_CUMPLE',
    observacion: null,
    evidenciaUrl: null,
    planAccion: 'Reforzar lavado de manos',
    fechaCompromiso: '2026-01-05',
    fechaControl: '2026-01-10',
    responsable: 'Jefe de turno',
    resuelto: false,
    resueltoAt: null,
    resueltoPorNombre: null,
    ...overrides,
  };
}

class FakeInspectionRepo implements Partial<InspectionRepositoryPort> {
  lastCall: { inspectionId: string; templateItemId: string; resuelto: boolean; resueltoPor: string } | null = null;

  async setResuelto(inspectionId: string, templateItemId: string, resuelto: boolean, resueltoPor: string) {
    this.lastCall = { inspectionId, templateItemId, resuelto, resueltoPor };
    return resuelto
      ? buildAnswer({ resuelto: true, resueltoAt: new Date('2026-01-15'), resueltoPorNombre: 'Camila Rojas' })
      : buildAnswer();
  }
}

describe('ResolveFindingUseCase', () => {
  it('marca un hallazgo como resuelto y deja el registro de quién y cuándo', async () => {
    const repo = new FakeInspectionRepo();
    const useCase = new ResolveFindingUseCase(repo as unknown as InspectionRepositoryPort);

    const result = await useCase.execute({
      inspectionId: 'insp-1',
      templateItemId: 'item-1',
      resuelto: true,
      resueltoPor: 'supervisor-1',
    });

    expect(result.resuelto).toBe(true);
    expect(result.resueltoPorNombre).toBe('Camila Rojas');
    expect(repo.lastCall).toEqual({
      inspectionId: 'insp-1',
      templateItemId: 'item-1',
      resuelto: true,
      resueltoPor: 'supervisor-1',
    });
  });

  it('permite reabrir un hallazgo ya resuelto', async () => {
    const repo = new FakeInspectionRepo();
    const useCase = new ResolveFindingUseCase(repo as unknown as InspectionRepositoryPort);

    const result = await useCase.execute({
      inspectionId: 'insp-1',
      templateItemId: 'item-1',
      resuelto: false,
      resueltoPor: 'supervisor-1',
    });

    expect(result.resuelto).toBe(false);
    expect(result.resueltoPorNombre).toBeNull();
  });
});
