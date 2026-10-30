import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad · Cotiza Fácil",
  description: "Qué datos trata Cotiza Fácil, para qué y con quién los comparte.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        {LEGAL.entityName} (&ldquo;nosotros&rdquo;) presta Cotiza Fácil. Esta política explica qué datos tratamos,
        para qué, con qué proveedores los compartimos y cómo ejercer tus derechos. Complementa los{" "}
        <Link href="/terminos">términos y condiciones</Link>.
      </p>

      <h2>1. Qué datos tratamos</h2>
      <p>
        <strong>De tu cuenta:</strong> nombre de tu negocio, correo, contraseña (la gestiona nuestro proveedor de
        autenticación y no se guarda en texto plano), fecha de verificación del correo y aceptación de los
        términos, plan contratado y registro de tus compras.
      </p>
      <p>
        <strong>Lo que cargas:</strong> plantillas, logos, presupuestos y los PDF generados, y los datos de tus
        clientes que escribas (nombre, correo, teléfono, dirección y el contenido del presupuesto).
      </p>
      <p>
        <strong>Del cliente que recibe un presupuesto:</strong> cuando abre el enlace y aprueba o rechaza, guardamos
        esa decisión y su fecha. No le pedimos crear una cuenta.
      </p>
      <p>
        <strong>Técnicos:</strong> registros de errores y de rendimiento para mantener el servicio. No usamos
        cookies de publicidad ni herramientas de analítica de comportamiento.
      </p>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Prestarte el servicio: generar los PDF, enviarlos por correo o WhatsApp y registrar las aprobaciones.</li>
        <li>Activar y gestionar tu plan, y verificar que tu correo es tuyo.</li>
        <li>Mantener la seguridad, detectar y corregir fallos.</li>
        <li>Escribirte sobre el servicio (verificación, invitaciones, avisos importantes).</li>
      </ul>

      <h2>3. Tus clientes: quién decide sobre sus datos</h2>
      <p>
        Los datos de tus clientes los cargas tú y tú decides para qué usarlos. Nosotros los tratamos solo por tu
        encargo, para prestarte el servicio. Es tu responsabilidad contar con una base legítima para tratarlos y
        para enviarles correos.
      </p>

      <h2>4. Con quién los compartimos</h2>
      <p>Usamos proveedores que tratan datos por nuestra cuenta, solo para lo indicado:</p>
      <ul>
        <li><strong>Supabase:</strong> base de datos, autenticación y almacenamiento de archivos (servidores en {LEGAL.dataRegion}).</li>
        <li><strong>Vercel:</strong> alojamiento de la aplicación.</li>
        <li><strong>Resend:</strong> envío de correos (verificación, invitaciones y presupuestos con su PDF adjunto).</li>
        <li><strong>Guaybo:</strong> procesamiento de pagos. Recibimos los datos de la compra (correo y plan), no los datos de tu tarjeta.</li>
        <li><strong>Sentry:</strong> monitoreo de errores. Configurado para no enviar cuerpos de formularios ni datos del usuario.</li>
        <li><strong>Tu CRM, si lo conectas:</strong> es una integración opcional que configuras tú; solo entonces enviamos datos de tus presupuestos a ese servicio.</li>
      </ul>
      <p>No vendemos tus datos ni los de tus clientes. Podemos revelarlos si una autoridad competente lo exige conforme a la ley.</p>

      <h2>5. Transferencias internacionales</h2>
      <p>
        Algunos proveedores pueden tratar datos fuera de tu país. [REVISAR CON EL ABOGADO: transferencias y garantías
        aplicables según la jurisdicción].
      </p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <p>
        Mientras tu cuenta esté activa. Si tu plan vence, tus datos no se borran. Puedes pedir cerrar tu cuenta desde
        Cuenta → Eliminar mi cuenta: tienes 7 días para cancelar y, pasado ese plazo, eliminamos tus datos y
        archivos. Conservamos únicamente el registro de las compras realizadas y lo que debamos guardar por
        obligación legal. [REVISAR CON EL ABOGADO: plazos de
        conservación y de eliminación].
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Cada cuenta solo puede ver sus propios datos: el aislamiento se aplica en la propia base de datos. Los enlaces de aprobación vencen a los 30 días y pueden revocarse. Aun así, ningún
        sistema es infalible; si detectamos un incidente que te afecte, te avisaremos.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes descargar una copia de tus datos tú mismo desde Cuenta → Exportar mis datos. Para corrección u
        oposición a ciertos usos, escribe a {LEGAL.contactEmail} desde el correo de tu cuenta. Si eres cliente de alguien que usa Cotiza Fácil y
        quieres ejercer tus derechos sobre los datos que esa persona cargó, contáctala a ella primero; podemos
        ayudarla a atenderte.
      </p>

      <h2>9. Cambios y contacto</h2>
      <p>
        Si actualizamos esta política de forma importante, te avisaremos. Consultas: {LEGAL.contactEmail}.
      </p>
    </LegalPage>
  );
}
