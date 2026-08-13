import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marca una ruta como accesible sin autenticación (login, registro, refresh). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
