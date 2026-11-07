export const theme = {
  colors: {
    brand: {
      primary: '#15803d',
      primaryHover: '#166534',
      sidebarBg: '#14532d',
      sidebarActive: '#15803d',
      lightBg: '#dcfce7',
      lightText: '#15803d',
    },
    surface: {
      background: '#f3f4f6',
      card: '#ffffff',
      cardBorder: '#e5e7eb',
      headerBg: '#f3f4f6',
      tableHeader: '#f9fafb',
    },
    text: {
      main: '#111827',
      secondary: '#6b7280',
      muted: '#9ca3af',
      onSidebar: '#ffffff',
      onSidebarMuted: '#bbf7d0',
    },
    status: {
      success: {
        bg: '#dcfce7',
        text: '#15803d',
        border: '#bbf7d0',
      },
      warning: {
        bg: '#fef3c7',
        text: '#b45309',
        border: '#fde68a',
      },
      danger: {
        bg: '#fee2e2',
        text: '#b91c1c',
        border: '#fecaca',
      },
      info: {
        bg: '#dbeafe',
        text: '#1d4ed8',
        border: '#bfdbfe',
      },
      purple: {
        bg: '#f3e8ff',
        text: '#7e22ce',
        border: '#e9d5ff',
      },
    },
  },
  typography: {
    fontFamily: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
  },
  radii: {
    input: '0.5rem',
    button: '0.5rem',
    card: '0.75rem',
    pill: '9999px',
  },
} as const;
