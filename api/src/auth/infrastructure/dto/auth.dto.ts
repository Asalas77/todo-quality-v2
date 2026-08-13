import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(255)
  @Transform(trim)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(200)
  password!: string;
}

export class RegisterTenantDto {
  @IsString()
  @Length(2, 150, { message: 'El nombre de la empresa es obligatorio' })
  @Transform(trim)
  empresaNombre!: string;

  @IsString()
  @Length(8, 20)
  @Transform(trim)
  empresaRut!: string;

  @IsString()
  @Length(2, 100)
  @Transform(trim)
  adminNombre!: string;

  @IsString()
  @Length(2, 100)
  @Transform(trim)
  adminApellido!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(255)
  @Transform(trim)
  adminEmail!: string;

  @IsString()
  @MinLength(10, {
    message: 'La contraseña debe tener al menos 10 caracteres',
  })
  @MaxLength(200)
  password!: string;
}

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(255)
  @Transform(trim)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(200)
  newPassword!: string;
}

export class ChangeOwnPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu contraseña actual' })
  @MaxLength(200)
  currentPassword!: string;

  @IsString()
  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(200)
  newPassword!: string;
}
