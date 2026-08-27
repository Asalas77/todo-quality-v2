import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CentrosModule } from './centros/centros.module';
import { PlantillasModule } from './plantillas/plantillas.module';
import { InspeccionesModule } from './inspecciones/inspecciones.module';
import { AgendaModule } from './agenda/agenda.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { ReportesModule } from './reportes/reportes.module';
import { FormulariosModule } from './formularios/formularios.module';
import { ComentariosModule } from './comentarios/comentarios.module';
import { SharedModule } from './shared/shared.module';
import { JwtAuthGuard } from './auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/infrastructure/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        // Las políticas RLS y las funciones SECURITY DEFINER no las conoce TypeORM:
        // synchronize las borraría sin avisar. El esquema lo llevan las migraciones SQL.
        synchronize: false,
        autoLoadEntities: true,
        // Proveedores gestionados (ej. Neon) exigen TLS y usan certificados que Node no
        // valida contra una CA local conocida; rejectUnauthorized: false replica lo que
        // hace cualquier cliente psql con sslmode=require.
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    SharedModule,
    AuthModule,
    CentrosModule,
    PlantillasModule,
    InspeccionesModule,
    AgendaModule,
    UsuariosModule,
    RolesModule,
    ReportesModule,
    FormulariosModule,
    ComentariosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
