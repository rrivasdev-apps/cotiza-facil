"use client";

import { useEffect } from "react";
import { ErrorPanel } from "@/components/error-panel";

export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="auth-main">
      <ErrorPanel digest={error.digest} retry={retry} />
    </main>
  );
}
