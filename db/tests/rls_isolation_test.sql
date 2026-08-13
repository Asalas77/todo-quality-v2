-- Verifica que RLS aísla de verdad. Una política mal escrita compila y no rompe nada
-- visible, pero tampoco aísla: esta prueba es la que detecta ese caso.
-- Debe ejecutarse conectado como todo_quality_app (NOBYPASSRLS).

\set ON_ERROR_STOP on

DO $$
DECLARE
  tenant_a uuid;
  tenant_b uuid;
  visto    int;
  afectado int;
BEGIN
  SELECT tenant_id INTO tenant_a FROM auth_lookup('admin@empresa-a.test');
  SELECT tenant_id INTO tenant_b FROM auth_lookup('admin@empresa-b.test');

  IF tenant_a IS NULL OR tenant_b IS NULL THEN
    RAISE EXCEPTION 'Faltan los datos de prueba (seed)';
  END IF;

  -- Contexto: tenant A
  PERFORM set_config('app.current_tenant', tenant_a::text, true);

  SELECT count(*) INTO visto FROM centro;
  IF visto <> 1 THEN
    RAISE EXCEPTION 'Tenant A debería ver exactamente 1 centro propio, vio %', visto;
  END IF;

  -- Contexto: tenant B, no debe ver nada de A
  PERFORM set_config('app.current_tenant', tenant_b::text, true);

  SELECT count(*) INTO visto FROM centro WHERE tenant_id = tenant_a;
  IF visto <> 0 THEN
    RAISE EXCEPTION 'FUGA: tenant B vio % centros de tenant A', visto;
  END IF;

  SELECT count(*) INTO visto FROM inspection WHERE tenant_id = tenant_a;
  IF visto <> 0 THEN
    RAISE EXCEPTION 'FUGA: tenant B vio % inspecciones de tenant A', visto;
  END IF;

  -- Escritura cruzada: UPDATE y DELETE sobre filas de A no deben afectar nada
  UPDATE centro SET nombre = 'hackeado' WHERE tenant_id = tenant_a;
  GET DIAGNOSTICS afectado = ROW_COUNT;
  IF afectado <> 0 THEN
    RAISE EXCEPTION 'FUGA: tenant B modificó % centros de tenant A', afectado;
  END IF;

  DELETE FROM centro WHERE tenant_id = tenant_a;
  GET DIAGNOSTICS afectado = ROW_COUNT;
  IF afectado <> 0 THEN
    RAISE EXCEPTION 'FUGA: tenant B borró % centros de tenant A', afectado;
  END IF;

  -- WITH CHECK: no debe poder insertar filas atribuidas a otro tenant
  BEGIN
    INSERT INTO centro (tenant_id, nombre) VALUES (tenant_a, 'infiltrado');
    RAISE EXCEPTION 'FUGA: tenant B insertó un centro en tenant A';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Los roles y sus permisos también son datos de tenant
  SELECT count(*) INTO visto FROM role WHERE tenant_id = tenant_a;
  IF visto <> 0 THEN
    RAISE EXCEPTION 'FUGA: tenant B vio % roles de tenant A', visto;
  END IF;

  -- El catálogo de permisos sí es global y debe verse
  SELECT count(*) INTO visto FROM permission;
  IF visto = 0 THEN
    RAISE EXCEPTION 'El catálogo global de permisos debería ser legible';
  END IF;

  RAISE NOTICE 'OK: aislamiento entre tenants verificado';
END $$;

-- Transacción aparte: set_config con is_local=true no sobrevive al bloque anterior,
-- así que aquí app.current_tenant nunca fue fijado. Sin tenant no debe verse nada.
DO $$
DECLARE
  visto int;
BEGIN
  SELECT count(*) INTO visto FROM centro;
  IF visto <> 0 THEN
    RAISE EXCEPTION 'FUGA: sin tenant en contexto se vieron % centros', visto;
  END IF;

  RAISE NOTICE 'OK: sin tenant en contexto no se ve nada';
END $$;
