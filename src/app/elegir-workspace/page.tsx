import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacesForUser } from "@/lib/workspaces/queries";
import { selectWorkspace } from "@/lib/workspaces/actions";
import { signOut } from "../(app)/actions";
import { CreateWorkspaceForm } from "./create-workspace-form";

const ROLE_LABELS = { owner: "Propietario", collaborator: "Colaborador" } as const;

export default async function ElegirWorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaces = await getWorkspacesForUser(user.id);
  const hasOwnWorkspace = workspaces.some((workspace) => workspace.role === "owner");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>Elige un workspace</h1>
          <p>Entra al que quieres trabajar ahora</p>
        </div>

        <div className="auth-card">
          {workspaces.length === 0 && <p>Todavía no perteneces a ningún workspace.</p>}

          {workspaces.map((workspace) => (
            <form key={workspace.accountId} action={selectWorkspace}>
              <input type="hidden" name="account_id" value={workspace.accountId} />
              <button type="submit" className="auth-submit" style={{ width: "100%" }}>
                {workspace.name} · {ROLE_LABELS[workspace.role]}
                {workspace.isActive ? " (actual)" : ""}
              </button>
            </form>
          ))}
        </div>

        {!hasOwnWorkspace && <CreateWorkspaceForm />}

        <form action={signOut}>
          <button type="submit" className="auth-switch" style={{ background: "none", border: "none", cursor: "pointer" }}>
            Salir
          </button>
        </form>
      </main>
    </div>
  );
}
