import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones · Cotiza Fácil",
  description: "Las condiciones de uso de Cotiza Fácil.",
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estos términos regulan el uso de Cotiza Fácil, un servicio de {LEGAL.entityName} (&ldquo;nosotros&rdquo;) para
        crear presupuestos en PDF, enviarlos por correo o WhatsApp y recibir la aprobación de tus clientes. Al crear
        una cuenta o usar el servicio aceptas estos términos. Si no estás de acuerdo, no lo uses.
      </p>

      <h2>1. Tu cuenta</h2>
      <ul>
        <li>Debes dar un correo real y mantener tu contraseña en reserva. Eres responsable de lo que ocurra con tu cuenta.</li>
        <li>Debes verificar tu correo para activar planes de pago e invitaciones a otros espacios de trabajo.</li>
        <li>El propietario de un espacio de trabajo puede invitar colaboradores, dentro del límite de su plan, y responde por lo que hagan.</li>
      </ul>

      <h2>2. Lo que el servicio hace y no hace</h2>
      <p>
        Cotiza Fácil es una herramienta para elaborar y enviar documentos. No es asesoría legal, contable ni
        tributaria. Tú eres responsable del contenido de tus presupuestos (precios, impuestos, condiciones) y de que
        cumplan la normativa que te aplique.
      </p>
      <p>
        La aprobación o el rechazo que registra un cliente desde el enlace es un registro de su respuesta en el
        servicio; no garantizamos que equivalga a una firma electrónica con valor legal en tu jurisdicción.
      </p>

      <h2>3. Tu contenido y los datos de tus clientes</h2>
      <ul>
        <li>Conservas todos los derechos sobre tus plantillas, logos, presupuestos y datos de clientes. Nos autorizas a almacenarlos y procesarlos solo para prestarte el servicio.</li>
        <li>Tú decides qué datos de terceros cargas. Eres responsable de contar con el derecho a tratarlos y a enviarles correos.</li>
        <li>Respecto de esos datos de tus clientes, tú eres quien decide para qué se usan y nosotros actuamos por tu encargo. Más detalle en la <Link href="/privacidad">política de privacidad</Link>.</li>
      </ul>

      <h2>4. Uso aceptable</h2>
      <p>No puedes usar el servicio para:</p>
      <ul>
        <li>enviar correo no solicitado (spam) o contenido engañoso, fraudulento o ilegal;</li>
        <li>suplantar a otra persona o empresa;</li>
        <li>intentar acceder a cuentas o datos que no son tuyos, vulnerar la seguridad del servicio o sobrecargarlo;</li>
        <li>revender o ceder el acceso sin nuestro permiso por escrito.</li>
      </ul>
      <p>Podemos suspender cuentas que incumplan esto, avisándote cuando sea posible.</p>

      <h2>5. Planes y pagos</h2>
      <ul>
        <li>Hay un plan gratuito con límites y planes de pago mensual o anual. Los precios y límites vigentes están en la página de precios.</li>
        <li>Los pagos los procesa un tercero (Guaybo). Nosotros no almacenamos los datos de tu tarjeta ni de tu medio de pago.</li>
        <li>El plan se activa al reconocer tu compra, asociada al correo con el que pagaste. Si pagaste antes de registrarte, se aplica cuando verificas ese correo.</li>
        <li>Al vencer tu plan no se borran tus datos: se limita la creación de nuevos elementos.</li>
        <li>Reembolsos y cancelaciones: [REVISAR CON EL ABOGADO: política de reembolsos].</li>
      </ul>

      <h2>6. Disponibilidad</h2>
      <p>
        Procuramos que el servicio esté disponible de forma continua, pero no podemos garantizar que no habrá
        interrupciones, errores o mantenimientos. Los correos dependen además de proveedores y de los filtros del
        destinatario, por lo que no garantizamos su entrega.
      </p>

      <h2>7. Límite de responsabilidad</h2>
      <p>
        El servicio se ofrece &ldquo;tal como está&rdquo;. En la medida que la ley lo permita, no respondemos por
        pérdidas indirectas, lucro cesante o pérdida de oportunidades de negocio derivadas del uso o de la
        imposibilidad de usar el servicio, y nuestra responsabilidad total se limita a lo que hayas pagado por el
        servicio en los 12 meses anteriores al hecho. [REVISAR CON EL ABOGADO: alcance del límite según la jurisdicción].
      </p>

      <h2>8. Terminación</h2>
      <p>
        Puedes dejar de usar el servicio y solicitar la eliminación de tu cuenta en cualquier momento escribiendo a{" "}
        {LEGAL.contactEmail}. Podemos suspender o cerrar una cuenta que incumpla estos términos. Al cerrarse,
        eliminamos tus datos como indica la política de privacidad.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar estos términos. Si el cambio es importante, te avisaremos por correo o dentro del
        servicio. Seguir usándolo después de la fecha de actualización implica que aceptas la nueva versión.
      </p>

      <h2>10. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de {LEGAL.jurisdiction}. Para cualquier consulta, escríbenos a{" "}
        {LEGAL.contactEmail}.
      </p>
    </LegalPage>
  );
}
