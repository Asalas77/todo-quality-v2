import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export enum ChecklistFrequencyDto {
  DIARIO = 'DIARIO',
  SEMANAL = 'SEMANAL',
  BIMESTRAL = 'BIMESTRAL',
  TRIMESTRAL = 'TRIMESTRAL',
}

export enum ItemCriticalityDto {
  BASICO = 'BASICO',
  CRITICO = 'CRITICO',
}

export class TemplateItemDto {
  @IsString()
  @Length(1, 500, { message: 'La pregunta es obligatoria' })
  @Transform(trim)
  descripcion!: string;

  @IsEnum(ItemCriticalityDto, { message: 'Criterio inválido' })
  criticidad!: ItemCriticalityDto;
}

export class CreateChecklistTemplateDto {
  @IsString()
  @Length(1, 50, { message: 'El identificador es obligatorio' })
  @Transform(trim)
  identificador!: string;

  @IsString()
  @Length(2, 150, { message: 'El nombre es obligatorio' })
  @Transform(trim)
  nombre!: string;

  @IsEnum(ChecklistFrequencyDto, { message: 'Frecuencia inválida' })
  frecuencia!: ChecklistFrequencyDto;

  @IsDateString({}, { message: 'La fecha de vigencia es obligatoria' })
  vigencia!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos un ítem a la plantilla' })
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items!: TemplateItemDto[];
}

export class UpdateChecklistTemplateDto extends CreateChecklistTemplateDto {}

export class SetChecklistTemplateActivoDto {
  @IsBoolean()
  activo!: boolean;
}
