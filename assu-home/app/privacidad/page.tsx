import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell, LegalSection, LegalList, LegalTable } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Assu',
  description:
    'Qué datos personales recolecta Assu, con qué finalidad, con quién se comparten y cómo se protegen. Cumple la Ley 1581 de 2012 (Habeas Data).',
};

export default function PrivacidadPage() {
  return (
    <LegalShell
      title="Política de Privacidad"
      currentPath="/privacidad"
      intro="Esta política explica, en lenguaje claro, qué datos personales recolecta Assu cuando un comercio crea su cuenta y usa el servicio, para qué los usamos, con quién los compartimos, cuánto tiempo los conservamos y cómo puedes ejercer tus derechos. Es el complemento divulgativo de la Política de Tratamiento de Datos Personales."
    >
      <LegalSection title="1. Quiénes somos">
        <p>
          El responsable del tratamiento es {LEGAL.entity} ({LEGAL.country}), con NIT {LEGAL.nit}. Para cualquier asunto
          relacionado con tus datos personales puedes escribir a <strong className="text-foreground">{LEGAL.privacyEmail}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos recolectamos">
        <LegalTable
          rows={[
            {
              label: 'Datos de registro',
              value: 'Tipo y número de documento, nombre completo, correo electrónico y teléfono del representante del comercio.',
            },
            {
              label: 'Documento de identidad',
              value: 'Foto de la cédula que cargas durante el registro, para validar tu identidad y prevenir el fraude.',
            },
            {
              label: 'Credenciales bancarias',
              value:
                'Usuario y contraseña del portal de tu banco, necesarios para consultar tus movimientos. Se guardan cifrados y se usan únicamente en modo lectura.',
            },
            {
              label: 'Información de movimientos',
              value: 'Transferencias, montos, fechas y referencias detectadas en las cuentas que autorizas.',
            },
            {
              label: 'Datos de uso y técnicos',
              value:
                'Dirección IP, tipo de dispositivo, identificador de dispositivo, fecha y hora de acceso, y eventos de seguridad (por ejemplo, intentos de inicio de sesión).',
            },
          ]}
        />
        <p>
          No solicitamos datos personales sensibles (artículo 5 de la Ley 1581 de 2012), como información de salud,
          orientación sexual, origen étnico o convicciones religiosas. Tampoco tratamos datos de niñas, niños y
          adolescentes: el servicio está dirigido a mayores de edad que actúan en representación de un comercio.
        </p>
      </LegalSection>

      <LegalSection title="3. Para qué usamos tus datos">
        <LegalList
          items={[
            'Crear y administrar tu cuenta de comercio, y verificar tu identidad.',
            'Conectarnos a las cuentas bancarias que autorizas y verificar los movimientos que recibe tu comercio.',
            'Enviarte notificaciones del servicio (confirmación de movimientos, inicios de sesión, cambios en tu cuenta) por correo y dentro del portal.',
            'Proteger la plataforma: autenticación en dos pasos, detección de accesos inusuales y prevención de fraude.',
            'Atender tus solicitudes, consultas y reclamos, y cumplir obligaciones legales, contables y contractuales.',
            'Mejorar la calidad del servicio a partir de métricas agregadas y anónimas.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Con quién compartimos los datos">
        <p>Assu no vende ni comercializa tus datos personales. Los compartimos únicamente con:</p>
        <LegalList
          items={[
            'Proveedores de infraestructura y hosting que alojan la plataforma y la base de datos.',
            'Proveedores de correo electrónico transaccional que entregan las notificaciones del servicio.',
            'Autoridades competentes, cuando exista una obligación legal o un requerimiento debidamente fundamentado.',
          ]}
        />
        <p>
          Estos proveedores actúan como encargados del tratamiento y solo acceden a la información necesaria para
          prestar su servicio, bajo obligaciones de confidencialidad.
        </p>
      </LegalSection>

      <LegalSection title="5. Transferencia y transmisión internacional">
        <p>
          Algunos proveedores de infraestructura o correo pueden estar ubicados fuera de Colombia. Cuando eso ocurra,
          Assu verifica que el país receptor cuente con un nivel adecuado de protección de datos conforme a los
          estándares de la {LEGAL.sicName}, o adopta las garantías contractuales necesarias antes de realizar la
          transferencia.
        </p>
      </LegalSection>

      <LegalSection title="6. Cómo protegemos tu información">
        <LegalList
          items={[
            'Las credenciales bancarias y las fotos de documento se almacenan cifradas con AES-256-GCM.',
            'El acceso a la información está restringido al personal y a los procesos que lo necesitan para operar el servicio.',
            'Usamos verificación en dos pasos: un inicio de sesión desde un dispositivo nuevo requiere un código enviado por correo o la aprobación desde un dispositivo de confianza.',
            'La conexión con tus cuentas bancarias es de solo lectura: Assu no puede mover dinero ni iniciar transacciones.',
          ]}
        />
        <p>
          Ningún sistema es infalible. Si detectamos un incidente de seguridad que afecte tus datos, te informaremos por
          los canales de contacto registrados y a la autoridad competente, según corresponda.
        </p>
      </LegalSection>

      <LegalSection title="7. Cuánto tiempo conservamos los datos">
        <p>
          Conservamos los datos mientras tu cuenta esté activa y, una vez la cierres, durante el tiempo necesario para
          cumplir obligaciones legales, contables y de defensa ante eventuales reclamaciones. La foto de tu documento de
          identidad y las credenciales bancarias se eliminan cuando dejan de ser necesarias para la finalidad para la
          que fueron recolectadas. Encontrarás los plazos concretos en la{' '}
          <Link href="/tratamiento-de-datos" className="text-accent hover:underline">
            Política de Tratamiento de Datos Personales
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Tus derechos">
        <p>
          Puedes conocer, actualizar, rectificar y suprimir tus datos, solicitar prueba de la autorización otorgada,
          ser informado sobre su uso, revocar la autorización y presentar quejas ante la {LEGAL.sicName}. En la{' '}
          <Link href="/habeas-data" className="text-accent hover:underline">
            página de Habeas Data
          </Link>{' '}
          explicamos cómo hacerlo y en cuánto tiempo respondemos.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies y almacenamiento local">
        <p>
          La plataforma usa cookies y almacenamiento local estrictamente necesarios para su funcionamiento. El detalle
          está en la{' '}
          <Link href="/cookies" className="text-accent hover:underline">
            Política de Cookies
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios a esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa. Publicaremos la
          versión vigente en esta página con su fecha de actualización y, si los cambios son sustanciales, te lo
          informaremos por correo o dentro del portal.
        </p>
      </LegalSection>

      <LegalSection title="11. Contacto">
        <p>
          Escríbenos a <strong className="text-foreground">{LEGAL.privacyEmail}</strong> o a nuestra dirección de
          notificación: {LEGAL.address}.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
