import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findValidInvitation } from "@/lib/colaboradores/invitations";
import { signOut } from "../../(app)/actions";
import { AcceptForm, SignupForm } from "./invitation-forms";

export default async function InvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await findValidInvitation(token);

  let body: React.ReactNode;

  if (!invitation) {
    body = <p className="auth-error">Esta invitación ya se usó, fue revocada o venció. Pídele al propietario una nueva.</p>;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      body =
        (user.email ?? "").toLowerCase() === invitation.email.toLowerCase() ? (
          <AcceptForm token={token} />
        ) : (
          <div className="auth-card">
            <p>
              Esta invitación es para <strong>{invitation.email}</strong>, pero iniciaste sesión como{" "}
              <strong>{user.email}</strong>.
            </p>
            <form action={signOut}>
              <button type="submit" className="auth-submit">
                Cerrar sesión
              </button>
            </form>
          </div>
        );
    } else {
      // Solo se pregunta a la base si el correo ya tiene usuario para
      // decidir qué formulario mostrar; no se revela nada a quien no
      // tenga el token (que ya demuestra acceso a esa casilla).
      const { data: existingUser } = await createAdminClient()
        .from("users")
        .select("id")
        .eq("email", invitation.email.toLowerCase())
        .maybeSingle();

      body = existingUser ? (
        <div className="auth-card">
          <p>
            Ya tienes cuenta con <strong>{invitation.email}</strong>. Inicia sesión para aceptar.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/invitacion/${token}`)}`}
            className="auth-submit"
            style={{ textAlign: "center" }}
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <SignupForm token={token} email={invitation.email} />
      );
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>{invitation ? `Únete a ${invitation.accountName}` : "Invitación"}</h1>
          {invitation && <p>Como colaborador podrás crear y enviar presupuestos y gestionar clientes.</p>}
        </div>

        {body}
      </main>
    </div>
  );
}
