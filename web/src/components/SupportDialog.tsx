import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import { AxiosError } from 'axios';
import { comentariosApi } from '../api/comentarios';

const SUPPORT_PHONE_DISPLAY = '+56 9 7950 0383';
const SUPPORT_PHONE_E164 = '56979500383';
const SUPPORT_EMAIL = 'kontrolcalidadasalas@gmail.com';

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SupportDialog({ open, onClose }: SupportDialogProps) {
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setMensaje('');
    setSent(false);
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (!mensaje.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await comentariosApi.create(mensaje.trim());
      setMensaje('');
      setSent(true);
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      setError(
        status
          ? 'No se pudo enviar el comentario. Intenta de nuevo.'
          : 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Soporte y comentarios
        <IconButton onClick={handleClose} size="small" aria-label="Cerrar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            ¿Algo no funciona, tienes una duda o una idea para mejorar Kontrol? Déjanos un
            comentario o escríbenos por el canal que prefieras.
          </Typography>

          {sent ? (
            <Alert severity="success" onClose={() => setSent(false)}>
              ¡Gracias! Tu comentario fue enviado.
            </Alert>
          ) : (
            <Stack spacing={1}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Tu comentario"
                multiline
                minRows={3}
                maxRows={6}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
              <Button
                variant="contained"
                startIcon={<SendIcon fontSize="small" />}
                disabled={!mensaje.trim() || isSubmitting}
                onClick={handleSend}
                sx={{ alignSelf: 'flex-end' }}
              >
                {isSubmitting ? 'Enviando…' : 'Enviar'}
              </Button>
            </Stack>
          )}

          <Divider />

          <List disablePadding>
            <ListItemButton
              component="a"
              href={`https://wa.me/${SUPPORT_PHONE_E164}`}
              target="_blank"
              rel="noopener"
              sx={{ borderRadius: 2, mb: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <WhatsAppIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="WhatsApp" secondary={SUPPORT_PHONE_DISPLAY} />
            </ListItemButton>

            <ListItemButton
              component="a"
              href={`tel:+${SUPPORT_PHONE_E164}`}
              sx={{ borderRadius: 2, mb: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CallIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Teléfono" secondary={SUPPORT_PHONE_DISPLAY} />
            </ListItemButton>

            <ListItemButton
              component="a"
              href={`mailto:${SUPPORT_EMAIL}`}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Correo" secondary={SUPPORT_EMAIL} />
            </ListItemButton>
          </List>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
