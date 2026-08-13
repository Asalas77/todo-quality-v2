import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { types } from 'pg';
import { AppModule } from './app.module';

// node-postgres, por defecto, parsea columnas DATE (OID 1082) como medianoche en la
// zona horaria LOCAL del proceso y las serializa después como ISO con offset UTC — un
// "2026-01-01" guardado puede volver como "2026-01-01T03:00:00.000Z" (o el día
// siguiente/anterior según el huso horario del servidor). Como estas columnas son
// fechas de calendario puras (sin hora), se devuelven como el string plano que envía
// Postgres, sin pasar por ninguna conversión de zona horaria. Debe ejecutarse antes de
// que TypeORM abra la conexión, así que va antes de NestFactory.create.
types.setTypeParser(1082, (value: string) => value);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // La cookie de refresh viaja con credentials: 'include'. Con eso activo, un origen
  // reflejado sin lista (`origin: true`) deja que cualquier sitio dispare requests
  // autenticados por cookie contra la API — de ahí el default explícito.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
