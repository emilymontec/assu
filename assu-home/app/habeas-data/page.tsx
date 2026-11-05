import type { Metadata } from 'next';
import { LegalShell, LegalSection, LegalList, LegalTable } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Consultas y Reclamos (Habeas Data) — Assu',
  description:
    'Cómo ejercer tus derechos de Habeas Data ante Assu: canal de atención, requisitos, plazos legales de respuesta y reclamación ante la SIC.',
};

export default function HabeasDataPage() {
  return (
    <LegalShell
      title="Consultas y Reclamos (Habeas Data)"
      currentPath="/habeas-data"
      intro="El Habeas Data es tu derecho a conocer, actualizar y rectificar la información que sobre ti se haya recolectado y a solicitar la supresión de tus datos. Aquí explicamos cómo ejercerlo ante Assu, qué necesitamos de tu parte y en cuánto tiempo respondemos."
    >
      <LegalSection title="1. Tus derechos">
        <LegalList
          items={[
            'Conocer, actualizar y rectificar tus datos personales.',
            'Solicitar prueba de la autorización que otorgaste.',
            'Ser informado sobre el uso que se ha dado a tus datos.',
            'Revocar la autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal o contractual de conservarlos.',
            'Acceder de forma gratuita a tus datos personales.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Canal de atención">
        <p>
          Todas las consultas y reclamos se reciben en{' '}
          <strong className="text-foreground">{LEGAL.privacyEmail}</strong>. Si prefieres, también puedes radicarlos por
          escrito en la dirección de notificación: {LEGAL.address}.
        </p>
      </LegalSection>

      <LegalSection title="3. Consultas">
        <p>
          Una consulta es una solicitud para conocer la información que Assu tiene sobre ti o el uso que le ha dado. Se
          atiende así:
        </p>
        <LegalTable
          rows={[
            { label: 'Plazo de respuesta', value: 'Máximo 10 días hábiles contados desde la recepción.' },
            { label: 'Prórroga', value: 'Cuando no sea posible responder dentro del plazo, se informará y se prorrogará hasta por 5 días hábiles más.' },
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Reclamos">
        <p>
          Un reclamo es una solicitud para corregir, actualizar o suprimir tus datos, o para reportar el presunto
          incumplimiento de la ley. Para radicarlo debe incluir:
        </p>
        <LegalList
          items={[
            'Tu nombre completo e identificación, y los datos de contacto para recibir la respuesta.',
            'La descripción de los hechos que motivan el reclamo.',
            'Los documentos que quieras hacer valer (si los tienes).',
            'La dirección de notificación o el correo donde deseas recibir la respuesta.',
          ]}
        />
        <p>
          Si el reclamo está incompleto, te pediremos que subsanes la falta dentro de los 5 días siguientes. Transcurridos
          2 meses sin que completes la información, se entenderá que has desistido.
        </p>
        <LegalTable
          rows={[
            { label: 'Plazo de respuesta', value: 'Máximo 15 días hábiles contados desde la recepción.' },
            { label: 'Prórroga', value: 'Cuando no sea posible responder dentro del plazo, se informará y se prorrogará hasta por 8 días hábiles más.' },
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Si no estás conforme con nuestra respuesta">
        <p>
          Puedes presentar una queja ante la {LEGAL.sicName}, autoridad nacional de protección de datos personales, a
          través de sus canales de atención:{' '}
          <a href={LEGAL.sicUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {LEGAL.sicUrl}
          </a>
          . Recomendamos radicar primero la consulta o el reclamo ante Assu, ya que la ley exige agotar este trámite
          previo en varios casos.
        </p>
      </LegalSection>

      <LegalSection title="6. Consideraciones sobre la supresión">
        <p>
          La supresión de datos no procede cuando exista un deber legal o contractual de conservarlos (por ejemplo,
          obligaciones contables o la defensa ante eventuales reclamaciones). En esos casos te explicaremos con claridad
          qué información se conserva y hasta cuándo. Ten en cuenta que revocar la autorización de los datos necesarios
          para operar el servicio puede impedir que sigas usando la plataforma.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
