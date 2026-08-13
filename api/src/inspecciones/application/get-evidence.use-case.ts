import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnswerNotFoundError,
  INSPECTION_REPOSITORY,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';
import {
  EVIDENCE_STORAGE,
  EvidenceNotFoundError,
  EvidenceStoragePort,
  StoredEvidence,
} from '../domain/ports/evidence-storage.port';

@Injectable()
export class GetEvidenceUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
    @Inject(EVIDENCE_STORAGE) private readonly storage: EvidenceStoragePort,
  ) {}

  async execute(inspectionId: string, templateItemId: string): Promise<StoredEvidence> {
    let storageKey: string | null;
    try {
      storageKey = await this.inspections.getEvidenciaStorageKey(inspectionId, templateItemId);
    } catch (error) {
      if (error instanceof AnswerNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }

    if (!storageKey) {
      throw new NotFoundException('Este ítem no tiene evidencia cargada');
    }

    try {
      return await this.storage.read(storageKey);
    } catch (error) {
      if (error instanceof EvidenceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
