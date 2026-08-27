import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ListInspectionsUseCase } from '../application/list-inspections.use-case';
import { GetInspectionUseCase } from '../application/get-inspection.use-case';
import { StartInspectionUseCase } from '../application/start-inspection.use-case';
import { SaveInspectionAnswersUseCase } from '../application/save-inspection-answers.use-case';
import { UploadEvidenceUseCase } from '../application/upload-evidence.use-case';
import { GetEvidenceUseCase } from '../application/get-evidence.use-case';
import { ResolveFindingUseCase } from '../application/resolve-finding.use-case';
import { ResolveFindingDto, SaveAnswersDto, StartInspectionDto } from './dto/inspection.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';
import { RequestWithUser } from '../../auth/infrastructure/tenant-context.middleware';
import { InspectionStatus } from '../domain/derive-inspection-status';

const MAX_EVIDENCE_SIZE_BYTES = 8 * 1024 * 1024;

@Controller('inspecciones')
export class InspeccionesController {
  constructor(
    private readonly listInspections: ListInspectionsUseCase,
    private readonly getInspection: GetInspectionUseCase,
    private readonly startInspection: StartInspectionUseCase,
    private readonly saveAnswers: SaveInspectionAnswersUseCase,
    private readonly uploadEvidence: UploadEvidenceUseCase,
    private readonly getEvidence: GetEvidenceUseCase,
    private readonly resolveFinding: ResolveFindingUseCase,
  ) {}

  @RequirePermissions('inspecciones.ver')
  @Get()
  list(
    @Req() req: RequestWithUser,
    @Query('estado') estado?: InspectionStatus,
    @Query('centroId') centroId?: string,
  ) {
    return this.listInspections.execute({
      estado,
      centroId,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('inspecciones.ver_todas'),
    });
  }

  @RequirePermissions('inspecciones.ver')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.getInspection.execute({
      id,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('inspecciones.ver_todas'),
    });
  }

  @RequirePermissions('inspecciones.completar')
  @Post()
  start(@Body() dto: StartInspectionDto, @Req() req: RequestWithUser) {
    return this.startInspection.execute({
      templateId: dto.templateId,
      centroId: dto.centroId,
      fecha: dto.fecha,
      inspectorId: req.user!.userId,
    });
  }

  @RequirePermissions('inspecciones.completar')
  @Put(':id/respuestas')
  saveInspectionAnswers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswersDto,
    @Req() req: RequestWithUser,
  ) {
    return this.saveAnswers.execute({
      inspectionId: id,
      answers: dto.answers.map((a) => ({
        templateItemId: a.templateItemId,
        estado: a.estado,
        observacion: a.observacion,
        planAccion: a.planAccion,
        fechaCompromiso: a.fechaCompromiso,
        fechaControl: a.fechaControl,
        responsable: a.responsable,
      })),
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('inspecciones.ver_todas'),
    });
  }

  @RequirePermissions('inspecciones.completar')
  @Post(':id/respuestas/:itemId/evidencia')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EVIDENCE_SIZE_BYTES } }))
  async uploadItemEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ ok: true }> {
    if (!file) {
      throw new BadRequestException('Falta el archivo de evidencia');
    }

    await this.uploadEvidence.execute({
      inspectionId: id,
      templateItemId: itemId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('inspecciones.ver_todas'),
    });
    return { ok: true };
  }

  /**
   * Resolver un hallazgo es una acción de supervisor: se gatea con inspecciones.ver_todas
   * (lo mismo que ya distingue Supervisor/Administrador de Inspector en el resto del
   * módulo), no con inspecciones.completar — el inspector que registró el hallazgo no
   * debería poder cerrarlo él mismo sin que un supervisor lo confirme.
   */
  @RequirePermissions('inspecciones.ver_todas')
  @Patch(':id/respuestas/:itemId/resolver')
  resolver(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ResolveFindingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.resolveFinding.execute({
      inspectionId: id,
      templateItemId: itemId,
      resuelto: dto.resuelto,
      resueltoPor: req.user!.userId,
    });
  }

  /**
   * Sirve la imagen solo si la inspección pertenece al tenant del usuario autenticado
   * (getEvidenciaStorageKey consulta bajo RLS) — nunca por una ruta pública de archivos
   * estáticos, que no distinguiría tenants.
   */
  @RequirePermissions('inspecciones.ver')
  @Get(':id/respuestas/:itemId/evidencia')
  async downloadItemEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const evidence = await this.getEvidence.execute({
      inspectionId: id,
      templateItemId: itemId,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('inspecciones.ver_todas'),
    });
    res.type(evidence.mimeType);
    res.sendFile(evidence.path);
  }
}
