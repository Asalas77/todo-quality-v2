import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
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
import { ListFormsUseCase } from '../application/list-forms.use-case';
import { GetFormUseCase } from '../application/get-form.use-case';
import { CreateFormUseCase } from '../application/create-form.use-case';
import { UpdateFormUseCase } from '../application/update-form.use-case';
import { SetFormActivoUseCase } from '../application/set-form-activo.use-case';
import { SubmitFormResponseUseCase } from '../application/submit-form-response.use-case';
import { SaveFormDraftUseCase } from '../application/save-form-draft.use-case';
import { GetFormDraftUseCase } from '../application/get-form-draft.use-case';
import { ListFormResponsesUseCase } from '../application/list-form-responses.use-case';
import { ListAllFormResponsesUseCase } from '../application/list-all-form-responses.use-case';
import { GetFormResponseUseCase } from '../application/get-form-response.use-case';
import { FORM_RESPONSE_REPOSITORY, FormResponseRepositoryPort } from '../domain/ports/form-response-repository.port';
import { FormFileStorage } from './form-file-storage';
import {
  CreateFormDto,
  SaveFormDraftDto,
  SetFormActivoDto,
  SubmitFormResponseDto,
  UpdateFormDto,
} from './dto/form.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';
import { RequestWithUser } from '../../auth/infrastructure/tenant-context.middleware';
import { requireTenantId } from '../../shared/tenant/tenant-context';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

@Controller('formularios')
export class FormulariosController {
  constructor(
    private readonly listForms: ListFormsUseCase,
    private readonly getForm: GetFormUseCase,
    private readonly createForm: CreateFormUseCase,
    private readonly updateForm: UpdateFormUseCase,
    private readonly setFormActivo: SetFormActivoUseCase,
    private readonly submitResponse: SubmitFormResponseUseCase,
    private readonly saveFormDraft: SaveFormDraftUseCase,
    private readonly getFormDraft: GetFormDraftUseCase,
    private readonly listResponses: ListFormResponsesUseCase,
    private readonly listAllFormResponses: ListAllFormResponsesUseCase,
    private readonly getResponse: GetFormResponseUseCase,
    private readonly fileStorage: FormFileStorage,
    @Inject(FORM_RESPONSE_REPOSITORY) private readonly responses: FormResponseRepositoryPort,
  ) {}

  @RequirePermissions('formularios.ver')
  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.listForms.execute(includeInactive === 'true');
  }

  /**
   * Todas las respuestas enviadas del tenant, de cualquier formulario — usado por Agenda.
   * Debe ir antes de ':id' para que 'respuestas' no se intente parsear como uuid.
   */
  @RequirePermissions('formularios.ver')
  @Get('respuestas')
  listAllResponses(@Query('centroId') centroId: string | undefined, @Req() req: RequestWithUser) {
    return this.listAllFormResponses.execute({
      centroId,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('formularios.ver_todas'),
    });
  }

  @RequirePermissions('formularios.ver')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getForm.execute(id);
  }

  @RequirePermissions('formularios.gestionar')
  @Post()
  create(@Body() dto: CreateFormDto, @Req() req: RequestWithUser) {
    return this.createForm.execute({ ...dto, createdBy: req.user!.userId });
  }

  @RequirePermissions('formularios.gestionar')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFormDto) {
    return this.updateForm.execute(id, dto);
  }

  @RequirePermissions('formularios.gestionar')
  @Put(':id/activo')
  setActivo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetFormActivoDto) {
    return this.setFormActivo.execute(id, dto.activo);
  }

  @RequirePermissions('formularios.completar')
  @Post(':id/respuestas')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitFormResponseDto,
    @Req() req: RequestWithUser,
  ) {
    return this.submitResponse.execute({
      formId: id,
      centroId: dto.centroId,
      creadoPor: req.user!.userId,
      valores: dto.valores,
      scheduleId: dto.scheduleId,
    });
  }

  @RequirePermissions('formularios.completar')
  @Post(':id/borrador')
  saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveFormDraftDto,
    @Req() req: RequestWithUser,
  ) {
    return this.saveFormDraft.execute({
      formId: id,
      centroId: dto.centroId,
      creadoPor: req.user!.userId,
      valores: dto.valores,
    });
  }

  /** Devuelve el borrador vigente del usuario autenticado para este formulario, o null. */
  @RequirePermissions('formularios.completar')
  @Get(':id/borrador')
  getDraft(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.getFormDraft.execute(id, req.user!.userId);
  }

  @RequirePermissions('formularios.ver')
  @Get(':id/respuestas')
  listFormResponses(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.listResponses.execute({
      formId: id,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('formularios.ver_todas'),
    });
  }

  @RequirePermissions('formularios.ver')
  @Get('respuestas/:responseId')
  getFormResponse(
    @Param('responseId', ParseUUIDPipe) responseId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.getResponse.execute({
      id: responseId,
      requestedBy: req.user!.userId,
      canViewAll: req.user!.can('formularios.ver_todas'),
    });
  }

  @RequirePermissions('formularios.completar')
  @Post('archivos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadArchivo(@UploadedFile() file?: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw new NotFoundException('Falta el archivo');
    const url = await this.fileStorage.save(requireTenantId(), file.buffer, file.mimetype);
    return { url };
  }

  /**
   * Sirve el archivo solo si la respuesta pertenece al tenant del usuario autenticado
   * (findById consulta bajo RLS) — nunca por una ruta estática pública.
   */
  @RequirePermissions('formularios.ver')
  @Get('respuestas/:responseId/archivos/:campoId')
  async downloadArchivo(
    @Param('responseId', ParseUUIDPipe) responseId: string,
    @Param('campoId', ParseUUIDPipe) campoId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const response = await this.responses.findById(responseId);
    if (!response) throw new NotFoundException('La respuesta no existe');
    if (!req.user!.can('formularios.ver_todas') && response.creadoPor !== req.user!.userId) {
      throw new ForbiddenException('No tienes permiso para ver esta respuesta');
    }
    const valor = response.valores.find((v) => v.campoId === campoId);
    if (!valor?.archivoUrl) throw new NotFoundException('Este campo no tiene archivo cargado');

    const file = await this.fileStorage.resolve(valor.archivoUrl);
    res.type(file.mimeType);
    res.sendFile(file.path);
  }
}
