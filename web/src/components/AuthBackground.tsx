import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { Logo } from './Logo';

/** Fondo compartido por las páginas de autenticación (login, registro, recuperar contraseña). */
export function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 4,
        py: 6,
        px: 2,
        background: (theme) =>
          'radial-gradient(circle at 15% 15%, rgba(0, 78, 137, 0.10), transparent 45%), ' +
          'radial-gradient(circle at 85% 85%, rgba(249, 115, 22, 0.10), transparent 45%), ' +
          theme.palette.background.default,
      }}
    >
      <Logo size={40} />
      {children}
    </Box>
  );
}
