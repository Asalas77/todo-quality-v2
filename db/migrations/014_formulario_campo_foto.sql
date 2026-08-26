-- Campo de tipo Foto para formularios: distinto de Archivo porque en el celular dispara
-- directamente la cámara (capture="environment" en el input, del lado del frontend) en
-- vez de abrir el selector de archivos genérico. Comparte almacenamiento con Archivo
-- (mismo FormFileStorage, mismo formulario_respuesta_valor.archivo_url) — la diferencia
-- es de intención en la UI, no de esquema.
ALTER TYPE form_field_type ADD VALUE 'FOTO';
