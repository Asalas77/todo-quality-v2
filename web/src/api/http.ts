import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/**
 * El access token vive solo en memoria (nunca en localStorage/sessionStorage): así un
 * XSS en la app no puede leerlo de un storage persistente, solo del proceso en curso.
 * Se pierde al recargar la página a propósito — por eso AuthProvider hace un refresh
 * silencioso al montar (ver context/AuthContext.tsx).
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export const http = axios.create({
  baseURL,
  // El refresh token viaja en una cookie httpOnly; sin esto el navegador no la envía.
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Único punto que llama a POST /auth/refresh, compartido por el interceptor de 401 y
 * por el refresh silencioso al montar la app.
 *
 * El backend rota el refresh token en cada canje: el token usado se revoca de inmediato.
 * Sin este singleton, dos llamadas concurrentes (por ejemplo el doble montaje de efectos
 * de React StrictMode en desarrollo, o dos componentes reaccionando al mismo 401) parten
 * del mismo token, y la segunda en llegar se encuentra el token que la primera ya rotó
 * y revocó — recibe 401 y cierra la sesión de un usuario que en realidad sí la tenía.
 */
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = http
      .post<{ accessToken: string; expiresIn: number }>('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

export function setUnauthorizedHandler(handler: () => void): void {
  onRefreshFailed = handler;
}
let onRefreshFailed: (() => void) | null = null;

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthEndpoint = config?.url?.includes('/auth/');

    if (error.response?.status !== 401 || !config || config._retried || isAuthEndpoint) {
      throw error;
    }

    config._retried = true;

    try {
      const token = await refreshAccessToken();
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return http.request(config);
    } catch (refreshError) {
      setAccessToken(null);
      onRefreshFailed?.();
      throw refreshError;
    }
  },
);
