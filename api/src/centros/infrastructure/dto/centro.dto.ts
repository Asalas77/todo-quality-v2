import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCentroDto {
  @IsString()
  @Length(2, 150, { message: 'El nombre es obligatorio' })
  @Transform(trim)
  nombre!: string;

  @IsString()
  @Length(2, 255, { message: 'La dirección es obligatoria' })
  @Transform(trim)
  direccion!: string;
}

export class UpdateCentroDto extends CreateCentroDto {}

export class SetCentroActivoDto {
  @IsBoolean()
  activo!: boolean;
}
