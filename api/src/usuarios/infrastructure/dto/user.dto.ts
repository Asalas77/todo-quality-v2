import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto {
  @IsString()
  @Length(2, 100, { message: 'El nombre es obligatorio' })
  @Transform(trim)
  nombre!: string;

  @IsString()
  @Length(2, 100, { message: 'El apellido es obligatorio' })
  @Transform(trim)
  apellido!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Transform(trim)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  @Transform(trim)
  rut?: string;

  @IsUUID()
  roleId!: string;
}

export class UpdateUserDto {
  @IsString()
  @Length(2, 100, { message: 'El nombre es obligatorio' })
  @Transform(trim)
  nombre!: string;

  @IsString()
  @Length(2, 100, { message: 'El apellido es obligatorio' })
  @Transform(trim)
  apellido!: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  @Transform(trim)
  rut?: string;

  @IsUUID()
  roleId!: string;
}

export class SetUserActivoDto {
  @IsBoolean()
  activo!: boolean;
}
