import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export enum AnswerStatusDto {
  CUMPLE = 'CUMPLE',
  NO_CUMPLE = 'NO_CUMPLE',
  NO_APLICA = 'NO_APLICA',
}

export class StartInspectionDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  centroId!: string;

  @IsDateString({}, { message: 'La fecha es obligatoria' })
  fecha!: string;
}

// evidenciaUrl no está aquí a propósito: se sube vía POST /:id/respuestas/:itemId/evidencia
// (multipart), no como parte del guardado en bloque de la inspección.
export class AnswerDto {
  @IsUUID()
  templateItemId!: string;

  @IsEnum(AnswerStatusDto, { message: 'Respuesta inválida' })
  estado!: AnswerStatusDto;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(trim)
  observacion?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(trim)
  planAccion?: string;

  @IsOptional()
  @IsDateString()
  fechaCompromiso?: string;

  @IsOptional()
  @IsDateString()
  fechaControl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  @Transform(trim)
  responsable?: string;
}

export class SaveAnswersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Envía al menos una respuesta' })
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
