import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { peekVerification } from "@/lib/verification/email-verification";
import { ConfirmForm } from "./confirm-form";

export default async function VerificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verification = await peekVerification(token);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>Confirmar correo</h1>
          {verification && <p>{verification.email}</p>}
        </div>

        {verification ? (
          <ConfirmForm token={token} />
        ) : (
          <p className="auth-error">Este enlace ya se usó o venció. Pide uno nuevo desde la app.</p>
        )}
      </main>
    </div>
  );
}
