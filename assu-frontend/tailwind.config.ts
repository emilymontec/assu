import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        // Rieles/superficies oscuras de marca (sidebar) — un negro con
        // fondo verdoso, no un gris/slate genérico, para que la "zona
        // oscura" del panel se sienta parte de la misma identidad que
        // las tarjetas de presentación y el ícono de la app en el brand
        // board, en vez de un tema oscuro por defecto de cualquier SaaS.
        ink: {
          DEFAULT: '#0E1613',
          light: '#16211D',
          border: '#233029',
        },
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        script: ['var(--font-script)', 'cursive'],
        // Folty Bold — reservada para momentos puntuales de marca
        // (títulos de página), nunca para texto de cuerpo o tablas.
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
