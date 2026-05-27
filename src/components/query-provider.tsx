"use client";

import { TRPCProvider } from "@/lib/trpc/react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
