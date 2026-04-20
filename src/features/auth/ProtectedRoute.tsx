import type { ReactNode } from "react";
import { ConsentGate } from "@/components/ConsentGate";
import VerificationGate from "@/components/VerificationGate";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ConsentGate>
    <VerificationGate>{children}</VerificationGate>
  </ConsentGate>
);
