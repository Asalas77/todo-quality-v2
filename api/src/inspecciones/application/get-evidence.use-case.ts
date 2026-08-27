import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

export interface GetEvidenceQuery {
  inspectionId: string;
  templateItemId: string;
  requestedBy: string;
  canViewAll: boolean;
}

@Injectable()
export class GetEvidenceUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
    @Inject(EVIDENCE_STORAGE) private readonly storage: EvidenceStoragePort,
  ) {}

  async execute(query: GetEvidenceQuery): Promise<StoredEvidence> {
    const inspection = await this.inspections.findById(query.inspectionId);
    if (!inspection) throw new NotFoundException('La inspección no existe');
    if (!query.canViewAll && inspection.inspectorId !== query.requestedBy) {
      throw new ForbiddenException('No tienes permiso para ver esta inspección');
    }

    let storageKey: string | null;
    try {
      storageKey = await this.inspections.getEvidenciaStorageKey(
        query.inspectionId,
        query.templateItemId,
      );
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
