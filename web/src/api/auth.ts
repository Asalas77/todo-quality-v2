import { http } from './http';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterTenantRequest {
  empresaNombre: string;
  empresaRut: string;
  adminNombre: string;
  adminApellido: string;
  adminEmail: string;
  password: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponse {
  userId: string;
  tenantId: string;
  tenantNombre: string | null;
  permissions: string[];
}

export interface RequestPasswordResetResponse {
  /** Solo presente en desarrollo, mientras no haya envío real de correo. */
  devResetUrl?: string;
}

export const authApi = {
  login: (body: LoginRequest) =>
    http.post<AccessTokenResponse>('/auth/login', body).then((r) => r.data),

  register: (body: RegisterTenantRequest) =>
    http
      .post<{ tenantId: string; userId: string }>('/auth/register', body)
      .then((r) => r.data),

  refresh: () => http.post<AccessTokenResponse>('/auth/refresh').then((r) => r.data),

  logout: () => http.post('/auth/logout').then(() => undefined),

  me: () => http.get<MeResponse>('/auth/me').then((r) => r.data),

  requestPasswordReset: (email: string) =>
    http
      .post<RequestPasswordResetResponse>('/auth/olvide-contrasena', { email })
      .then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    http.post('/auth/restablecer-contrasena', { token, newPassword }).then(() => undefined),

  changePassword: (currentPassword: string, newPassword: string) =>
    http
      .post('/auth/cambiar-contrasena', { currentPassword, newPassword })
      .then(() => undefined),
};
