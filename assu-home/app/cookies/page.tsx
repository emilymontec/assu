import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell, LegalSection, LegalList, LegalTable } from '@/components/legal';

export const metadata: Metadata = {
  title: 'Política de Cookies — Assu',
  description:
    'Cookies y almacenamiento local que usa Assu: qué son, cuáles son estrictamente necesarios, para qué sirven y cómo puedes gestionarlos.',
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Política de Cookies"
      currentPath="/cookies"
      intro="Esta política explica qué son las cookies y el almacenamiento local, cuáles usa Assu y para qué. La plataforma se apoya únicamente en mecanismos estrictamente necesarios para su funcionamiento; no usamos cookies de publicidad ni de perfilamiento."
    >
      <LegalSection title="1. Qué son las cookies y el almacenamiento local">
        <p>
          Las cookies son pequeños archivos que un sitio guarda en tu navegador y que permiten recordar información entre
          visitas. El <em>almacenamiento local</em> (localStorage) cumple una función parecida, pero la información
          permanece en tu navegador y no se envía automáticamente al servidor con cada petición.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué usamos">
        <LegalTable
          rows={[
            {
              label: 'Landing pública',
              value:
                'No instala cookies de analítica, publicidad ni seguimiento. No hay rastreo de tu navegación entre sitios.',
            },
            {
              label: 'Portal de comercios (localStorage)',
              value:
                'Usa almacenamiento local estrictamente necesario para mantener tu sesión y reconocer tu dispositivo.',
            },
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Almacenamiento local del portal de comercios">
        <LegalTable
          rows={[
            {
              label: 'assu_access_token',
              value:
                'Guarda el token de tu sesión para que no tengas que iniciar sesión en cada página. Se elimina al cerrar sesión.',
            },
            {
              label: 'assu_device_id',
              value:
                'Identificador anónimo de este navegador. Permite que el sistema recuerde si este dispositivo es de confianza para la verificación en dos pasos. No contiene datos personales por sí mismo.',
            },
          ]}
        />
        <p>
          Este almacenamiento es necesario para el funcionamiento del portal: sin él, cada inicio de sesión parecería
          venir de un dispositivo nuevo y la verificación en dos pasos no podría recordar tu dispositivo.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies de terceros">
        <p>
          Al día de hoy la plataforma no incorpora cookies de terceros con fines publicitarios o de analítica. Si en el
          futuro se integran herramientas de medición o servicios externos que instalen cookies, se actualizará esta
          política y, cuando corresponda, se solicitará tu consentimiento previo.
        </p>
      </LegalSection>

      <LegalSection title="5. Cómo gestionarlas">
        <LegalList
          items={[
            'Puedes eliminar o bloquear las cookies y el almacenamiento local desde la configuración de tu navegador.',
            'Si bloqueas el almacenamiento local del portal, es posible que no puedas mantener la sesión iniciada ni completar la verificación en dos pasos.',
            'Para cerrar tu sesión y borrar el token guardado, usa la opción "Cerrar sesión" dentro del portal.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Relación con otros documentos">
        <p>
          El uso de estos mecanismos se enmarca en la{' '}
          <Link href="/privacidad" className="text-accent hover:underline">
            Política de Privacidad
          </Link>{' '}
          y en la{' '}
          <Link href="/tratamiento-de-datos" className="text-accent hover:underline">
            Política de Tratamiento de Datos Personales
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
