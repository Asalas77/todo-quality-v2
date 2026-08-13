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
import { ListCentrosUseCase } from '../application/list-centros.use-case';
import { CreateCentroUseCase } from '../application/create-centro.use-case';
import { UpdateCentroUseCase } from '../application/update-centro.use-case';
import { SetCentroActivoUseCase } from '../application/set-centro-activo.use-case';
import { CreateCentroDto, SetCentroActivoDto, UpdateCentroDto } from './dto/centro.dto';
import { RequirePermissions } from '../../auth/infrastructure/decorators/require-permissions.decorator';

@Controller('centros')
export class CentrosController {
  constructor(
    private readonly listCentros: ListCentrosUseCase,
    private readonly createCentro: CreateCentroUseCase,
    private readonly updateCentro: UpdateCentroUseCase,
    private readonly setCentroActivo: SetCentroActivoUseCase,
  ) {}

  @RequirePermissions('centros.ver')
  @Get()
  list(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.listCentros.execute({ includeInactive: incluirInactivos === 'true' });
  }

  @RequirePermissions('centros.gestionar')
  @Post()
  create(@Body() dto: CreateCentroDto) {
    return this.createCentro.execute(dto);
  }

  @RequirePermissions('centros.gestionar')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCentroDto) {
    return this.updateCentro.execute({ id, ...dto });
  }

  @RequirePermissions('centros.gestionar')
  @Patch(':id/activo')
  setActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCentroActivoDto,
  ) {
    return this.setCentroActivo.execute({ id, activo: dto.activo });
  }
}
