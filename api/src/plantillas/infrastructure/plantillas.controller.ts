import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ListChecklistTemplatesUseCase } from '../application/list-checklist-templates.use-case';
import { GetChecklistTemplateUseCase } from '../application/get-checklist-template.use-case';
import { CreateChecklistTemplateUseCase } from '../application/create-checklist-template.use-case';
import { UpdateChecklistTemplateUseCase } from '../application/update-checklist-template.use-case';
import { SetChecklistTemplateActivoUseCase } from '../application/set-checklist-template-activo.use-case';
import {
  CreateChecklistTemplateDto,
  SetChecklistTemplateActivoDto,
  UpdateChecklistTemplateDto,
} from './dto/checklist-template.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';

@Controller('plantillas')
export class PlantillasController {
  constructor(
    private readonly listTemplates: ListChecklistTemplatesUseCase,
    private readonly getTemplate: GetChecklistTemplateUseCase,
    private readonly createTemplate: CreateChecklistTemplateUseCase,
    private readonly updateTemplate: UpdateChecklistTemplateUseCase,
    private readonly setTemplateActivo: SetChecklistTemplateActivoUseCase,
  ) {}

  @RequirePermissions('plantillas.ver')
  @Get()
  list(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.listTemplates.execute({ includeInactive: incluirInactivos === 'true' });
  }

  @RequirePermissions('plantillas.ver')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.getTemplate.execute(id);
  }

  @RequirePermissions('plantillas.gestionar')
  @Post()
  create(@Body() dto: CreateChecklistTemplateDto) {
    return this.createTemplate.execute(dto);
  }

  @RequirePermissions('plantillas.gestionar')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistTemplateDto,
  ) {
    return this.updateTemplate.execute({ id, ...dto });
  }

  @RequirePermissions('plantillas.gestionar')
  @Patch(':id/activo')
  setActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetChecklistTemplateActivoDto,
  ) {
    return this.setTemplateActivo.execute({ id, activo: dto.activo });
  }
}
