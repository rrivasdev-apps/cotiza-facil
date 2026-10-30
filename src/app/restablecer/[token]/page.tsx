import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { peekPasswordReset } from "@/lib/password-reset/password-reset";
import { ResetForm } from "./reset-form";

export default async function RestablecerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reset = await peekPasswordReset(token);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>Nueva contraseña</h1>
          {reset && <p>{reset.email}</p>}
        </div>

        {reset ? (
          <ResetForm token={token} />
        ) : (
          <>
            <p className="auth-error">Este enlace ya se usó o venció.</p>
            <p className="auth-switch">
              <Link href="/recuperar">Pedir un enlace nuevo</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
