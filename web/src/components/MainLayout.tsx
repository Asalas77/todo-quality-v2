import { useState, type ReactNode } from 'react';
import {
  alpha,
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import StoreIcon from '@mui/icons-material/Store';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { Logo } from './Logo';
import { SupportDialog } from './SupportDialog';

const NAV_ITEMS = [
  { to: '/centros', label: 'Centros', icon: StoreIcon, permission: null },
  { to: '/plantillas', label: 'Plantillas', icon: AssignmentIcon, permission: null },
  { to: '/agenda', label: 'Agenda', icon: CalendarMonthIcon, permission: null },
  { to: '/reportes', label: 'Reportes', icon: BarChartIcon, permission: 'reportes.ver' },
  { to: '/usuarios', label: 'Usuarios', icon: PeopleIcon, permission: 'usuarios.ver' },
  { to: '/roles', label: 'Roles', icon: AdminPanelSettingsIcon, permission: 'roles.gestionar' },
] as const;

export function MainLayout({ children }: { children: ReactNode }) {
  const { logout, hasPermission, user } = useAuth();
  const { mode, toggle } = useThemeMode();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        className="no-print"
        sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 0.5, minHeight: 64 }}>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: 'inline-flex', lg: 'none' }, mr: 1 }}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </IconButton>

          <Box
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'inherit', mr: 3 }}
          >
            <Logo size={34} />
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flexGrow: 1, display: { xs: 'none', lg: 'flex' } }}
          >
            {items.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Box
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    transition: 'background-color 0.15s, color 0.15s',
                    '&:hover': {
                      bgcolor: active
                        ? alpha(theme.palette.primary.main, 0.14)
                        : alpha(theme.palette.text.primary, 0.05),
                    },
                  })}
                >
                  <Icon sx={{ fontSize: 19 }} />
                  {item.label}
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ flexGrow: { xs: 1, lg: 0 } }} />

          <Tooltip title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <IconButton onClick={toggle} size="small" sx={{ mr: 1 }} aria-label="Cambiar tema">
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {user?.tenantNombre && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 500, mr: 1.5, display: { xs: 'none', md: 'block' } }}
            >
              {user.tenantNombre}
            </Typography>
          )}

          <Tooltip title="Cuenta">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main' }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem
              component={RouterLink}
              to="/perfil"
              onClick={() => setAnchorEl(null)}
            >
              <PersonIcon fontSize="small" sx={{ mr: 1.25 }} />
              Perfil
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setSupportOpen(true);
              }}
            >
              <SupportAgentIcon fontSize="small" sx={{ mr: 1.25 }} />
              Soporte y comentarios
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => logout()}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} />
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', lg: 'none' } }}
      >
        <Box sx={{ width: 260, pt: 2 }} role="presentation">
          <Box sx={{ px: 2, pb: 2 }}>
            <Logo size={32} />
          </Box>
          <Divider />
          <List>
            {items.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <ListItemButton
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  selected={active}
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon color={active ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </List>
          <Divider />
          <List>
            <ListItemButton onClick={toggle}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </ListItemIcon>
              <ListItemText primary={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'} />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/perfil" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Perfil" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setSupportOpen(true);
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SupportAgentIcon />
              </ListItemIcon>
              <ListItemText primary="Soporte y comentarios" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesión" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ p: { xs: 2, sm: 3 } }}>
        {children}
      </Box>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </Box>
  );
}
