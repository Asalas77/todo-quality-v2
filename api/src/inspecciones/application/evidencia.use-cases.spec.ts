import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UploadEvidenceUseCase } from './upload-evidence.use-case';
import { GetEvidenceUseCase } from './get-evidence.use-case';
import {
  AnswerNotFoundError,
  Inspection,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';
import {
  EvidenceNotFoundError,
  EvidenceStoragePort,
  StoredEvidence,
} from '../domain/ports/evidence-storage.port';
import { tenantContext } from '../../shared/tenant/tenant-context';

const OWNER_ID = 'user-1';

class FakeInspectionRepo implements Partial<InspectionRepositoryPort> {
  evidenceByAnswer = new Map<string, string | null>();
  throwOnSetEvidencia: Error | null = null;
  throwOnGet: Error | null = null;

  async findById(id: string): Promise<Inspection | null> {
    return {
      id,
      templateId: 'tpl-1',
      templateNombre: 'Higiene diaria',
      centroId: 'centro-1',
      centroNombre: 'Planta Norte',
      inspectorId: OWNER_ID,
      inspectorNombre: 'Ana Salas',
      fecha: '2026-01-01',
      estado: 'BORRADOR',
      answers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async setEvidencia(inspectionId: string, templateItemId: string, storageKey: string) {
    if (this.throwOnSetEvidencia) throw this.throwOnSetEvidencia;
    const key = `${inspectionId}:${templateItemId}`;
    const previousStorageKey = this.evidenceByAnswer.get(key) ?? null;
    this.evidenceByAnswer.set(key, storageKey);
    return { previousStorageKey };
  }

  async getEvidenciaStorageKey(inspectionId: string, templateItemId: string) {
    if (this.throwOnGet) throw this.throwOnGet;
    return this.evidenceByAnswer.get(`${inspectionId}:${templateItemId}`) ?? null;
  }
}

class FakeEvidenceStorage implements EvidenceStoragePort {
  saved: Array<{ tenantId: string; buffer: Buffer; extension: string }> = [];
  deleted: string[] = [];
  throwOnRead: Error | null = null;
  private counter = 0;

  async save(tenantId: string, buffer: Buffer, extension: string) {
    this.saved.push({ tenantId, buffer, extension });
    this.counter += 1;
    return `${tenantId}/file-${this.counter}${extension}`;
  }

  async read(storageKey: string): Promise<StoredEvidence> {
    if (this.throwOnRead) throw this.throwOnRead;
    return { path: `/disk/${storageKey}`, mimeType: 'image/jpeg' };
  }

  async delete(storageKey: string): Promise<void> {
    this.deleted.push(storageKey);
  }
}

function runAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantContext.run({ tenantId }, fn);
}

describe('UploadEvidenceUseCase', () => {
  it('guarda el archivo y vincula la clave a la respuesta', async () => {
    const repo = new FakeInspectionRepo();
    const storage = new FakeEvidenceStorage();
    const useCase = new UploadEvidenceUseCase(
      repo as unknown as InspectionRepositoryPort,
      storage,
    );

    await runAsTenant('tenant-1', () =>
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'item-1',
        buffer: Buffer.from('foto'),
        mimeType: 'image/jpeg',
        requestedBy: OWNER_ID,
        canViewAll: false,
      }),
    );

    expect(storage.saved).toHaveLength(1);
    expect(storage.saved[0].tenantId).toBe('tenant-1');
    expect(storage.saved[0].extension).toBe('.jpg');
    expect(await repo.getEvidenciaStorageKey('insp-1', 'item-1')).toBe('tenant-1/file-1.jpg');
  });

  it('rechaza un tipo de archivo no admitido antes de tocar el storage', async () => {
    const repo = new FakeInspectionRepo();
    const storage = new FakeEvidenceStorage();
    const useCase = new UploadEvidenceUseCase(
      repo as unknown as InspectionRepositoryPort,
      storage,
    );

    await expect(
      runAsTenant('tenant-1', () =>
        useCase.execute({
          inspectionId: 'insp-1',
          templateItemId: 'item-1',
          buffer: Buffer.from('x'),
          mimeType: 'application/pdf',
          requestedBy: OWNER_ID,
          canViewAll: false,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.saved).toHaveLength(0);
  });

  it('borra el archivo viejo al reemplazar la evidencia de un ítem', async () => {
    const repo = new FakeInspectionRepo();
    const storage = new FakeEvidenceStorage();
    const useCase = new UploadEvidenceUseCase(
      repo as unknown as InspectionRepositoryPort,
      storage,
    );

    await runAsTenant('tenant-1', () =>
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'item-1',
        buffer: Buffer.from('foto1'),
        mimeType: 'image/jpeg',
        requestedBy: OWNER_ID,
        canViewAll: false,
      }),
    );
    await runAsTenant('tenant-1', () =>
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'item-1',
        buffer: Buffer.from('foto2'),
        mimeType: 'image/png',
        requestedBy: OWNER_ID,
        canViewAll: false,
      }),
    );

    expect(storage.deleted).toEqual(['tenant-1/file-1.jpg']);
    expect(await repo.getEvidenciaStorageKey('insp-1', 'item-1')).toBe('tenant-1/file-2.png');
  });

  it('no deja el archivo huérfano si el ítem no existe', async () => {
    const repo = new FakeInspectionRepo();
    repo.throwOnSetEvidencia = new AnswerNotFoundError();
    const storage = new FakeEvidenceStorage();
    const useCase = new UploadEvidenceUseCase(
      repo as unknown as InspectionRepositoryPort,
      storage,
    );

    await expect(
      runAsTenant('tenant-1', () =>
        useCase.execute({
          inspectionId: 'insp-1',
          templateItemId: 'no-existe',
          buffer: Buffer.from('foto'),
          mimeType: 'image/jpeg',
          requestedBy: OWNER_ID,
          canViewAll: false,
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(storage.deleted).toEqual(['tenant-1/file-1.jpg']);
  });
});

describe('GetEvidenceUseCase', () => {
  it('devuelve el archivo cuando el ítem tiene evidencia', async () => {
    const repo = new FakeInspectionRepo();
    repo.evidenceByAnswer.set('insp-1:item-1', 'tenant-1/foto.jpg');
    const storage = new FakeEvidenceStorage();
    const useCase = new GetEvidenceUseCase(repo as unknown as InspectionRepositoryPort, storage);

    const result = await useCase.execute({
      inspectionId: 'insp-1',
      templateItemId: 'item-1',
      requestedBy: OWNER_ID,
      canViewAll: false,
    });
    expect(result.path).toBe('/disk/tenant-1/foto.jpg');
  });

  it('da 404 si el ítem no tiene evidencia cargada', async () => {
    const repo = new FakeInspectionRepo();
    const storage = new FakeEvidenceStorage();
    const useCase = new GetEvidenceUseCase(repo as unknown as InspectionRepositoryPort, storage);

    await expect(
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'item-1',
        requestedBy: OWNER_ID,
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('da 404 si el ítem no existe en la inspección', async () => {
    const repo = new FakeInspectionRepo();
    repo.throwOnGet = new AnswerNotFoundError();
    const storage = new FakeEvidenceStorage();
    const useCase = new GetEvidenceUseCase(repo as unknown as InspectionRepositoryPort, storage);

    await expect(
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'no-existe',
        requestedBy: OWNER_ID,
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('da 404 si el archivo referenciado ya no está en disco', async () => {
    const repo = new FakeInspectionRepo();
    repo.evidenceByAnswer.set('insp-1:item-1', 'tenant-1/foto.jpg');
    const storage = new FakeEvidenceStorage();
    storage.throwOnRead = new EvidenceNotFoundError();
    const useCase = new GetEvidenceUseCase(repo as unknown as InspectionRepositoryPort, storage);

    await expect(
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'item-1',
        requestedBy: OWNER_ID,
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza con 403 ver la evidencia de una inspección ajena sin ver_todas', async () => {
    const repo = new FakeInspectionRepo();
    repo.evidenceByAnswer.set('insp-1:item-1', 'tenant-1/foto.jpg');
    const storage = new FakeEvidenceStorage();
    const useCase = new GetEvidenceUseCase(repo as unknown as InspectionRepositoryPort, storage);

    await expect(
      useCase.execute({
        inspectionId: 'insp-1',
        templateItemId: 'item-1',
        requestedBy: 'otro-user',
        canViewAll: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
