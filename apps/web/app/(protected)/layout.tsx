import RequireAuth from "@/components/RequireAuth";
import type { ReactNode } from "react";

/** Toute page placée dans app/(protected)/ exige d'être connecté. */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
