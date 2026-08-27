import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';

const SUPPORT_PHONE_DISPLAY = '+56 9 7950 0383';
const SUPPORT_PHONE_E164 = '56979500383';
const SUPPORT_EMAIL = 'kontrolcalidadasalas@gmail.com';

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SupportDialog({ open, onClose }: SupportDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Soporte y comentarios
        <IconButton onClick={onClose} size="small" aria-label="Cerrar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            ¿Algo no funciona, tienes una duda o una idea para mejorar Kontrol? Escríbenos por
            el canal que prefieras.
          </Typography>

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
