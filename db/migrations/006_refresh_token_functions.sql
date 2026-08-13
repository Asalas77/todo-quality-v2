-- Canjear un refresh token ocurre antes de saber a qué tenant pertenece, igual que el
-- login. Estas funciones son el único acceso a refresh_token sin tenant en contexto.

ALTER TABLE refresh_token OWNER TO todo_quality_owner;

CREATE FUNCTION refresh_token_lookup(p_token_hash text)
RETURNS TABLE (id uuid, user_id uuid, tenant_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT rt.id, rt.user_id, rt.tenant_id
  FROM refresh_token rt
  JOIN app_user u ON u.id = rt.user_id
  JOIN tenant t   ON t.id = rt.tenant_id
  WHERE rt.token_hash = p_token_hash
    AND rt.revoked_at IS NULL
    AND rt.expires_at > now()
    AND u.activo
    AND t.activo;
$$;

CREATE FUNCTION refresh_token_revoke(p_token_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE refresh_token SET revoked_at = now()
  WHERE token_hash = p_token_hash AND revoked_at IS NULL;
$$;

ALTER FUNCTION refresh_token_lookup(text) OWNER TO todo_quality_owner;
ALTER FUNCTION refresh_token_revoke(text) OWNER TO todo_quality_owner;

REVOKE EXECUTE ON FUNCTION refresh_token_lookup(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_token_revoke(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION refresh_token_lookup(text) TO todo_quality_app;
GRANT EXECUTE ON FUNCTION refresh_token_revoke(text) TO todo_quality_app;
