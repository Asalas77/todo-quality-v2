import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'default' | 'success' | 'error' | 'warning';
  hint?: string;
}

const COLOR_MAP = {
  default: 'text.primary',
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
} as const;

export function StatTile({ label, value, icon, color = 'default', hint }: StatTileProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {icon}
        </Stack>
        <Typography variant="h4" sx={{ color: COLOR_MAP[color], fontWeight: 600, mt: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
