import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell, LegalSection, LegalList } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Assu',
  description:
    'Términos y condiciones de uso del servicio de verificación automática de movimientos bancarios de Assu para comercios.',
};

export default function TerminosPage() {
  return (
    <LegalShell
      title="Términos y Condiciones"
      currentPath="/terminos"
      intro="Estos términos regulan el uso del servicio de Assu. Al crear una cuenta de comercio aceptas estas condiciones; si no estás de acuerdo, no debes usar la plataforma."
    >
      <LegalSection title="1. Identificación del prestador">
        <p>
          El servicio es prestado por {LEGAL.entity}, con NIT {LEGAL.nit} y domicilio en {LEGAL.address}.
        </p>
      </LegalSection>

      <LegalSection title="2. Descripción del servicio">
        <p>
          Assu es una plataforma que, con la autorización del comercio, se conecta a sus cuentas bancarias en modo
          lectura para detectar y verificar los movimientos que recibe, notificar cada verificación y permitir su
          consulta desde el portal de comercios. El servicio es una herramienta de apoyo a la operación del comercio y no
          sustituye los extractos ni los canales oficiales del banco.
        </p>
      </LegalSection>

      <LegalSection title="3. Cuenta de comercio">
        <LegalList
          items={[
            'Para usar el servicio debes ser mayor de edad y actuar en representación legítima del comercio, o contar con facultades suficientes para vincularlo.',
            'Eres responsable de la veracidad y actualización de la información que registras.',
            'Debes custodiar tus credenciales de acceso al portal y el acceso a los dispositivos que autorizas como de confianza.',
            'Debes informarnos de inmediato cualquier uso no autorizado de tu cuenta.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Conexión con cuentas bancarias">
        <LegalList
          items={[
            'Al conectar una cuenta bancaria declaras ser titular de esa cuenta o contar con autorización de su titular para consultarla.',
            'Las credenciales bancarias se almacenan cifradas y se usan únicamente en modo lectura, para consultar movimientos.',
            'Assu no ejecuta transferencias, pagos ni ninguna operación que mueva dinero.',
            'Eres responsable de cumplir los términos, condiciones y políticas de tu banco. Si un banco restringe o modifica el acceso automatizado, el servicio podría verse afectado.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Uso aceptable">
        <LegalList
          items={[
            'No usar el servicio para fines ilícitos ni para acceder a cuentas de las que no seas titular o respecto de las cuales no tengas autorización.',
            'No intentar vulnerar la seguridad de la plataforma, interferir con su funcionamiento ni acceder a información de otros comercios.',
            'No revender ni sublicenciar el servicio sin autorización escrita de Assu.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Precio y facturación">
        <p>
          Las condiciones comerciales, el plan contratado y su precio se acuerdan de forma particular con cada comercio
          en el respectivo contrato u orden de servicio. El uso del servicio implica la aceptación de esas condiciones.
        </p>
      </LegalSection>

      <LegalSection title="7. Propiedad intelectual">
        <p>
          La plataforma, su código, su marca y sus contenidos son de titularidad de Assu o de sus licenciantes. El uso
          del servicio no te transfiere derecho alguno sobre ellos. Los datos que cargas o autorizas a consultar siguen
          siendo tuyos.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidad y limitación de responsabilidad">
        <LegalList
          items={[
            'Assu procura la disponibilidad continua del servicio, pero no garantiza la ausencia de interrupciones, en especial cuando dependen de terceros (bancos, proveedores de infraestructura o de correo).',
            'La información de movimientos refleja lo que reporta el canal bancario consultado; Assu no es responsable por inexactitudes, retrasos u omisiones originados en la información del banco.',
            'Assu no responde por decisiones comerciales, contables o tributarias que tomes con base en la información mostrada en la plataforma.',
            'En la medida permitida por la ley, la responsabilidad de Assu se limita al valor efectivamente pagado por el servicio durante el periodo en que se causó el daño.',
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Suspensión y terminación">
        <p>
          Assu puede suspender o dar por terminado el acceso al servicio ante el uso indebido de la plataforma, el
          incumplimiento de estos términos o el uso fraudulento. El comercio puede cerrar su cuenta en cualquier momento
          desde el portal o solicitándolo a nuestros canales de atención.
        </p>
      </LegalSection>

      <LegalSection title="10. Protección de datos personales">
        <p>
          El tratamiento de datos personales se rige por la{' '}
          <Link href="/privacidad" className="text-accent hover:underline">
            Política de Privacidad
          </Link>
          , la{' '}
          <Link href="/tratamiento-de-datos" className="text-accent hover:underline">
            Política de Tratamiento de Datos Personales
          </Link>{' '}
          y la{' '}
          <Link href="/autorizacion-de-datos" className="text-accent hover:underline">
            Autorización de Tratamiento
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Modificaciones">
        <p>
          Assu puede actualizar estos términos para reflejar cambios en el servicio o en la ley. Publicaremos la versión
          vigente en esta página con su fecha y, si los cambios son sustanciales, te lo informaremos por correo o dentro
          del portal.
        </p>
      </LegalSection>

      <LegalSection title="12. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de la República de {LEGAL.country}. Cualquier controversia se someterá a
          los jueces y tribunales competentes de Colombia.
        </p>
        <p>
          Dudas o reclamos sobre el servicio: <strong className="text-foreground">{LEGAL.privacyEmail}</strong>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
