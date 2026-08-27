import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateScheduleDto {
  /**
   * Se agenda una plantilla de checklist o un formulario. Los ValidateIf exigen que venga
   * exactamente uno: cada campo es obligatorio solo cuando el otro está ausente, así que
   * mandar ninguno falla ambos y mandar los dos falla el chequeo de exclusividad.
   */
  @ValidateIf((dto: CreateScheduleDto) => !dto.formId)
  @IsUUID('4', { message: 'Selecciona una plantilla o un formulario' })
  templateId?: string;

  @ValidateIf((dto: CreateScheduleDto) => !dto.templateId)
  @IsUUID('4', { message: 'Selecciona una plantilla o un formulario' })
  formId?: string;

  @IsUUID()
  centroId!: string;

  /** Si se omite, se asigna a quien programa (comportamiento previo). */
  @IsOptional()
  @IsUUID()
  asignadoA?: string;

  @IsDateString({}, { message: 'La fecha es obligatoria' })
  fecha!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(trim)
  asunto?: string;
}
