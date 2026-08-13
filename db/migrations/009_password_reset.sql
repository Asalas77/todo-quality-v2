-- Recuperación de contraseña (self-service). Mismo patrón que refresh_token: solo se
-- guarda el hash del token, nunca el valor en texto plano, y es de un solo uso.

CREATE TABLE password_reset_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_token_user_idx ON password_reset_token (user_id) WHERE used_at IS NULL;

ALTER TABLE password_reset_token ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON password_reset_token
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE password_reset_token OWNER TO todo_quality_owner;

-- Solicitar recuperación ocurre antes de saber a qué tenant pertenece el email, igual
-- que el login — de ahí SECURITY DEFINER. Silenciosamente no hace nada si el email no
-- existe o el usuario/tenant está inactivo: el llamador nunca distingue ese caso de un
-- envío exitoso, para no filtrar qué correos están registrados.
CREATE FUNCTION request_password_reset(
  p_email citext,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS TABLE (user_id uuid, tenant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
  found_tenant_id uuid;
BEGIN
  SELECT u.id, u.tenant_id INTO found_user_id, found_tenant_id
  FROM app_user u
  JOIN tenant t ON t.id = u.tenant_id
  WHERE u.email = p_email AND u.activo AND t.activo;

  IF found_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO password_reset_token (tenant_id, user_id, token_hash, expires_at)
  VALUES (found_tenant_id, found_user_id, p_token_hash, p_expires_at);

  RETURN QUERY SELECT found_user_id, found_tenant_id;
END;
$$;

-- Canjear el token: valida que exista, no haya expirado ni se haya usado, actualiza la
-- contraseña y revoca todas las sesiones activas del usuario (refresh tokens) — un
-- cambio de contraseña por recuperación debe cerrar cualquier sesión que alguien más
-- pudiera tener abierta con la contraseña anterior.
CREATE FUNCTION consume_password_reset(
  p_token_hash text,
  p_new_password_hash text
)
RETURNS TABLE (user_id uuid, tenant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
  found_tenant_id uuid;
BEGIN
  SELECT prt.user_id, prt.tenant_id INTO found_user_id, found_tenant_id
  FROM password_reset_token prt
  WHERE prt.token_hash = p_token_hash
    AND prt.used_at IS NULL
    AND prt.expires_at > now();

  IF found_user_id IS NULL THEN
    RAISE EXCEPTION 'Token de recuperación inválido o expirado' USING ERRCODE = 'TQ005';
  END IF;

  UPDATE password_reset_token SET used_at = now() WHERE token_hash = p_token_hash;
  UPDATE app_user SET password_hash = p_new_password_hash, updated_at = now() WHERE id = found_user_id;
  UPDATE refresh_token SET revoked_at = now() WHERE refresh_token.user_id = found_user_id AND refresh_token.revoked_at IS NULL;

  RETURN QUERY SELECT found_user_id, found_tenant_id;
END;
$$;

ALTER FUNCTION request_password_reset(citext, text, timestamptz) OWNER TO todo_quality_owner;
ALTER FUNCTION consume_password_reset(text, text) OWNER TO todo_quality_owner;

REVOKE EXECUTE ON FUNCTION request_password_reset(citext, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION consume_password_reset(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION request_password_reset(citext, text, timestamptz) TO todo_quality_app;
GRANT EXECUTE ON FUNCTION consume_password_reset(text, text) TO todo_quality_app;
