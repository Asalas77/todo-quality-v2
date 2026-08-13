import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { SaveAnswersDto, StartInspectionDto } from './dto/inspection.dto';
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
  ) {}

  @RequirePermissions('inspecciones.ver')
  @Get()
  list(
    @Query('estado') estado?: InspectionStatus,
    @Query('centroId') centroId?: string,
  ) {
    return this.listInspections.execute({ estado, centroId });
  }

  @RequirePermissions('inspecciones.ver')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getInspection.execute(id);
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
    });
  }

  @RequirePermissions('inspecciones.completar')
  @Post(':id/respuestas/:itemId/evidencia')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EVIDENCE_SIZE_BYTES } }))
  async uploadItemEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
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
    });
    return { ok: true };
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
    @Res() res: Response,
  ): Promise<void> {
    const evidence = await this.getEvidence.execute(id, itemId);
    res.type(evidence.mimeType);
    res.sendFile(evidence.path);
  }
}
