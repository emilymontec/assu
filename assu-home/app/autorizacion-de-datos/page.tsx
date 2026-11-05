import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell, LegalSection, LegalList } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Autorización de Tratamiento de Datos — Assu',
  description:
    'Texto de la autorización de tratamiento de datos personales que el comercio otorga al crear su cuenta en Assu, conforme a la Ley 1581 de 2012.',
};

export default function AutorizacionDeDatosPage() {
  return (
    <LegalShell
      title="Autorización de Tratamiento de Datos Personales"
      currentPath="/autorizacion-de-datos"
      intro="Este es el texto de la autorización que el comercio otorga de manera previa, expresa e informada al momento de crear su cuenta en Assu. Se acepta mediante el casillero de autorización del formulario de registro y debe leerse junto con la Política de Tratamiento de Datos Personales."
    >
      <LegalSection title="Autorización">
        <p className="rounded-bento border border-border bg-surface-2 p-4 text-[13px] leading-relaxed text-foreground">
          Yo, como representante del comercio que se registra en Assu, declaro que he sido informado(a) de forma clara,
          expresa y previa sobre las finalidades del tratamiento de mis datos personales y, en consecuencia,{' '}
          <strong>autorizo de manera libre, previa, expresa e informada</strong> a {LEGAL.entity}, con NIT {LEGAL.nit}, para
          recolectar, almacenar, usar, circular, transmitir y en general tratar mis datos personales conforme a las
          finalidades descritas a continuación.
        </p>
      </LegalSection>

      <LegalSection title="1. Datos autorizados">
        <LegalList
          items={[
            'Datos de identificación y contacto: nombre completo, tipo y número de documento, correo electrónico y teléfono.',
            'Documento de identidad: fotografía de mi cédula, para validar mi identidad y prevenir el fraude.',
            'Credenciales de acceso a mis cuentas bancarias (usuario y contraseña), utilizadas únicamente en modo lectura para consultar movimientos.',
            'Información de los movimientos detectados en las cuentas que autorizo.',
            'Datos técnicos y de seguridad: dirección IP, dispositivo y registros de acceso.',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Finalidades autorizadas">
        <LegalList
          items={[
            'Crear y administrar mi cuenta de comercio y verificar mi identidad.',
            'Conectarme a las cuentas bancarias que autorizo y verificar los movimientos que recibe mi comercio.',
            'Enviarme notificaciones operativas y de seguridad por correo electrónico y dentro del portal.',
            'Gestionar la seguridad de mi cuenta, incluida la autenticación en dos pasos y el registro de dispositivos de confianza.',
            'Atender mis solicitudes y cumplir obligaciones legales, contables y contractuales.',
            'Elaborar estadísticas internas con información disociada o agregada.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Declaraciones del titular">
        <LegalList
          items={[
            'Declaro que la información que suministro es veraz, completa y actualizada, y me comprometo a actualizarla cuando cambie.',
            'Declaro que soy mayor de edad y que actúo en representación legítima del comercio registrado, o que cuento con facultades para otorgar esta autorización.',
            'Declaro que conozco que Assu no comercializa ni vende mis datos personales a terceros.',
            'Declaro que entiendo que el acceso a mis cuentas bancarias es de solo lectura y que Assu no puede mover dinero ni iniciar transacciones.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Derechos del titular y cómo revocar la autorización">
        <p>
          Puedo conocer, actualizar, rectificar y suprimir mis datos, solicitar prueba de esta autorización, ser
          informado sobre el uso de mis datos, presentar quejas ante la Superintendencia de Industria y Comercio (SIC) y
          revocar esta autorización en cualquier momento, salvo cuando exista un deber legal o contractual que impida la
          supresión.
        </p>
        <p>
          Para ejercer estos derechos puedo escribir a <strong className="text-foreground">{LEGAL.privacyEmail}</strong>. El
          procedimiento y los plazos están descritos en{' '}
          <Link href="/habeas-data" className="text-accent hover:underline">
            Consultas y Reclamos (Habeas Data)
          </Link>
          . La revocatoria de la autorización de datos necesarios para operar el servicio puede implicar la imposibilidad
          de continuar usando la plataforma.
        </p>
      </LegalSection>

      <LegalSection title="5. Vigencia de la autorización">
        <p>
          Esta autorización rige desde el momento de su otorgamiento y durante el tiempo en que Assu conserve mis datos
          conforme a las finalidades descritas y a los plazos legales aplicables.
        </p>
        <p className="text-[12px]">
          Documento relacionado:{' '}
          <Link href="/tratamiento-de-datos" className="text-accent hover:underline">
            Política de Tratamiento de Datos Personales
          </Link>{' '}
          ·{' '}
          <Link href="/privacidad" className="text-accent hover:underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
