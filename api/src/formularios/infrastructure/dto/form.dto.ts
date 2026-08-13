import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export enum FormFieldTypeDto {
  TEXTO_CORTO = 'TEXTO_CORTO',
  TEXTO_LARGO = 'TEXTO_LARGO',
  FECHA = 'FECHA',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  DESPLEGABLE = 'DESPLEGABLE',
  ARCHIVO = 'ARCHIVO',
}

const OPTION_FIELD_TYPES = [
  FormFieldTypeDto.RADIO,
  FormFieldTypeDto.CHECKBOX,
  FormFieldTypeDto.DESPLEGABLE,
];

export class FormFieldDto {
  @IsEnum(FormFieldTypeDto, { message: 'Tipo de campo inválido' })
  tipo!: FormFieldTypeDto;

  @IsString()
  @Length(1, 300, { message: 'La etiqueta es obligatoria' })
  @Transform(trim)
  etiqueta!: string;

  @IsBoolean()
  requerido!: boolean;

  @ValidateIf((dto: FormFieldDto) => OPTION_FIELD_TYPES.includes(dto.tipo))
  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos una opción' })
  @IsString({ each: true })
  opciones?: string[];
}

export class CreateFormDto {
  @IsString()
  @Length(2, 150, { message: 'El nombre es obligatorio' })
  @Transform(trim)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  descripcion?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos un campo al formulario' })
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields!: FormFieldDto[];
}

export class UpdateFormDto extends CreateFormDto {}

export class SetFormActivoDto {
  @IsBoolean()
  activo!: boolean;
}

export class FormResponseValueDto {
  @IsString()
  campoId!: string;

  @IsOptional()
  @IsString()
  valorTexto?: string;

  @IsOptional()
  @IsString()
  valorFecha?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valorOpciones?: string[];

  @IsOptional()
  @IsString()
  archivoUrl?: string;
}

export class SubmitFormResponseDto {
  @IsOptional()
  @IsString()
  centroId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormResponseValueDto)
  valores!: FormResponseValueDto[];
}
