import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        // Hairline más tenue que --border, para divisores internos de
        // tarjetas/tablas (cabecera de tabla, pie de card) — tomado del
        // par border/border-light de la plantilla Editorial Bento.
        'border-light': 'hsl(var(--border-light))',
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
        // Superficie blanca + una variante "alt" apenas gris-verdosa para
        // cabeceras de tabla / fondos de tile secundarios — equivalente a
        // --color-surface / --color-surface-2 de la plantilla, pero blanco
        // sigue siendo la superficie dominante (no el negro bento).
        surface: {
          DEFAULT: 'hsl(var(--background))',
          2: 'hsl(var(--surface-2))',
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
        // Es también la única superficie oscura "bento" del panel (p.ej.
        // el tile hero del dashboard) — el blanco/teal siguen siendo
        // dominantes, el negro es puntual como en la plantilla.
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
      // Radios contenidos: el estilo minimalista se apoya en bordes finos
      // y esquinas apenas redondeadas, no en tiles con radio grande.
      borderRadius: {
        sm: '3px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        bento: '10px',
      },
      // Sombras casi imperceptibles: la separación la da el borde, no la
      // elevación. Se conservan los tokens para no romper los componentes.
      boxShadow: {
        bento: '0 1px 2px 0 rgb(14 22 19 / 0.04)',
        'bento-hover': '0 1px 2px 0 rgb(14 22 19 / 0.06)',
        accent: '0 1px 2px 0 rgb(56 167 147 / 0.20)',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        lg: ['16px', '22px'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
