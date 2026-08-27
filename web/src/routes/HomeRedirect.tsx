import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Destino al entrar a la app: Reportes si el usuario tiene permiso para verlos
 * (Administrador/Supervisor), Inicio en caso contrario (p. ej. Inspector, que no tiene
 * 'reportes.ver' y recibiría un 403 del backend si lo mandáramos ahí igual).
 */
export function HomeRedirect() {
  const { hasPermission } = useAuth();
  return <Navigate to={hasPermission('reportes.ver') ? '/reportes' : '/inicio'} replace />;
}
