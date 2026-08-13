-- protect_system_roles bloqueaba también el borrado en cascada al eliminar una empresa,
-- dejando los tenants imposibles de dar de baja. El trigger solo debe frenar el borrado
-- directo de un rol de sistema, no el arrastre legítimo al desaparecer su tenant.

CREATE OR REPLACE FUNCTION protect_system_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Durante el CASCADE de DELETE FROM tenant, la fila del tenant ya no es visible:
    -- eso distingue el arrastre de un intento de borrar el rol por su cuenta.
    IF EXISTS (SELECT 1 FROM tenant WHERE id = OLD.tenant_id) THEN
      RAISE EXCEPTION 'No se puede eliminar un rol de sistema';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.nombre <> OLD.nombre OR NEW.es_sistema <> OLD.es_sistema THEN
    RAISE EXCEPTION 'No se puede renombrar un rol de sistema';
  END IF;

  RETURN NEW;
END;
$$;
