import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell, LegalSection, LegalList, LegalTable } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Tratamiento de Datos Personales — Assu',
  description:
    'Política de Tratamiento de Datos Personales de Assu conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013: finalidades, derechos del titular, retención y vigencia.',
};

export default function TratamientoDeDatosPage() {
  return (
    <LegalShell
      title="Política de Tratamiento de Datos Personales"
      currentPath="/tratamiento-de-datos"
      intro="Documento mediante el cual Assu establece las reglas bajo las cuales realiza el tratamiento de los datos personales de los comercios y de las personas que los representan, en cumplimiento del derecho constitucional al Habeas Data y de la Ley 1581 de 2012."
    >
      <LegalSection title="1. Marco normativo">
        <LegalList
          items={[
            'Constitución Política de Colombia, artículo 15 (Habeas Data).',
            'Ley 1581 de 2012 — régimen general de protección de datos personales.',
            'Decreto 1377 de 2013 y Decreto 1074 de 2015 (Decreto Único Reglamentario del Sector Comercio, Industria y Turismo), en lo relativo a la protección de datos personales.',
            'Circulares e instrucciones de la Superintendencia de Industria y Comercio (SIC) sobre protección de datos.',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Identificación del responsable">
        <LegalTable
          rows={[
            { label: 'Responsable', value: `${LEGAL.entity} (${LEGAL.country})` },
            { label: 'NIT', value: LEGAL.nit },
            { label: 'Dirección de notificación', value: LEGAL.address },
            { label: 'Canal de atención', value: `${LEGAL.privacyEmail} · ${LEGAL.phone}` },
            { label: 'Actividad', value: 'Software de verificación automática de movimientos bancarios para comercios.' },
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Principios aplicables al tratamiento">
        <LegalList
          items={[
            'Legalidad: el tratamiento se sujeta a la ley y a las finalidades autorizadas.',
            'Finalidad: los datos se tratan para finalidades determinadas, explícitas y legítimas, informadas al titular.',
            'Libertad: el tratamiento solo se realiza con la autorización previa, expresa e informada del titular.',
            'Veracidad y calidad: los datos deben ser exactos, completos, actualizados y comprobables.',
            'Transparencia: el titular puede obtener información sobre el tratamiento de sus datos en cualquier momento.',
            'Acceso y circulación restringida: solo acceden a los datos las personas y procesos autorizados.',
            'Seguridad: se aplican medidas técnicas, humanas y administrativas para evitar el acceso no autorizado.',
            'Confidencialidad: quienes intervienen en el tratamiento están obligados a preservar la reserva de la información.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Categorías de datos tratados">
        <p>Assu trata las siguientes categorías de datos personales de los comercios y de sus representantes:</p>
        <LegalTable
          rows={[
            { label: 'Identificación', value: 'Nombre completo, tipo y número de documento, correo electrónico y teléfono.' },
            { label: 'Documento de identidad', value: 'Fotografía de la cédula de ciudadanía cargada durante el registro.' },
            { label: 'Financieros y de acceso', value: 'Credenciales del portal bancario (usuario y contraseña), necesarias para consultar movimientos en modo lectura.' },
            { label: 'De operación', value: 'Movimientos bancarios detectados, verificaciones realizadas y su estado.' },
            { label: 'Técnicos y de seguridad', value: 'Dirección IP, dispositivo, registros (logs) de acceso y eventos de seguridad.' },
          ]}
        />
        <p>
          A la fecha de expedición de esta política Assu <strong className="text-foreground">no trata datos personales
          sensibles</strong> en los términos del artículo 5 de la Ley 1581 de 2012.
        </p>
      </LegalSection>

      <LegalSection title="5. Finalidades del tratamiento">
        <LegalList
          items={[
            'Ejecutar el contrato de prestación del servicio y permitir el acceso al portal de comercios.',
            'Verificar la identidad del comercio y de su representante, y prevenir el fraude.',
            'Conectarse a las cuentas bancarias autorizadas para consultar y verificar movimientos.',
            'Enviar notificaciones e información operativa por correo electrónico y dentro del portal.',
            'Gestionar la seguridad de la cuenta: autenticación en dos pasos, registro de dispositivos y alertas de accesos inusuales.',
            'Atender consultas, quejas y reclamos, y dar cumplimiento a obligaciones legales, contables y contractuales.',
            'Elaborar estadísticas internas con información disociada o agregada para mejorar el servicio.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Derechos del titular">
        <LegalList
          items={[
            'Conocer, actualizar y rectificar sus datos personales frente al responsable.',
            'Solicitar prueba de la autorización otorgada, salvo en los casos en que la ley no la exige.',
            'Ser informado, previa solicitud, sobre el uso que se ha dado a sus datos.',
            'Presentar quejas ante la SIC por infracciones a la Ley 1581 de 2012.',
            'Revocar la autorización y/o solicitar la supresión de los datos, cuando no exista un deber legal o contractual que lo impida.',
            'Acceder de forma gratuita a sus datos personales.',
          ]}
        />
        <p>
          El procedimiento para ejercer estos derechos está descrito en{' '}
          <Link href="/habeas-data" className="text-accent hover:underline">
            Consultas y Reclamos (Habeas Data)
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Deberes del responsable">
        <LegalList
          items={[
            'Solicitar y conservar, en las condiciones legalmente previstas, una prueba de la autorización otorgada por el titular.',
            'Informar al titular de forma clara, previa y expresa la finalidad del tratamiento.',
            'Conservar la información bajo condiciones de seguridad que impidan su adulteración, pérdida, consulta o uso no autorizado.',
            'Actualizar la información cuando sea necesario y comunicar los cambios relevantes al titular.',
            'Atender las consultas y reclamos en los términos y plazos previstos en la ley.',
            'Usar los datos únicamente para las finalidades autorizadas.',
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Autorización del titular">
        <p>
          El tratamiento se realiza con la autorización previa, expresa e informada que el comercio otorga al crear su
          cuenta. El texto de esa autorización está disponible en{' '}
          <Link href="/autorizacion-de-datos" className="text-accent hover:underline">
            Autorización de Tratamiento de Datos
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Conservación y supresión">
        <LegalList
          items={[
            'Datos de la cuenta (identificación, contacto y operación): mientras la cuenta esté activa y, tras su cierre, durante el término necesario para atender obligaciones legales, contables y de defensa jurídica.',
            'Foto del documento de identidad: durante el tiempo requerido para la validación de identidad y la prevención de fraude; luego se elimina o se conserva de forma disociada.',
            'Credenciales bancarias: mientras la cuenta bancaria permanezca conectada; al desvincularla o cerrar la cuenta, se eliminan.',
            'Registros técnicos y de seguridad: por el tiempo necesario para auditar la seguridad y cumplir obligaciones legales.',
          ]}
        />
        <p>
          La supresión no procede cuando exista un deber legal o contractual de conservar la información.
        </p>
      </LegalSection>

      <LegalSection title="10. Registro Nacional de Bases de Datos (RNBD)">
        <p>
          Cuando la ley lo exija según el tamaño de la sociedad, Assu inscribirá sus bases de datos en el Registro
          Nacional de Bases de Datos administrado por la {LEGAL.sicName} y mantendrá actualizada esa información.
        </p>
      </LegalSection>

      <LegalSection title="11. Vigencia">
        <p>
          Esta política rige a partir de su publicación ({LEGAL.lastUpdated}). Las autorizaciones otorgadas por los
          titulares se mantendrán vigentes mientras se conserve la información conforme a las finalidades aquí descritas
          y a los plazos legales aplicables.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
