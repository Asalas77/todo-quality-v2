import { IsBooleanString, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DateRangeQueryDto {
  @IsDateString({}, { message: 'La fecha "desde" no es válida' })
  desde!: string;

  @IsDateString({}, { message: 'La fecha "hasta" no es válida' })
  hasta!: string;

  @IsOptional()
  @IsUUID()
  centroId?: string;
}

export class CentroQueryDto {
  @IsOptional()
  @IsUUID()
  centroId?: string;

  @IsOptional()
  @IsBooleanString()
  incluirResueltos?: string;
}
