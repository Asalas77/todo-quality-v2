import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerNotFoundError,
  INSPECTION_REPOSITORY,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';
import { EVIDENCE_STORAGE, EvidenceStoragePort } from '../domain/ports/evidence-storage.port';
import { requireTenantId } from '../../shared/tenant/tenant-context';

export interface UploadEvidenceCommand {
  inspectionId: string;
  templateItemId: string;
  buffer: Buffer;
  mimeType: string;
  requestedBy: string;
  canViewAll: boolean;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

@Injectable()
export class UploadEvidenceUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
    @Inject(EVIDENCE_STORAGE) private readonly storage: EvidenceStoragePort,
  ) {}

  async execute(command: UploadEvidenceCommand): Promise<void> {
    const extension = EXTENSION_BY_MIME[command.mimeType];
    if (!extension) {
      throw new BadRequestException(
        'Formato de imagen no admitido. Usa JPEG, PNG, WEBP o HEIC.',
      );
    }

    const inspection = await this.inspections.findById(command.inspectionId);
    if (!inspection) throw new NotFoundException('La inspección no existe');
    if (!command.canViewAll && inspection.inspectorId !== command.requestedBy) {
      throw new ForbiddenException('No puedes modificar una inspección que no te pertenece');
    }

    const tenantId = requireTenantId();
    const storageKey = await this.storage.save(tenantId, command.buffer, extension);

    let previousStorageKey: string | null;
    try {
      ({ previousStorageKey } = await this.inspections.setEvidencia(
        command.inspectionId,
        command.templateItemId,
        storageKey,
      ));
    } catch (error) {
      // El ítem no existe: no dejar el archivo recién subido huérfano en disco.
      await this.storage.delete(storageKey);
      if (error instanceof AnswerNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }

    if (previousStorageKey) {
      await this.storage.delete(previousStorageKey);
    }
  }
}
