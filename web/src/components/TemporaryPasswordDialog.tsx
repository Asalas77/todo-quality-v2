import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import type { CreatedUser } from '../api/usuarios';

interface TemporaryPasswordDialogProps {
  user: CreatedUser | null;
  onClose: () => void;
  title?: string;
}

export function TemporaryPasswordDialog({
  user,
  onClose,
  title = 'Usuario creado',
}: TemporaryPasswordDialogProps) {
  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            La contraseña de <strong>{user?.nombre} {user?.apellido}</strong> es:
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2 }}
          >
            {user?.temporaryPassword}
          </Typography>
          <Alert severity="warning">
            Esta contraseña no se volverá a mostrar. Compártela con el usuario ahora.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
