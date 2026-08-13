import { Module } from '@nestjs/common';
import { CentrosController } from './infrastructure/centros.controller';
import { ListCentrosUseCase } from './application/list-centros.use-case';
import { CreateCentroUseCase } from './application/create-centro.use-case';
import { UpdateCentroUseCase } from './application/update-centro.use-case';
import { SetCentroActivoUseCase } from './application/set-centro-activo.use-case';
import { CENTRO_REPOSITORY } from './domain/ports/centro-repository.port';
import { PostgresCentroRepository } from './infrastructure/postgres-centro.repository';

@Module({
  controllers: [CentrosController],
  providers: [
    ListCentrosUseCase,
    CreateCentroUseCase,
    UpdateCentroUseCase,
    SetCentroActivoUseCase,
    { provide: CENTRO_REPOSITORY, useClass: PostgresCentroRepository },
  ],
})
export class CentrosModule {}
