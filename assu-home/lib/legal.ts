/**
 * Datos del responsable del tratamiento y catálogo de documentos legales de
 * la landing. Un único lugar para que la sección de la landing, el footer y
 * todas las páginas legales queden coherentes entre sí.
 *
 * ⚠️ COMPLETAR ANTES DE PUBLICAR — los textos entre [corchetes] son
 * marcadores de posición. Reemplázalos por los datos reales de la sociedad
 * responsable (razón social, NIT, dirección y canales de atención). Mientras
 * sigan los corchetes, los documentos son un BORRADOR y no deben publicarse.
 * Este contenido debe revisarlo un abogado antes de salir a producción.
 */
export const LEGAL = {
  entity: '[Razón social del responsable]',
  nit: '[NIT]',
  address: '[Dirección de notificación], Colombia',
  privacyEmail: '[correo para asuntos de datos personales]',
  phone: '[teléfono de atención]',
  country: 'Colombia',
  /** Fecha que aparece en el encabezado de cada documento. */
  lastUpdated: '4 de noviembre de 2026',
  sicName: 'Superintendencia de Industria y Comercio (SIC)',
  sicUrl: 'https://www.sic.gov.co',
} as const;

export interface LegalDoc {
  href: string;
  title: string;
  short: string;
}

/**
 * Orden en que se listan los documentos en la landing, el footer y la
 * navegación entre páginas legales.
 */
export const LEGAL_DOCS: readonly LegalDoc[] = [
  {
    href: '/privacidad',
    title: 'Política de Privacidad',
    short: 'Qué datos recolectamos, para qué y con quién los compartimos.',
  },
  {
    href: '/tratamiento-de-datos',
    title: 'Política de Tratamiento de Datos Personales',
    short: 'Documento base exigido por la Ley 1581 de 2012 y el Decreto 1377 de 2013.',
  },
  {
    href: '/autorizacion-de-datos',
    title: 'Autorización de Tratamiento de Datos',
    short: 'El consentimiento que otorgas al crear tu cuenta de comercio.',
  },
  {
    href: '/habeas-data',
    title: 'Consultas y Reclamos (Habeas Data)',
    short: 'Cómo ejercer tus derechos y en cuánto tiempo respondemos.',
  },
  {
    href: '/cookies',
    title: 'Política de Cookies',
    short: 'Cookies y almacenamiento local que usa la plataforma.',
  },
  {
    href: '/terminos',
    title: 'Términos y Condiciones',
    short: 'Condiciones de uso del servicio y responsabilidades.',
  },
] as const;
