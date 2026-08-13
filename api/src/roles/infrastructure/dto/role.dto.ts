import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RoleInputDto {
  @IsString()
  @Length(2, 100, { message: 'El nombre es obligatorio' })
  @Transform(trim)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(trim)
  descripcion?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes!: string[];
}
