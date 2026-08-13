-- protect_system_roles() usaba el SQLSTATE genérico P0001 para sus dos casos (borrar y
-- renombrar un rol de sistema), indistinguibles desde la aplicación sin parsear el
-- texto del mensaje. Se les da un ERRCODE propio, igual que TQ001/TQ002 en 005.

CREATE OR REPLACE FUNCTION protect_system_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM tenant WHERE id = OLD.tenant_id) THEN
      RAISE EXCEPTION 'No se puede eliminar un rol de sistema' USING ERRCODE = 'TQ003';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.nombre <> OLD.nombre OR NEW.es_sistema <> OLD.es_sistema THEN
    RAISE EXCEPTION 'No se puede renombrar un rol de sistema' USING ERRCODE = 'TQ004';
  END IF;

  RETURN NEW;
END;
$$;
