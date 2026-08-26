import { Box, Stack, Typography } from '@mui/material';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

/** Marca de la app: cuadrado redondeado en el azul de marca con un check en el acento naranja. */
export function Logo({ size = 36, showText = true, textColor = 'inherit' }: LogoProps) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        component="svg"
        viewBox="0 0 40 40"
        sx={{ width: size, height: size, flexShrink: 0 }}
      >
        <rect width="40" height="40" rx="11" fill="#004E89" />
        <path
          d="M12 20.5L17.2 25.8L28.5 13.8"
          stroke="#F97316"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Box>
      {showText && (
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: size * 0.5,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: textColor,
            whiteSpace: 'nowrap',
          }}
        >
          Kontrol<Box component="span" sx={{ color: '#F97316' }}>.</Box>
        </Typography>
      )}
    </Stack>
  );
}
