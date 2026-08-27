import { Inject, Injectable } from '@nestjs/common';
import {
  INSPECTION_REPOSITORY,
  InspectionAnswer,
  InspectionRepositoryPort,
} from '../domain/ports/inspection-repository.port';

export interface ResolveFindingCommand {
  inspectionId: string;
  templateItemId: string;
  resuelto: boolean;
  resueltoPor: string;
}

/**
 * Gateado en el controller con inspecciones.ver_todas: resolver un hallazgo es una
 * acción de supervisor, no del inspector que completó el ítem — mismo permiso que ya
 * distingue Supervisor/Administrador de Inspector en el resto del módulo.
 */
@Injectable()
export class ResolveFindingUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepositoryPort,
  ) {}

  execute(command: ResolveFindingCommand): Promise<InspectionAnswer> {
    return this.inspections.setResuelto(
      command.inspectionId,
      command.templateItemId,
      command.resuelto,
      command.resueltoPor,
    );
  }
}
