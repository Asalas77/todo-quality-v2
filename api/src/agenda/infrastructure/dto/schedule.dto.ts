import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateScheduleDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  centroId!: string;

  @IsDateString({}, { message: 'La fecha es obligatoria' })
  fecha!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(trim)
  asunto?: string;
}
